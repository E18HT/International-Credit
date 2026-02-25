const mongoose = require('mongoose');

const activityHistorySchema = new mongoose.Schema({
  // Activity Identification
  activityType: {
    type: String,
    required: true,
    enum: [
      // User Activities
      'USER_REGISTER', 'USER_LOGIN', 'USER_LOGOUT', 'USER_EMAIL_VERIFY',
      'USER_PASSWORD_CHANGE', 'USER_PASSWORD_RESET', 'USER_PROFILE_UPDATE',
      'USER_STATUS_CHANGE', 'USER_DELETE',

      // Authentication & Security
      '2FA_ENABLE', '2FA_DISABLE', '2FA_QUICK_ENABLE', '2FA_RESET',
      '2FA_BACKUP_REGENERATE', '2FA_LOGIN', 'LOGIN_FAILED', 'ACCOUNT_LOCKED',

      // KYC Activities
      'KYC_APPLICATION_CREATE', 'KYC_APPLICATION_SUBMIT', 'KYC_APPROVED',
      'KYC_REJECTED', 'KYC_PENDING', 'KYC_WEBHOOK_RECEIVED',

      // Wallet Activities
      'WALLET_LINK', 'WALLET_UNLINK', 'WALLET_STATUS_CHANGE',
      'WALLET_WHITELIST', 'WALLET_BLACKLIST',

      // Payment Activities
      'PAYMENT_INTENT_CREATE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED',
      'PAYMENT_REFUND', 'PAYMENT_WEBHOOK_RECEIVED', 'QUOTE_GENERATED',

      // Ledger Activities
      'TRANSFER_SEND', 'TRANSFER_RECEIVE', 'BALANCE_UPDATE',
      'ACCOUNT_CREATE', 'TRANSACTION_REVERSE',

      // Trading Activities
      'SWAP_EXECUTE', 'SWAP_FAILED', 'FAUCET_CLAIM',

      // Admin Activities
      'ADMIN_USER_UPDATE', 'ADMIN_KYC_REVIEW', 'ADMIN_WALLET_UPDATE',
      'ADMIN_PAYMENT_REVIEW', 'ADMIN_CONFIG_UPDATE', 'ADMIN_SYSTEM_PAUSE',
      'ADMIN_BULK_ACTION', 'ADMIN_REPORT_GENERATE',

      // System Activities
      'SYSTEM_STARTUP', 'SYSTEM_SHUTDOWN', 'SYSTEM_ERROR',
      'WEBHOOK_RECEIVED', 'EMAIL_SENT', 'NOTIFICATION_SENT',
      'RECONCILIATION_RUN', 'BACKUP_COMPLETE', 'MAINTENANCE_START',
      'MAINTENANCE_END'
    ],
    index: true
  },

  // Actor Information
  actor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    userEmail: String, // Denormalized for faster queries
    userRole: String,
    ipAddress: String,
    userAgent: String,
    sessionId: String
  },

  // Target/Object Information
  target: {
    type: {
      type: String,
      enum: ['User', 'KycApplication', 'Wallet', 'Payment', 'Transaction', 'Account', 'Config', 'System', 'Notification'],
      index: true
    },
    id: mongoose.Schema.Types.ObjectId,
    identifier: String, // Email, wallet address, transaction ID, etc.
    metadata: mongoose.Schema.Types.Mixed // Additional target info
  },

  // Activity Details
  details: {
    action: String, // Human readable action description
    category: {
      type: String,
      enum: ['AUTHENTICATION', 'SECURITY', 'KYC', 'PAYMENTS', 'WALLETS', 'TRANSFERS', 'TRADING', 'ADMIN', 'SYSTEM'],
      index: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING', 'WARNING'],
      default: 'SUCCESS',
      index: true
    }
  },

  // Activity Data
  data: {
    before: mongoose.Schema.Types.Mixed, // State before change
    after: mongoose.Schema.Types.Mixed,  // State after change
    amount: Number, // For financial activities
    currency: String, // For financial activities
    metadata: mongoose.Schema.Types.Mixed, // Additional activity-specific data
    errorMessage: String, // For failed activities
    requestId: String, // For tracing requests
    correlationId: String // For linking related activities
  },

  // Context Information
  context: {
    source: {
      type: String,
      enum: ['WEB', 'MOBILE', 'API', 'WEBHOOK', 'SYSTEM', 'ADMIN'],
      default: 'WEB'
    },
    environment: {
      type: String,
      enum: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      default: 'DEVELOPMENT'
    },
    version: String, // API or app version
    feature: String, // Feature name that triggered the activity
    experiment: String // A/B test or experiment identifier
  },

  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Performance & Analytics
  performance: {
    duration: Number, // Activity duration in milliseconds
    responseSize: Number, // Response size in bytes
    dbQueries: Number, // Number of DB queries made
    cacheHits: Number, // Cache hits during the activity
    memoryUsage: Number // Memory usage during activity
  },

  // Compliance & Security
  compliance: {
    piiProcessed: Boolean, // Whether PII was processed
    gdprRelevant: Boolean, // Whether activity is GDPR relevant
    retentionPeriod: Number, // Days to retain this record
    encrypted: Boolean, // Whether sensitive data is encrypted
    auditRequired: Boolean // Whether this requires audit review
  },

  // Geolocation (for security analysis)
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  }

}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'activity_history'
});

