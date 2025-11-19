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

// Helper function to normalize user ID to string
const normalizeUserId = (user) => {
  if (!user) return null
  if (typeof user === 'string') return user
  if (user._id) return user._id.toString()
  if (user.toString) return user.toString()
  return String(user)
}

// Helper function to create thread reply notification
export const createThreadNotification = async (replyMessage, parentMessage, io = null) => {
  try {
    // Get parent message to find original author
    const parent = await Message.findById(parentMessage)
      .populate('channel')
      .populate('user')
    
    if (!parent || !parent.user) {
      console.error('❌ Parent message or user not found for thread notification')
      return
    }
    
    // Normalize user IDs to strings for consistent comparison
    const parentUserId = normalizeUserId(parent.user)
    const replyUserId = normalizeUserId(replyMessage.user)
    
    if (!parentUserId || !replyUserId) {
      console.error('❌ Could not normalize user IDs for thread notification')
      return
    }
    
    // Skip if reply author is the same as parent author
    if (parentUserId === replyUserId) {
      console.log('⏭️ Skipping notification - reply author is same as parent author')
      return
    }
    
    // Get workspace
    const channelId = normalizeUserId(parent.channel)
    if (!channelId) {
      console.error('❌ Could not get channel ID for thread notification')
      return
    }
    
    const channel = await Channel.findById(channelId)
    if (!channel) {
      console.error('❌ Channel not found for thread notification')
      return
    }
    
    const workspaceId = normalizeUserId(channel.workspace)
    if (!workspaceId) {
      console.error('❌ Workspace ID not found for thread notification')
      return
    }
    
    const workspace = await Workspace.findById(workspaceId)
    if (!workspace) {
      console.error('❌ Workspace not found for thread notification')
      return
    }
    
    // Create notification for parent message author (if not the reply author)
    // Check if notification already exists
    const existing = await Notification.findOne({
      user: parentUserId,
      type: 'thread_reply',
      threadParent: parentMessage,
      message: replyMessage._id,
      read: false
    })
    
    if (!existing) {
      const notification = new Notification({
        user: parentUserId,
        type: 'thread_reply',
        workspace: workspaceId,
        channel: channelId,
        message: replyMessage._id,
        threadParent: parentMessage,
        fromUser: replyUserId
      })
      
      await notification.save()
      await notification.populate('fromUser', 'name email avatar')
      await notification.populate('channel', 'name')
      await notification.populate('workspace', 'name')
      
      // Broadcast via Socket.IO - use normalized user ID
      if (io) {
        const notificationObj = notification.toObject ? notification.toObject() : notification
        // Ensure user ID is string for Socket.IO room
        const targetUserId = normalizeUserId(parentUserId)
        io.to(`user:${targetUserId}`).emit('notification', notificationObj)
        
        // Also emit notification count update
        const count = await Notification.countDocuments({
          user: parentUserId,
          read: false
        })
        io.to(`user:${targetUserId}`).emit('notification_count_updated', { count })
        console.log(`✅ Thread notification sent to user:${targetUserId}`)
      }
    }
    
    // Also notify users mentioned in the thread reply
    if (replyMessage.mentions && replyMessage.mentions.length > 0) {
      for (const mentionedUserIdRaw of replyMessage.mentions) {
        const mentionedUserId = normalizeUserId(mentionedUserIdRaw)
        
        // Skip if mentioned user is the reply author or parent author
        if (!mentionedUserId || mentionedUserId === replyUserId || mentionedUserId === parentUserId) {
          continue
        }
        
        // Check if notification already exists
        const existingMention = await Notification.findOne({
          user: mentionedUserId,
          type: 'thread_reply',
          threadParent: parentMessage,
          message: replyMessage._id,
          read: false
        })
        
        if (!existingMention) {
          const mentionNotification = new Notification({
            user: mentionedUserId,
            type: 'thread_reply',
            workspace: workspaceId,
            channel: channelId,
            message: replyMessage._id,
            threadParent: parentMessage,
            fromUser: replyUserId
          })
          
          await mentionNotification.save()
          await mentionNotification.populate('fromUser', 'name email avatar')
          await mentionNotification.populate('channel', 'name')
          await mentionNotification.populate('workspace', 'name')
          
          if (io) {
            const notificationObj = mentionNotification.toObject ? mentionNotification.toObject() : mentionNotification
            const targetUserId = normalizeUserId(mentionedUserId)
            io.to(`user:${targetUserId}`).emit('notification', notificationObj)
            
            // Also emit notification count update
            const count = await Notification.countDocuments({
              user: mentionedUserId,
              read: false
            })
            io.to(`user:${targetUserId}`).emit('notification_count_updated', { count })
            console.log(`✅ Thread mention notification sent to user:${targetUserId}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to create thread notification:', error)
  }
}

// Helper function to create mention notification for regular messages
export const createMentionNotification = async (message, channel, workspace, io = null) => {
  try {
    if (!message || !message.mentions || message.mentions.length === 0) {
      return
    }
    
    // Normalize message author ID
    const messageUserId = normalizeUserId(message.user)
    if (!messageUserId) {
      console.error('❌ Could not normalize message author ID for mention notification')
      return
    }
    
    const workspaceId = normalizeUserId(workspace?._id || workspace)
    const channelId = normalizeUserId(channel?._id || channel)
    
    if (!workspaceId || !channelId) {
      console.error('❌ Missing workspace or channel ID for mention notification')
      return
    }
    
    // Create notifications for each mentioned user
    for (const mentionedUserIdRaw of message.mentions) {
      const mentionedUserId = normalizeUserId(mentionedUserIdRaw)
      
      // Skip if mentioned user is the message author
      if (!mentionedUserId || mentionedUserId === messageUserId) {
        continue
      }
      
      // Check if notification already exists
      const existing = await Notification.findOne({
        user: mentionedUserId,
        type: 'mention',
        message: message._id,
        read: false
      })
      
      if (!existing) {
        const notification = new Notification({
          user: mentionedUserId,
          type: 'mention',
          workspace: workspaceId,
          channel: channelId,
          message: message._id,
          fromUser: messageUserId
        })
        
        await notification.save()
        await notification.populate('fromUser', 'name email avatar')
        await notification.populate('channel', 'name')
        await notification.populate('workspace', 'name')
        
        // Broadcast via Socket.IO
        if (io) {
          const notificationObj = notification.toObject ? notification.toObject() : notification
          const targetUserId = normalizeUserId(mentionedUserId)
          io.to(`user:${targetUserId}`).emit('notification', notificationObj)
          
          // Also emit notification count update
          const count = await Notification.countDocuments({
            user: mentionedUserId,
            read: false
          })
          io.to(`user:${targetUserId}`).emit('notification_count_updated', { count })
          console.log(`✅ Mention notification sent to user:${targetUserId}`)
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to create mention notification:', error)
  }
}

export default router

