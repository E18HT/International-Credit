const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  proposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true,
  },
  voterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  choice: {
    type: String,
    enum: ['FOR', 'AGAINST', 'ABSTAIN'],
    required: true,
  },
  weight: {
    type: Number,
    default: 1,
    min: 0,
  },
  reason: {
    type: String,
    maxlength: 500,
  },
  signature: {
    message: String,
    signature: String,
    address: String,
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    delegatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

voteSchema.index({ proposalId: 1, voterId: 1 }, { unique: true });
voteSchema.index({ proposalId: 1 });
voteSchema.index({ voterId: 1 });
voteSchema.index({ choice: 1 });
voteSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Vote', voteSchema);