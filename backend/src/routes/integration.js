import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Integration from '../models/Integration.js'
import Workspace from '../models/Workspace.js'
import Channel from '../models/Channel.js'
import Message from '../models/Message.js'
import Stripe from 'stripe'
import { isWorkspaceAdmin } from '../utils/workspaceAuth.js'

const router = express.Router()
router.use(authenticate)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

// Stripe webhook handler
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

// Generic webhook endpoint
router.post('/webhook/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params
    const integration = await Integration.findById(integrationId)
      .populate('channel')
    
    if (!integration || integration.type !== 'webhook' || !integration.active) {
      return res.status(404).json({ message: 'Integration not found or inactive' })
    }
    
    // Verify webhook secret if configured
    if (integration.config.secret) {
      const providedSecret = req.headers['x-webhook-secret']
      if (providedSecret !== integration.config.secret) {
        return res.status(401).json({ message: 'Invalid webhook secret' })
      }
    }
    
    // Format message
    let messageText = integration.messageTemplate
      .replace('{{event}}', 'webhook')
      .replace('{{data}}', JSON.stringify(req.body, null, 2))
    
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
    // io.to(`channel:${integration.channel._id}`).emit('new_message', message)
    
    res.json({ received: true, message: 'Webhook processed' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to process webhook', error: error.message })
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

export default router

