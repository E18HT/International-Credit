const ActivityHistory = require('../models/ActivityHistory');
const logger = require('../utils/logger');
const geoip = require('geoip-lite');

class ActivityHistoryService {
  /**
   * Log a platform activity
   */
  async logActivity({
    activityType,
    actor = {},
    target = {},
    details = {},
    data = {},
    context = {},
    performance = {},
    req = null // Express request object for automatic context extraction
  }) {
    try {
      // Extract context from request if provided
      if (req) {
        actor = {
          userId: req.user?.id || req.user?._id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent'),
          sessionId: req.session?.id || req.sessionID,
          ...actor
        };

        context = {
          source: this._getSourceFromUserAgent(req.get('User-Agent')),
          requestId: req.id || req.headers['x-request-id'],
          ...context
        };
      }

      // Get geolocation from IP
      const location = this._getLocationFromIP(actor.ipAddress);

      // Determine category from activity type
      const category = this._getCategoryFromActivityType(activityType);

      // Create activity record
      const activityRecord = new ActivityHistory({
        activityType,
        actor: {
          userId: actor.userId,
          userEmail: actor.userEmail,
          userRole: actor.userRole,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          sessionId: actor.sessionId
        },
        target: {
          type: target.type,
          id: target.id,
          identifier: target.identifier,
          metadata: target.metadata
        },
        details: {
          action: details.action || this._getActionFromActivityType(activityType),
          category: details.category || category,
          severity: details.severity || 'LOW',
          status: details.status || 'SUCCESS'
        },
        data: {
          before: data.before,
          after: data.after,
          amount: data.amount,
          currency: data.currency,
          metadata: data.metadata,
          errorMessage: data.errorMessage,
          requestId: context.requestId,
          correlationId: data.correlationId || this._generateCorrelationId()
        },
        context: {
          source: context.source || 'SYSTEM',
          environment: process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT',
          version: process.env.npm_package_version || '1.0.0',
          feature: context.feature,
          experiment: context.experiment
        },
        performance: {
          duration: performance.duration,
          responseSize: performance.responseSize,
          dbQueries: performance.dbQueries,
          cacheHits: performance.cacheHits,
          memoryUsage: performance.memoryUsage
        },
        location,
        compliance: {
          piiProcessed: data.piiProcessed || false,
          gdprRelevant: this._isGdprRelevant(activityType),
          encrypted: data.encrypted || false
        }
      });

      await activityRecord.save();

      // Log high severity activities
      if (details.severity === 'HIGH' || details.severity === 'CRITICAL') {
        logger.warn('High severity activity logged', {
          activityType,
          userId: actor.userId,
          severity: details.severity,
          ipAddress: actor.ipAddress
        });
      }

      return activityRecord;
    } catch (error) {
      logger.error('Failed to log activity:', {
        error: error.message,
        activityType,
        userId: actor.userId
      });
      // Don't throw error to avoid breaking main functionality
      return null;
    }
  }

  /**
   * Log user authentication activities
   */
  async logAuth(type, user, req, additionalData = {}) {
    const activityTypes = {
      login: 'USER_LOGIN',
      logout: 'USER_LOGOUT',
      register: 'USER_REGISTER',
      loginFailed: 'LOGIN_FAILED',
      '2faEnable': '2FA_ENABLE',
      '2faDisable': '2FA_DISABLE'
    };

    return this.logActivity({
      activityType: activityTypes[type] || type,
      actor: {
        userId: user?.id || user?._id,
        userEmail: user?.email,
        userRole: user?.role
      },
      target: {
        type: 'User',
        id: user?.id || user?._id,
        identifier: user?.email
      },
      details: {
        severity: type === 'loginFailed' ? 'MEDIUM' : 'LOW',
        status: type === 'loginFailed' ? 'FAILED' : 'SUCCESS'
      },
      data: additionalData,
      req
    });
  }

  /**
   * Log financial activities
   */
  async logFinancial(type, user, amount, currency, target, req, additionalData = {}) {
    const activityTypes = {
      payment: 'PAYMENT_SUCCESS',
      paymentFailed: 'PAYMENT_FAILED',
      transfer: 'TRANSFER_SEND',
      swap: 'SWAP_EXECUTE',
      faucet: 'FAUCET_CLAIM'
    };

    return this.logActivity({
      activityType: activityTypes[type] || type,
      actor: {
        userId: user?.id || user?._id,
        userEmail: user?.email,
        userRole: user?.role
      },
      target,
      details: {
        severity: amount > 1000 ? 'MEDIUM' : 'LOW',
        status: type.includes('Failed') ? 'FAILED' : 'SUCCESS'
      },
      data: {
        amount,
        currency,
        ...additionalData
      },
      req
    });
  }

  /**
   * Log admin activities
   */
  async logAdmin(type, admin, target, req, additionalData = {}) {
    return this.logActivity({
      activityType: type,
      actor: {
        userId: admin?.id || admin?._id,
        userEmail: admin?.email,
        userRole: admin?.role
      },
      target,
      details: {
        severity: 'HIGH', // Admin actions are always high severity
        status: 'SUCCESS'
      },
      data: additionalData,
      req
    });
  }

  /**
   * Log system activities
   */
  async logSystem(type, details = {}, data = {}) {
    return this.logActivity({
      activityType: type,
      actor: {
        userId: null,
        userEmail: 'system@universalcredit.internal',
        userRole: 'SYSTEM'
      },
      details: {
        severity: type.includes('ERROR') ? 'CRITICAL' : 'LOW',
        ...details
      },
      data,
      context: {
        source: 'SYSTEM'
      }
    });
  }

