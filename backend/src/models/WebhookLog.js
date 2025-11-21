import mongoose from 'mongoose'

const webhookLogSchema = new mongoose.Schema({
  integration: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Integration',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true,
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  response: {
    type: mongoose.Schema.Types.Mixed
  },
  error: {
    type: String
  },
  processedMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  headers: {
    type: Map,
    of: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
})

// Indexes for efficient queries
webhookLogSchema.index({ integration: 1, createdAt: -1 })
webhookLogSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model('WebhookLog', webhookLogSchema)

