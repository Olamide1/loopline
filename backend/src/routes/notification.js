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
        // Ensure user ID is string for Socket.IO room and in notification object
        const targetUserId = normalizeUserId(parentUserId)
        
        // CRITICAL: Ensure notification.user is a string ID (not populated object) for frontend matching
        notificationObj.user = targetUserId
        if (notificationObj.fromUser && notificationObj.fromUser._id) {
          notificationObj.fromUser = {
            _id: normalizeUserId(replyUserId),
            name: notificationObj.fromUser.name,
            email: notificationObj.fromUser.email,
            avatar: notificationObj.fromUser.avatar
          }
        } else {
          notificationObj.fromUser = normalizeUserId(replyUserId)
        }
        
        const roomName = `user:${targetUserId}`
        io.to(roomName).emit('notification', notificationObj)
        console.log(`📤 Emitting thread notification to room: ${roomName}`, {
          notificationId: notificationObj._id?.toString() || notificationObj._id,
          type: notificationObj.type,
          targetUserId: targetUserId,
          fromUserId: normalizeUserId(replyUserId)
        })
        
        // Also emit notification count update
        const count = await Notification.countDocuments({
          user: parentUserId,
          read: false
        })
        io.to(roomName).emit('notification_count_updated', { count })
        console.log(`✅ Thread notification sent to user:${targetUserId}, count: ${count}`)
      } else {
        console.error('❌ Socket.IO instance not available for notification emission')
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
            
            // CRITICAL: Ensure notification.user is a string ID (not populated object) for frontend matching
            notificationObj.user = targetUserId
            if (notificationObj.fromUser && notificationObj.fromUser._id) {
              notificationObj.fromUser = {
                _id: normalizeUserId(replyUserId),
                name: notificationObj.fromUser.name,
                email: notificationObj.fromUser.email,
                avatar: notificationObj.fromUser.avatar
              }
            } else {
              notificationObj.fromUser = normalizeUserId(replyUserId)
            }
            
            const roomName = `user:${targetUserId}`
            io.to(roomName).emit('notification', notificationObj)
            console.log(`📤 Emitting thread mention notification to room: ${roomName}`, {
              notificationId: notificationObj._id?.toString() || notificationObj._id,
              type: notificationObj.type,
              targetUserId: targetUserId,
              fromUserId: normalizeUserId(replyUserId)
            })
            
            // Also emit notification count update
            const count = await Notification.countDocuments({
              user: mentionedUserId,
              read: false
            })
            io.to(roomName).emit('notification_count_updated', { count })
            console.log(`✅ Thread mention notification sent to user:${targetUserId}, count: ${count}`)
          } else {
            console.error('❌ Socket.IO instance not available for thread mention notification emission')
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
          
          // CRITICAL: Ensure notification.user is a string ID (not populated object) for frontend matching
          notificationObj.user = targetUserId
          if (notificationObj.fromUser && notificationObj.fromUser._id) {
            notificationObj.fromUser = {
              _id: normalizeUserId(messageUserId),
              name: notificationObj.fromUser.name,
              email: notificationObj.fromUser.email,
              avatar: notificationObj.fromUser.avatar
            }
          } else {
            notificationObj.fromUser = normalizeUserId(messageUserId)
          }
          
          const roomName = `user:${targetUserId}`
          io.to(roomName).emit('notification', notificationObj)
          console.log(`📤 Emitting mention notification to room: ${roomName}`, {
            notificationId: notificationObj._id?.toString() || notificationObj._id,
            type: notificationObj.type,
            targetUserId: targetUserId,
            fromUserId: normalizeUserId(messageUserId)
          })
          
          // Also emit notification count update
          const count = await Notification.countDocuments({
            user: mentionedUserId,
            read: false
          })
          io.to(roomName).emit('notification_count_updated', { count })
          console.log(`✅ Mention notification sent to user:${targetUserId}, count: ${count}`)
        } else {
          console.error('❌ Socket.IO instance not available for mention notification emission')
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to create mention notification:', error)
  }
}

