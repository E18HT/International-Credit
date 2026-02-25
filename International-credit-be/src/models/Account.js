const mongoose = require('mongoose');
const config = require('../config');

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  asset: {
    type: String,
    required: true,
    enum: Object.values(config.assets),
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'FROZEN', 'CLOSED'],
    default: 'ACTIVE',
  },
  accountType: {
    type: String,
    enum: ['USER', 'SYSTEM', 'RESERVE', 'FEE'],
    default: 'USER',
  },
  metadata: {
    description: String,
    externalId: String,
    tags: [String],
  },
}, {
  timestamps: true,
});

accountSchema.index({ userId: 1, asset: 1, accountType: 1 }, { unique: true });
accountSchema.index({ asset: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ accountType: 1 });

module.exports = mongoose.model('Account', accountSchema);