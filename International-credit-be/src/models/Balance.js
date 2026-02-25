const mongoose = require('mongoose');
const config = require('../config');

const balanceSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    unique: true,
  },
  asset: {
    type: String,
    required: true,
    enum: Object.values(config.assets),
  },
  available: {
    type: mongoose.Types.Decimal128,
    default: 0,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  pending: {
    type: mongoose.Types.Decimal128,
    default: 0,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  total: {
    type: mongoose.Types.Decimal128,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  lastEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerEntry',
  },
  version: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: { createdAt: false, updatedAt: true },
  toJSON: { getters: true },
});

// accountId already has unique: true in schema
balanceSchema.index({ asset: 1 });
balanceSchema.index({ updatedAt: -1 });

balanceSchema.pre('save', function(next) {
  this.total = (this.available || 0) + (this.pending || 0);
  this.version += 1;
  next();
});

balanceSchema.methods.hasAvailableBalance = function(amount) {
  return this.available >= amount;
};

balanceSchema.methods.hasTotalBalance = function(amount) {
  return this.total >= amount;
};

module.exports = mongoose.model('Balance', balanceSchema);