const mongoose = require('mongoose');
const config = require('../config');

const ledgerEntrySchema = new mongoose.Schema({
  journalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true,
  },
  debit: {
    type: mongoose.Types.Decimal128,
    default: 0,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  credit: {
    type: mongoose.Types.Decimal128,
    default: 0,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  balance: {
    type: mongoose.Types.Decimal128,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  meta: {
    type: {
      type: String,
      enum: Object.values(config.transactionTypes),
      required: true,
    },
    reference: String,
    description: String,
    correlationId: String,
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    externalRef: {
      stripePaymentIntentId: String,
      chainTxHash: String,
      contractAddress: String,
      method: String,
      status: String,
    },
    counterparty: {
      userId: mongoose.Schema.Types.ObjectId,
      walletAddress: String,
      country: String,
    },
  },
  status: {
    type: String,
    enum: ['PENDING', 'POSTED', 'REVERSED'],
    default: 'POSTED',
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { getters: true },
});

ledgerEntrySchema.index({ journalId: 1 });
ledgerEntrySchema.index({ accountId: 1, createdAt: -1 });
ledgerEntrySchema.index({ createdAt: -1 });
ledgerEntrySchema.index({ 'meta.type': 1 });
// meta.idempotencyKey already has unique: true, sparse: true in schema
ledgerEntrySchema.index({ 'meta.reference': 1 });
ledgerEntrySchema.index({ 'meta.correlationId': 1 });
ledgerEntrySchema.index({ status: 1 });

ledgerEntrySchema.pre('save', function(next) {
  if (this.debit && this.credit) {
    return next(new Error('Entry cannot have both debit and credit amounts'));
  }
  
  if (!this.debit && !this.credit) {
    return next(new Error('Entry must have either debit or credit amount'));
  }
  
  next();
});

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);