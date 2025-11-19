import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Workspace from '../models/Workspace.js'
import Channel from '../models/Channel.js'
import { isWorkspaceAdmin, hasWorkspaceAdminRole, isWorkspaceMember } from '../utils/workspaceAuth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Create workspace
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    
    if (!name) {
      return res.status(400).json({ message: 'Workspace name is required' })
    }
    
    const workspace = new Workspace({
      name,
      admin: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin'
      }]
    })
    
    await workspace.save()
    
    // Add workspace to user
    req.user.workspaces.push(workspace._id)
    await req.user.save()
    
    // Create default "welcome" channel
    const Channel = (await import('../models/Channel.js')).default
    const welcomeChannel = new Channel({
      name: 'welcome',
      workspace: workspace._id,
      privacy: 'public',
      description: 'Welcome to your workspace! This is a general channel for everyone.'
    })
    await welcomeChannel.save()
    
    console.log('✅ Created workspace with default welcome channel:', workspace._id)
    
    res.status(201).json(workspace)
  } catch (error) {
    console.error('❌ Failed to create workspace:', error)
    res.status(500).json({ message: 'Failed to create workspace', error: error.message })
  }
})

// Get user's workspaces
router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { admin: req.user._id },
        { 'members.user': req.user._id }
      ]
    }).populate('admin', 'name email avatar')
    
    res.json(workspaces)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch workspaces', error: error.message })
  }
})

// Get workspace by ID
router.get('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('admin', 'name email avatar')
      .populate('members.user', 'name email avatar')
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    // Check if user has access
    if (!isWorkspaceMember(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    res.json(workspace)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch workspace', error: error.message })
  }
})

// Update workspace
router.patch('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    // Check if user is admin
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can update workspace' })
    }
    
    Object.assign(workspace, req.body)
    await workspace.save()
    
    res.json(workspace)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update workspace', error: error.message })
  }
})

// Invite member
router.post('/:id/invite', async (req, res) => {
  try {
    const { email, role = 'member' } = req.body
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    // Check if user is admin
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can invite members' })
    }
    
    // Find user by email
    const User = (await import('../models/User.js')).default
    const user = await User.findOne({ email })
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    // Check if already a member
    const isMember = workspace.members?.some(m => {
      if (!m || !m.user) return false
      const memberId = m.user?._id || m.user
      return memberId?.toString() === user._id.toString()
    }) || false
    
    if (isMember) {
      return res.status(400).json({ message: 'User is already a member' })
    }
    
    workspace.members.push({
      user: user._id,
      role
    })
    
    await workspace.save()
    
    // Add workspace to user
    if (!user.workspaces.includes(workspace._id)) {
      user.workspaces.push(workspace._id)
      await user.save()
    }
    
    res.json(workspace)
  } catch (error) {
    res.status(500).json({ message: 'Failed to invite member', error: error.message })
  }
})

// Get workspace members
router.get('/:id/members', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('admin', 'name email avatar')
      .populate('members.user', 'name email avatar')
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    // Check if user has access
    if (!isWorkspaceMember(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    // Only admin can see full member list with details
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Only admin can view members' })
    }
    
    res.json({
      admin: workspace.admin,
      members: workspace.members
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch members', error: error.message })
  }
})

export default router

