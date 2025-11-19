import express from 'express'
import mongoose from 'mongoose'
import { authenticate } from '../middleware/auth.js'
import Workspace from '../models/Workspace.js'
import Channel from '../models/Channel.js'
import User from '../models/User.js'
import { isWorkspaceAdmin, hasWorkspaceAdminRole, isWorkspaceMember } from '../utils/workspaceAuth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Generate unique invite code
const generateInviteCode = () => {
  const prefix = 'LOOP'
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluding confusing chars
  let code = prefix + '-'

  // Generate 3 groups of 3 characters
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
    console.error('❌ safeWorkspaceIdToObjectId error:', error)
    console.error('   Input type:', typeof workspaceId)
    console.error('   Input value:', workspaceId)
    throw new Error(`Failed to convert workspace ID to ObjectId: ${error.message}`)
  }
}

// Middleware to ensure workspace has inviteCode
const ensureInviteCode = async (workspace) => {
  try {
    if (!workspace || !workspace._id) {
      return workspace
    }
    
    // If workspace already has inviteCode, we're done
    if (workspace.inviteCode) {
      return workspace
    }
    
    // Get the ID as a string first - handle all edge cases
    let idStr
    if (workspace._id instanceof mongoose.Types.ObjectId) {
      idStr = workspace._id.toString()
    } else if (typeof workspace._id === 'string') {
      idStr = workspace._id
    } else if (workspace._id && typeof workspace._id.toString === 'function') {
      idStr = workspace._id.toString()
    } else {
      idStr = String(workspace._id)
    }
    
    // Validate it's a valid ObjectId format
    if (!idStr || idStr === '[object Object]' || !mongoose.Types.ObjectId.isValid(idStr)) {
      throw new Error(`Invalid ObjectId: ${idStr}`)
    }
    
    // Create ObjectId instance
    const workspaceObjectId = new mongoose.Types.ObjectId(idStr)
    const workspaceIdStr = workspaceObjectId.toString()
    
    let inviteCode
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10
    
    while (!isUnique && attempts < maxAttempts) {
      inviteCode = generateInviteCode()
      
      try {
        // Use ObjectId instance directly in query (MongoDB handles this correctly)
        const existing = await Workspace.findOne({ 
          inviteCode, 
          _id: { $ne: workspaceObjectId }
        })
        
        if (!existing) {
          isUnique = true
        } else {
          attempts++
        }
      } catch (findError) {
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
    
    // Use findByIdAndUpdate with string ID to avoid any casting issues
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
    
    return workspace
  } catch (error) {
    // Re-throw so calling function can handle it
    throw error
  }
}

// Create workspace
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    
    if (!name) {
      return res.status(400).json({ message: 'Workspace name is required' })
    }
    
    // Generate unique invite code
    let inviteCode
    let isUnique = false
    while (!isUnique) {
      inviteCode = generateInviteCode()
      const existing = await Workspace.findOne({ inviteCode })
      if (!existing) {
        isUnique = true
      }
    }
    
    const workspace = new Workspace({
      name,
      admin: req.user._id,
      inviteCode,
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
    }).populate('admin', 'name email avatar status')
    
    // Add online users to each workspace
    for (const workspace of workspaces) {
      try {
        const allUserIds = [
          workspace.admin?._id || workspace.admin,
          ...(workspace.members || []).map(m => m.user?._id || m.user)
        ].filter(Boolean).filter(id => mongoose.Types.ObjectId.isValid(id))
        
        if (allUserIds.length > 0) {
          const onlineUsers = await User.find({
            _id: { $in: allUserIds },
            status: 'online'
          }).select('_id name email avatar status')
          
          workspace.onlineUsers = onlineUsers || []
        } else {
          workspace.onlineUsers = []
        }
      } catch (error) {
        // If online users query fails, just set empty array and continue
        console.error('Failed to fetch online users for workspace:', workspace._id, error)
        workspace.onlineUsers = []
      }
    }
    
    res.json(workspaces)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch workspaces', error: error.message })
  }
})