// Helper function to create notifications for regular channel messages
export const createChannelMessageNotification = async (message, channel, workspace, io = null, providedSenderId = null) => {
  try {
    if (!message || !channel || !workspace) {
      console.error('❌ Missing required parameters for channel message notification', {
        hasMessage: !!message,
        hasChannel: !!channel,
        hasWorkspace: !!workspace
      })
      return
    }
    
    // CRITICAL: Use provided sender ID if available (more reliable), otherwise normalize from message.user
    // This ensures we have the correct sender ID even if message.user is not properly set
    let normalizedSenderId
    if (providedSenderId) {
      normalizedSenderId = String(providedSenderId).trim()
      console.log(`🔍 Using provided sender ID: ${normalizedSenderId}`)
    } else {
      // Fallback: normalize message author ID
      const senderId = normalizeUserId(message.user)
      if (!senderId) {
        console.error('❌ Could not normalize message author ID for channel notification', {
          messageUser: message.user,
          messageUserType: typeof message.user,
          messageUserHasId: !!message.user?._id,
          messageId: message._id
        })
        return
      }
      normalizedSenderId = String(senderId).trim()
      console.log(`🔍 Normalized sender ID from message.user: ${normalizedSenderId}`)
    }
    
    console.log(`🔍 Channel notification - Message author (sender) ID: ${normalizedSenderId} (will be EXCLUDED from recipients)`)
    
    // Ensure workspace and channel have _id
    // Note: workspace and channel are already verified to be truthy above, so we only check for _id
    if (!workspace._id) {
      console.error('❌ Workspace missing _id for channel notification', { workspace })
      return
    }
    
    if (!channel._id) {
      console.error('❌ Channel missing _id for channel notification', { channel })
      return
    }
    
    const workspaceId = normalizeUserId(workspace?._id || workspace)
    const channelId = normalizeUserId(channel?._id || channel)
    
    if (!workspaceId || !channelId) {
      console.error('❌ Missing workspace or channel ID for channel notification', {
        workspaceId,
        channelId,
        workspace: workspace?._id || workspace,
        channel: channel?._id || channel
      })
      return
    }
    
    // Get all users who should receive notifications
    // For private channels: only channel members
    // For public channels: all workspace members
    const recipients = new Set()
    
    // Always include workspace admin (if not the message author)
    // Handle both populated and unpopulated admin
    const adminId = normalizeUserId(workspace.admin?._id || workspace.admin)
    const normalizedAdminId = adminId ? String(adminId).trim() : null
    // CRITICAL: Compare normalized IDs as strings to ensure sender is excluded
    if (normalizedAdminId && normalizedAdminId !== normalizedSenderId) {
      recipients.add(normalizedAdminId)
      console.log(`📋 Added workspace admin to recipients: ${normalizedAdminId}`)
    } else if (normalizedAdminId) {
      console.log(`⏭️ Skipping workspace admin (sender): ${normalizedAdminId}`)
    }
    
    // Add workspace members (for public channels) or channel members (for private channels)
    if (channel.privacy === 'private') {
      // Private channel: only notify channel members
      if (channel.members && Array.isArray(channel.members)) {
        channel.members.forEach(member => {
          // Handle both populated and unpopulated members
          const memberId = normalizeUserId(member?._id || member)
          const normalizedMemberId = memberId ? String(memberId).trim() : null
          // CRITICAL: Compare normalized IDs as strings to ensure sender is excluded
          if (normalizedMemberId && normalizedMemberId !== normalizedSenderId) {
            recipients.add(normalizedMemberId)
            console.log(`📋 Added private channel member to recipients: ${normalizedMemberId}`)
          } else if (normalizedMemberId) {
            console.log(`⏭️ Skipping private channel member (sender): ${normalizedMemberId}`)
          }
        })
      } else {
        console.warn('⚠️ Private channel has no members array:', channelId)
      }
    } else {
      // Public channel: notify all workspace members
      if (workspace.members && Array.isArray(workspace.members)) {
        workspace.members.forEach(member => {
          // Handle workspace.members structure: {user: ObjectId, role: string}
          // member.user might be populated (object) or unpopulated (ObjectId)
          const memberId = normalizeUserId(member.user?._id || member.user || member)
          const normalizedMemberId = memberId ? String(memberId).trim() : null
          // CRITICAL: Compare normalized IDs as strings to ensure sender is excluded
          if (normalizedMemberId && normalizedMemberId !== normalizedSenderId) {
            recipients.add(normalizedMemberId)
            console.log(`📋 Added workspace member to recipients: ${normalizedMemberId}`)
          } else if (normalizedMemberId) {
            console.log(`⏭️ Skipping workspace member (sender): ${normalizedMemberId}`)
          }
        })
      } else {
        console.warn('⚠️ Workspace has no members array:', workspaceId)
      }
    }
    
    console.log(`📊 Total recipients for channel message notification: ${recipients.size}`)
    console.log(`📋 Recipients list:`, Array.from(recipients))
    console.log(`🔍 Sender ID: ${normalizedSenderId} (should NOT be in recipients)`)
    
    // Final safety check: Remove sender from recipients if somehow added
    // Check all possible formats of senderId in the recipients Set
    let senderFound = false
    const recipientsToRemove = []
    for (const rec of recipients) {
      const recStr = String(rec).trim()
      // Use strict comparison with normalized sender ID
      if (recStr === normalizedSenderId) {
        console.error(`❌ ERROR: Sender ${normalizedSenderId} found in recipients! Removing...`)
        recipientsToRemove.push(rec)
        senderFound = true
      }
    }
    
    // Remove all found sender instances
    recipientsToRemove.forEach(rec => recipients.delete(rec))
    
    if (senderFound) {
      console.log(`📊 Recipients after removing sender: ${recipients.size}`, Array.from(recipients))
    }
    
    // Additional validation: Log if sender is still in recipients (should never happen)
    for (const rec of recipients) {
      const recStr = String(rec).trim()
      if (recStr === normalizedSenderId) {
        console.error(`❌ CRITICAL: Sender ${normalizedSenderId} STILL in recipients after removal! This is a bug.`)
      }
    }
    
    // Create notifications for each recipient (process in parallel for better performance)
    const notificationPromises = []
    
    for (const recipientId of recipients) {
      // CRITICAL: Final check - recipientId should already be a normalized string from the Set
      const recipientStr = String(recipientId).trim()
      
      // Triple-check sender is not in recipients (should never happen, but safety first)
      if (recipientStr === normalizedSenderId) {
        console.error(`❌ ERROR: Sender ${normalizedSenderId} found in recipients during iteration! Skipping...`)
        continue
      }
      
      // Create notification promise (will execute in parallel)
      notificationPromises.push(
        (async () => {
          try {
            // Check if user is mentioned (mentions get priority notifications - skip channel message notification)
            // CRITICAL: Compare with recipientStr (normalized string) for consistent comparison
            const isMentioned = message.mentions && message.mentions.some(m => {
              const mentionId = normalizeUserId(m)
              const normalizedMentionId = mentionId ? String(mentionId).trim() : null
              return normalizedMentionId === recipientStr
            })
            
            // Skip if user is mentioned (they'll get a mention notification instead)
            if (isMentioned) {
              console.log(`⏭️ Skipping channel notification for ${recipientStr} - user is mentioned`)
              return
            }
            
            // Check if notification already exists (avoid duplicates)
            // Use 'mention' type for channel messages (Notification model enum limitation)
            // But check for both mention type AND ensure it's not an actual mention notification
            // CRITICAL: Use recipientStr (normalized string) for the query to ensure consistency
            const existing = await Notification.findOne({
              user: recipientStr,
              type: 'mention',
              channel: channelId,
              message: message._id,
              read: false
            })
            
            // Skip if notification already exists
            if (existing) {
              console.log(`⏭️ Skipping duplicate notification for ${recipientStr}`)
              return
            }
        
            // Create notification
            // Note: Using 'mention' type due to Notification model enum limitation
            // This is a channel message notification, not an actual mention
            console.log(`📝 Creating notification for recipient: ${recipientStr}, from sender: ${normalizedSenderId}`)
            const notification = new Notification({
              user: recipientStr, // Use normalized string ID
              type: 'mention', // Using 'mention' type for channel messages (enum limitation)
              workspace: workspaceId,
              channel: channelId,
              message: message._id,
              fromUser: normalizedSenderId // Use normalized string ID
            })
                
            await notification.save()
            await notification.populate('fromUser', 'name email avatar')
            await notification.populate('channel', 'name')
            await notification.populate('workspace', 'name')
            
            // Broadcast via Socket.IO
            if (io) {
              const notificationObj = notification.toObject ? notification.toObject() : notification
              
              // CRITICAL: Ensure notification.user is a string ID (not populated object) for frontend matching
              notificationObj.user = recipientStr // Use the normalized recipient ID
              if (notificationObj.fromUser && notificationObj.fromUser._id) {
                notificationObj.fromUser = {
                  _id: normalizedSenderId, // Use normalized sender ID
                  name: notificationObj.fromUser.name,
                  email: notificationObj.fromUser.email,
                  avatar: notificationObj.fromUser.avatar
                }
              } else {
                notificationObj.fromUser = normalizedSenderId // Use normalized sender ID
              }
              
              const roomName = `user:${recipientStr}`
              io.to(roomName).emit('notification', notificationObj)
              console.log(`📤 Emitting channel message notification to room: ${roomName}`, {
                notificationId: notificationObj._id?.toString() || notificationObj._id,
                type: notificationObj.type,
                targetUserId: recipientStr,
                fromUserId: normalizedSenderId,
                channelId: channelId
              })
              
              // Also emit notification count update
              // CRITICAL: Use recipientStr (normalized string) for the count query to ensure consistency
              const count = await Notification.countDocuments({
                user: recipientStr,
                read: false
              })
              io.to(roomName).emit('notification_count_updated', { count })
              console.log(`✅ Channel message notification sent to user:${recipientStr}, count: ${count}`)
            }
          } catch (recipientError) {
            // Log error for this recipient but continue with others
            console.error(`❌ Error creating notification for recipient ${recipientStr}:`, recipientError)
          }
        })()
      )
    }
    
    // Execute all notification creations in parallel (much faster than sequential)
    // Use Promise.allSettled to ensure all notifications are attempted even if some fail
    await Promise.allSettled(notificationPromises)
    console.log(`✅ Completed notification creation for ${recipients.size} recipients`)
  } catch (error) {
    console.error('❌ Failed to create channel message notification:', error)
  }
}

export default router