  /**
   * Get activity history with filtering
   */
  async getActivities({
    page = 1,
    limit = 50,
    category,
    activityType,
    userId,
    severity,
    status,
    startDate,
    endDate,
    ipAddress,
    search
  }) {
    const skip = (page - 1) * limit;
    const query = {};

    // Build query filters
    if (category) query['details.category'] = category;
    if (activityType) query.activityType = activityType;
    if (userId) query['actor.userId'] = userId;
    if (severity) query['details.severity'] = severity;
    if (status) query['details.status'] = status;
    if (ipAddress) query['actor.ipAddress'] = ipAddress;

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const [activities, total] = await Promise.all([
      ActivityHistory.find(query)
        .populate('actor.userId', 'fullName email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityHistory.countDocuments(query)
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get activity statistics for dashboard
   */
  async getActivityStats(timeframe = '24h') {
    const stats = await ActivityHistory.getActivityStats(timeframe);

    // Get additional metrics
    const now = new Date();
    const startTime = this._getTimeframeStart(timeframe);

    const [
      totalActivities,
      uniqueUsers,
      criticalActivities,
      failedActivities,
      topUsers
    ] = await Promise.all([
      ActivityHistory.countDocuments({ timestamp: { $gte: startTime } }),
      ActivityHistory.distinct('actor.userId', { timestamp: { $gte: startTime } }),
      ActivityHistory.countDocuments({
        timestamp: { $gte: startTime },
        'details.severity': 'CRITICAL'
      }),
      ActivityHistory.countDocuments({
        timestamp: { $gte: startTime },
        'details.status': 'FAILED'
      }),
      ActivityHistory.aggregate([
        { $match: { timestamp: { $gte: startTime }, 'actor.userId': { $ne: null } } },
        { $group: { _id: '$actor.userId', count: { $sum: 1 }, email: { $first: '$actor.userEmail' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    return {
      overview: {
        totalActivities,
        uniqueUsers: uniqueUsers.length,
        criticalActivities,
        failedActivities,
        successRate: totalActivities > 0 ? ((totalActivities - failedActivities) / totalActivities * 100).toFixed(2) : 100
      },
      categoryStats: stats,
      topUsers
    };
  }

  /**
   * Get user activity timeline
   */
  async getUserTimeline(userId, limit = 50) {
    return ActivityHistory.getUserTimeline(userId, limit);
  }

  /**
   * Get suspicious activities
   */
  async getSuspiciousActivities(timeframe = '24h') {
    return ActivityHistory.getSuspiciousActivities(timeframe);
  }

  /**
   * Helper methods
   */
  _getSourceFromUserAgent(userAgent) {
    if (!userAgent) return 'UNKNOWN';

    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'MOBILE';
    }
    if (userAgent.includes('Postman') || userAgent.includes('curl') || userAgent.includes('axios')) {
      return 'API';
    }
    return 'WEB';
  }

  _getLocationFromIP(ipAddress) {
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return {
        country: 'Local',
        region: 'Local',
        city: 'Local',
        timezone: 'UTC'
      };
    }

    const geo = geoip.lookup(ipAddress);
    if (geo) {
      return {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone,
        coordinates: {
          lat: geo.ll[0],
          lng: geo.ll[1]
        }
      };
    }

    return {};
  }

  _getCategoryFromActivityType(activityType) {
    const categoryMap = {
      'USER_': 'AUTHENTICATION',
      'LOGIN_': 'AUTHENTICATION',
      '2FA_': 'SECURITY',
      'ACCOUNT_': 'SECURITY',
      'KYC_': 'KYC',
      'WALLET_': 'WALLETS',
      'PAYMENT_': 'PAYMENTS',
      'TRANSFER_': 'TRANSFERS',
      'SWAP_': 'TRADING',
      'FAUCET_': 'TRADING',
      'ADMIN_': 'ADMIN',
      'SYSTEM_': 'SYSTEM'
    };

    for (const [prefix, category] of Object.entries(categoryMap)) {
      if (activityType.startsWith(prefix)) {
        return category;
      }
    }

    return 'SYSTEM';
  }

  _getActionFromActivityType(activityType) {
    const actionMap = {
      'USER_REGISTER': 'User registered',
      'USER_LOGIN': 'User logged in',
      'USER_LOGOUT': 'User logged out',
      'LOGIN_FAILED': 'Login failed',
      '2FA_ENABLE': '2FA enabled',
      '2FA_DISABLE': '2FA disabled',
      'KYC_APPROVED': 'KYC approved',
      'KYC_REJECTED': 'KYC rejected',
      'PAYMENT_SUCCESS': 'Payment completed',
      'TRANSFER_SEND': 'Transfer sent',
      'WALLET_LINK': 'Wallet linked'
    };

    return actionMap[activityType] || activityType.toLowerCase().replace(/_/g, ' ');
  }

  _isGdprRelevant(activityType) {
    const gdprRelevantTypes = [
      'USER_REGISTER', 'USER_LOGIN', 'USER_EMAIL_VERIFY',
      'USER_PROFILE_UPDATE', 'KYC_APPLICATION_CREATE',
      'KYC_APPROVED', 'WALLET_LINK'
    ];

    return gdprRelevantTypes.includes(activityType);
  }

  _generateCorrelationId() {
    return require('crypto').randomBytes(16).toString('hex');
  }

  _getTimeframeStart(timeframe) {
    const now = new Date();

    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = new ActivityHistoryService();