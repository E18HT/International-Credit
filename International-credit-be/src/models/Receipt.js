const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
  },
  journalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['TRANSFER', 'SWAP', 'DEPOSIT', 'WITHDRAWAL'],
    required: true,
  },
  url: String,
  s3Key: String,
  format: {
    type: String,
    enum: ['PDF', 'JSON'],
    default: 'PDF',
  },
  data: {
    amount: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    asset: String,
    fromAddress: String,
    toAddress: String,
    exchangeRate: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    fees: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    timestamp: Date,
    confirmationNumber: String,
  },
  status: {
    type: String,
    enum: ['GENERATING', 'READY', 'EXPIRED', 'ERROR'],
    default: 'GENERATING',
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    },
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  lastDownloadedAt: Date,
  error: String,
}, {
  timestamps: true,
  toJSON: { getters: true },
});

// id already has unique: true in schema
receiptSchema.index({ journalId: 1 });
receiptSchema.index({ userId: 1 });
receiptSchema.index({ expiresAt: 1 });
receiptSchema.index({ status: 1 });

receiptSchema.statics.generateId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `RC-${timestamp}-${random}`.toUpperCase();
};

module.exports = mongoose.model('Receipt', receiptSchema);