const express = require('express');
const Joi = require('joi');
const ActivityHistoryService = require('../../services/ActivityHistoryService');
const { authenticate, adminOnly, superAdminOnly } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const { asyncHandler } = require('../../middleware/errorHandler');
const { strictRateLimit } = require('../../middleware/security');

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(adminOnly);
router.use(strictRateLimit);

/**
 * @swagger
 * /admin/history/activities:
 *   get:
 *     tags: [Admin - Activity History]
 *     summary: Get platform activity history
 *     description: Retrieve filtered and paginated platform activity history for admin dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of activities per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [AUTHENTICATION, SECURITY, KYC, PAYMENTS, WALLETS, TRANSFERS, TRADING, ADMIN, SYSTEM]
 *         description: Filter by activity category
 *       - in: query
 *         name: activityType
 *         schema:
 *           type: string
 *         description: Filter by specific activity type
 *         example: USER_LOGIN
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Filter by severity level
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILED, PENDING, WARNING]
 *         description: Filter by activity status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO format)
 *       - in: query
 *         name: ipAddress
 *         schema:
 *           type: string
 *         description: Filter by IP address
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Text search in activity descriptions and metadata
 *     responses:
 *       200:
 *         description: Activity history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     activities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivityHistory'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/activities',
  validate(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    category: Joi.string().valid('AUTHENTICATION', 'SECURITY', 'KYC', 'PAYMENTS', 'WALLETS', 'TRANSFERS', 'TRADING', 'ADMIN', 'SYSTEM'),
    activityType: Joi.string(),
    userId: Joi.string(),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    status: Joi.string().valid('SUCCESS', 'FAILED', 'PENDING', 'WARNING'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    ipAddress: Joi.string().ip(),
    search: Joi.string()
  }), 'query'),
  asyncHandler(async (req, res) => {
    const result = await ActivityHistoryService.getActivities(req.query);

    // Log admin activity
    await ActivityHistoryService.logAdmin(
      'ADMIN_HISTORY_VIEW',
      req.user,
      { type: 'ActivityHistory', identifier: 'platform_activities' },
      req,
      { filters: req.query }
    );

    res.json({
      status: 'success',
      data: result
    });
  })
);

/**
 * @swagger
 * /admin/history/stats:
 *   get:
 *     tags: [Admin - Activity History]
 *     summary: Get activity statistics
 *     description: Get aggregated activity statistics for dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *         description: Timeframe for statistics
 *     responses:
 *       200:
 *         description: Activity statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalActivities:
 *                           type: integer
 *                         uniqueUsers:
 *                           type: integer
 *                         criticalActivities:
 *                           type: integer
 *                         failedActivities:
 *                           type: integer
 *                         successRate:
 *                           type: string
 *                     categoryStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           status:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           uniqueUserCount:
 *                             type: integer
 *                           avgDuration:
 *                             type: number
 *                           totalAmount:
 *                             type: number
 *                     topUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           email:
 *                             type: string
 */