// Get workspace by ID
router.get('/:id', async (req, res) => {
  try {
    let workspaceId = req.params.id
    
    // Handle case where ID might be an object string representation
    if (workspaceId && typeof workspaceId === 'string') {
      // Remove any whitespace
      workspaceId = workspaceId.trim()
    }
    
    // Validate the ID format first
    if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ 
        message: 'Invalid workspace ID format',
        received: workspaceId
      })
    }
    
    const workspace = await Workspace.findById(workspaceId)
      .populate('admin', 'name email avatar status')
      .populate('members.user', 'name email avatar status')
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    // Check if user has access
    if (!isWorkspaceMember(workspace, req.user._id)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    // Ensure workspace has inviteCode (non-blocking - don't fail request if this fails)
    // Only try if workspace doesn't already have an inviteCode
    if (!workspace.inviteCode) {
      try {
        await ensureInviteCode(workspace)
      } catch (inviteError) {
        // Silently fail - don't log or throw, just continue
        // The workspace will be returned without inviteCode, which can be generated later
      }
    }
    
    // Get online users for this workspace
    try {
      const allUserIds = [
        workspace.admin?._id || workspace.admin,
        ...(workspace.members || []).map(m => m.user?._id || m.user)
      ].filter(Boolean).filter(id => mongoose.Types.ObjectId.isValid(id))
      
      let onlineUsers = []
      if (allUserIds.length > 0) {
        onlineUsers = await User.find({
          _id: { $in: allUserIds },
          status: 'online'
        }).select('_id name email avatar status')
      }
      
      // Return workspace - convert to plain object to avoid serialization issues
      const workspaceObj = workspace.toObject ? workspace.toObject() : workspace
      workspaceObj.onlineUsers = onlineUsers || []
      
      res.json(workspaceObj)
    } catch (error) {
      // If online users query fails, return workspace without online users
      console.error('Failed to fetch online users for workspace:', workspaceId, error)
      const workspaceObj = workspace.toObject ? workspace.toObject() : workspace
      workspaceObj.onlineUsers = []
      res.json(workspaceObj)
    }
  } catch (error) {
    console.error('❌ Failed to fetch workspace:', error)
    res.status(500).json({ 
      message: 'Failed to fetch workspace', 
      error: error.message
    })
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

// Regenerate invite code (admin only)
router.post('/:id/invite-code/regenerate', async (req, res) => {
  try {
    console.log(`🔄 Regenerating invite code for workspace: ${req.params.id}`)
    const workspace = await Workspace.findById(req.params.id)
    
    if (!workspace) {
      console.error(`❌ Workspace not found: ${req.params.id}`)
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    // Check if user is admin
    if (!isWorkspaceAdmin(workspace, req.user._id)) {
      console.error(`❌ Access denied - user ${req.user._id} is not admin`)
      return res.status(403).json({ message: 'Only admin can regenerate invite code' })
    }
    
    console.log(`   Current invite code: ${workspace.inviteCode || 'NONE'}`)
    
    // Convert workspace._id ONCE before the loop and reuse it
    let workspaceObjectId
    try {
      workspaceObjectId = safeWorkspaceIdToObjectId(workspace._id)
      if (!(workspaceObjectId instanceof mongoose.Types.ObjectId)) {
        throw new Error(`Conversion returned invalid type: ${typeof workspaceObjectId}`)
      }
    } catch (idError) {
      console.error('❌ Error converting workspace._id to ObjectId:', idError)
      throw new Error(`Invalid workspace ID: ${idError.message}`)
    }
    
    // Generate new unique code
    let inviteCode
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10
    
    while (!isUnique && attempts < maxAttempts) {
      inviteCode = generateInviteCode()
      console.log(`   Attempt ${attempts + 1}: Generated code: ${inviteCode}`)
      
      try {
        const existing = await Workspace.findOne({ 
          inviteCode, 
          _id: { $ne: workspaceObjectId }
        })
        
        if (!existing) {
          isUnique = true
          console.log(`   ✅ Code is unique: ${inviteCode}`)
        } else {
          console.log(`   ⚠️ Code already exists, trying again...`)
          attempts++
        }
      } catch (findError) {
        console.error('❌ Error checking for existing invite code:', findError)
        attempts++
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to check code uniqueness after ${maxAttempts} attempts: ${findError.message}`)
        }
      }
    }
    
    if (!isUnique) {
      throw new Error(`Failed to generate unique invite code after ${maxAttempts} attempts`)
    }
    
    console.log(`💾 Saving workspace with new invite code: ${inviteCode}`)
    
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
      
      console.log(`✅ Successfully regenerated invite code: ${inviteCode}`)
      res.json({ inviteCode })
    } catch (saveError) {
      console.error('❌ Error saving regenerated invite code:', saveError)
      console.error('   Error details:', {
        message: saveError.message,
        name: saveError.name,
        code: saveError.code,
        keyPattern: saveError.keyPattern,
        keyValue: saveError.keyValue
      })
      throw saveError
    }
  } catch (error) {
    console.error('❌ Failed to regenerate invite code:', error)
    console.error('   Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    })
    res.status(500).json({ 
      message: 'Failed to regenerate invite code', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Get workspace members
router.get('/:id/members', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('admin', 'name email avatar status')
      .populate('members.user', 'name email avatar status')
    
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
    
    // Get online users
    const allUserIds = [
      workspace.admin._id || workspace.admin,
      ...workspace.members.map(m => m.user?._id || m.user)
    ].filter(Boolean)
    
    const onlineUsers = await User.find({
      _id: { $in: allUserIds },
      status: 'online'
    }).select('_id name email avatar status')
    
    res.json({
      admin: workspace.admin,
      members: workspace.members,
      onlineUsers
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch members', error: error.message })
  }
})

export default router

