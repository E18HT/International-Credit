const express = require('express');
const Joi = require('joi');
const FirebaseNotificationService = require('../services/FirebaseNotificationService');
const { validate } = require('../middleware/validation');
const { authenticate, adminOnly } = require('../middleware/auth');
const { strictRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /notifications/test:
 *   post:
 *     tags: [Notifications]
 *     summary: Send test notification
 *     description: Send a test push notification to the authenticated user's registered devices
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Notification title
 *                 example: "Test Notification"
 *               body:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 300
 *                 description: Notification body text
 *                 example: "This is a test notification from Universal Credit"
 *               image:
 *                 type: string
 *                 format: uri
 *                 description: Optional notification image URL
 *                 example: "https://example.com/image.png"
 *               data:
 *                 type: object
 *                 description: Custom data payload
 *                 example: {"customKey": "customValue"}
 *               actions:
 *                 type: array
 *                 description: Web notification action buttons
 *                 items:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       example: "view"
 *                     title:
 *                       type: string
 *                       example: "View Details"
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Test notification sent to 2 devices
 *                 data:
 *                   type: object
 *                   properties:
 *                     sentCount:
 *                       type: integer
 *                       example: 2
 *                     failedCount:
 *                       type: integer
 *                       example: 0
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           token:
 *                             type: string
 *                             example: "dQw4w9WgXcQ..."
 *                           success:
 *                             type: boolean
 *                           messageId:
 *                             type: string
 *       400:
 *         description: No FCM tokens found or push notifications disabled
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/test',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    title: Joi.string().required().min(1).max(100),
    body: Joi.string().required().min(1).max(300),
    image: Joi.string().uri().optional(),
    data: Joi.object().optional(),
    actions: Joi.array().items(Joi.object({
      action: Joi.string().required(),
      title: Joi.string().required(),
    })).optional(),
  })),
  asyncHandler(async (req, res) => {
    const { title, body, image, data = {}, actions = [] } = req.body;
    const { user } = req;

    // Check if user has push notifications enabled
    if (!user.preferences.notifications.push) {
      return res.status(400).json({
        status: 'error',
        message: 'Push notifications are disabled for this user',
      });
    }

    // Get active FCM tokens
    const fcmTokens = user.getActiveFcmTokens();
    if (fcmTokens.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No active FCM tokens found. Please register a device first.',
      });
    }

    const notification = {
      title,
      body,
      image,
      actions,
    };

    // Send notifications to all user devices
    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const token of fcmTokens) {
      const result = await FirebaseNotificationService.sendNotification(token, notification, {
        ...data,
        userId: user._id.toString(),
        type: 'test',
        timestamp: new Date().toISOString(),
      });
      
      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        
        // Remove invalid tokens
        if (result.shouldRemoveToken) {
          await user.removeFcmToken(token);
        }
      }
      
      results.push({
        token: token.substring(0, 20) + '...',
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    }

    res.json({
      status: 'success',
      message: `Test notification sent to ${sentCount} device(s)`,
      data: {
        sentCount,
        failedCount,
        results,
      },
    });
  })
);

/**
 * @swagger
 * /notifications/welcome:
 *   post:
 *     tags: [Notifications]
 *     summary: Send welcome notification
 *     description: Send a welcome notification to the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Welcome notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Welcome notification sent
 */
router.post('/welcome',
  authenticate,
  strictRateLimit,
  asyncHandler(async (req, res) => {
    const { user } = req;

    if (!user.preferences.notifications.push) {
      return res.status(400).json({
        status: 'error',
        message: 'Push notifications are disabled for this user',
      });
    }

    const fcmTokens = user.getActiveFcmTokens();
    if (fcmTokens.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No active FCM tokens found',
      });
    }

    const notification = FirebaseNotificationService.getWelcomeNotification(user);

    // Send to all user devices
    const result = await FirebaseNotificationService.sendMulticastNotification(
      fcmTokens,
      notification,
      notification.data
    );

    // Clean up invalid tokens
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      for (const invalidToken of result.invalidTokens) {
        await user.removeFcmToken(invalidToken);
      }
    }

    res.json({
      status: 'success',
      message: 'Welcome notification sent',
      data: {
        sentCount: result.successCount,
        failedCount: result.failureCount,
      },
    });
  })
);

