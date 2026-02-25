const express = require('express');
const Joi = require('joi');
const { authenticate, adminOnly, superAdminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const UserService = require('../services/UserService');
const LedgerService = require('../services/LedgerService');
const WalletService = require('../services/WalletService');
const PaymentService = require('../services/PaymentService');
const KycService = require('../services/KycService');
const { User, Config, AuditLog, PriceTick, ReservesSnapshot, Proposal } = require('../models');
const config = require('../config');

const router = express.Router();

// ===== USER MANAGEMENT =====

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin - User Management]
 *     summary: Get all users with pagination and filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, status, search } = req.query;

    let query = {};

    if (role) query.role = role;
    if (status) query.isActive = status === 'active';
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count and users in parallel
    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const paginatedUsers = {
      docs: users,
      totalDocs: total,
      limit: limitNum,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
      nextPage: pageNum < Math.ceil(total / limitNum) ? pageNum + 1 : null,
      prevPage: pageNum > 1 ? pageNum - 1 : null
    };

    res.json({
      status: 'success',
      data: paginatedUsers
    });
  })
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     tags: [Admin - User Management]
 *     summary: Get user details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 */
router.get('/users/:userId',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const user = await UserService.getProfile(req.params.userId);

    res.json({
      status: 'success',
      data: { user }
    });
  })
);

/**
 * @swagger
 * /admin/users/{userId}/status:
 *   put:
 *     tags: [Admin - User Management]
 *     summary: Update user status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive, reason]
 *             properties:
 *               isActive:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
router.put('/users/:userId/status',
  authenticate,
  adminOnly,
  validate(Joi.object({
    isActive: Joi.boolean().required(),
    reason: Joi.string().required()
  })),
  asyncHandler(async (req, res) => {
    const { isActive, reason } = req.body;

    if (isActive) {
      await UserService.reactivateUser(req.user.id, req.params.userId, reason);
    } else {
      await UserService.deactivateUser(req.user.id, req.params.userId, reason);
    }

    res.json({
      status: 'success',
      message: 'User status updated successfully'
    });
  })
);

/**
 * @swagger
 * /admin/users/{userId}/role:
 *   put:
 *     tags: [Admin - User Management]
 *     summary: Update user role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, reason]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [end_user, admin.compliance, admin.treasury, admin.super]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User role updated successfully
 */
router.put('/users/:userId/role',
  authenticate,
  superAdminOnly,
  validate(Joi.object({
    role: Joi.string().valid(...Object.values(config.roles)).required(),
    reason: Joi.string().required()
  })),
  asyncHandler(async (req, res) => {
    const { role, reason } = req.body;

    await UserService.updateUserRole(req.user.id, req.params.userId, role, reason);

    res.json({
      status: 'success',
      message: 'User role updated successfully'
    });
  })
);

// ===== KYC MANAGEMENT =====

/**
 * @swagger
 * /admin/kyc/applications:
 *   get:
 *     tags: [Admin - KYC Management]
 *     summary: Get KYC applications with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: KYC applications retrieved successfully
 */
router.get('/kyc/applications',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };

    const applications = await KycService.getKycApplications(req.user.id, filters, pagination);

    res.json({
      status: 'success',
      data: applications
    });
  })
);

/**
 * @swagger
 * /admin/kyc/applications/{applicationId}/review:
 *   post:
 *     tags: [Admin - KYC Management]
 *     summary: Review KYC application
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision, reason]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC application reviewed successfully
 */
router.post('/kyc/applications/:applicationId/review',
  authenticate,
  adminOnly,
  validate(Joi.object({
    decision: Joi.string().valid('APPROVED', 'REJECTED').required(),
    reason: Joi.string().required()
  })),
  asyncHandler(async (req, res) => {
    const result = await KycService.manualReview(
      req.user.id,
      req.params.applicationId,
      req.body.decision,
      req.body.reason
    );

    res.json({
      status: 'success',
      message: 'KYC application reviewed successfully',
      data: result
    });
  })
);

// ===== WALLET MANAGEMENT =====

/**
 * @swagger
 * /admin/wallets/search:
 *   get:
 *     tags: [Admin - Wallet Management]
 *     summary: Search wallets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [WHITELISTED, BLACKLISTED, PENDING]
 *     responses:
 *       200:
 *         description: Wallets retrieved successfully
 */
router.get('/wallets/search',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const wallets = await WalletService.searchWalletsForAdmin(req.query);

    res.json({
      status: 'success',
      data: { wallets }
    });
  })
);

/**
 * @swagger
 * /admin/wallets/{walletId}/status:
 *   put:
 *     tags: [Admin - Wallet Management]
 *     summary: Update wallet status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status, reason]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [WHITELISTED, BLACKLISTED, PENDING]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet status updated successfully
 */
