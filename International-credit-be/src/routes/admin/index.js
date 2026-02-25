const express = require('express');

// Compose legacy admin routes with activity history routes
const legacyAdminRouter = require('../admin');
const activityHistoryRouter = require('./history');

const router = express.Router();

// Mount existing admin endpoints (users, kyc, wallets, ledger, payments, etc.)
router.use('/', legacyAdminRouter);

// Mount activity history under /history
router.use('/history', activityHistoryRouter);

module.exports = router;

