import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Integration from '../models/Integration.js'
import Workspace from '../models/Workspace.js'
import Channel from '../models/Channel.js'
import Message from '../models/Message.js'
import WebhookLog from '../models/WebhookLog.js'
import Stripe from 'stripe'
import { isWorkspaceAdmin } from '../utils/workspaceAuth.js'
import { renderTemplate } from '../utils/templateRenderer.js'

const router = express.Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// PUBLIC ROUTES (no auth) - Define webhook endpoints first
// Generic webhook endpoint (public - no auth required for webhooks)
router.post('/webhook/:integrationId', async (req, res) => {
  let webhookLog = null
  const startTime = Date.now()
  
  try {
    const { integrationId } = req.params
    const integration = await Integration.findById(integrationId)
      .populate('channel')
      .populate('workspace', 'admin')
    
    if (!integration || integration.type !== 'webhook' || !integration.active) {
      return res.status(404).json({ message: 'Integration not found or inactive' })
    }
    
    // Verify populated fields are not null (channel or workspace may have been deleted)
    if (!integration.channel) {
      return res.status(404).json({ message: 'Channel associated with this integration no longer exists' })
    }
    
    if (!integration.workspace) {
      return res.status(404).json({ message: 'Workspace associated with this integration no longer exists' })
    }
    
    // Verify webhook secret if configured
    if (integration.config.secret) {
      const providedSecret = req.headers['x-webhook-secret']
      if (providedSecret !== integration.config.secret) {
        // Log failed attempt
        try {
          webhookLog = new WebhookLog({
            integration: integration._id,
            status: 'failed',
            payload: req.body,
            error: 'Invalid webhook secret',
            headers: new Map(Object.entries(req.headers))
          })
          await webhookLog.save()
        } catch (logError) {
          console.error('Failed to log webhook error:', logError)
        }
        return res.status(401).json({ message: 'Invalid webhook secret' })
      }
    }
    
    // Prepare context for template rendering
    const templateContext = {
      event: 'webhook',
      data: req.body,
      headers: req.headers
    }
    
    // Render message using enhanced template
    let messageText = renderTemplate(integration.messageTemplate, templateContext)
    
    // Create message
    const message = new Message({
      channel: integration.channel._id,
      user: integration.workspace.admin,
      text: messageText,
      files: []
    })
    
    await message.save()
    await message.populate('user', 'name email avatar')
    
    // Emit via Socket.IO
    try {
      const io = req.app.get('io') || global.io
      if (io) {
        io.to(`channel:${integration.channel._id}`).emit('new_message', message)
      }
    } catch (socketError) {
      console.error('Failed to emit webhook message via Socket.IO:', socketError)
    }
    
    // Log successful webhook
    try {
      webhookLog = new WebhookLog({
        integration: integration._id,
        status: 'success',
        payload: req.body,
        processedMessage: message._id,
        headers: new Map(Object.entries(req.headers)),
        response: {
          received: true,
          processedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime
        }
      })
      await webhookLog.save()
    } catch (logError) {
      console.error('Failed to log webhook success:', logError)
    }
    
    res.json({ received: true, message: 'Webhook processed' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    
    // Log failed webhook
    try {
      if (!webhookLog) {
        webhookLog = new WebhookLog({
          integration: req.params.integrationId,
          status: 'failed',
          payload: req.body,
          error: error.message,
          headers: new Map(Object.entries(req.headers || {}))
        })
        await webhookLog.save()
      } else {
        webhookLog.status = 'failed'
        webhookLog.error = error.message
        await webhookLog.save()
      }
    } catch (logError) {
      console.error('Failed to log webhook error:', logError)
    }
    
    res.status(500).json({ message: 'Failed to process webhook', error: error.message })
  }
})

// Stripe webhook handler (public)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  
  let event
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`)
  }
  
  // Find active Stripe integrations
  const integrations = await Integration.find({
    type: 'stripe',
    active: true,
    'config.events': event.type
  }).populate('channel')
  
  // Process each integration
  for (const integration of integrations) {
    try {
      // Format message from template
      let messageText = integration.messageTemplate
        .replace('{{event}}', event.type)
        .replace('{{data}}', JSON.stringify(event.data.object, null, 2))
      
      // Create message in channel
      const message = new Message({
        channel: integration.channel._id,
        user: integration.workspace.admin, // System message from workspace admin
        text: messageText,
        files: []
      })
      
      await message.save()
      
      // Emit via Socket.IO (will be handled in socket.js)
      // io.to(`channel:${integration.channel._id}`).emit('new_message', message)
    } catch (error) {
      console.error(`Failed to process integration ${integration._id}:`, error)
    }
  }
  
  res.json({ received: true })
})

// PROTECTED ROUTES (require auth) - Apply auth middleware to all remaining routes
router.use(authenticate)

// Create integration
router.post('/', async (req, res) => {
  try {
    const { type, name, workspace, channel, config, messageTemplate } = req.body
    
    if (!type || !name || !workspace || !channel) {
      return res.status(400).json({ message: 'Type, name, workspace, and channel are required' })
    }
    
    // Verify workspace admin access
    const workspaceDoc = await Workspace.findById(workspace)
    if (!workspaceDoc) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspaceDoc, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can create integrations' })
    }
    
    // Verify channel access
    const channelDoc = await Channel.findById(channel)
    if (!channelDoc || channelDoc.workspace.toString() !== workspace) {
      return res.status(400).json({ message: 'Invalid channel for workspace' })
    }
    
    const integration = new Integration({
      type,
      name,
      workspace,
      channel,
      config,
      messageTemplate: messageTemplate || '{{event}} occurred: {{data}}'
    })
    
    await integration.save()
    res.status(201).json(integration)
  } catch (error) {
    res.status(500).json({ message: 'Failed to create integration', error: error.message })
  }
})

// Get integrations for workspace
router.get('/workspace/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params
    
    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId)
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can view integrations' })
    }
    
    const integrations = await Integration.find({ workspace: workspaceId })
      .populate('channel', 'name')
    
    res.json(integrations)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch integrations', error: error.message })
  }
})


// Update integration
router.patch('/:id', async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id)
    
    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' })
    }
    
    // Verify admin access
    const workspace = await Workspace.findById(integration.workspace)
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can update integrations' })
    }
    
    Object.assign(integration, req.body)
    await integration.save()
    
    res.json(integration)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update integration', error: error.message })
  }
})

// Delete integration
router.delete('/:id', async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id)
    
    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' })
    }
    
    // Verify admin access
    const workspace = await Workspace.findById(integration.workspace)
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can delete integrations' })
    }
    
    await integration.deleteOne()
    res.json({ message: 'Integration deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete integration', error: error.message })
  }
})

// Get webhook logs for an integration
router.get('/:id/logs', async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id)
    
    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' })
    }
    
    // Verify admin access
    const workspace = await Workspace.findById(integration.workspace)
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can view webhook logs' })
    }
    
    const limit = parseInt(req.query.limit) || 50
    const logs = await WebhookLog.find({ integration: integration._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-headers') // Exclude headers for now (they're large)
      .lean()
    
    res.json(logs)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch webhook logs', error: error.message })
  }
})

// Preview template with sample data
router.post('/:id/preview', async (req, res) => {
  try {
    const { template, sampleData } = req.body
    
    // Allow preview even without existing integration (for new integrations)
    let templateToUse = template
    let workspaceId = null
    
    if (req.params.id !== 'preview') {
      // Existing integration - verify access
      const integration = await Integration.findById(req.params.id)
      
      if (!integration) {
        return res.status(404).json({ message: 'Integration not found' })
      }
      
      // Verify admin access
      const workspace = await Workspace.findById(integration.workspace)
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' })
      }
      if (!isWorkspaceAdmin(workspace, req.user._id)) {
        return res.status(403).json({ message: 'Only admin can preview templates' })
      }
      
      templateToUse = template || integration.messageTemplate
      workspaceId = integration.workspace.toString()
    } else {
      // New integration preview - just verify user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' })
      }
      // User can preview templates before creating integration
    }
    
    if (!templateToUse) {
      return res.status(400).json({ message: 'Template is required' })
    }
    
    // Use provided sample data or default
    const context = sampleData || {
      event: 'webhook',
      data: {
        action: 'test',
        repository: {
          name: 'example-repo',
          full_name: 'user/example-repo'
        },
        message: 'This is a test webhook payload'
      }
    }
    
    const preview = renderTemplate(templateToUse, context)
    
    res.json({ preview, context })
  } catch (error) {
    res.status(500).json({ message: 'Failed to preview template', error: error.message })
  }
})

// Test webhook - send a test webhook to the integration
router.post('/:id/test', async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id)
      .populate('channel')
      .populate('workspace', 'admin')
    
    if (!integration || integration.type !== 'webhook' || !integration.active) {
      return res.status(404).json({ message: 'Integration not found, not a webhook integration, or inactive' })
    }
    
    // Verify populated fields are not null (channel or workspace may have been deleted)
    if (!integration.channel) {
      return res.status(404).json({ message: 'Channel associated with this integration no longer exists' })
    }
    
    if (!integration.workspace) {
      return res.status(404).json({ message: 'Workspace associated with this integration no longer exists' })
    }
    
    // Verify admin access
    if (!isWorkspaceAdmin(integration.workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can test integrations' })
    }
    
    const { testPayload } = req.body
    
    // Prepare context for template rendering
    const templateContext = {
      event: 'test',
      data: testPayload || {
        action: 'test',
        message: 'This is a test webhook',
        timestamp: new Date().toISOString()
      },
      headers: {}
    }
    
    // Render message using enhanced template
    let messageText = renderTemplate(integration.messageTemplate, templateContext)
    
    // Create message
    const message = new Message({
      channel: integration.channel._id,
      user: integration.workspace.admin,
      text: messageText,
      files: []
    })
    
    await message.save()
    await message.populate('user', 'name email avatar')
    
    // Emit via Socket.IO
    try {
      const io = req.app.get('io') || global.io
      if (io) {
        io.to(`channel:${integration.channel._id}`).emit('new_message', message)
      }
    } catch (socketError) {
      console.error('Failed to emit test message via Socket.IO:', socketError)
    }
    
    res.json({ 
      success: true, 
      message: 'Test webhook sent successfully',
      renderedMessage: messageText,
      createdMessage: message
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to test webhook', error: error.message })
  }
})

export default router

