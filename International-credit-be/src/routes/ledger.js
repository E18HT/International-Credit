const express = require('express');
const Joi = require('joi');
const LedgerService = require('../services/LedgerService');
const { validate, ledgerSchemas, commonSchemas } = require('../middleware/validation');
const { authenticate, adminOnly, requireKyc } = require('../middleware/auth');
const { strictRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /ledger/balance/{asset}:
 *   get:
 *     tags: [Ledger]
 *     summary: Get asset balance
 *     description: Get the current balance for a specific asset
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: asset
 *         required: true
 *         schema:
 *           type: string
 *           enum: [UC, USDC_mock, USDT_mock, BBT_mock, GBT_mock]
 *         description: Asset symbol
 *         example: UC
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
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
 *                     balance:
 *                       $ref: '#/components/schemas/Balance'
 */
router.get('/balance/:asset',
  authenticate,
  validate(Joi.object({
    asset: commonSchemas.asset.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { asset } = req.params;
    
    const balance = await LedgerService.getBalance(req.user.id, asset);
    
    res.json({
      status: 'success',
      data: { balance },
    });
  })
);

/**
 * @swagger
 * /ledger/balances:
 *   get:
 *     tags: [Ledger]
 *     summary: Get all asset balances
 *     description: Get current balances for all assets the user holds
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balances retrieved successfully
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
 *                     balances:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Balance'
 */
router.get('/balances',
  authenticate,
  asyncHandler(async (req, res) => {
    const balances = await LedgerService.getAllBalances(req.user.id);
    
    res.json({
      status: 'success',
      data: { balances },
    });
  })
);

/**
 * @swagger
 * /ledger/transfer:
 *   post:
 *     tags: [Ledger]
 *     summary: Transfer assets to another wallet
 *     description: Transfer assets from user's account to another wallet address
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toAddress
 *               - amount
 *               - asset
 *             properties:
 *               toAddress:
 *                 type: string
 *                 description: Recipient wallet address
 *                 example: "0.0.654321"
 *               amount:
 *                 type: number
 *                 minimum: 0.00000001
 *                 description: Amount to transfer
 *                 example: 50.25
 *               asset:
 *                 type: string
 *                 enum: [UC, USDC_mock, USDT_mock, BBT_mock, GBT_mock]
 *                 description: Asset to transfer
 *                 example: UC
 *               description:
 *                 type: string
 *                 maxLength: 200
 *                 description: Optional transfer description
 *                 example: "Payment for services"
 *     responses:
 *       201:
 *         description: Transfer completed successfully
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
 *                   example: Transfer completed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     journalId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     transaction:
 *                       type: object
 *                       description: Transaction details
 */
router.post('/transfer',
  authenticate,
  requireKyc,
  strictRateLimit,
  validate(ledgerSchemas.transfer),
  asyncHandler(async (req, res) => {
    const { toAddress, amount, asset, description, idempotencyKey } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.requestId,
    };
    
    const result = await LedgerService.transfer(
      req.user.id,
      toAddress,
      amount,
      asset,
      description,
      idempotencyKey,
      metadata
    );
    
    res.status(201).json({
      status: 'success',
      message: 'Transfer completed successfully',
      data: result,
    });
  })
);

/**
 * @swagger
 * /ledger/transactions:
 *   get:
 *     tags: [Ledger]
 *     summary: Get transaction history
 *     description: Retrieve paginated transaction history for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: asset
 *         schema:
 *           type: string
 *           enum: [UC, USDC_mock, USDT_mock]
 *         description: Filter by specific asset
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [DEPOSIT, TRANSFER, SWAP, WITHDRAWAL, FEE, REVERSAL]
 *         description: Filter by transaction type
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
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
 *           default: 20
 *         description: Number of transactions per page
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
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
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
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
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/transactions',
  authenticate,
  validate(Joi.object({
    asset: commonSchemas.asset.optional(),
    transactionType: Joi.string().valid(...Object.values(require('../config').transactionTypes)).optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    
    const result = await LedgerService.getTransactionHistory(
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

/**
 * @swagger
 * /ledger/transaction/{journalId}:
 *   get:
 *     tags: [Ledger]
 *     summary: Get specific transaction details
 *     description: Retrieve detailed information about a specific transaction by journal ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: journalId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: Journal ID of the transaction
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Transaction details retrieved successfully
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
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Transaction not found
 */
router.get('/transaction/:journalId',
  authenticate,
  validate(Joi.object({
    journalId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { journalId } = req.params;
    
    // Get journal entries
    const entries = await require('../models').LedgerEntry.find({ journalId })
      .populate('accountId', 'asset userId accountType');
    
    if (!entries.length) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found',
      });
    }
    
    // Check if user has access to this transaction
    const userAccounts = await require('../models').Account.find({ userId: req.user.id });
    const userAccountIds = userAccounts.map(acc => acc._id.toString());
    
    const hasAccess = entries.some(entry => 
      userAccountIds.includes(entry.accountId._id.toString())
    );
    
    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied to this transaction',
      });
    }
    
    res.json({
      status: 'success',
      data: {
        journalId,
        entries,
        timestamp: entries[0].createdAt,
        type: entries[0].meta.type,
        description: entries[0].meta.description,
      },
    });
  })
);

// Admin routes
router.get('/admin/invariants',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const invariants = await LedgerService.checkInvariants();
    
    res.json({
      status: 'success',
      data: invariants,
    });
  })
);

router.post('/admin/reverse/:journalId',
  authenticate,
  adminOnly,
  validate(Joi.object({
    reason: Joi.string().required().min(10).max(500),
  })),
  validate(Joi.object({
    journalId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { journalId } = req.params;
    const { reason } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const result = await LedgerService.reverseTransaction(
      req.user.id,
      journalId,
      reason,
      metadata
    );
    
    res.json({
      status: 'success',
      message: 'Transaction reversed successfully',
      data: result,
    });
  })
);

router.get('/admin/balances/:userId',
  authenticate,
  adminOnly,
  validate(Joi.object({
    userId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const balances = await LedgerService.getAllBalances(userId);
    
    res.json({
      status: 'success',
      data: { balances },
    });
  })
);

router.get('/admin/transactions/:userId',
  authenticate,
  adminOnly,
  validate(Joi.object({
    userId: commonSchemas.objectId.required(),
  }), 'params'),
  validate(Joi.object({
    asset: commonSchemas.asset.optional(),
    transactionType: Joi.string().valid(...Object.values(require('../config').transactionTypes)).optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page, limit, ...filters } = req.query;
    
    const result = await LedgerService.getTransactionHistory(
      userId,
      filters,
      { page, limit }
    );
    
    res.json({
      status: 'success',
      data: result,
    });
  })
);

module.exports = router;