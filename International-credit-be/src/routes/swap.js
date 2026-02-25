const express = require('express');
const Joi = require('joi');
const { authenticate, requireKyc } = require('../middleware/auth');
const { strictRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { Account, Config } = require('../models');
const LedgerService = require('../services/LedgerService');
const config = require('../config');

const router = express.Router();

/**
 * @swagger
 * /swap:
 *   post:
 *     tags: [Ledger]
 *     summary: Swap UC to stable mock assets
 *     description: Simulates UC -> USDC_mock/USDT_mock swap with fee debited.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, toAsset]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *               toAsset:
 *                 type: string
 *                 enum: [USDC_mock, USDT_mock]
 *     responses:
 *       201:
 *         description: Swap completed
 */
router.post('/',
  authenticate,
  requireKyc,
  strictRateLimit,
  validate(Joi.object({
    amount: Joi.number().min(1).required(),
    toAsset: Joi.string().valid('USDC_mock', 'USDT_mock').required(),
    idempotencyKey: Joi.string().optional(),
  })),
  asyncHandler(async (req, res) => {
    const { amount, toAsset, idempotencyKey } = req.body;
    const systemConfig = await Config.getConfig();
    if (systemConfig?.paused) {
      return res.status(403).json({ status: 'error', message: 'System is paused' });
    }

    const feeBps = systemConfig?.feeStructure?.swapFeeBps || 50; // 0.5%
    const feeAmount = (amount * feeBps) / 10000;
    const receiveAmount = amount - feeAmount;

    const ucAccount = await Account.findOne({ userId: req.user.id, asset: config.assets.UC });
    const toAccount = await Account.findOne({ userId: req.user.id, asset: toAsset });
    if (!ucAccount || !toAccount) {
      return res.status(400).json({ status: 'error', message: 'Required accounts not found' });
    }

    const feeAccount = await Account.findOne({ accountType: 'FEE', asset: config.assets.UC });

    const entries = [
      // User gives UC
      { accountId: ucAccount._id, debit: amount, meta: { type: config.transactionTypes.SWAP, description: `Swap UC -> ${toAsset}` } },
      // User receives stable
      { accountId: toAccount._id, credit: receiveAmount, meta: { type: config.transactionTypes.SWAP, description: `Swap UC -> ${toAsset}` } },
    ];
    if (feeAmount > 0 && feeAccount) {
      entries.push({ accountId: feeAccount._id, credit: feeAmount, meta: { type: config.transactionTypes.FEE, description: 'Swap fee' } });
    }

    const result = await LedgerService.createJournal(entries, {
      userId: req.user.id,
      transactionType: config.transactionTypes.SWAP,
      description: `Swap UC -> ${toAsset}`,
      correlationId: req.requestId,
      idempotencyKey,
      amount,
      currency: config.assets.UC,
    });

    res.status(201).json({ status: 'success', message: 'Swap completed', data: { journalId: result.journalId, feeAmount, receiveAmount } });
  })
);

module.exports = router;


