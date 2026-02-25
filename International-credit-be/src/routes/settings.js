const express = require('express');
const Joi = require('joi');
const UserService = require('../services/UserService');
const KycService = require('../services/KycService');
const WalletService = require('../services/WalletService');
const { validate, commonSchemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { strictRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// =================== SECURITY SETTINGS ===================

/**
 * @swagger
 * /settings/security/devices:
 *   get:
 *     tags: [Account Settings - Security]
 *     summary: Get active devices/sessions
 *     description: List all active login sessions and devices
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active devices retrieved successfully
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
 *                     devices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sessionId:
 *                             type: string
 *                           deviceInfo:
 *                             type: string
 *                             example: "Chrome 120 on Windows"
 *                           ipAddress:
 *                             type: string
 *                             example: "192.168.1.100"
 *                           location:
 *                             type: string
 *                             example: "New York, US"
 *                           lastActive:
 *                             type: string
 *                             format: date-time
 *                           current:
 *                             type: boolean
 *                             example: true
 */
router.get('/security/devices',
  authenticate,
  asyncHandler(async (req, res) => {
    const devices = await UserService.getActiveSessions(req.user.id, req.sessionId);
    
    res.json({
      status: 'success',
      data: { devices },
    });
  })
);

/**
 * @swagger
 * /settings/security/devices/{sessionId}:
 *   delete:
 *     tags: [Account Settings - Security]
 *     summary: Revoke device/session access
 *     description: Revoke access for a specific device/session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to revoke
 *     responses:
 *       200:
 *         description: Device access revoked successfully
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
 *                   example: Device access revoked successfully
 */
router.delete('/security/devices/:sessionId',
  authenticate,
  validate(Joi.object({
    sessionId: Joi.string().required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    await UserService.revokeSession(req.user.id, sessionId);
    
    res.json({
      status: 'success',
      message: 'Device access revoked successfully',
    });
  })
);

/**
 * @swagger
 * /settings/security/2fa/enable:
 *   post:
 *     tags: [Account Settings - Security]
 *     summary: Enable 2FA
 *     description: Enable two-factor authentication for the user account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [totp, sms]
 *                 description: 2FA method to enable
 *                 example: totp
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number (required for SMS method)
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: 2FA setup initiated
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
 *                     qrCode:
 *                       type: string
 *                       description: QR code for TOTP setup (base64)
 *                     secret:
 *                       type: string
 *                       description: TOTP secret key
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: One-time backup codes
 */
// 2FA endpoints have been moved to /api/v1/2fa/*
// See /routes/twofactor.js for complete 2FA implementation

// =================== PREFERENCES SETTINGS ===================

/**
 * @swagger
 * /settings/preferences:
 *   get:
 *     tags: [Account Settings - Preferences]
 *     summary: Get user preferences
 *     description: Retrieve all user preference settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
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
 *                     preferences:
 *                       type: object
 *                       properties:
 *                         language:
 *                           type: string
 *                           enum: [en, es, fr, de, zh, ja]
 *                           example: en
 *                         currency:
 *                           type: string
 *                           enum: [USD, EUR, GBP, CAD, AUD]
 *                           example: USD
 *                         theme:
 *                           type: string
 *                           enum: [light, dark, auto]
 *                           example: light
 *                         timezone:
 *                           type: string
 *                           example: "America/New_York"
 *                         notifications:
 *                           type: object
 *                           properties:
 *                             email:
 *                               type: boolean
 *                               example: true
 *                             push:
 *                               type: boolean
 *                               example: true
 *                             inApp:
 *                               type: boolean
 *                               example: true
 */
router.get('/preferences',
  authenticate,
  asyncHandler(async (req, res) => {
    const preferences = await UserService.getUserPreferences(req.user.id);
    
    res.json({
      status: 'success',
      data: { preferences },
    });
  })
);

/**
 * @swagger
 * /settings/preferences:
 *   put:
 *     tags: [Account Settings - Preferences]
 *     summary: Update user preferences
 *     description: Update user preference settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [en, es, fr, de, zh, ja]
 *                 example: en
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, CAD, AUD]
 *                 example: USD
 *               theme:
 *                 type: string
 *                 enum: [light, dark, auto]
 *                 example: dark
 *               timezone:
 *                 type: string
 *                 example: "America/New_York"
 *               notifications:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                     example: true
 *                   push:
 *                     type: boolean
 *                     example: false
 *                   inApp:
 *                     type: boolean
 *                     example: true
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
router.put('/preferences',
  authenticate,
  validate(Joi.object({
    language: Joi.string().valid('en', 'es', 'fr', 'de', 'zh', 'ja').optional(),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD').optional(),
    theme: Joi.string().valid('light', 'dark', 'auto').optional(),
    timezone: Joi.string().optional(),
    notifications: Joi.object({
      email: Joi.boolean().optional(),
      push: Joi.boolean().optional(),
      inApp: Joi.boolean().optional(),
    }).optional(),
  })),
  asyncHandler(async (req, res) => {
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const preferences = await UserService.updateUserPreferences(req.user.id, req.body, metadata);
    
    res.json({
      status: 'success',
      message: 'Preferences updated successfully',
      data: { preferences },
    });
  })
);

// =================== COMPLIANCE SETTINGS ===================

/**
 * @swagger
 * /settings/compliance/kyc:
 *   get:
 *     tags: [Account Settings - Compliance]
 *     summary: Get KYC compliance status
 *     description: View submitted KYC documents and current status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
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
 *                     kycStatus:
 *                       type: string
 *                       enum: [NOT_STARTED, PENDING, APPROVED, REJECTED, EXPIRED]
 *                       example: APPROVED
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: "passport"
 *                           status:
 *                             type: string
 *                             example: "approved"
 *                           submittedAt:
 *                             type: string
 *                             format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: KYC expiration date
 */
router.get('/compliance/kyc',
  authenticate,
  asyncHandler(async (req, res) => {
    const kycData = await KycService.getUserKycCompliance(req.user.id);
    
    res.json({
      status: 'success',
      data: kycData,
    });
  })
);

/**
 * @swagger
 * /settings/compliance/wallets:
 *   get:
 *     tags: [Account Settings - Compliance]
 *     summary: Get wallet compliance status
 *     description: View wallet whitelist/blacklist status for all linked wallets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet compliance status retrieved successfully
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
 *                     wallets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           address:
 *                             type: string
 *                             example: "0.0.123456"
 *                           network:
 *                             type: string
 *                             example: "hedera"
 *                           whitelistStatus:
 *                             type: string
 *                             enum: [PENDING, WHITELISTED, BLACKLISTED]
 *                             example: WHITELISTED
 *                           reason:
 *                             type: string
 *                             example: "KYC approved"
 *                           lastUpdated:
 *                             type: string
 *                             format: date-time
 */
router.get('/compliance/wallets',
  authenticate,
  asyncHandler(async (req, res) => {
    const walletCompliance = await WalletService.getUserWalletCompliance(req.user.id);
    
    res.json({
      status: 'success',
      data: { wallets: walletCompliance },
    });
  })
);

// =================== ADVANCED SETTINGS ===================

/**
 * @swagger
 * /settings/advanced/export:
 *   post:
 *     tags: [Account Settings - Advanced]
 *     summary: Export user data
 *     description: Generate and download complete user data export (GDPR compliance)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeTransactions:
 *                 type: boolean
 *                 default: true
 *                 description: Include transaction history
 *               includeGovernance:
 *                 type: boolean
 *                 default: true
 *                 description: Include governance/voting history
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *                 default: json
 *                 description: Export format
 *     responses:
 *       202:
 *         description: Export initiated, will be emailed when ready
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
 *                   example: Data export initiated. Download link will be emailed when ready.
 *                 data:
 *                   type: object
 *                   properties:
 *                     exportId:
 *                       type: string
 *                       example: "exp_123456789"
 */
router.post('/advanced/export',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    includeTransactions: Joi.boolean().default(true),
    includeGovernance: Joi.boolean().default(true),
    format: Joi.string().valid('json', 'csv').default('json'),
  })),
  asyncHandler(async (req, res) => {
    const exportOptions = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const exportId = await UserService.initiateDataExport(req.user.id, exportOptions, metadata);
    
    res.status(202).json({
      status: 'success',
      message: 'Data export initiated. Download link will be emailed when ready.',
      data: { exportId },
    });
  })
);

/**
 * @swagger
 * /settings/advanced/delete-account:
 *   post:
 *     tags: [Account Settings - Advanced]
 *     summary: Delete user account
 *     description: Soft delete user account (disables access, preserves audit logs)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *               - confirmation
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Reason for account deletion
 *                 example: "No longer need the service"
 *               confirmation:
 *                 type: string
 *                 pattern: "^DELETE MY ACCOUNT$"
 *                 description: Must type "DELETE MY ACCOUNT" to confirm
 *                 example: "DELETE MY ACCOUNT"
 *     responses:
 *       200:
 *         description: Account deletion initiated
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
 *                   example: Account deletion initiated. You have 30 days to cancel this action.
 */
router.post('/advanced/delete-account',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    reason: Joi.string().required().min(10).max(500),
    confirmation: Joi.string().required().pattern(/^DELETE MY ACCOUNT$/),
  })),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    await UserService.initiateAccountDeletion(req.user.id, reason, metadata);
    
    res.json({
      status: 'success',
      message: 'Account deletion initiated. You have 30 days to cancel this action.',
    });
  })
);

module.exports = router;