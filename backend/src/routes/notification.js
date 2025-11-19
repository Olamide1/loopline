import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Notification from '../models/Notification.js'
import Message from '../models/Message.js'
import Channel from '../models/Channel.js'
import Workspace from '../models/Workspace.js'

const router = express.Router()
router.use(authenticate)

// Get all notifications for current user
router.get('/', async (req, res) => {
  try {
    const { limit = 50, unreadOnly = false, type } = req.query
    
    const query = { user: req.user._id }
    if (unreadOnly === 'true') {
      query.read = false
    }
    if (type) {
      query.type = type
    }
    
    const notifications = await Notification.find(query)
      .populate('workspace', 'name')
      .populate('channel', 'name')
      .populate('message')
      .populate('threadParent')
      .populate('fromUser', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
    
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message })
  }
})

// Get unread notification count
router.get('/unread/count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false
    })
    
    res.json({ count })
  } catch (error) {
    res.status(500).json({ message: 'Failed to get unread count', error: error.message })
  }
})

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' })
    }
    
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    notification.read = true
    notification.readAt = new Date()
    await notification.save()
    
    res.json(notification)
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message })
  }
})

// Mark all notifications as read
router.patch('/read/all', async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    )
    
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark all as read', error: error.message })
  }
})

// Helper function to create thread reply notification
export const createThreadNotification = async (replyMessage, parentMessage) => {
  try {
    // Get parent message to find original author
    const parent = await Message.findById(parentMessage)
      .populate('channel')
      .populate('user')
    
    if (!parent) return
    
    // Get workspace
    const channel = await Channel.findById(parent.channel)
    if (!channel) return
    
    const workspace = await Workspace.findById(channel.workspace)
    if (!workspace) return
    
    // Create notification for parent message author (if not the reply author)
    if (parent.user._id.toString() !== replyMessage.user.toString()) {
      // Check if notification already exists
      const existing = await Notification.findOne({
        user: parent.user._id,
        type: 'thread_reply',
        threadParent: parentMessage,
        message: replyMessage._id,
        read: false
      })
      
      if (!existing) {
        const notification = new Notification({
          user: parent.user._id,
          type: 'thread_reply',
          workspace: workspace._id,
          channel: channel._id,
          message: replyMessage._id,
          threadParent: parentMessage,
          fromUser: replyMessage.user
        })
        
        await notification.save()
        await notification.populate('fromUser', 'name email avatar')
        await notification.populate('channel', 'name')
        await notification.populate('workspace', 'name')
        
        // Broadcast via Socket.IO
        const io = global.io
        if (io) {
          io.to(`user:${parent.user._id}`).emit('notification', notification.toObject ? notification.toObject() : notification)
        }
      }
    }
    
    // Also notify users mentioned in the thread
    if (replyMessage.mentions && replyMessage.mentions.length > 0) {
      for (const mentionedUserId of replyMessage.mentions) {
        if (mentionedUserId.toString() !== replyMessage.user.toString() &&
            mentionedUserId.toString() !== parent.user._id.toString()) {
          
          const existing = await Notification.findOne({
            user: mentionedUserId,
            type: 'thread_reply',
            threadParent: parentMessage,
            message: replyMessage._id,
            read: false
          })
          
          if (!existing) {
            const notification = new Notification({
              user: mentionedUserId,
              type: 'thread_reply',
              workspace: workspace._id,
              channel: channel._id,
              message: replyMessage._id,
              threadParent: parentMessage,
              fromUser: replyMessage.user
            })
            
            await notification.save()
            await notification.populate('fromUser', 'name email avatar')
            await notification.populate('channel', 'name')
            await notification.populate('workspace', 'name')
            
            const io = global.io
            if (io) {
              io.to(`user:${mentionedUserId}`).emit('notification', notification.toObject ? notification.toObject() : notification)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to create thread notification:', error)
  }
}

export default router

