const express = require('express');
const Joi = require('joi');
const WalletService = require('../services/WalletService');
const { validate, walletSchemas, commonSchemas } = require('../middleware/validation');
const { authenticate, adminOnly, requireKyc } = require('../middleware/auth');
const { strictRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /wallets/link:
 *   post:
 *     tags: [Wallets]
 *     summary: Link a wallet to user account
 *     description: Connect a blockchain wallet address to the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: Wallet address
 *                 example: "0.0.123456"
 *               network:
 *                 type: string
 *                 enum: [hedera, ethereum, bitcoin]
 *                 description: Blockchain network
 *                 example: hedera
 *               country:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 2
 *                 description: Country code (ISO 3166-1 alpha-2)
 *                 example: "US"
 *               signature:
 *                 type: string
 *                 description: Optional wallet signature for verification
 *               message:
 *                 type: string
 *                 description: Optional message for signature verification
 *     responses:
 *       201:
 *         description: Wallet linked successfully
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
 *                   example: Wallet linked successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     wallet:
 *                       $ref: '#/components/schemas/Wallet'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/link',
  authenticate,
  strictRateLimit,
  validate(walletSchemas.linkWallet),
  asyncHandler(async (req, res) => {
    const walletData = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const wallet = await WalletService.linkWallet(req.user.id, walletData, metadata);
    
    res.status(201).json({
      status: 'success',
      message: 'Wallet linked successfully',
      data: { wallet },
    });
  })
);

/**
 * @swagger
 * /wallets:
 *   get:
 *     tags: [Wallets]
 *     summary: Get user's linked wallets
 *     description: Retrieve all wallets linked to the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallets retrieved successfully
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
 *                         $ref: '#/components/schemas/Wallet'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const wallets = await WalletService.getUserWallets(req.user.id);
    
    res.json({
      status: 'success',
      data: { wallets },
    });
  })
);

/**
 * @swagger
 * /wallets/{walletId}:
 *   get:
 *     tags: [Wallets]
 *     summary: Get specific wallet details
 *     description: Retrieve details of a specific wallet by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: Wallet ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Wallet details retrieved successfully
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
 *                     wallet:
 *                       $ref: '#/components/schemas/Wallet'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:walletId',
  authenticate,
  validate(Joi.object({
    walletId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { walletId } = req.params;
    
    const wallet = await WalletService.getWallet(req.user.id, walletId);
    
    res.json({
      status: 'success',
      data: { wallet },
    });
  })
);

router.delete('/:walletId',
  authenticate,
  validate(Joi.object({
    walletId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { walletId } = req.params;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const wallet = await WalletService.removeWallet(req.user.id, walletId, metadata);
    
    res.json({
      status: 'success',
      message: 'Wallet removed successfully',
      data: { wallet },
    });
  })
);

// Admin routes
router.get('/admin/search',
  authenticate,
  adminOnly,
  validate(Joi.object({
    address: Joi.string().optional(),
    network: Joi.string().valid('hedera', 'ethereum', 'bitcoin').optional(),
    country: Joi.string().length(2).uppercase().optional(),
    whitelistState: Joi.string().valid('PENDING', 'WHITELISTED', 'BLACKLISTED').optional(),
    isActive: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    
    const result = await WalletService.searchWallets(
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

router.put('/admin/:walletId/status',
  authenticate,
  adminOnly,
  validate(walletSchemas.updateWallet),
  validate(Joi.object({
    walletId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { walletId } = req.params;
    const { whitelistState, reason } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const wallet = await WalletService.updateWalletStatus(
      req.user.id,
      walletId,
      whitelistState,
      reason,
      metadata
    );
    
    res.json({
      status: 'success',
      message: 'Wallet status updated successfully',
      data: { wallet },
    });
  })
);

router.get('/admin/stats',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const stats = await WalletService.getWalletStats(req.user.id);
    
    res.json({
      status: 'success',
      data: stats,
    });
  })
);

module.exports = router;