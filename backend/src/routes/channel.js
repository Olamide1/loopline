import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Channel from '../models/Channel.js'
import Workspace from '../models/Workspace.js'
import { isWorkspaceAdmin, isWorkspaceMember } from '../utils/workspaceAuth.js'

const router = express.Router()

router.use(authenticate)

// Create channel
router.post('/', async (req, res) => {
  try {
    const { name, workspace, privacy = 'public', description, members = [] } = req.body
    
    console.log('📝 Creating channel:', { name, workspace, privacy })
    
    if (!name || !workspace) {
      return res.status(400).json({ message: 'Channel name and workspace are required' })
    }
    
    // Validate channel name (lowercase, alphanumeric, hyphens, underscores only)
    const sanitizedName = name.trim().toLowerCase().replace(/\s+/g, '-')
    if (!/^[a-z0-9-_]+$/.test(sanitizedName)) {
      return res.status(400).json({ message: 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores' })
    }
    
    if (sanitizedName.length < 1 || sanitizedName.length > 50) {
      return res.status(400).json({ message: 'Channel name must be between 1 and 50 characters' })
    }
    
    // Verify workspace access
    const workspaceDoc = await Workspace.findById(workspace)
    if (!workspaceDoc) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceMember(workspaceDoc, req.user._id)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    // Check if channel with same name already exists in workspace
    const existingChannel = await Channel.findOne({
      workspace,
      name: sanitizedName,
      archived: false
    })
    
    if (existingChannel) {
      return res.status(400).json({ message: 'A channel with this name already exists' })
    }
    
    const channel = new Channel({
      name: sanitizedName,
      workspace,
      privacy,
      description: description?.trim() || undefined,
      members: privacy === 'private' ? [...members, req.user._id] : []
    })
    
    await channel.save()
    
    // Populate for response
    await channel.populate('members', 'name email avatar status')
    
    // Broadcast channel creation via Socket.IO
    const io = req.app.get('io')
    if (io) {
      const workspaceId = workspaceDoc._id.toString()
      io.to(`workspace:${workspaceId}`).emit('channel_created', channel)
    }
    
    console.log('✅ Channel created:', channel._id)
    res.status(201).json(channel)
  } catch (error) {
    console.error('❌ Failed to create channel:', error)
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A channel with this name already exists' })
    }
    
    res.status(500).json({ message: 'Failed to create channel', error: error.message })
  }
})

// Get channels for workspace
router.get('/workspace/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params
    
    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId)
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceMember(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    // Get public channels and private channels user is member of
    const channels = await Channel.find({
      workspace: workspaceId,
      archived: false,
      $or: [
        { privacy: 'public' },
        { members: req.user._id }
      ]
    }).populate('members', 'name email avatar status')
      .lean()
    
    // Calculate unread counts for each channel
    const Message = (await import('../models/Message.js')).default
    const userId = req.user._id.toString()
    
    for (const channel of channels) {
      // When using .lean(), Map fields become plain objects
      let lastRead = null
      try {
        if (channel.lastRead && typeof channel.lastRead === 'object' && !Array.isArray(channel.lastRead)) {
          lastRead = channel.lastRead[userId] || null
        }
      } catch (err) {
        // If lastRead access fails, just continue with null
        console.warn('Warning: Could not access lastRead for channel', channel._id, err.message)
      }
      
      const query = {
        channel: channel._id,
        deleted: false,
        threadParent: null // Only count parent messages, not thread replies
      }
      
      if (lastRead) {
        try {
          const lastReadDate = new Date(lastRead)
          if (!isNaN(lastReadDate.getTime())) {
            query.createdAt = { $gt: lastReadDate }
          }
        } catch (err) {
          // Invalid date, skip the filter
          console.warn('Warning: Invalid lastRead date for channel', channel._id, err.message)
        }
      }
      
      try {
        const unreadCount = await Message.countDocuments(query)
        channel.unreadCount = unreadCount || 0
      } catch (err) {
        console.error('Error counting unread messages for channel', channel._id, err.message)
        channel.unreadCount = 0
      }
    }
    
    res.json(channels)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch channels', error: error.message })
  }
})

// Get channel by ID
router.get('/:id', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('members', 'name email avatar')
      .populate('workspace')
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    
    // Check access
    if (channel.privacy === 'private' && !channel.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    res.json(channel)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch channel', error: error.message })
  }
})

// Update channel
router.patch('/:id', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    
    // Check if user is workspace admin or channel member
    const workspace = await Workspace.findById(channel.workspace)
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    const isAdmin = isWorkspaceAdmin(workspace, req.user._id)
    const isMember = channel.members.some(m => {
      const memberId = m?._id || m
      return memberId?.toString() === req.user._id.toString()
    })
    
    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    // Handle members array separately to ensure proper updates
    if (req.body.members !== undefined) {
      // Validate that all members are workspace members
      const workspaceMembers = []
      if (workspace.admin) {
        workspaceMembers.push(workspace.admin._id || workspace.admin)
      }
      if (workspace.members) {
        workspace.members.forEach(m => {
          const memberId = m.user?._id || m.user
          if (memberId) {
            workspaceMembers.push(memberId)
          }
        })
      }
      
      // Filter to only include valid workspace members
      const validMembers = req.body.members.filter(memberId => {
        return workspaceMembers.some(wm => {
          const wmId = wm?._id || wm
          return wmId?.toString() === memberId?.toString()
        })
      })
      
      channel.members = validMembers
    }
    
    // Update other fields
    if (req.body.name !== undefined) channel.name = req.body.name
    if (req.body.description !== undefined) channel.description = req.body.description
    if (req.body.privacy !== undefined) channel.privacy = req.body.privacy
    
    await channel.save()
    await channel.populate('members', 'name email avatar status')
    
    // Broadcast channel update via Socket.IO
    const io = req.app.get('io')
    if (io) {
      const workspaceId = channel.workspace.toString()
      io.to(`workspace:${workspaceId}`).emit('channel_updated', {
        _id: channel._id,
        name: channel.name,
        privacy: channel.privacy,
        members: channel.members,
        description: channel.description
      })
    }
    
    res.json(channel)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update channel', error: error.message })
  }
})

// Archive channel
router.post('/:id/archive', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    
    // Check if user is workspace admin
    const workspace = await Workspace.findById(channel.workspace)
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can archive channels' })
    }
    
    channel.archived = true
    await channel.save()
    
    res.json(channel)
  } catch (error) {
    res.status(500).json({ message: 'Failed to archive channel', error: error.message })
  }
})

// Mark channel as read
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    
    const workspace = await Workspace.findById(channel.workspace)
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    if (!isWorkspaceMember(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    // Update last read timestamp
    const userIdStr = req.user._id.toString()
    const now = new Date()
    
    // Use findByIdAndUpdate with $set for Map fields (Mongoose handles this correctly)
    await Channel.findByIdAndUpdate(
      req.params.id,
      { $set: { [`lastRead.${userIdStr}`]: now } },
      { new: true }
    )
    
    // Broadcast channel read event to workspace
    const io = req.app.get('io')
    if (io) {
      const workspaceId = workspace._id?.toString() || workspace._id
      if (workspaceId) {
        io.to(`workspace:${workspaceId}`).emit('channel_read', {
          channelId: req.params.id.toString(),
          userId: userIdStr
        })
      }
    }
    
    res.json({ message: 'Channel marked as read', lastRead: now })
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark channel as read', error: error.message })
  }
})

export default router

