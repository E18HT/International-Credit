const express = require('express');
const Joi = require('joi');
const PaymentService = require('../services/PaymentService');
const { validate, paymentSchemas, commonSchemas } = require('../middleware/validation');
const { authenticate, adminOnly, requireKyc, requireEmailVerification } = require('../middleware/auth');
const { strictRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /payments/quote:
 *   post:
 *     tags: [Payments]
 *     summary: Get payment quote
 *     description: Generate a quote for converting fiat currency to UC tokens
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fiatAmount
 *               - fiatCurrency
 *               - asset
 *             properties:
 *               fiatAmount:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10000
 *                 example: 100.00
 *                 description: Amount in fiat currency
 *               fiatCurrency:
 *                 type: string
 *                 enum: [USD, EUR, GBP]
 *                 example: USD
 *               asset:
 *                 type: string
 *                 enum: [UC]
 *                 example: UC
 *                 description: Target asset to purchase
 *     responses:
 *       200:
 *         description: Quote generated successfully
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
 *                     quoteId:
 *                       type: string
 *                       example: quote_1234567890abcdef
 *                     fiatAmount:
 *                       type: number
 *                       example: 100.00
 *                     ucAmount:
 *                       type: number
 *                       example: 100.00
 *                     exchangeRate:
 *                       type: number
 *                       example: 1.0
 *                     fees:
 *                       type: object
 *                       properties:
 *                         processing:
 *                           type: number
 *                           example: 2.9
 *                         total:
 *                           type: number
 *                           example: 2.9
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-01T12:30:00Z
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/quote',
  authenticate,
  requireEmailVerification,
  strictRateLimit,
  validate(Joi.object({
    fiatAmount: Joi.number().min(1).max(10000).required(),
    fiatCurrency: Joi.string().valid('USD', 'EUR', 'GBP').default('USD'),
    asset: Joi.string().valid('UC').default('UC')
  })),
  asyncHandler(async (req, res) => {
    const { fiatAmount, fiatCurrency, asset } = req.body;

    // Simple 1:1 exchange rate for MVP
    const exchangeRate = 1.0;
    const ucAmount = fiatAmount * exchangeRate;

    // Calculate fees (2.9% processing fee)
    const processingFee = fiatAmount * 0.029;
    const totalFees = processingFee;

    // Generate quote ID
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Quote expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    res.json({
      status: 'success',
      data: {
        quoteId,
        fiatAmount,
        ucAmount,
        exchangeRate,
        fees: {
          processing: processingFee,
          total: totalFees
        },
        expiresAt: expiresAt.toISOString()
      }
    });
  })
);

/**
 * @swagger
 * /payments/intent:
 *   post:
 *     tags: [Payments]
 *     summary: Create payment intent (supports both quote-based and direct)
 *     description: Creates a new Stripe payment intent for purchasing UC tokens. Can use a quote or direct parameters.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: Quote-based payment
 *                 required: [quoteId, paymentMethod]
 *                 properties:
 *                   quoteId:
 *                     type: string
 *                     example: quote_1234567890abcdef
 *                     description: Quote ID from /payments/quote endpoint
 *                   paymentMethod:
 *                     type: string
 *                     enum: [card]
 *                     example: card
 *               - type: object
 *                 title: Direct payment
 *                 required: [amount, currency]
 *                 properties:
 *                   amount:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10000
 *                     example: 100.00
 *                     description: Amount in fiat currency
 *                   currency:
 *                     type: string
 *                     enum: [USD, EUR, GBP]
 *                     example: USD
 *                   paymentMethodId:
 *                     type: string
 *                     example: pm_1234567890abcdef
 *                     description: Stripe payment method ID (optional)
 *     responses:
 *       201:
 *         description: Payment intent created successfully
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
 *                   example: Payment intent created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientSecret:
 *                       type: string
 *                       example: pi_1234567890abcdef_secret_abc123
 *                     paymentId:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     stripePaymentIntentId:
 *                       type: string
 *                       example: pi_1234567890abcdef
 *                     ucAmount:
 *                       type: number
 *                       example: 100.00
 *                     exchangeRate:
 *                       type: number
 *                       example: 1.0
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/intent',
  authenticate,
  requireEmailVerification,
  requireKyc,
  strictRateLimit,
  validate(paymentSchemas.createIntent),
  asyncHandler(async (req, res) => {
    const { amount, currency, paymentMethodId } = req.body;
    
    const result = await PaymentService.createPaymentIntent(
      req.user.id,
      amount,
      currency,
      paymentMethodId
    );
    
    res.status(201).json({
      status: 'success',
      message: 'Payment intent created successfully',
      data: {
        clientSecret: result.clientSecret,
        paymentId: result.payment._id,
        stripePaymentIntentId: result.stripePaymentIntentId,
        ucAmount: result.payment.ucAmount,
        exchangeRate: result.payment.exchangeRate,
      },
    });
  })
);

/**
 * @swagger
 * /payments/mock/intent:
 *   post:
 *     tags: [Payments]
 *     summary: Create mock payment intent
 *     description: Development-only mock payment. Creates a local payment record without Stripe.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *     responses:
 *       201:
 *         description: Mock intent created
 */