// Indexes for optimal query performance
activityHistorySchema.index({ timestamp: -1 }); // Most recent first
activityHistorySchema.index({ 'actor.userId': 1, timestamp: -1 }); // User activity timeline
activityHistorySchema.index({ activityType: 1, timestamp: -1 }); // Activity type filtering
activityHistorySchema.index({ 'details.category': 1, timestamp: -1 }); // Category filtering
activityHistorySchema.index({ 'details.severity': 1, timestamp: -1 }); // Severity filtering
activityHistorySchema.index({ 'target.type': 1, 'target.id': 1 }); // Target-based queries
activityHistorySchema.index({ 'data.correlationId': 1 }); // Related activities
activityHistorySchema.index({ 'actor.ipAddress': 1, timestamp: -1 }); // IP-based analysis
activityHistorySchema.index({ 'context.source': 1, timestamp: -1 }); // Source-based filtering

// Compound indexes for common admin dashboard queries
activityHistorySchema.index({ 'details.category': 1, 'details.status': 1, timestamp: -1 });
activityHistorySchema.index({ 'actor.userRole': 1, activityType: 1, timestamp: -1 });
activityHistorySchema.index({ 'details.severity': 1, 'details.status': 1, timestamp: -1 });

// Text search index for activity descriptions and metadata
activityHistorySchema.index({
  'details.action': 'text',
  'data.metadata': 'text',
  'target.identifier': 'text'
});

// TTL index for automatic cleanup (configurable retention)
activityHistorySchema.index(
  { timestamp: 1 },
  {
    expireAfterSeconds: 365 * 24 * 60 * 60, // 1 year default
    partialFilterExpression: { 'compliance.retentionPeriod': { $exists: false } }
  }
);

// Virtual for human-readable timestamp
activityHistorySchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString();
});

// Virtual for activity age
activityHistorySchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60));
});

// Static method to get activity statistics
activityHistorySchema.statics.getActivityStats = function(timeframe = '24h') {
  const now = new Date();
  let startTime;

  switch (timeframe) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  return this.aggregate([
    { $match: { timestamp: { $gte: startTime } } },
    {
      $group: {
        _id: {
          category: '$details.category',
          status: '$details.status'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$actor.userId' },
        avgDuration: { $avg: '$performance.duration' },
        totalAmount: { $sum: '$data.amount' }
      }
    },
    {
      $project: {
        category: '$_id.category',
        status: '$_id.status',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        avgDuration: { $round: ['$avgDuration', 2] },
        totalAmount: { $round: ['$totalAmount', 2] },
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get user activity timeline
activityHistorySchema.statics.getUserTimeline = function(userId, limit = 50) {
  return this.find({
    'actor.userId': userId
  })
  .sort({ timestamp: -1 })
  .limit(limit)
  .select('activityType details.action details.status timestamp data.amount data.currency target')
  .lean();
};

// Static method to detect suspicious activities
activityHistorySchema.statics.getSuspiciousActivities = function(timeframe = '24h') {
  const now = new Date();
  const startTime = new Date(now.getTime() - (timeframe === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));

  return this.aggregate([
    { $match: { timestamp: { $gte: startTime } } },
    {
      $group: {
        _id: '$actor.ipAddress',
        failedLogins: {
          $sum: {
            $cond: [
              { $eq: ['$activityType', 'LOGIN_FAILED'] },
              1,
              0
            ]
          }
        },
        uniqueUsers: { $addToSet: '$actor.userId' },
        activities: { $push: '$$ROOT' }
      }
    },
    {
      $match: {
        $or: [
          { failedLogins: { $gte: 5 } }, // 5+ failed logins
          { uniqueUsers: { $size: { $gte: 3 } } } // 3+ different users from same IP
        ]
      }
    },
    { $sort: { failedLogins: -1 } }
  ]);
};

// Pre-save middleware to set defaults and validate data
activityHistorySchema.pre('save', function(next) {
  // Set correlation ID if not provided
  if (!this.data.correlationId) {
    this.data.correlationId = new mongoose.Types.ObjectId().toString();
  }

  // Set retention period based on severity
  if (!this.compliance.retentionPeriod) {
    switch (this.details.severity) {
      case 'CRITICAL':
        this.compliance.retentionPeriod = 2555; // 7 years
        break;
      case 'HIGH':
        this.compliance.retentionPeriod = 1095; // 3 years
        break;
      case 'MEDIUM':
        this.compliance.retentionPeriod = 365; // 1 year
        break;
      default:
        this.compliance.retentionPeriod = 90; // 90 days
    }
  }

  // Set audit required flag for certain activities
  const auditRequiredTypes = [
    'ADMIN_USER_UPDATE', 'ADMIN_KYC_REVIEW', 'ADMIN_CONFIG_UPDATE',
    'KYC_APPROVED', 'KYC_REJECTED', 'PAYMENT_SUCCESS', 'TRANSFER_SEND'
  ];

  if (auditRequiredTypes.includes(this.activityType)) {
    this.compliance.auditRequired = true;
  }

  next();
});

module.exports = mongoose.model('ActivityHistory', activityHistorySchema);