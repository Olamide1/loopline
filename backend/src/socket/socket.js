import Message from '../models/Message.js'
import Channel from '../models/Channel.js'
import User from '../models/User.js'
import jwt from 'jsonwebtoken'

// Track online users per workspace
const onlineUsers = new Map() // workspaceId -> Set of userIds

export const setupSocketIO = (io) => {
  // Add connection error handler to log detailed errors
  io.engine.on('connection_error', (err) => {
    console.error('❌ Socket.IO engine connection error:', {
      message: err.message,
      description: err.description,
      context: err.context,
      type: err.type,
      req: err.req ? {
        url: err.req.url,
        method: err.req.method,
        headers: {
          authorization: err.req.headers.authorization ? 'present' : 'missing',
          origin: err.req.headers.origin,
          referer: err.req.headers.referer
        }
      } : null
    })
  })
  
  // Add error handler for socket connection attempts
  io.on('connection_error', (err) => {
    console.error('❌ Socket.IO connection error (socket level):', {
      message: err.message,
      description: err.description,
      type: err.type,
      context: err.context,
      req: err.req ? {
        url: err.req.url,
        auth: err.req.auth
      } : null
    })
    // Ensure error message is properly formatted
    if (err.message && !err.message.includes('Authentication error')) {
      err.message = `Server error: ${err.message}`
    }
  })
  
  io.use(async (socket, next) => {
    const connectionId = socket.id || 'pending'
    console.log(`🔐 Socket.IO authentication attempt - connection ID: ${connectionId}`)
    
    try {
      // Check MongoDB connection first
      const mongoose = (await import('mongoose')).default
      if (mongoose.connection.readyState !== 1) {
        const errorMsg = `MongoDB not connected, readyState: ${mongoose.connection.readyState}`
        console.error(`❌ Socket.IO auth (${connectionId}): ${errorMsg}`)
        return next(new Error('Authentication error: Database not available'))
      }
      
      // Authentication middleware for Socket.IO
      // Verify JWT token from handshake.auth.token
      // Socket.IO v4+ passes auth in handshake.auth, but also check query for compatibility
      let token = socket.handshake.auth?.token
      
      // Fallback: check query params (for older Socket.IO versions or manual connections)
      if (!token) {
        token = socket.handshake.query?.token
      }
      
      // Fallback: check headers
      if (!token) {
        const authHeader = socket.handshake.headers?.authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.replace('Bearer ', '')
        }
      }
      
      if (!token) {
        console.error(`❌ Socket.IO auth (${connectionId}): No token provided`, {
          auth: socket.handshake.auth,
          query: socket.handshake.query,
          queryKeys: Object.keys(socket.handshake.query || {}),
          headers: {
            origin: socket.handshake.headers.origin,
            referer: socket.handshake.headers.referer,
            authorization: socket.handshake.headers.authorization ? 'present' : 'missing'
          }
        })
        return next(new Error('Authentication error: No token provided'))
      }
      
      console.log(`🔑 Socket.IO auth (${connectionId}): Token found, length: ${token.length}`)
      
      // Verify JWT_SECRET is set
      if (!process.env.JWT_SECRET) {
        console.error(`❌ Socket.IO auth (${connectionId}): JWT_SECRET not configured`)
        return next(new Error('Authentication error: Server configuration error'))
      }
      
      // Verify JWT token
      let decoded
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
        console.log(`✅ Socket.IO auth (${connectionId}): Token verified, userId: ${decoded.userId}`)
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          console.error(`❌ Socket.IO auth (${connectionId}): Invalid token format - ${error.message}`)
          return next(new Error('Authentication error: Invalid token'))
        }
        if (error.name === 'TokenExpiredError') {
          console.error(`❌ Socket.IO auth (${connectionId}): Token expired at ${error.expiredAt}`)
          return next(new Error('Authentication error: Token expired'))
        }
        console.error(`❌ Socket.IO auth (${connectionId}): Token verification failed:`, error.message)
        return next(new Error('Authentication error: Token verification failed'))
      }
      
      // Get userId from decoded token (not from client - security!)
      const userId = decoded.userId
      
      if (!userId) {
        console.error(`❌ Socket.IO auth (${connectionId}): No userId in token payload`, { decoded })
        return next(new Error('Authentication error: Invalid token payload'))
      }
      
      // Verify user exists in database
      try {
        const user = await User.findById(userId).select('-password').maxTimeMS(5000)
        if (!user) {
          console.error(`❌ Socket.IO auth (${connectionId}): User not found: ${userId}`)
          return next(new Error('Authentication error: User not found'))
        }
        
        // Attach verified user ID to socket (normalize to string for consistency)
        socket.userId = userId.toString()
        socket.user = user
        
        console.log(`✅ Socket.IO authentication successful (${connectionId}) for user: ${userId}`)
        next()
      } catch (dbError) {
        console.error(`❌ Socket.IO auth (${connectionId}): Database error:`, {
          message: dbError.message,
          name: dbError.name,
          code: dbError.code,
          userId: userId
        })
        
        // Check if it's a timeout or connection error
        if (dbError.name === 'MongoServerSelectionError' || dbError.message?.includes('timeout')) {
          return next(new Error('Authentication error: Database connection timeout'))
        }
        
        return next(new Error('Authentication error: Database error'))
      }
      } catch (error) {
        console.error(`❌ Socket.IO authentication error (${connectionId}) - unexpected:`, {
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
        })
        // Provide more descriptive error message
        const errorMsg = error.message || 'Unknown error'
        return next(new Error(`Authentication error: ${errorMsg}`))
      }
  })
  
  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.userId}`)
    
    // Update user status to online
    try {
      await User.findByIdAndUpdate(socket.userId, {
        status: 'online',
        lastSeen: new Date()
      }).maxTimeMS(5000)
    } catch (error) {
      console.error('❌ Failed to update user status:', error.message)
      // Don't disconnect on status update failure
    }
    
    // Join user's personal room for DMs and notifications (ensure string format)
    const userIdStr = socket.userId.toString()
    socket.join(`user:${userIdStr}`)
    console.log(`✅ User ${userIdStr} joined personal room: user:${userIdStr}`)
    
    // Join workspace rooms
    socket.on('join_workspace', async (workspaceId) => {
      socket.join(`workspace:${workspaceId}`)
      console.log(`User ${socket.userId} joined workspace ${workspaceId}`)
      
      // Track user as online in this workspace
      if (!onlineUsers.has(workspaceId)) {
        onlineUsers.set(workspaceId, new Set())
      }
      onlineUsers.get(workspaceId).add(socket.userId.toString())
      
      // Broadcast user online status to workspace
      try {
        const user = await User.findById(socket.userId).select('name email avatar status')
        if (user) {
          io.to(`workspace:${workspaceId}`).emit('user_online', {
            userId: socket.userId,
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              status: 'online'
            },
            workspaceId
          })
        }
      } catch (error) {
        console.error('Failed to broadcast user online:', error)
      }
    })
    
    // Join channel room
    socket.on('join_channel', async (channelId) => {
      try {
        // Normalize channel ID to string for consistent room names
        const normalizedChannelId = channelId ? String(channelId).trim() : null
        if (!normalizedChannelId) {
          console.error(`❌ join_channel: Invalid channel ID: ${channelId}`)
          socket.emit('error', { message: 'Invalid channel ID' })
          return
        }
        
        // Verify channel access
        const channel = await Channel.findById(normalizedChannelId).maxTimeMS(5000)
        if (!channel) {
          console.error(`❌ join_channel: Channel not found: ${normalizedChannelId}`)
          socket.emit('error', { message: 'Channel not found' })
          return
        }
        
        // Check access (simplified - should verify user membership)
        const roomName = `channel:${normalizedChannelId}`
        socket.join(roomName)
        console.log(`✅ User ${socket.userId} joined channel room: ${roomName}`)
        
        socket.emit('joined_channel', { channelId: normalizedChannelId })
      } catch (error) {
        console.error(`❌ join_channel error for channel ${channelId}:`, error.message)
        socket.emit('error', { message: 'Failed to join channel', error: error.message })
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
        await message.populate('user', 'name email avatar status')
        await message.populate('mentions', 'name email avatar status')
        await message.populate('reactions.users', 'name email avatar status')
        await message.populate('readBy.user', 'name email avatar status')
        
        // Get message as plain object for Socket.IO
        const messageObj = message.toObject ? message.toObject() : message
        
        // Broadcast to channel
        if (threadParent) {
          // Thread reply - emit to thread listeners
          io.to(`thread:${threadParent}`).emit('thread_reply_created', messageObj)
          // Also emit to channel for thread count updates
          io.to(`channel:${channel}`).emit('thread_reply_created', messageObj)
        } else {
          // Regular message - broadcast to channel
          io.to(`channel:${channel}`).emit('message_created', messageObj)
        }
        
        // Also broadcast to workspace for activity updates
        const workspaceId = channelDoc.workspace?.toString() || channelDoc.workspace
        if (workspaceId) {
          io.to(`workspace:${workspaceId}`).emit('workspace_activity', {
            type: 'message',
            channel: channel,
            message: messageObj
          })
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
        await message.populate('user', 'name email avatar status')
        await message.populate('readBy.user', 'name email avatar status')
        
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
    
    // User status update (away/online)
    socket.on('update_status', async (data) => {
      const { status, workspaceId } = data
      
      if (!['online', 'offline', 'away'].includes(status)) {
        return
      }
      
      try {
        await User.findByIdAndUpdate(socket.userId, {
          status,
          lastSeen: new Date()
        })
        
        // Broadcast status update to workspace
        if (workspaceId) {
          const user = await User.findById(socket.userId).select('name email avatar status')
          if (user) {
            io.to(`workspace:${workspaceId}`).emit('user_status_changed', {
              userId: socket.userId,
              user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                status
              },
              workspaceId
            })
          }
        }
      } catch (error) {
        console.error('Failed to update user status:', error)
      }
    })
    
    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`)
      
      // Update user status to offline
      try {
        await User.findByIdAndUpdate(socket.userId, {
          status: 'offline',
          lastSeen: new Date()
        })
        
        // Broadcast offline status to all workspaces user was in
        onlineUsers.forEach((userSet, workspaceId) => {
          if (userSet.has(socket.userId.toString())) {
            userSet.delete(socket.userId.toString())
            
            io.to(`workspace:${workspaceId}`).emit('user_offline', {
              userId: socket.userId,
              workspaceId
            })
            
            // Clean up empty sets
            if (userSet.size === 0) {
              onlineUsers.delete(workspaceId)
            }
          }
        })
      } catch (error) {
        console.error('Failed to update user offline status:', error)
      }
    })
  })
}

