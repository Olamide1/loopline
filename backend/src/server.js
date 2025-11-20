import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { createServer } from 'http'
import { Server } from 'socket.io'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.js'
import workspaceRoutes from './routes/workspace.js'
import channelRoutes from './routes/channel.js'
import messageRoutes from './routes/message.js'
import fileRoutes from './routes/file.js'
import integrationRoutes from './routes/integration.js'
import adminRoutes from './routes/admin.js'
import searchRoutes from './routes/search.js'
import directMessageRoutes from './routes/directMessage.js'
import notificationRoutes from './routes/notification.js'

import { setupSocketIO } from './socket/socket.js'
import { startRetentionScheduler } from './jobs/retention.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Allow connection attempts to be logged even if they fail
  allowRequest: (req, callback) => {
    // Log connection attempts for debugging
    // Socket.IO passes auth in query params or headers
    const queryToken = req._query?.token || req._query?.auth?.token
    const headerToken = req.headers?.authorization?.replace('Bearer ', '')
    const token = queryToken || headerToken || 'missing'
    
    console.log('🔌 Socket.IO connection attempt:', {
      url: req.url,
      method: req.method,
      origin: req.headers.origin,
      hasToken: token !== 'missing',
      tokenLength: token !== 'missing' ? token.length : 0,
      queryParams: Object.keys(req._query || {}),
      hasAuthInQuery: !!req._query?.auth,
      hasAuthInHeaders: !!req.headers?.authorization
    })
    
    // Allow all connection attempts - authentication will happen in middleware
    callback(null, true)
  },
  // Add error handler at server level
  transports: ['polling', 'websocket']
})

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limiting - more permissive for real-time chat app
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for real-time features)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for Socket.IO health checks
  skip: (req) => {
    return req.path === '/health' || req.path.startsWith('/socket.io/')
  }
})
app.use('/api/', limiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/workspaces', workspaceRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/direct-messages', directMessageRoutes)
app.use('/api/notifications', notificationRoutes)

// Socket.IO setup
setupSocketIO(io)

// Make io available to routes for broadcasting
app.set('io', io)
global.io = io // Also make available globally for notification helper

// MongoDB connection with retry logic
const connectMongoDB = async (retries = 10, delay = 2000) => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/loopline'
  
  console.log('🔄 Connecting to MongoDB...')
  
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 5000,
      })
      console.log('✅ Connected to MongoDB')
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message)
      })
      
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected, attempting to reconnect...')
      })
      
      return true
    } catch (error) {
      const isLastAttempt = i === retries - 1
      
      if (isLastAttempt) {
        console.error('')
        console.error('❌ MongoDB connection failed after', retries, 'attempts')
        console.error('Error:', error.message)
        console.error('')
        console.error('💡 To start MongoDB, run one of these commands:')
        console.error('   brew services start mongodb-community')
        console.error('   OR: mongod --dbpath /opt/homebrew/var/mongodb --fork')
        console.error('   OR: mongod --dbpath /usr/local/var/mongodb --fork')
        console.error('')
        console.error('⚠️  Server started but database operations will fail until MongoDB is running')
        console.error('')
        return false
      }
      
      console.log(`⏳ Attempt ${i + 1}/${retries} failed, retrying in ${delay/1000}s...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  return false
}

// Connect to MongoDB (non-blocking, won't crash server)
connectMongoDB().then(connected => {
  if (connected) {
    // Start retention scheduler once MongoDB is connected
    startRetentionScheduler()
  }
}).catch(err => {
  console.error('MongoDB connection setup error:', err)
})

const PORT = process.env.PORT || 3000

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 Socket.IO server ready`)
})

