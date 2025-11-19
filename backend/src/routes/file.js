import express from 'express'
import { authenticate } from '../middleware/auth.js'
import multer from 'multer'
import { google } from 'googleapis'
import Channel from '../models/Channel.js'
import Workspace from '../models/Workspace.js'

const router = express.Router()
router.use(authenticate)

// Configure multer for file uploads (temporary storage before Drive upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
})

// Upload file to Google Drive
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { channelId } = req.body
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' })
    }
    
    // Verify channel access
    const channel = await Channel.findById(channelId)
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    
    const workspace = await Workspace.findById(channel.workspace)
    if (!workspace.driveLinked) {
      return res.status(400).json({ message: 'Google Drive not linked to workspace' })
    }
    
    // Initialize Google Drive API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    oauth2Client.setCredentials({
      refresh_token: workspace.driveRefreshToken
    })
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    
    // Upload to Drive
    const driveFile = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: workspace.driveFolderId ? [workspace.driveFolderId] : []
      },
      media: {
        mimeType: req.file.mimetype,
        body: req.file.buffer
      },
      fields: 'id, name, webViewLink, size, mimeType'
    })
    
    // Make file accessible
    await drive.permissions.create({
      fileId: driveFile.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    })
    
    res.json({
      fileId: driveFile.data.id,
      name: driveFile.data.name,
      url: driveFile.data.webViewLink,
      mimeType: driveFile.data.mimeType,
      size: driveFile.data.size
    })
  } catch (error) {
    console.error('Drive upload error:', error)
    res.status(500).json({ message: 'Failed to upload file', error: error.message })
  }
})

// Get files for channel
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params
    
    // Verify channel access
    const channel = await Channel.findById(channelId)
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    
    // Get all messages with files in this channel
    const Message = (await import('../models/Message.js')).default
    const messages = await Message.find({
      channel: channelId,
      'files.0': { $exists: true },
      deleted: false
    }).select('files createdAt user').populate('user', 'name')
    
    // Flatten files with message context
    const files = []
    messages.forEach(message => {
      message.files.forEach(file => {
        files.push({
          ...file.toObject(),
          messageId: message._id,
          messageDate: message.createdAt,
          uploadedBy: message.user.name
        })
      })
    })
    
    // Sort by date (newest first)
    files.sort((a, b) => b.messageDate - a.messageDate)
    
    res.json(files)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch files', error: error.message })
  }
})

export default router

