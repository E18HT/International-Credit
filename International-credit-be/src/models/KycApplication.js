const mongoose = require('mongoose');
const config = require('../config');

const kycApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sumsubApplicantId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: Object.values(config.kycStatus),
    default: config.kycStatus.PENDING,
  },
  level: {
    type: String,
    default: 'basic',
  },
  country: String,
  notes: String,
  evidenceKeys: [String],
  rejectionReasons: [String],
  reviewResult: {
    reviewAnswer: String,
    rejectLabels: [String],
    reviewRejectType: String,
    moderationComment: String,
  },
  decidedAt: Date,
  decidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  externalUserId: String,
  webhook: {
    lastProcessedAt: Date,
    attempts: { type: Number, default: 0 },
    errors: [String],
    lastWebhookId: String, // For idempotency
  },
}, {
  timestamps: true,
});

kycApplicationSchema.index({ userId: 1 });
// sumsubApplicantId already has unique: true in schema
kycApplicationSchema.index({ status: 1 });
kycApplicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('KycApplication', kycApplicationSchema);