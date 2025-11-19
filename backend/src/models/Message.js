import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  files: [{
    name: String,
    driveFileId: String,
    driveUrl: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  threadParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  reactions: [{
    emoji: String,
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Indexes for search
messageSchema.index({ channel: 1, createdAt: -1 })
messageSchema.index({ text: 'text' }) // Text search index
messageSchema.index({ user: 1, createdAt: -1 })
messageSchema.index({ threadParent: 1 })

// Update timestamp
messageSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  if (this.isModified('text') && !this.isNew) {
    this.edited = true
    this.editedAt = Date.now()
  }
  next()
})

export default mongoose.model('Message', messageSchema)

