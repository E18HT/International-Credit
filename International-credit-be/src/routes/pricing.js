const express = require('express');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /pricing/tickers:
 *   get:
 *     tags: [System]
 *     summary: Get mock price tickers
 *     description: Returns mock BTC and Gold prices from two sources and median.
 *     responses:
 *       200:
 *         description: Prices retrieved
 */
router.get('/tickers',
  asyncHandler(async (req, res) => {
    const sourceA = { BTC: 65000, XAU: 2400 };
    const sourceB = { BTC: 65250, XAU: 2390 };
    const median = {
      BTC: (sourceA.BTC + sourceB.BTC) / 2,
      XAU: (sourceA.XAU + sourceB.XAU) / 2,
    };
    res.json({ status: 'success', data: { sourceA, sourceB, median, ts: new Date().toISOString() } });
  })
);

/**
 * @swagger
 * /pricing/fx/quote:
 *   get:
 *     tags: [System]
 *     summary: Get UC->stable swap quote
 *     parameters:
 *       - in: query
 *         name: asset
 *         schema:
 *           type: string
 *           enum: [USDC_mock, USDT_mock]
 *         required: true
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *         required: true
 *     responses:
 *       200:
 *         description: Quote returned
 */
router.get('/fx/quote',
  asyncHandler(async (req, res) => {
    const amount = parseFloat(req.query.amount || '0');
    const feeBps = 50; // 0.50%
    const fee = (amount * feeBps) / 10000;
    const receive = amount - fee;
    res.json({ status: 'success', data: { amount, feeBps, fee, receive } });
  })
);

module.exports = router;


