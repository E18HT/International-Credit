const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  },
  role: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_2FA',
      'KYC_APPROVE', 'KYC_REJECT', 'WALLET_WHITELIST', 'WALLET_BLACKLIST',
      'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'SWAP',
      'PROPOSAL_CREATE', 'VOTE_CAST', 'PROPOSAL_EXECUTE',
      'CONFIG_UPDATE', 'SYSTEM_PAUSE', 'SYSTEM_RESUME',
      'EXPORT_GENERATE', 'REPORT_VIEW',
      'GENERATE_2FA_SETUP', 'ENABLE_2FA', 'DISABLE_2FA', 'VERIFY_2FA'
    ],
  },
  object: {
    type: {
      type: String,
      required: true,
    },
    id: mongoose.Schema.Types.ObjectId,
    identifier: String,
  },
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
  metadata: {
    ipAddress: String,
    userAgent: String,
    correlationId: String,
    sessionId: String,
    requestId: String,
    amount: {
      type: mongoose.Types.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : undefined,
    },
    currency: String,
    reason: String,
    notes: String,
  },
  result: {
    success: { type: Boolean, default: true },
    error: String,
    statusCode: Number,
  },
}, {
  timestamps: { createdAt: false, updatedAt: false },
  toJSON: { getters: true },
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actor: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'object.type': 1, 'object.id': 1 });
auditLogSchema.index({ 'metadata.correlationId': 1 });

auditLogSchema.statics.logAction = async function(params) {
  const {
    actor,
    role,
    action,
    object,
    before,
    after,
    metadata = {},
    result = { success: true }
  } = params;

  return this.create({
    actor,
    role,
    action,
    object,
    before,
    after,
    metadata,
    result
  });
};

auditLogSchema.statics.getUserActivity = async function(userId, limit = 50) {
  return this.find({ actor: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('actor', 'email role');
};

auditLogSchema.statics.getObjectHistory = async function(objectType, objectId) {
  return this.find({
    'object.type': objectType,
    'object.id': objectId
  }).sort({ timestamp: -1 }).populate('actor', 'email role');
};

module.exports = mongoose.model('AuditLog', auditLogSchema);