router.put('/wallets/:walletId/status',
  authenticate,
  adminOnly,
  validate(Joi.object({
    status: Joi.string().valid(...Object.values(config.walletStatus)).required(),
    reason: Joi.string().required()
  })),
  asyncHandler(async (req, res) => {
    const result = await WalletService.updateWalletStatusByAdmin(
      req.params.walletId,
      req.body.status,
      req.body.reason,
      req.user.id
    );

    res.json({
      status: 'success',
      message: 'Wallet status updated successfully',
      data: result
    });
  })
);

// ===== LEDGER MANAGEMENT =====

/**
 * @swagger
 * /admin/ledger/invariants:
 *   get:
 *     tags: [Admin - Ledger Management]
 *     summary: Check ledger invariants
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ledger invariants checked successfully
 */
router.get('/ledger/invariants',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const invariants = await LedgerService.checkInvariants();

    res.json({
      status: 'success',
      data: { invariants }
    });
  })
);

/**
 * @swagger
 * /admin/ledger/reverse/{journalId}:
 *   post:
 *     tags: [Admin - Ledger Management]
 *     summary: Reverse a ledger journal entry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: journalId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Journal entry reversed successfully
 */
router.post('/ledger/reverse/:journalId',
  authenticate,
  superAdminOnly,
  validate(Joi.object({
    reason: Joi.string().required()
  })),
  asyncHandler(async (req, res) => {
    const result = await LedgerService.reverseJournal(
      req.params.journalId,
      req.body.reason,
      req.user.id
    );

    res.json({
      status: 'success',
      message: 'Journal entry reversed successfully',
      data: result
    });
  })
);

/**
 * @swagger
 * /admin/ledger/balances/{userId}:
 *   get:
 *     tags: [Admin - Ledger Management]
 *     summary: Get user balances
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User balances retrieved successfully
 */
router.get('/ledger/balances/:userId',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const balances = await LedgerService.getUserBalances(req.params.userId);

    res.json({
      status: 'success',
      data: { balances }
    });
  })
);

// ===== PAYMENT MANAGEMENT =====

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     tags: [Admin - Payment Management]
 *     summary: Get all payments with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get('/payments',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const payments = await PaymentService.getPaymentsForAdmin(req.query);

    res.json({
      status: 'success',
      data: payments
    });
  })
);

/**
 * @swagger
 * /admin/payments/reconcile:
 *   get:
 *     tags: [Admin - Payment Management]
 *     summary: Get payment reconciliation report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Reconciliation report retrieved successfully
 */
router.get('/payments/reconcile',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const report = await PaymentService.getReconciliationReport(req.query.date);

    res.json({
      status: 'success',
      data: { report }
    });
  })
);

/**
 * @swagger
 * /admin/payments/stats:
 *   get:
 *     tags: [Admin - Payment Management]
 *     summary: Get payment statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 */
router.get('/payments/stats',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const stats = await PaymentService.getAdminStats();

    res.json({
      status: 'success',
      data: { stats }
    });
  })
);

// ===== SYSTEM CONFIGURATION =====

/**
 * @swagger
 * /admin/config:
 *   get:
 *     tags: [Admin - System Configuration]
 *     summary: Get system configuration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System configuration retrieved successfully
 */
router.get('/config',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const config = await Config.getConfig();

    res.json({
      status: 'success',
      data: { config }
    });
  })
);

/**
 * @swagger
 * /admin/config:
 *   put:
 *     tags: [Admin - System Configuration]
 *     summary: Update system configuration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fees:
 *                 type: object
 *               limits:
 *                 type: object
 *               ratios:
 *                 type: object
 *               paused:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: System configuration updated successfully
 */
router.put('/config',
  authenticate,
  superAdminOnly,
  asyncHandler(async (req, res) => {
    const { reason, ...updateData } = req.body;

    const updatedConfig = await Config.updateConfig(updateData, {
      updatedBy: req.user.id,
      reason
    });

    res.json({
      status: 'success',
      message: 'System configuration updated successfully',
      data: { config: updatedConfig }
    });
  })
);

// ===== SYSTEM MONITORING =====

/**
 * @swagger
 * /admin/system/status:
 *   get:
 *     tags: [Admin - System Monitoring]
 *     summary: Get system status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 */
router.get('/system/status',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const status = {
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    };

    res.json({
      status: 'success',
      data: { status }
    });
  })
);

/**
 * @swagger
 * /admin/system/pause:
 *   post:
 *     tags: [Admin - System Monitoring]
 *     summary: Pause/unpause system
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paused, reason]
 *             properties:
 *               paused:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: System pause status updated successfully
 */
