const mongoose = require('mongoose');
const config = require('../config');

const proposalSchema = new mongoose.Schema({
  proposerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(config.proposalTypes),
    required: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'PASSED', 'REJECTED', 'EXECUTED', 'EXPIRED'],
    default: 'DRAFT',
  },
  votingPeriod: {
    openAt: {
      type: Date,
      required: true,
    },
    closeAt: {
      type: Date,
      required: true,
    },
  },
  quorum: {
    required: {
      type: Number,
      default: 0.1, // 10% of eligible voters
    },
    achieved: {
      type: Number,
      default: 0,
    },
  },
  tallies: {
    for: { type: Number, default: 0 },
    against: { type: Number, default: 0 },
    abstain: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  executedAt: Date,
  executedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  executionResult: {
    success: Boolean,
    transactionHash: String,
    error: String,
    logs: [String],
  },
  metadata: {
    tags: [String],
    discussionUrl: String,
    attachments: [String],
  },
}, {
  timestamps: true,
});

proposalSchema.index({ status: 1 });
proposalSchema.index({ type: 1 });
proposalSchema.index({ proposerId: 1 });
proposalSchema.index({ 'votingPeriod.openAt': 1, 'votingPeriod.closeAt': 1 });
proposalSchema.index({ createdAt: -1 });

proposalSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'ACTIVE' && 
         this.votingPeriod.openAt <= now && 
         this.votingPeriod.closeAt > now;
});

proposalSchema.virtual('isExpired').get(function() {
  return this.status === 'ACTIVE' && this.votingPeriod.closeAt <= new Date();
});

proposalSchema.virtual('hasQuorum').get(function() {
  return this.quorum.achieved >= this.quorum.required;
});

proposalSchema.virtual('isPassing').get(function() {
  return this.tallies.for > this.tallies.against;
});

module.exports = mongoose.model('Proposal', proposalSchema);