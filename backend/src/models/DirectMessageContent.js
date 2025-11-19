import mongoose from 'mongoose'

const directMessageContentSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DirectMessage',
    required: true,
    index: true
  },
  sender: {
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
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
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

// Indexes for efficient queries
directMessageContentSchema.index({ conversation: 1, createdAt: -1 })
directMessageContentSchema.index({ sender: 1, createdAt: -1 })

// Update timestamp
directMessageContentSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  if (this.isModified('text') && !this.isNew) {
    this.edited = true
    this.editedAt = Date.now()
  }
  next()
})

export default mongoose.model('DirectMessageContent', directMessageContentSchema)