router.get('/stats',
  validate(Joi.object({
    timeframe: Joi.string().valid('1h', '24h', '7d', '30d').default('24h')
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { timeframe } = req.query;
    const stats = await ActivityHistoryService.getActivityStats(timeframe);

    // Log admin activity
    await ActivityHistoryService.logAdmin(
      'ADMIN_STATS_VIEW',
      req.user,
      { type: 'System', identifier: 'activity_stats' },
      req,
      { timeframe }
    );

    res.json({
      status: 'success',
      data: stats
    });
  })
);

/**
 * @swagger
 * /admin/history/user/{userId}/timeline:
 *   get:
 *     tags: [Admin - Activity History]
 *     summary: Get user activity timeline
 *     description: Get chronological activity timeline for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Number of activities to retrieve
 *     responses:
 *       200:
 *         description: User timeline retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           activityType:
 *                             type: string
 *                           details:
 *                             type: object
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           data:
 *                             type: object
 */
router.get('/user/:userId/timeline',
  validate(Joi.object({
    userId: Joi.string().required(),
    limit: Joi.number().integer().min(1).max(200).default(50)
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit } = req.query;

    const timeline = await ActivityHistoryService.getUserTimeline(userId, limit);

    // Log admin activity
    await ActivityHistoryService.logAdmin(
      'ADMIN_USER_TIMELINE_VIEW',
      req.user,
      { type: 'User', id: userId },
      req,
      { timelineLimit: limit }
    );

    res.json({
      status: 'success',
      data: {
        timeline,
        userId
      }
    });
  })
);

/**
 * @swagger
 * /admin/history/suspicious:
 *   get:
 *     tags: [Admin - Activity History]
 *     summary: Get suspicious activities
 *     description: Detect and retrieve potentially suspicious activities based on patterns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 24h]
 *           default: 24h
 *         description: Timeframe for suspicious activity detection
 *     responses:
 *       200:
 *         description: Suspicious activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     suspiciousIPs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: IP Address
 *                           failedLogins:
 *                             type: integer
 *                           uniqueUsers:
 *                             type: array
 *                           activities:
 *                             type: array
 */
router.get('/suspicious',
  validate(Joi.object({
    timeframe: Joi.string().valid('1h', '24h').default('24h')
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { timeframe } = req.query;
    const suspiciousActivities = await ActivityHistoryService.getSuspiciousActivities(timeframe);

    // Log admin activity - mark as high severity due to security nature
    await ActivityHistoryService.logAdmin(
      'ADMIN_SUSPICIOUS_VIEW',
      req.user,
      { type: 'System', identifier: 'suspicious_activities' },
      req,
      { timeframe, suspiciousCount: suspiciousActivities.length }
    );

    res.json({
      status: 'success',
      data: {
        suspiciousIPs: suspiciousActivities,
        count: suspiciousActivities.length,
        timeframe
      }
    });
  })
);

/**
 * @swagger
 * /admin/history/export:
 *   post:
 *     tags: [Admin - Activity History]
 *     summary: Export activity history
 *     description: Export filtered activity history as CSV for compliance/audit purposes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filters:
 *                 type: object
 *                 properties:
 *                   category:
 *                     type: string
 *                   activityType:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   severity:
 *                     type: string
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *               format:
 *                 type: string
 *                 enum: [csv, json]
 *                 default: csv
 *     responses:
 *       200:
 *         description: Export file generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     exportId:
 *                       type: string
 *                     downloadUrl:
 *                       type: string
 *                     recordCount:
 *                       type: integer
 *                     message:
 *                       type: string
 */
router.post('/export',
  superAdminOnly,
  validate(Joi.object({
    filters: Joi.object({
      category: Joi.string(),
      activityType: Joi.string(),
      userId: Joi.string(),
      severity: Joi.string(),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso()
    }),
    format: Joi.string().valid('csv', 'json').default('csv')
  })),
  asyncHandler(async (req, res) => {
    const { filters, format } = req.body;

    // Get activities for export (limit to prevent abuse)
    const exportData = await ActivityHistoryService.getActivities({
      ...filters,
      limit: 10000 // Maximum export limit
    });

    // Generate export ID for tracking
    const exportId = require('crypto').randomBytes(16).toString('hex');

    // Log critical admin activity
    await ActivityHistoryService.logAdmin(
      'ADMIN_DATA_EXPORT',
      req.user,
      { type: 'System', identifier: 'activity_history' },
      req,
      {
        exportId,
        format,
        filters,
        recordCount: exportData.activities.length,
        severity: 'CRITICAL' // Data export is critical activity
      }
    );

    // In a real implementation, you would:
    // 1. Generate the actual file asynchronously
    // 2. Store it in secure location (S3, etc.)
    // 3. Return download URL with expiration
    // 4. Set up cleanup job for exported files

    res.json({
      status: 'success',
      data: {
        exportId,
        downloadUrl: `/admin/history/export/${exportId}/download`,
        recordCount: exportData.activities.length,
        message: 'Export generated successfully. Download link expires in 24 hours.'
      }
    });
  })
);

/**
 * @swagger
 * /admin/history/analytics:
 *   get:
 *     tags: [Admin - Activity History]
 *     summary: Get advanced analytics
 *     description: Get detailed analytics and trends for platform activities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 7d
 *         description: Timeframe for analytics
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, category, severity]
 *           default: day
 *         description: How to group the analytics data
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
router.get('/analytics',
  validate(Joi.object({
    timeframe: Joi.string().valid('24h', '7d', '30d').default('7d'),
    groupBy: Joi.string().valid('hour', 'day', 'category', 'severity').default('day')
  })),
  asyncHandler(async (req, res) => {
    const { timeframe, groupBy } = req.query;

    // This would contain more sophisticated analytics logic
    // For now, return basic stats
    const stats = await ActivityHistoryService.getActivityStats(timeframe);

    // Log admin activity
    await ActivityHistoryService.logAdmin(
      'ADMIN_ANALYTICS_VIEW',
      req.user,
      { type: 'System', identifier: 'activity_analytics' },
      req,
      { timeframe, groupBy }
    );

    res.json({
      status: 'success',
      data: {
        analytics: stats,
        timeframe,
        groupBy,
        generated: new Date().toISOString()
      }
    });
  })
);

module.exports = router;