/**
 * @swagger
 * /notifications/transaction:
 *   post:
 *     tags: [Notifications]
 *     summary: Send transaction notification
 *     description: Send a notification about a transaction (for testing)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - asset
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [DEPOSIT, TRANSFER, WITHDRAWAL]
 *                 example: TRANSFER
 *               amount:
 *                 type: number
 *                 example: 50.25
 *               asset:
 *                 type: string
 *                 enum: [UC, USDC_mock, USDT_mock, BBT_mock, GBT_mock]
 *                 example: UC
 *               transactionId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Transaction notification sent successfully
 */
router.post('/transaction',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    type: Joi.string().valid('DEPOSIT', 'TRANSFER', 'WITHDRAWAL').required(),
    amount: Joi.number().required(),
    asset: Joi.string().valid('UC', 'USDC_mock', 'USDT_mock', 'BBT_mock', 'GBT_mock').required(),
    transactionId: Joi.string().optional(),
  })),
  asyncHandler(async (req, res) => {
    const { type, amount, asset, transactionId = 'test_transaction_id' } = req.body;
    const { user } = req;

    if (!user.preferences.notifications.push) {
      return res.status(400).json({
        status: 'error',
        message: 'Push notifications are disabled for this user',
      });
    }

    const fcmTokens = user.getActiveFcmTokens();
    if (fcmTokens.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No active FCM tokens found',
      });
    }

    // Mock transaction object
    const mockTransaction = {
      type,
      amount,
      asset,
      id: transactionId,
    };

    const notification = FirebaseNotificationService.getTransactionNotification(user, mockTransaction);

    const result = await FirebaseNotificationService.sendMulticastNotification(
      fcmTokens,
      notification,
      notification.data
    );

    // Clean up invalid tokens
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      for (const invalidToken of result.invalidTokens) {
        await user.removeFcmToken(invalidToken);
      }
    }

    res.json({
      status: 'success',
      message: 'Transaction notification sent',
      data: {
        sentCount: result.successCount,
        failedCount: result.failureCount,
      },
    });
  })
);

/**
 * @swagger
 * /notifications/subscribe-topic:
 *   post:
 *     tags: [Notifications]
 *     summary: Subscribe to topic notifications
 *     description: Subscribe user's devices to a notification topic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 description: Topic name to subscribe to
 *                 example: "general_announcements"
 *     responses:
 *       200:
 *         description: Successfully subscribed to topic
 */
router.post('/subscribe-topic',
  authenticate,
  validate(Joi.object({
    topic: Joi.string().required().min(1).max(100),
  })),
  asyncHandler(async (req, res) => {
    const { topic } = req.body;
    const { user } = req;

    const fcmTokens = user.getActiveFcmTokens();
    if (fcmTokens.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No active FCM tokens found',
      });
    }

    const results = [];
    for (const token of fcmTokens) {
      const result = await FirebaseNotificationService.subscribeToTopic(token, topic);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      status: 'success',
      message: `Subscribed ${successCount} device(s) to topic: ${topic}`,
      data: { successCount, totalDevices: fcmTokens.length },
    });
  })
);

/**
 * @swagger
 * /notifications/admin/send-to-all:
 *   post:
 *     tags: [Notifications - Admin]
 *     summary: Send notification to all users (Admin only)
 *     description: Send a broadcast notification to all users via topic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *               - topic
 *             properties:
 *               title:
 *                 type: string
 *                 example: "System Maintenance"
 *               body:
 *                 type: string
 *                 example: "Universal Credit will be under maintenance from 2-4 AM UTC"
 *               topic:
 *                 type: string
 *                 example: "general_announcements"
 *               image:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/maintenance.png"
 *     responses:
 *       200:
 *         description: Broadcast notification sent successfully
 */
router.post('/admin/send-to-all',
  authenticate,
  adminOnly,
  strictRateLimit,
  validate(Joi.object({
    title: Joi.string().required().min(1).max(100),
    body: Joi.string().required().min(1).max(300),
    topic: Joi.string().required().min(1).max(100),
    image: Joi.string().uri().optional(),
    data: Joi.object().optional(),
  })),
  asyncHandler(async (req, res) => {
    const { title, body, topic, image, data = {} } = req.body;

    const notification = { title, body, image };

    const result = await FirebaseNotificationService.sendTopicNotification(
      topic,
      notification,
      {
        ...data,
        adminId: req.user.id,
        type: 'admin_broadcast',
      }
    );

    if (result.success) {
      res.json({
        status: 'success',
        message: `Broadcast notification sent to topic: ${topic}`,
        data: { messageId: result.messageId },
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to send broadcast notification',
        error: result.error,
      });
    }
  })
);

module.exports = router;