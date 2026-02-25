const mongoose = require('mongoose');

const reservesSnapshotSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    unique: true,
  },
  reserves: {
    BBT: {
      quantity: {
        type: mongoose.Types.Decimal128,
        default: 0,
        get: (v) => v ? parseFloat(v.toString()) : 0,
      },
      priceUSD: {
        type: mongoose.Types.Decimal128,
        get: (v) => v ? parseFloat(v.toString()) : 0,
      },
      valueUSD: {
        type: mongoose.Types.Decimal128,
        get: (v) => v ? parseFloat(v.toString()) : 0,
      },
    },
    GBT: {
      quantity: {
        type: mongoose.Types.Decimal128,
        default: 0,
        get: (v) => v ? parseFloat(v.toString()) : 0,
      },
      priceUSD: {
        type: mongoose.Types.Decimal128,
        get: (v) => v ? parseFloat(v.toString()) : 0,
      },
      valueUSD: {
        type: mongoose.Types.Decimal128,
        get: (v) => v ? parseFloat(v.toString()) : 0,
      },
    },
    cash: {
      valueUSD: {
        type: mongoose.Types.Decimal128,
        default: 0,
        get: (v) => v ? parseFloat(v.toString()) : 0,
      },
    },
  },
  supply: {
    UC: {
      total: {
        type: mongoose.Types.Decimal128,
        default: 0,
        get: (v) => v ? parseFloat(v.toString()) : 0,
      },
      circulating: {
        type: mongoose.Types.Decimal128,
        default: 0,
        get: (v) => v ? parseFloat(v.toString()) : 0,
      },
    },
  },
  ratios: {
    collateralPct: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    reserveRatio: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
  },
  health: {
    status: {
      type: String,
      enum: ['HEALTHY', 'WARNING', 'CRITICAL'],
      default: 'HEALTHY',
    },
    warnings: [String],
    lastAuditAt: Date,
  },
  calculatedBy: {
    type: String,
    default: 'system',
  },
}, {
  timestamps: { createdAt: false, updatedAt: false },
  toJSON: { getters: true },
});

reservesSnapshotSchema.index({ timestamp: -1 });

reservesSnapshotSchema.statics.getLatest = async function() {
  return this.findOne().sort({ timestamp: -1 });
};

reservesSnapshotSchema.statics.getHistory = async function(fromDate, toDate) {
  return this.find({
    timestamp: { $gte: fromDate, $lte: toDate }
  }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('ReservesSnapshot', reservesSnapshotSchema);