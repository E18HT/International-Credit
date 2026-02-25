const express = require('express');
const Joi = require('joi');
const TwoFactorService = require('../services/TwoFactorService');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { strictRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /2fa/status:
 *   get:
 *     tags: [Two-Factor Authentication]
 *     summary: Get 2FA status
 *     description: Get the current 2FA status for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA status retrieved successfully
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
 *                     isEnabled:
 *                       type: boolean
 *                       example: false
 *                     method:
 *                       type: string
 *                       example: totp
 *                     lastUsed:
 *                       type: string
 *                       format: date-time
 *                     unusedBackupCodes:
 *                       type: integer
 *                       example: 8
 *                     setupRequired:
 *                       type: boolean
 *                       example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const status = await TwoFactorService.get2FAStatus(req.user.id);

    res.json({
      status: 'success',
      data: status
    });
  })
);

/**
 * @swagger
 * /2fa/setup:
 *   post:
 *     tags: [Two-Factor Authentication]
 *     summary: Generate 2FA setup
 *     description: Generate QR code and secret for 2FA setup
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup generated successfully
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
 *                     secret:
 *                       type: string
 *                       example: JBSWY3DPEHPK3PXP
 *                     qrCode:
 *                       type: string
 *                       example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
 *                     manualEntryKey:
 *                       type: string
 *                       example: JBSWY3DPEHPK3PXP
 *                     issuer:
 *                       type: string
 *                       example: Universal Credit
 *                     account:
 *                       type: string
 *                       example: user@example.com
 *       400:
 *         description: 2FA already enabled
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/setup',
  authenticate,
  strictRateLimit,
  asyncHandler(async (req, res) => {
    const setup = await TwoFactorService.generateSetup(req.user.id);

    res.json({
      status: 'success',
      data: setup
    });
  })
);

/**
 * @swagger
 * /2fa/enable:
 *   post:
 *     tags: [Two-Factor Authentication]
 *     summary: Enable 2FA
 *     description: Enable 2FA by verifying the token from authenticator app
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *                 description: 6-digit code from authenticator app
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
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
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["A1B2C3D4E5", "F6G7H8I9J0"]
 *                     message:
 *                       type: string
 *                       example: 2FA has been successfully enabled
 *       400:
 *         description: Invalid token or 2FA already enabled
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/enable',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    token: Joi.string().length(6).pattern(/^[0-9]{6}$/).required()
  })),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const result = await TwoFactorService.enable2FA(req.user.id, token);

    res.json({
      status: 'success',
      data: result
    });
  })
);

/**
 * @swagger
 * /2fa/quick-enable:
 *   post:
 *     tags: [Two-Factor Authentication]
 *     summary: Quick re-enable 2FA
 *     description: Re-enable 2FA using previously configured secret (no QR code needed)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, token]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: User's current password
 *                 example: "SecurePassword123!"
 *               token:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *                 description: 6-digit code from existing authenticator app
 *     responses:
 *       200:
 *         description: 2FA quickly re-enabled successfully
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
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *                     quickReEnable:
 *                       type: boolean
 *                       example: true
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["ABC123", "DEF456"]
 *                     message:
 *                       type: string
 *                       example: "2FA has been quickly re-enabled using your previous setup"
 *       400:
 *         description: Invalid request (no previous setup found)
 *       401:
 *         description: Invalid password or 2FA token
 *       422:
 *         description: 2FA is already enabled
 */
router.post('/quick-enable',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    currentPassword: Joi.string().min(8).required(),
    token: Joi.string().length(6).pattern(/^[0-9]{6}$/).required()
  })),
  asyncHandler(async (req, res) => {
    const { currentPassword, token } = req.body;

    const result = await TwoFactorService.quickEnable2FA(req.user.id, currentPassword, token);

    res.json({
      status: 'success',
      data: result
    });
  })
);

/**
 * @swagger
 * /2fa/disable:
 *   post:
 *     tags: [Two-Factor Authentication]
 *     summary: Disable 2FA
 *     description: Disable 2FA by providing current password and 2FA token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, token]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "MyCurrentPassword123!"
 *                 description: User's current password
 *               token:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 10
 *                 example: "123456"
 *                 description: 6-digit TOTP code or 10-character backup code
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
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
 *                     enabled:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: 2FA has been successfully disabled
 *       400:
 *         description: Invalid password or token, or 2FA not enabled
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/disable',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    currentPassword: Joi.string().min(8).required(),
    token: Joi.string().min(6).max(10).required()
  })),
  asyncHandler(async (req, res) => {
    const { currentPassword, token } = req.body;

    const result = await TwoFactorService.disable2FA(req.user.id, currentPassword, token);

    res.json({
      status: 'success',
      data: result
    });
  })
);

/**
 * @swagger
 * /2fa/verify:
 *   post:
 *     tags: [Two-Factor Authentication]
 *     summary: Verify 2FA token
 *     description: Verify a 2FA token or backup code (for testing purposes)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 10
 *                 example: "123456"
 *                 description: 6-digit TOTP code or 10-character backup code
 *     responses:
 *       200:
 *         description: Token verification result
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
 *                     verified:
 *                       type: boolean
 *                       example: true
 *                     usedBackupCode:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: 2FA not enabled
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/verify',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    token: Joi.string().min(6).max(10).required()
  })),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const result = await TwoFactorService.verify2FAToken(req.user.id, token);

    res.json({
      status: 'success',
      data: result
    });
  })
);

/**
 * @swagger
 * /2fa/backup-codes/regenerate:
 *   post:
 *     tags: [Two-Factor Authentication]
 *     summary: Regenerate backup codes
 *     description: Generate new backup codes (invalidates old ones)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, token]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "MyCurrentPassword123!"
 *                 description: User's current password
 *               token:
 *                 type: string
 *                 length: 6
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *                 description: 6-digit TOTP code from authenticator app
 *     responses:
 *       200:
 *         description: Backup codes regenerated successfully
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
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["A1B2C3D4E5", "F6G7H8I9J0"]
 *                     message:
 *                       type: string
 *                       example: New backup codes generated successfully
 *       400:
 *         description: Invalid password or token, or 2FA not enabled
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/backup-codes/regenerate',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    currentPassword: Joi.string().min(8).required(),
    token: Joi.string().length(6).pattern(/^[0-9]{6}$/).required()
  })),
  asyncHandler(async (req, res) => {
    const { currentPassword, token } = req.body;

    const result = await TwoFactorService.regenerateBackupCodes(req.user.id, currentPassword, token);

    res.json({
      status: 'success',
      data: result
    });
  })
);

module.exports = router;