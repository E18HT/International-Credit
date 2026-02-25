const express = require('express');
const Joi = require('joi');
const { authenticate, requireKyc } = require('../middleware/auth');
const { strictRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const LedgerService = require('../services/LedgerService');
const { Account, Config } = require('../models');
const config = require('../config');

const router = express.Router();

/**
 * @swagger
 * /faucet/uc:
 *   post:
 *     tags: [Payments]
 *     summary: Claim test UC from faucet
 *     description: Credits UC to the authenticated user's account in development/test mode.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10000
 *                 default: 100
 *                 description: Amount of UC to credit
 *               idempotencyKey:
 *                 type: string
 *                 description: Unique key to prevent duplicate credits
 *     responses:
 *       201:
 *         description: UC credited successfully
 *       403:
 *         description: Faucet disabled or paused
 */
router.post('/uc',
  authenticate,
  requireKyc,
  strictRateLimit,
  validate(Joi.object({
    amount: Joi.number().min(1).max(10000).default(100),
    idempotencyKey: Joi.string().optional(),
  })),
  asyncHandler(async (req, res) => {
    const { amount, idempotencyKey } = req.body;

    const systemConfig = await Config.getConfig();
    if (systemConfig?.paused) {
      return res.status(403).json({ status: 'error', message: 'System is paused' });
    }

    // Ensure user UC account exists
    let userAccount = await Account.findOne({ userId: req.user.id, asset: config.assets.UC });
    if (!userAccount) {
      userAccount = new Account({ userId: req.user.id, asset: config.assets.UC, status: 'ACTIVE', accountType: 'USER' });
      await userAccount.save();
    }

    // Find system account for UC debit
    const systemAccount = await Account.findOne({ accountType: 'SYSTEM', asset: config.assets.UC });

    const entries = [
      {
        accountId: userAccount._id,
        credit: amount,
        meta: { type: config.transactionTypes.DEPOSIT, description: 'UC faucet credit', reference: 'faucet' },
      },
    ];

    if (systemAccount) {
      entries.push({
        accountId: systemAccount._id,
        debit: amount,
        meta: { type: config.transactionTypes.DEPOSIT, description: 'Faucet system debit', reference: 'faucet' },
      });
    }

    const result = await LedgerService.createJournal(entries, {
      userId: req.user.id,
      transactionType: config.transactionTypes.DEPOSIT,
      description: 'UC faucet credit',
      correlationId: req.requestId,
      idempotencyKey,
      amount,
      currency: config.assets.UC,
    });

    res.status(201).json({ status: 'success', message: 'UC credited successfully', data: { journalId: result.journalId, amount } });
  })
);

module.exports = router;


