import mongoose from 'mongoose'

const integrationSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  type: {
    type: String,
    enum: ['stripe', 'webhook'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  config: {
    // Stripe-specific
    events: [{
      type: String // e.g., 'payment_intent.succeeded', 'charge.refunded'
    }],
    // Webhook-specific
    webhookUrl: String,
    secret: String,
    method: {
      type: String,
      enum: ['POST', 'GET'],
      default: 'POST'
    }
  },
  messageTemplate: {
    type: String,
    default: '{{event}} occurred: {{data}}'
  },
  active: {
    type: Boolean,
    default: true
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
integrationSchema.index({ workspace: 1 })
integrationSchema.index({ channel: 1 })

// Update timestamp
integrationSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.model('Integration', integrationSchema)

