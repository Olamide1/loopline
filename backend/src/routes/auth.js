import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  console.log('📝 Registration request received:', { email: req.body?.email, name: req.body?.name, hasPassword: !!req.body?.password })
  
  try {
    const { email, password, name } = req.body
    
    console.log('📋 Registration data:', { email, name, passwordLength: password?.length })
    
    if (!email || !password || !name) {
      console.error('❌ Missing required fields:', { hasEmail: !!email, hasPassword: !!password, hasName: !!name })
      return res.status(400).json({ message: 'Email, password, and name are required' })
    }
    
    if (password.length < 8) {
      console.error('❌ Password too short:', password.length)
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }
    
    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set in environment variables')
      return res.status(500).json({ message: 'Server configuration error. Please contact support.' })
    }
    
    console.log('🔍 Checking for existing user...')
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      console.error('❌ User already exists:', email)
      return res.status(400).json({ message: 'User already exists' })
    }
    
    console.log('✅ Creating new user...')
    const user = new User({ email, password, name })
    await user.save()
    console.log('✅ User created successfully:', user._id)
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    
    console.log('✅ Registration successful, sending response')
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      }
    })
  } catch (error) {
    console.error('❌ Registration error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    })
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' })
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message })
    }
    
    res.status(500).json({ message: 'Registration failed', error: error.message })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    if (!user.password) {
      return res.status(401).json({ message: 'Please use Google login' })
    }
    
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  // This will be implemented with Google OAuth flow
  res.json({ message: 'Google OAuth callback - to be implemented' })
})

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      avatar: req.user.avatar,
      role: req.user.role
    }
  })
})

export default router

