const express = require('express');
const Joi = require('joi');
const UserService = require('../services/UserService');
const FirebaseNotificationService = require('../services/FirebaseNotificationService');
const { validate, commonSchemas } = require('../middleware/validation');
const { authenticate, adminOnly, superAdminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /users/profile:
 *   get:
 *     tags: [User Profile]
 *     summary: Get user profile
 *     description: Get the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                     user:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             wallets:
 *                               type: array
 *                               description: User's linked wallet addresses
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   _id:
 *                                     type: string
 *                                     example: "507f1f77bcf86cd799439011"
 *                                   address:
 *                                     type: string
 *                                     example: "0.0.123456"
 *                                     description: Wallet address
 *                                   network:
 *                                     type: string
 *                                     enum: [hedera, ethereum, bitcoin]
 *                                     example: "hedera"
 *                                     description: Blockchain network
 *                                   whitelistState:
 *                                     type: string
 *                                     enum: [WHITELISTED, BLACKLISTED, PENDING]
 *                                     example: "WHITELISTED"
 *                                     description: Wallet verification status
 *                                   country:
 *                                     type: string
 *                                     example: "US"
 *                                     description: Country code
 *                                   metadata:
 *                                     type: object
 *                                     properties:
 *                                       isMultisig:
 *                                         type: boolean
 *                                         example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await UserService.getProfile(req.user.id);
    
    res.json({
      status: 'success',
      data: { user },
    });
  })
);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     tags: [User Profile]
 *     summary: Update user profile
 *     description: Update the authenticated user's profile preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: object
 *                 properties:
 *                   notifications:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: boolean
 *                         description: Enable email notifications
 *                         example: true
 *                       push:
 *                         type: boolean
 *                         description: Enable push notifications
 *                         example: true
 *                   language:
 *                     type: string
 *                     enum: [en, es, fr, de]
 *                     description: Preferred language
 *                     example: en
 *                   timezone:
 *                     type: string
 *                     description: User's timezone
 *                     example: UTC
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/profile',
  authenticate,
  validate(Joi.object({
    preferences: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
      }),
      language: Joi.string().valid('en', 'es', 'fr', 'de'),
      timezone: Joi.string(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const user = await UserService.updateProfile(req.user.id, req.body, metadata);
    
    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user },
    });
  })
);

router.get('/accounts',
  authenticate,
  asyncHandler(async (req, res) => {
    const accounts = await UserService.getUserAccounts(req.user.id);
    
    res.json({
      status: 'success',
      data: { accounts },
    });
  })
);

router.post('/accounts',
  authenticate,
  asyncHandler(async (req, res) => {
    const accounts = await UserService.createUserAccounts(req.user.id);
    
    res.status(201).json({
      status: 'success',
      message: 'User accounts created successfully',
      data: { accounts },
    });
  })
);

router.put('/:userId/role',
  authenticate,
  superAdminOnly,
  validate(Joi.object({
    role: commonSchemas.role.required(),
    reason: Joi.string().required().min(10).max(500),
  })),
  validate(Joi.object({
    userId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role, reason } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const user = await UserService.updateUserRole(req.user.id, userId, role, reason, metadata);
    
    res.json({
      status: 'success',
      message: 'User role updated successfully',
      data: { user },
    });
  })
);

router.put('/:userId/deactivate',
  authenticate,
  adminOnly,
  validate(Joi.object({
    reason: Joi.string().required().min(10).max(500),
  })),
  validate(Joi.object({
    userId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const user = await UserService.deactivateUser(req.user.id, userId, reason, metadata);
    
    res.json({
      status: 'success',
      message: 'User deactivated successfully',
      data: { user },
    });
  })
);

router.put('/:userId/reactivate',
  authenticate,
  adminOnly,
  validate(Joi.object({
    reason: Joi.string().required().min(10).max(500),
  })),
  validate(Joi.object({
    userId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const user = await UserService.reactivateUser(req.user.id, userId, reason, metadata);
    
    res.json({
      status: 'success',
      message: 'User reactivated successfully',
      data: { user },
    });
  })
);

router.get('/search',
  authenticate,
  adminOnly,
  validate(Joi.object({
    email: Joi.string().optional(),
    role: commonSchemas.role.optional(),
    kycStatus: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED').optional(),
    isActive: Joi.boolean().optional(),
    emailVerified: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    
    const result = await UserService.searchUsers(
      req.user.id,
      filters,
      { page, limit }
    );
    
    res.json({
      status: 'success',
      data: result,
    });
  })
);

router.get('/stats',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const stats = await UserService.getUserStats(req.user.id);
    
    res.json({
      status: 'success',
      data: stats,
    });
  })
);

/**
 * @swagger
 * /users/fcm-token:
 *   post:
 *     tags: [User Notifications]
 *     summary: Register FCM token
 *     description: Register a Firebase Cloud Messaging token for push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - deviceType
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase Cloud Messaging token
 *                 example: dQw4w9WgXcQ:APA91bHun4MwP...
 *               deviceType:
 *                 type: string
 *                 enum: [web, ios, android]
 *                 description: Device type
 *                 example: web
 *     responses:
 *       201:
 *         description: FCM token registered successfully
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
 *                   example: FCM token registered successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/fcm-token',
  authenticate,
  validate(Joi.object({
    token: Joi.string().required(),
    deviceType: Joi.string().valid('web', 'ios', 'android').required(),
  })),
  asyncHandler(async (req, res) => {
    const { token, deviceType } = req.body;
    const { user } = req;

    const deviceInfo = {
      type: deviceType,
      userAgent: req.get('User-Agent'),
    };

    await user.addFcmToken(token, deviceInfo);

    res.status(201).json({
      status: 'success',
      message: 'FCM token registered successfully',
    });
  })
);

router.delete('/fcm-token',
  authenticate,
  validate(Joi.object({
    token: Joi.string().required(),
  })),
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const { user } = req;

    await user.removeFcmToken(token);

    res.json({
      status: 'success',
      message: 'FCM token removed successfully',
    });
  })
);

router.post('/test-notification',
  authenticate,
  validate(Joi.object({
    title: Joi.string().required(),
    body: Joi.string().required(),
    data: Joi.object().optional(),
  })),
  asyncHandler(async (req, res) => {
    const { title, body, data = {} } = req.body;
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
        message: 'No active FCM tokens found for this user',
      });
    }

    const notification = { title, body };
    const results = [];

    for (const token of fcmTokens) {
      const result = await FirebaseNotificationService.sendNotification(token, notification, {
        ...data,
        userId: user._id.toString(),
        type: 'test',
      });
      
      if (!result.success && result.shouldRemoveToken) {
        await user.removeFcmToken(token);
      }
      
      results.push({ token: token.substring(0, 20) + '...', result });
    }

    res.json({
      status: 'success',
      message: 'Test notification sent',
      data: { results },
    });
  })
);

module.exports = router;