router.post('/system/pause',
  authenticate,
  superAdminOnly,
  validate(Joi.object({
    paused: Joi.boolean().required(),
    reason: Joi.string().required()
  })),
  asyncHandler(async (req, res) => {
    const { paused, reason } = req.body;

    const updatedConfig = await Config.updateConfig({ paused }, {
      updatedBy: req.user.id,
      reason
    });

    res.json({
      status: 'success',
      message: `System ${paused ? 'paused' : 'unpaused'} successfully`,
      data: { config: updatedConfig }
    });
  })
);

// ===== AUDIT LOGS =====

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin - Audit & Reporting]
 *     summary: Get audit logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */
router.get('/audit-logs',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, action, userId, startDate, endDate } = req.query;

    let query = {};

    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count and audit logs in parallel
    const [total, auditLogs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .populate('userId', 'email fullName')
        .populate('performedBy', 'email fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const paginatedAuditLogs = {
      docs: auditLogs,
      totalDocs: total,
      limit: limitNum,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
      nextPage: pageNum < Math.ceil(total / limitNum) ? pageNum + 1 : null,
      prevPage: pageNum > 1 ? pageNum - 1 : null
    };

    res.json({
      status: 'success',
      data: paginatedAuditLogs
    });
  })
);

// ===== PRICING & RESERVES =====

/**
 * @swagger
 * /admin/pricing/ticks:
 *   get:
 *     tags: [Admin - Pricing & Reserves]
 *     summary: Get price ticks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: asset
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Price ticks retrieved successfully
 */
router.get('/pricing/ticks',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { asset, startDate, endDate, limit = 100 } = req.query;

    let query = {};

    if (asset) query.asset = asset;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const priceTicks = await PriceTick.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      status: 'success',
      data: { priceTicks }
    });
  })
);

/**
 * @swagger
 * /admin/reserves/snapshots:
 *   get:
 *     tags: [Admin - Pricing & Reserves]
 *     summary: Get reserves snapshots
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Reserves snapshots retrieved successfully
 */
router.get('/reserves/snapshots',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, limit = 50 } = req.query;

    let query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const snapshots = await ReservesSnapshot.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      status: 'success',
      data: { snapshots }
    });
  })
);

// ===== GOVERNANCE =====

/**
 * @swagger
 * /admin/governance/proposals:
 *   get:
 *     tags: [Admin - Governance]
 *     summary: Get governance proposals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Proposals retrieved successfully
 */
router.get('/governance/proposals',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, type } = req.query;

    let query = {};

    if (status) query.status = status;
    if (type) query.type = type;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count and proposals in parallel
    const [total, proposals] = await Promise.all([
      Proposal.countDocuments(query),
      Proposal.find(query)
        .populate('createdBy', 'email fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const paginatedProposals = {
      docs: proposals,
      totalDocs: total,
      limit: limitNum,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
      nextPage: pageNum < Math.ceil(total / limitNum) ? pageNum + 1 : null,
      prevPage: pageNum > 1 ? pageNum - 1 : null
    };

    res.json({
      status: 'success',
      data: paginatedProposals
    });
  })
);

// ===== MULTI-SIG ACTIONS =====

/**
 * @swagger
 * /admin/msig/actions:
 *   post:
 *     tags: [Admin - Multi-Sig]
 *     summary: Create multi-sig action
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, payload]
 *             properties:
 *               type:
 *                 type: string
 *               payload:
 *                 type: object
 *     responses:
 *       201:
 *         description: Action created
 */
router.post('/msig/actions',
  authenticate,
  adminOnly,
  validate(Joi.object({
    type: Joi.string().required(),
    payload: Joi.object().required()
  })),
  asyncHandler(async (req, res) => {
    // Placeholder: store in msig_actions when model/service exists
    res.status(201).json({
      status: 'success',
      message: 'Action queued (stub)',
      data: { id: 'stub' }
    });
  })
);

/**
 * @swagger
 * /admin/msig/actions:
 *   get:
 *     tags: [Admin - Multi-Sig]
 *     summary: List multi-sig actions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Actions listed
 */
router.get('/msig/actions',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({ status: 'success', data: { actions: [] } });
  })
);

/**
 * @swagger
 * /admin/msig/actions/{id}/approve:
 *   post:
 *     tags: [Admin - Multi-Sig]
 *     summary: Approve multi-sig action
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action approved
 */
router.post('/msig/actions/:id/approve',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({ status: 'success', message: 'Approved (stub)' });
  })
);

/**
 * @swagger
 * /admin/msig/actions/{id}/reject:
 *   post:
 *     tags: [Admin - Multi-Sig]
 *     summary: Reject multi-sig action
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action rejected
 */
router.post('/msig/actions/:id/reject',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({ status: 'success', message: 'Rejected (stub)' });
  })
);

module.exports = router;