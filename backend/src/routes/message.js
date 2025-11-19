import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Message from '../models/Message.js'
import { isWorkspaceAdmin } from '../utils/workspaceAuth.js'
import Channel from '../models/Channel.js'
import Workspace from '../models/Workspace.js'
import User from '../models/User.js'

const router = express.Router()

router.use(authenticate)

// Create message
router.post('/', async (req, res) => {
  try {
    const { channel, text, files = [], threadParent = null } = req.body
    
    if (!channel || !text) {
      return res.status(400).json({ message: 'Channel and text are required' })
    }
    
    // Verify channel access
    const channelDoc = await Channel.findById(channel)
    if (!channelDoc) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    
    if (channelDoc.privacy === 'private' && 
        !channelDoc.members.some(m => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    // Extract mentions (@username or @name)
    const mentionRegex = /@(\w+)/g
    const mentionMatches = [...text.matchAll(mentionRegex)]
    const mentionNames = [...new Set(mentionMatches.map(m => m[1].toLowerCase()))]
    
    // Get workspace to find members
    const workspace = await Workspace.findById(channelDoc.workspace)
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    // Find mentioned users by name (case-insensitive, partial match)
    const mentions = []
    if (mentionNames.length > 0) {
      // Populate workspace to get full member data
      await workspace.populate('admin', 'name email')
      await workspace.populate('members.user', 'name email')
      
      // Get all workspace members (admin + members)
      const allMembers = []
      if (workspace.admin) {
        allMembers.push({
          _id: workspace.admin._id || workspace.admin,
          name: workspace.admin.name,
          email: workspace.admin.email
        })
      }
      if (workspace.members) {
        workspace.members.forEach(member => {
          const user = member.user || member
          if (user && user._id) {
            allMembers.push({
              _id: user._id,
              name: user.name,
              email: user.email
            })
          }
        })
      }
      
      // Find users by name match (case-insensitive, starts with)
      for (const mentionName of mentionNames) {
        const lowerMention = mentionName.toLowerCase()
        const matchedUser = allMembers.find(member => {
          const name = (member.name || '').toLowerCase()
          const email = (member.email || '').toLowerCase()
          return name.startsWith(lowerMention) || email.startsWith(lowerMention)
        })
        
        if (matchedUser && !mentions.some(id => id.toString() === matchedUser._id.toString())) {
          mentions.push(matchedUser._id)
        }
      }
    }
    
    const message = new Message({
      channel,
      user: req.user._id,
      text,
      files,
      threadParent,
      mentions
    })
    
    await message.save()
    
    // Populate user and mentions for response
    await message.populate('user', 'name email avatar')
    await message.populate('mentions', 'name email avatar')
    
    res.status(201).json(message)
  } catch (error) {
    res.status(500).json({ message: 'Failed to create message', error: error.message })
  }
})

// Get messages for channel
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params
    const { limit = 50, before } = req.query
    
    // Verify channel access
    const channel = await Channel.findById(channelId)
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    
    if (channel.privacy === 'private' && 
        !channel.members.some(m => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    const query = {
      channel: channelId,
      deleted: false
    }
    
    if (before) {
      query.createdAt = { $lt: new Date(before) }
    }
    
    const messages = await Message.find(query)
      .populate('user', 'name email avatar')
      .populate('threadParent')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean()
    
    res.json(messages.reverse()) // Reverse to show oldest first
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message })
  }
})

// Get thread messages
router.get('/thread/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params
    
    const messages = await Message.find({
      threadParent: messageId,
      deleted: false
    })
      .populate('user', 'name email avatar')
      .sort({ createdAt: 1 })
    
    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch thread', error: error.message })
  }
})

// Update message
router.patch('/:id', async (req, res) => {
  try {
    const { text } = req.body
    const message = await Message.findById(req.params.id)
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }
    
    // Check if user owns the message
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' })
    }
    
    message.text = text
    await message.save()
    
    await message.populate('user', 'name email avatar')
    res.json(message)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update message', error: error.message })
  }
})

// Delete message
router.delete('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }
    
    // Check if user owns the message or is admin
    const Channel = (await import('../models/Channel.js')).default
    const channel = await Channel.findById(message.channel)
    const Workspace = (await import('../models/Workspace.js')).default
    const workspace = await Workspace.findById(channel.workspace)
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' })
    }
    
    const isOwner = message.user.toString() === req.user._id.toString()
    const isAdmin = isWorkspaceAdmin(workspace, req.user._id)
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    message.deleted = true
    message.deletedAt = Date.now()
    await message.save()
    
    res.json({ message: 'Message deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete message', error: error.message })
  }
})

// Add reaction
router.post('/:id/reaction', async (req, res) => {
  try {
    const { emoji } = req.body
    const message = await Message.findById(req.params.id)
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }
    
    const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji)
    
    if (reactionIndex >= 0) {
      // Toggle user in reaction
      const userIndex = message.reactions[reactionIndex].users.findIndex(
        u => u.toString() === req.user._id.toString()
      )
      
      if (userIndex >= 0) {
        // Remove reaction
        message.reactions[reactionIndex].users.splice(userIndex, 1)
        if (message.reactions[reactionIndex].users.length === 0) {
          message.reactions.splice(reactionIndex, 1)
        }
      } else {
        // Add user to reaction
        message.reactions[reactionIndex].users.push(req.user._id)
      }
    } else {
      // Create new reaction
      message.reactions.push({
        emoji,
        users: [req.user._id]
      })
    }
    
    await message.save()
    await message.populate('user', 'name email avatar')
    await message.populate('mentions', 'name email avatar')
    await message.populate('reactions.users', 'name email avatar')
    
    // Broadcast reaction update via Socket.IO
    const io = req.app.get('io')
    if (io) {
      // Get channel ID
      const channelId = message.channel.toString()
      
      // Convert to plain object for Socket.IO
      const messageObj = message.toObject ? message.toObject() : message
      
      io.to(`channel:${channelId}`).emit('reaction_updated', {
        _id: messageObj._id,
        reactions: messageObj.reactions || [],
        channel: channelId
      })
      
      // Also broadcast to thread if it's a thread reply
      if (message.threadParent) {
        io.to(`thread:${message.threadParent}`).emit('reaction_updated', {
          _id: messageObj._id,
          reactions: messageObj.reactions || [],
          channel: channelId
        })
      }
    }
    
    res.json(message)
  } catch (error) {
    res.status(500).json({ message: 'Failed to add reaction', error: error.message })
  }
})

export default router

