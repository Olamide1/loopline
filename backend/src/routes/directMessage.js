import express from 'express'
import { authenticate } from '../middleware/auth.js'
import DirectMessage from '../models/DirectMessage.js'
import DirectMessageContent from '../models/DirectMessageContent.js'
import User from '../models/User.js'

const router = express.Router()
router.use(authenticate)

// Get or create DM conversation with a user
router.post('/conversation', async (req, res) => {
  try {
    const { userId } = req.body
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' })
    }
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' })
    }
    
    // Check if user exists
    const otherUser = await User.findById(userId)
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    // Find or create conversation
    // Check both possible orders of participants
    const userIdObj = typeof userId === 'string' ? userId : userId.toString()
    const currentUserId = req.user._id.toString()
    
    let conversation = await DirectMessage.findOne({
      $or: [
        { participants: [req.user._id, userId] },
        { participants: [userId, req.user._id] }
      ]
    })
      .populate('participants', 'name email avatar')
      .populate('lastMessage')
    
    if (!conversation) {
      conversation = new DirectMessage({
        participants: [req.user._id, userId]
      })
      await conversation.save()
      await conversation.populate('participants', 'name email avatar')
    }
    
    res.json(conversation)
  } catch (error) {
    res.status(500).json({ message: 'Failed to get/create conversation', error: error.message })
  }
})

// Get all DM conversations for current user
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await DirectMessage.find({
      participants: req.user._id
    })
      .populate('participants', 'name email avatar')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
    
    res.json(conversations)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch conversations', error: error.message })
  }
})

// Get messages for a conversation
router.get('/conversation/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params
    const { limit = 50, before } = req.query
    
    // Verify user is a participant
    const conversation = await DirectMessage.findById(conversationId)
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' })
    }
    
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    const query = {
      conversation: conversationId,
      deleted: false
    }
    
    if (before) {
      query.createdAt = { $lt: new Date(before) }
    }
    
    const messages = await DirectMessageContent.find(query)
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean()
    
    // Mark messages as read
    await DirectMessageContent.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        read: false
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    )
    
    // Reset unread count
    const userIdStr = req.user._id.toString()
    if (conversation.unreadCount instanceof Map) {
      conversation.unreadCount.set(userIdStr, 0)
    } else {
      conversation.unreadCount = conversation.unreadCount || {}
      conversation.unreadCount[userIdStr] = 0
    }
    await conversation.save()
    
    res.json(messages.reverse()) // Reverse to show oldest first
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message })
  }
})

// Send message in DM
router.post('/conversation/:conversationId/message', async (req, res) => {
  try {
    const { conversationId } = req.params
    const { text, files = [] } = req.body
    
    if (!text) {
      return res.status(400).json({ message: 'Message text is required' })
    }
    
    // Verify user is a participant
    const conversation = await DirectMessage.findById(conversationId)
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' })
    }
    
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    // Create message
    const message = new DirectMessageContent({
      conversation: conversationId,
      sender: req.user._id,
      text,
      files
    })
    
    await message.save()
    await message.populate('sender', 'name email avatar')
    
    // Update conversation
    conversation.lastMessage = message._id
    conversation.lastMessageAt = new Date()
    
    // Increment unread count for the other participant
    const otherParticipant = conversation.participants.find(
      p => p.toString() !== req.user._id.toString()
    )
    if (otherParticipant) {
      const otherIdStr = otherParticipant.toString()
      if (conversation.unreadCount instanceof Map) {
        const currentCount = conversation.unreadCount.get(otherIdStr) || 0
        conversation.unreadCount.set(otherIdStr, currentCount + 1)
      } else {
        conversation.unreadCount = conversation.unreadCount || {}
        conversation.unreadCount[otherIdStr] = (conversation.unreadCount[otherIdStr] || 0) + 1
      }
    }
    
    await conversation.save()
    await conversation.populate('participants', 'name email avatar')
    
    // Broadcast via Socket.IO
    const io = req.app.get('io')
    if (io) {
      // Emit to both participants
      conversation.participants.forEach(participant => {
        io.to(`user:${participant._id}`).emit('dm_message', {
          conversation: conversation.toObject(),
          message: message.toObject()
        })
      })
    }
    
    res.status(201).json(message)
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message })
  }
})

export default router

