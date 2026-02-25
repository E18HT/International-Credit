const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true,
  },
  fiatAmount: {
    type: mongoose.Types.Decimal128,
    required: true,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  fiatCurrency: {
    type: String,
    default: 'USD',
    uppercase: true,
  },
  ucAmount: {
    type: mongoose.Types.Decimal128,
    required: true,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  exchangeRate: {
    type: mongoose.Types.Decimal128,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED'],
    default: 'PENDING',
  },
  linkedJournalId: {
    type: mongoose.Schema.Types.ObjectId,
    sparse: true,
    index: true,
  },
  events: [{
    type: String,
    status: String,
    timestamp: { type: Date, default: Date.now },
    data: mongoose.Schema.Types.Mixed,
  }],
  metadata: {
    clientSecret: String,
    paymentMethodId: String,
    customerId: String,
    description: String,
    receiptUrl: String,
    failureReason: String,
    refundReason: String,
  },
  fees: {
    stripeFee: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    platformFee: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
  },
  webhook: {
    lastProcessedAt: Date,
    attempts: { type: Number, default: 0 },
    errors: [String],
  },
}, {
  timestamps: true,
  toJSON: { getters: true },
});

paymentSchema.index({ userId: 1 });
// stripePaymentIntentId already has unique: true in schema
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
// linkedJournalId already has index: true, sparse: true in schema

module.exports = mongoose.model('Payment', paymentSchema);