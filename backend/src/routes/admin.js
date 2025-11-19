import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Workspace from '../models/Workspace.js'
import Channel from '../models/Channel.js'
import Message from '../models/Message.js'
import Integration from '../models/Integration.js'
import { google } from 'googleapis'
import { isWorkspaceAdmin } from '../utils/workspaceAuth.js'

const router = express.Router()
router.use(authenticate)

// Get workspace settings
router.get('/workspace/:id/settings', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can view settings' })
    }
    
    res.json({
      name: workspace.name,
      settings: workspace.settings,
      driveLinked: workspace.driveLinked,
      driveFolderId: workspace.driveFolderId,
      subscriptionStatus: workspace.subscriptionStatus
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message })
  }
})

// Update workspace settings
router.patch('/workspace/:id/settings', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can update settings' })
    }
    
    if (req.body.name) {
      workspace.name = req.body.name
    }
    
    if (req.body.settings) {
      workspace.settings = { ...workspace.settings, ...req.body.settings }
    }
    
    await workspace.save()
    res.json(workspace)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings', error: error.message })
  }
})

// Link Google Drive
router.post('/workspace/:id/drive/link', async (req, res) => {
  try {
    const { code } = req.body // OAuth code from frontend
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can link Drive' })
    }
    
    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
    
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)
    
    // Create Drive folder for workspace
    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    const folder = await drive.files.create({
      requestBody: {
        name: workspace.name,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    })
    
    workspace.driveLinked = true
    workspace.driveFolderId = folder.data.id
    workspace.driveToken = tokens.access_token
    workspace.driveRefreshToken = tokens.refresh_token
    
    await workspace.save()
    
    res.json({ success: true, folderId: folder.data.id })
  } catch (error) {
    res.status(500).json({ message: 'Failed to link Drive', error: error.message })
  }
})

// Export messages as JSON
router.get('/workspace/:id/export/messages', async (req, res) => {
  try {
    const { channelId } = req.query
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can export messages' })
    }
    
    // Get all channels in workspace
    const channels = await Channel.find({
      workspace: workspace._id
    }).select('_id')
    
    const channelIds = channelId 
      ? [channelId]
      : channels.map(c => c._id)
    
    const messages = await Message.find({
      channel: { $in: channelIds },
      deleted: false
    })
      .populate('user', 'name email')
      .populate('channel', 'name')
      .sort({ createdAt: 1 })
      .lean()
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="loopline-messages-${workspace._id}.json"`)
    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: 'Failed to export messages', error: error.message })
  }
})

// Export file map
router.get('/workspace/:id/export/files', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can export file map' })
    }
    
    // Get all channels
    const channels = await Channel.find({ workspace: workspace._id })
    
    // Get all files from messages
    const fileMap = []
    
    for (const channel of channels) {
      const messages = await Message.find({
        channel: channel._id,
        'files.0': { $exists: true },
        deleted: false
      }).select('files createdAt user').populate('user', 'name')
      
      messages.forEach(message => {
        message.files.forEach(file => {
          fileMap.push({
            channel: channel.name,
            channelId: channel._id,
            messageId: message._id,
            fileName: file.name,
            driveFileId: file.driveFileId,
            driveUrl: file.driveUrl,
            mimeType: file.mimeType,
            size: file.size,
            uploadedBy: message.user.name,
            uploadedAt: file.uploadedAt
          })
        })
      })
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="loopline-files-${workspace._id}.json"`)
    res.json(fileMap)
  } catch (error) {
    res.status(500).json({ message: 'Failed to export file map', error: error.message })
  }
})

// Get workspace stats
router.get('/workspace/:id/stats', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can view stats' })
    }
    
    const channelCount = await Channel.countDocuments({ workspace: workspace._id })
    const messageCount = await Message.countDocuments({
      channel: { $in: await Channel.find({ workspace: workspace._id }).select('_id') },
      deleted: false
    })
    const integrationCount = await Integration.countDocuments({ workspace: workspace._id, active: true })
    
    // Get file count
    const channels = await Channel.find({ workspace: workspace._id }).select('_id')
    const fileCount = await Message.countDocuments({
      channel: { $in: channels.map(c => c._id) },
      'files.0': { $exists: true },
      deleted: false
    })
    
    res.json({
      channels: channelCount,
      messages: messageCount,
      integrations: integrationCount,
      files: fileCount,
      members: workspace.members.length
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message })
  }
})

export default router

