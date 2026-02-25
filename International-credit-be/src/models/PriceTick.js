const mongoose = require('mongoose');

const priceTickSchema = new mongoose.Schema({
  asset: {
    type: String,
    required: true,
    enum: ['BTC', 'XAU', 'UC', 'USDC', 'USDT'],
  },
  price: {
    type: mongoose.Types.Decimal128,
    required: true,
    get: (v) => v ? parseFloat(v.toString()) : 0,
  },
  source: {
    type: String,
    required: true,
    enum: ['coinbase', 'binance', 'goldapi', 'manual', 'calculated'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 86400 * 30, // 30 days TTL
  },
  metadata: {
    volume: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    high24h: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    low24h: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    change24h: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
    rawData: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: { createdAt: false, updatedAt: false },
  toJSON: { getters: true },
});

priceTickSchema.index({ asset: 1, timestamp: -1 });
priceTickSchema.index({ asset: 1, source: 1, timestamp: -1 });
priceTickSchema.index({ timestamp: -1 });

priceTickSchema.statics.getLatestPrice = async function(asset, sources = []) {
  const query = { asset };
  if (sources.length > 0) {
    query.source = { $in: sources };
  }
  
  return this.findOne(query).sort({ timestamp: -1 });
};

priceTickSchema.statics.getPriceHistory = async function(asset, fromDate, toDate, source = null) {
  const query = {
    asset,
    timestamp: { $gte: fromDate, $lte: toDate }
  };
  
  if (source) {
    query.source = source;
  }
  
  return this.find(query).sort({ timestamp: -1 });
};

module.exports = mongoose.model('PriceTick', priceTickSchema);