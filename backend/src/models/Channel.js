import mongoose from 'mongoose'

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  privacy: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  description: {
    type: String,
    trim: true
  },
  archived: {
    type: Boolean,
    default: false
  },
  retentionDays: {
    type: Number,
    default: null // null = use workspace default
  },
  lastRead: {
    type: Map,
    of: Date,
    default: () => new Map() // userId -> last read timestamp (function to avoid shared reference)
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
channelSchema.index({ workspace: 1 })
channelSchema.index({ workspace: 1, privacy: 1 })
channelSchema.index({ 'members': 1 })

// Update timestamp
channelSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.model('Channel', channelSchema)

