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
    await channel.populate('members', 'name email avatar')
    
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
    }).populate('members', 'name email avatar')
    
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
    
    Object.assign(channel, req.body)
    await channel.save()
    
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

export default router

