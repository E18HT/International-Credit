const mongoose = require('mongoose');
const config = require('../config');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  network: {
    type: String,
    required: true,
    enum: ['hedera', 'ethereum', 'bitcoin'],
    default: 'hedera',
  },
  country: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 2,
    maxlength: 3,
  },
  whitelistState: {
    type: String,
    enum: Object.values(config.walletStatus),
    default: config.walletStatus.PENDING,
  },
  reason: String,
  metadata: {
    chainRef: String,
    contractAddress: String,
    isMultisig: { type: Boolean, default: false },
    threshold: Number,
    owners: [String],
  },
  verificationData: {
    signature: String,
    message: String,
    verifiedAt: Date,
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

walletSchema.index({ userId: 1 });
walletSchema.index({ address: 1, network: 1 }, { unique: true });
walletSchema.index({ whitelistState: 1 });
walletSchema.index({ country: 1 });

walletSchema.pre('save', function(next) {
  this.address = this.address.toLowerCase();
  next();
});

module.exports = mongoose.model('Wallet', walletSchema);