import express from 'express'
import mongoose from 'mongoose'
import { authenticate } from '../middleware/auth.js'
import Workspace from '../models/Workspace.js'
import Channel from '../models/Channel.js'
import Message from '../models/Message.js'
import Integration from '../models/Integration.js'
import { google } from 'googleapis'
import { isWorkspaceAdmin } from '../utils/workspaceAuth.js'

const router = express.Router()
router.use(authenticate)

// Helper function to generate invite code
const generateInviteCode = () => {
  const prefix = 'LOOP'
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = prefix + '-'
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    if (i < 2) code += '-'
  }
  return code
}

// Centralized helper to safely convert workspace._id to ObjectId
// Handles all edge cases: ObjectId, string, populated objects, etc.
const safeWorkspaceIdToObjectId = (workspaceId) => {
  try {
    // If it's already a valid ObjectId instance, return it
    if (workspaceId instanceof mongoose.Types.ObjectId) {
      return workspaceId
    }
    
    // If it's a string, validate and convert
    if (typeof workspaceId === 'string') {
      if (mongoose.Types.ObjectId.isValid(workspaceId)) {
        return new mongoose.Types.ObjectId(workspaceId)
      }
      throw new Error(`Invalid ObjectId string: ${workspaceId}`)
    }
    
    // If it has a toString method, use it
    if (workspaceId && typeof workspaceId.toString === 'function') {
      const idStr = workspaceId.toString()
      if (mongoose.Types.ObjectId.isValid(idStr)) {
        return new mongoose.Types.ObjectId(idStr)
      }
      throw new Error(`Invalid ObjectId from toString(): ${idStr}`)
    }
    
    // If it's an object with an _id property (populated object)
    if (workspaceId && typeof workspaceId === 'object' && workspaceId._id) {
      return safeWorkspaceIdToObjectId(workspaceId._id)
    }
    
    // Last resort: try to convert to string
    const idStr = String(workspaceId)
    if (idStr === '[object Object]') {
      throw new Error('Cannot convert object to ObjectId - got "[object Object]"')
    }
    if (mongoose.Types.ObjectId.isValid(idStr)) {
      return new mongoose.Types.ObjectId(idStr)
    }
    
    throw new Error(`Cannot convert to ObjectId: ${JSON.stringify(workspaceId)}`)
  } catch (error) {
    console.error('❌ [Admin] safeWorkspaceIdToObjectId error:', error)
    console.error('   Input type:', typeof workspaceId)
    console.error('   Input value:', workspaceId)
    throw new Error(`Failed to convert workspace ID to ObjectId: ${error.message}`)
  }
}