router.post('/mock/intent',
  authenticate,
  validate(Joi.object({ amount: Joi.number().min(1).required(), currency: Joi.string().default('USD') })),
  asyncHandler(async (req, res) => {
    const { Payment } = require('../models');
    const { amount, currency } = req.body;
    const ucAmount = amount; // 1:1
    const payment = new Payment({
      userId: req.user.id,
      stripePaymentIntentId: `mock_${Date.now()}`,
      fiatAmount: amount,
      fiatCurrency: currency,
      ucAmount,
      exchangeRate: 1,
      status: 'PENDING',
      events: [{ type: 'mock_intent.created', status: 'pending' }],
    });
    await payment.save();
    res.status(201).json({ status: 'success', data: { paymentId: payment._id, ucAmount } });
  })
);

/**
 * @swagger
 * /payments/mock/confirm:
 *   post:
 *     tags: [Payments]
 *     summary: Confirm mock payment (credits UC)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId]
 *             properties:
 *               paymentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed and UC credited
 */
router.post('/mock/confirm',
  authenticate,
  validate(Joi.object({ paymentId: commonSchemas.objectId.required() })),
  asyncHandler(async (req, res) => {
    const { Payment } = require('../models');
    const payment = await Payment.findOne({ _id: req.body.paymentId, userId: req.user.id });
    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Payment not found' });
    }
    if (payment.status === 'SUCCEEDED') {
      return res.json({ status: 'success', message: 'Already confirmed', data: { paymentId: payment._id } });
    }
    payment.status = 'SUCCEEDED';
    payment.events.push({ type: 'mock_intent.succeeded', status: 'succeeded' });
    await payment.save();
    await require('../services/PaymentService').creditUserAccount(payment);
    res.json({ status: 'success', message: 'Payment confirmed', data: { paymentId: payment._id, ucAmount: payment.ucAmount } });
  })
);

router.post('/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.get('Stripe-Signature');
    
    const result = await PaymentService.processWebhook(req.body, signature);
    
    res.json({
      status: 'success',
      data: result,
    });
  })
);

/**
 * @swagger
 * /payments/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment history
 *     description: Retrieve paginated payment history for the authenticated user
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
 *           maximum: 50
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
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
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
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
 */
router.get('/history',
  authenticate,
  validate(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    
    const result = await PaymentService.getUserPayments(
      req.user.id,
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
 * /payments/{paymentId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment details
 *     description: Retrieve detailed information about a specific payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: Payment ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
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
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:paymentId',
  authenticate,
  validate(Joi.object({
    paymentId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    
    const payment = await PaymentService.getPaymentDetails(req.user.id, paymentId);
    
    res.json({
      status: 'success',
      data: { payment },
    });
  })
);

// Admin routes
router.get('/admin/reconcile',
  authenticate,
  adminOnly,
  validate(Joi.object({
    date: Joi.date().iso().optional(),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    
    const reconciliation = await PaymentService.reconcilePayments(req.user.id, new Date(date));
    
    res.json({
      status: 'success',
      data: reconciliation,
    });
  })
);

router.get('/admin/payments',
  authenticate,
  adminOnly,
  validate(Joi.object({
    status: Joi.string().valid('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED').optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().optional(),
    userId: commonSchemas.objectId.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.userId) query.userId = filters.userId;
    
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
    }

    const [payments, total] = await Promise.all([
      require('../models').Payment.find(query)
        .populate('userId', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      require('../models').Payment.countDocuments(query)
    ]);

    res.json({
      status: 'success',
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

router.get('/admin/stats',
  authenticate,
  adminOnly,
  validate(Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { period } = req.query;
    
    let matchStage = {};
    const now = new Date();
    
    switch (period) {
      case 'day':
        matchStage.createdAt = {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        };
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchStage.createdAt = { $gte: weekAgo };
        break;
      case 'month':
        matchStage.createdAt = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        };
        break;
      case 'year':
        matchStage.createdAt = {
          $gte: new Date(now.getFullYear(), 0, 1),
        };
        break;
    }

    const stats = await require('../models').Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalFiatAmount: { $sum: '$fiatAmount' },
          totalUcAmount: { $sum: '$ucAmount' },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCEEDED'] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
          },
          successfulFiatAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCEEDED'] }, '$fiatAmount', 0] }
          },
          successfulUcAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCEEDED'] }, '$ucAmount', 0] }
          },
        }
      }
    ]);

    const statusBreakdown = await require('../models').Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$fiatAmount' },
        }
      }
    ]);

    const currencyBreakdown = await require('../models').Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$fiatCurrency',
          count: { $sum: 1 },
          totalAmount: { $sum: '$fiatAmount' },
        }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        period,
        overview: stats[0] || {
          totalPayments: 0,
          totalFiatAmount: 0,
          totalUcAmount: 0,
          successfulPayments: 0,
          failedPayments: 0,
          successfulFiatAmount: 0,
          successfulUcAmount: 0,
        },
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            totalAmount: item.totalAmount,
          };
          return acc;
        }, {}),
        currencyBreakdown: currencyBreakdown.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            totalAmount: item.totalAmount,
          };
          return acc;
        }, {}),
      },
    });
  })
);

module.exports = router;