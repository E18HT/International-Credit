const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'system_config',
  },
  feeStructure: {
    transferFeeBps: { type: Number, default: 50 }, // 0.5%
    swapFeeBps: { type: Number, default: 100 }, // 1%
    withdrawalFeeBps: { type: Number, default: 25 }, // 0.25%
    minTransferAmount: { type: Number, default: 1 },
    maxTransferAmount: { type: Number, default: 100000 },
  },
  faucetCaps: {
    dailyLimit: { type: Number, default: 1000 },
    weeklyLimit: { type: Number, default: 5000 },
    monthlyLimit: { type: Number, default: 20000 },
    perUserDaily: { type: Number, default: 100 },
  },
  reserveRatio: {
    target: { type: Number, default: 1.2 }, // 120%
    minimum: { type: Number, default: 1.1 }, // 110%
    critical: { type: Number, default: 1.05 }, // 105%
  },
  paused: {
    system: { type: Boolean, default: false },
    deposits: { type: Boolean, default: false },
    withdrawals: { type: Boolean, default: false },
    transfers: { type: Boolean, default: false },
    swaps: { type: Boolean, default: false },
    governance: { type: Boolean, default: false },
  },
  fxTable: {
    USDC: { type: Number, default: 1.0 },
    USDT: { type: Number, default: 1.0 },
    BTC: { type: Number, default: 50000 },
    XAU: { type: Number, default: 2000 }, // Gold per oz
  },
  limits: {
    maxProposalsPerUser: { type: Number, default: 5 },
    votingPeriodDays: { type: Number, default: 7 },
    executionDelayHours: { type: Number, default: 24 },
    quorumPercentage: { type: Number, default: 10 },
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  maintenance: {
    scheduled: { type: Boolean, default: false },
    message: { type: String, default: '' },
    startTime: Date,
    endTime: Date,
  },
  version: {
    type: Number,
    default: 1,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  collection: 'config',
});

configSchema.statics.getConfig = async function() {
  let config = await this.findById('system_config');
  if (!config) {
    config = new this({ _id: 'system_config' });
    await config.save();
  }
  return config;
};

configSchema.statics.updateConfig = async function(updates, updatedBy) {
  const config = await this.getConfig();
  Object.assign(config, updates);
  config.updatedBy = updatedBy;
  config.version += 1;
  return config.save();
};

module.exports = mongoose.model('Config', configSchema);