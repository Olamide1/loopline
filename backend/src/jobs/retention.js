import Message from '../models/Message.js'
import Channel from '../models/Channel.js'
import Workspace from '../models/Workspace.js'

/**
 * Retention job - deletes old messages based on workspace and channel retention policies
 * Runs every hour
 */
export const runRetentionJob = async () => {
  console.log('🔄 Running retention job...')
  
  try {
    // Get all workspaces with retention settings
    const workspaces = await Workspace.find({
      'settings.retentionDays': { $exists: true, $gt: 0 }
    })
    
    let totalDeleted = 0
    
    for (const workspace of workspaces) {
      const workspaceRetentionDays = workspace.settings?.retentionDays || 0
      
      if (workspaceRetentionDays <= 0) continue
      
      // Get all channels in workspace
      const channels = await Channel.find({ workspace: workspace._id })
      
      for (const channel of channels) {
        // Use channel retention if set, otherwise use workspace retention
        const retentionDays = channel.retentionDays || workspaceRetentionDays
        
        if (retentionDays <= 0) continue
        
        // Calculate cutoff date
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
        
        // Find messages older than cutoff date
        const oldMessages = await Message.find({
          channel: channel._id,
          createdAt: { $lt: cutoffDate },
          deleted: false
        })
        
        if (oldMessages.length > 0) {
          // Soft delete messages
          await Message.updateMany(
            { _id: { $in: oldMessages.map(m => m._id) } },
            { $set: { deleted: true, deletedAt: new Date() } }
          )
          
          totalDeleted += oldMessages.length
          console.log(`  ✅ Deleted ${oldMessages.length} messages from channel ${channel.name} (${retentionDays} days retention)`)
        }
      }
    }
    
    // Also handle channels with their own retention settings (even if workspace doesn't have one)
    const channelsWithRetention = await Channel.find({
      retentionDays: { $exists: true, $gt: 0 }
    }).populate('workspace')
    
    for (const channel of channelsWithRetention) {
      const retentionDays = channel.retentionDays
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
      const oldMessages = await Message.find({
        channel: channel._id,
        createdAt: { $lt: cutoffDate },
        deleted: false
      })
      
      if (oldMessages.length > 0) {
        await Message.updateMany(
          { _id: { $in: oldMessages.map(m => m._id) } },
          { $set: { deleted: true, deletedAt: new Date() } }
        )
        
        totalDeleted += oldMessages.length
        console.log(`  ✅ Deleted ${oldMessages.length} messages from channel ${channel.name} (${retentionDays} days retention)`)
      }
    }
    
    if (totalDeleted > 0) {
      console.log(`✅ Retention job completed: ${totalDeleted} messages deleted`)
    } else {
      console.log('✅ Retention job completed: No messages to delete')
    }
  } catch (error) {
    console.error('❌ Retention job error:', error)
  }
}

// Run retention job every hour
export const startRetentionScheduler = () => {
  console.log('⏰ Starting retention scheduler (runs every hour)')
  
  // Run immediately on startup
  runRetentionJob()
  
  // Then run every hour
  setInterval(() => {
    runRetentionJob()
  }, 60 * 60 * 1000) // 1 hour
}

