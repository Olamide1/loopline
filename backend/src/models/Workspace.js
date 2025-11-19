import mongoose from 'mongoose'

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  driveFolderId: {
    type: String
  },
  driveLinked: {
    type: Boolean,
    default: false
  },
  driveToken: {
    type: String,
    select: false // Don't return in queries by default
  },
  driveRefreshToken: {
    type: String,
    select: false
  },
  settings: {
    retentionDays: {
      type: Number,
      default: null // null = no retention
    },
    allowPublicChannels: {
      type: Boolean,
      default: true
    }
  },
  stripeCustomerId: {
    type: String
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'inactive'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Indexes
workspaceSchema.index({ admin: 1 })
workspaceSchema.index({ 'members.user': 1 })

// Update timestamp
workspaceSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.model('Workspace', workspaceSchema)

