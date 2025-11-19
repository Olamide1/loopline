import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Message from '../models/Message.js'
import Channel from '../models/Channel.js'
import Workspace from '../models/Workspace.js'
import { isWorkspaceMember } from '../utils/workspaceAuth.js'

const router = express.Router()
router.use(authenticate)

// Search messages
router.get('/', async (req, res) => {
  try {
    const { q, channelId, userId, workspaceId, limit = 50 } = req.query
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' })
    }
    
    // Build query
    const query = {
      text: { $regex: q, $options: 'i' },
      deleted: false
    }
    
    // Filter by channel
    if (channelId) {
      // Verify channel access
      const channel = await Channel.findById(channelId)
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' })
      }
      
      if (channel.privacy === 'private' && 
          !channel.members.some(m => m.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Access denied' })
      }
      
      query.channel = channelId
    }
    
    // Filter by workspace (all channels in workspace)
    if (workspaceId) {
      // Verify workspace access
      const workspace = await Workspace.findById(workspaceId)
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' })
      }
      
      if (!isWorkspaceMember(workspace, req.user._id)) {
        return res.status(403).json({ message: 'Access denied' })
      }
      
      // Get all accessible channels in workspace
      const channels = await Channel.find({
        workspace: workspaceId,
        $or: [
          { privacy: 'public' },
          { members: req.user._id }
        ]
      }).select('_id')
      
      query.channel = { $in: channels.map(c => c._id) }
    }
    
    // Filter by user
    if (userId) {
      query.user = userId
    }
    
    // Execute search
    const messages = await Message.find(query)
      .populate('user', 'name email avatar')
      .populate('channel', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
    
    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: 'Failed to search messages', error: error.message })
  }
})

export default router