// Helper to ensure workspace has inviteCode
const ensureInviteCode = async (workspace) => {
  try {
    if (!workspace || !workspace._id) {
      console.error('❌ [Admin] ensureInviteCode: Invalid workspace object')
      return workspace
    }
    
    // If workspace already has inviteCode, we're done
    if (workspace.inviteCode) {
      console.log(`✅ [Admin] Workspace already has invite code: ${workspace.inviteCode}`)
      return workspace
    }
    
    console.log(`🔑 [Admin] Generating invite code for workspace: ${workspace._id}`)
    console.log(`   Workspace._id type: ${typeof workspace._id}, value: ${workspace._id}`)
    
    // Safely convert workspace._id to ObjectId using centralized helper
    // Do this ONCE and reuse it for all operations
    let workspaceObjectId
    try {
      workspaceObjectId = safeWorkspaceIdToObjectId(workspace._id)
      console.log(`   ✅ [Admin] Converted workspace ID to ObjectId: ${workspaceObjectId}`)
      
      // Validate it's actually a valid ObjectId
      if (!(workspaceObjectId instanceof mongoose.Types.ObjectId)) {
        throw new Error(`Conversion returned invalid type: ${typeof workspaceObjectId}`)
      }
    } catch (idError) {
      console.error('❌ [Admin] Error converting workspace._id to ObjectId:', idError)
      throw new Error(`Invalid workspace ID: ${idError.message}`)
    }
    
    let inviteCode
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10
    
    while (!isUnique && attempts < maxAttempts) {
      inviteCode = generateInviteCode()
      console.log(`   [Admin] Attempt ${attempts + 1}: Generated code: ${inviteCode}`)
      
      try {
        // Use the validated ObjectId in the query
        const existing = await Workspace.findOne({ 
          inviteCode, 
          _id: { $ne: workspaceObjectId }
        })
        
        if (!existing) {
          isUnique = true
          console.log(`   ✅ [Admin] Code is unique: ${inviteCode}`)
        } else {
          console.log(`   ⚠️ [Admin] Code already exists, trying again...`)
          attempts++
        }
      } catch (findError) {
        console.error('❌ [Admin] Error checking for existing invite code:', findError)
        console.error('   findError details:', {
          message: findError.message,
          name: findError.name,
          code: findError.code
        })
        // Don't throw - just try next code
        attempts++
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to check code uniqueness after ${maxAttempts} attempts: ${findError.message}`)
        }
      }
    }
    
    if (!isUnique) {
      throw new Error(`Failed to generate unique invite code after ${maxAttempts} attempts`)
    }
    
    // Use findByIdAndUpdate instead of save() to avoid issues with populated documents
    // Reuse the already-validated workspaceObjectId
    
    console.log(`💾 [Admin] Saving workspace with invite code: ${inviteCode}`)
    
    try {
      // Use string representation for findByIdAndUpdate to avoid any casting issues
      const workspaceIdStr = workspaceObjectId.toString()
      const updated = await Workspace.findByIdAndUpdate(
        workspaceIdStr,
        { inviteCode },
        { new: true, runValidators: true }
      )
      
      if (!updated) {
        throw new Error('Workspace not found when trying to update invite code')
      }
      
      // Update the workspace object in memory so it reflects the change
      workspace.inviteCode = inviteCode
      
      console.log(`✅ [Admin] Successfully saved invite code for workspace: ${workspaceIdStr}`)
    } catch (saveError) {
      console.error('❌ [Admin] Error saving workspace with invite code:', saveError)
      console.error('   Error details:', {
        message: saveError.message,
        name: saveError.name,
        code: saveError.code,
        keyPattern: saveError.keyPattern,
        keyValue: saveError.keyValue
      })
      throw saveError
    }
    
    return workspace
  } catch (error) {
    console.error('❌ [Admin] ensureInviteCode failed:', error)
    console.error('   Workspace ID:', workspace?._id)
    console.error('   Workspace ID type:', typeof workspace?._id)
    console.error('   Error stack:', error.stack)
    // Re-throw so calling function can handle it
    throw error
  }
}

// Get workspace settings
router.get('/workspace/:id/settings', async (req, res) => {
  try {
    console.log(`📋 [Admin] Fetching settings for workspace: ${req.params.id}`)
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      console.error(`❌ [Admin] Workspace not found: ${req.params.id}`)
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      console.error(`❌ [Admin] Access denied for user ${req.user._id}`)
      return res.status(403).json({ message: 'Only admin can view settings' })
    }
    
    // Ensure workspace has inviteCode (for existing workspaces)
    try {
      await ensureInviteCode(workspace)
      console.log(`✅ [Admin] Workspace ready, inviteCode: ${workspace.inviteCode}`)
    } catch (inviteError) {
      console.error('❌ [Admin] Failed to ensure invite code:', inviteError)
      // Continue anyway - return what we have
    }
    
    res.json({
      name: workspace.name,
      settings: workspace.settings,
      driveLinked: workspace.driveLinked,
      driveFolderId: workspace.driveFolderId,
      subscriptionStatus: workspace.subscriptionStatus,
      inviteCode: workspace.inviteCode
    })
  } catch (error) {
    console.error('❌ [Admin] Failed to fetch settings:', error)
    console.error('   Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    })
    res.status(500).json({ 
      message: 'Failed to fetch settings', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
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

