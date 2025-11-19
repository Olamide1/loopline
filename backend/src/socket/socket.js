import Message from '../models/Message.js'
import Channel from '../models/Channel.js'

export const setupSocketIO = (io) => {
  io.use(async (socket, next) => {
    // Authentication middleware for Socket.IO
    // In production, verify JWT token from handshake.auth.token
    const token = socket.handshake.auth.token
    
    if (!token) {
      return next(new Error('Authentication error'))
    }
    
    // Verify token and attach user to socket
    // This is simplified - implement proper JWT verification
    socket.userId = socket.handshake.auth.userId
    next()
  })
  
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`)
    
    // Join workspace rooms
    socket.on('join_workspace', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`)
      console.log(`User ${socket.userId} joined workspace ${workspaceId}`)
    })
    
    // Join channel room
    socket.on('join_channel', async (channelId) => {
      try {
        // Verify channel access
        const channel = await Channel.findById(channelId)
        if (!channel) {
          socket.emit('error', { message: 'Channel not found' })
          return
        }
        
        // Check access (simplified - should verify user membership)
        socket.join(`channel:${channelId}`)
        console.log(`User ${socket.userId} joined channel ${channelId}`)
        
        socket.emit('joined_channel', { channelId })
      } catch (error) {
        socket.emit('error', { message: 'Failed to join channel' })
      }
    })
    
    // Join thread
    socket.on('join_thread', (messageId) => {
      socket.join(`thread:${messageId}`)
      console.log(`User ${socket.userId} joined thread ${messageId}`)
    })
    
    // Leave thread
    socket.on('leave_thread', (messageId) => {
      socket.leave(`thread:${messageId}`)
      console.log(`User ${socket.userId} left thread ${messageId}`)
    })
    
    // Leave channel
    socket.on('leave_channel', (channelId) => {
      socket.leave(`channel:${channelId}`)
      console.log(`User ${socket.userId} left channel ${channelId}`)
    })
    
    // New message
    socket.on('new_message', async (data) => {
      try {
        const { channel, text, files, threadParent } = data
        
        // Verify channel access and create message
        const channelDoc = await Channel.findById(channel)
        if (!channelDoc) {
          socket.emit('error', { message: 'Channel not found' })
          return
        }
        
        const message = new Message({
          channel,
          user: socket.userId,
          text,
          files: files || [],
          threadParent: threadParent || null
        })
        
        await message.save()
        await message.populate('user', 'name email avatar')
        await message.populate('mentions', 'name email avatar')
        await message.populate('reactions.users', 'name email avatar')
        
        // Broadcast to channel
        if (threadParent) {
          // Thread reply - emit to thread listeners
          io.to(`thread:${threadParent}`).emit('thread_reply_created', message)
        } else {
          // Regular message
          io.to(`channel:${channel}`).emit('message_created', message)
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to create message', error: error.message })
      }
    })
    
    // Message update
    socket.on('update_message', async (data) => {
      try {
        const { messageId, text } = data
        const message = await Message.findById(messageId)
        
        if (!message || message.user.toString() !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }
        
        message.text = text
        await message.save()
        await message.populate('user', 'name email avatar')
        
        io.to(`channel:${message.channel}`).emit('message_updated', message)
      } catch (error) {
        socket.emit('error', { message: 'Failed to update message' })
      }
    })
    
    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(`channel:${data.channel}`).emit('user_typing', {
        userId: socket.userId,
        channel: data.channel
      })
    })
    
    // Stop typing
    socket.on('stop_typing', (data) => {
      socket.to(`channel:${data.channel}`).emit('user_stopped_typing', {
        userId: socket.userId,
        channel: data.channel
      })
    })
    
    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`)
    })
  })
}

