const Stripe = require('stripe');
const crypto = require('crypto');
const { Payment, Account, User, AuditLog } = require('../models');
const LedgerService = require('./LedgerService');
const { NotFoundError, ValidationError, InternalServerError, ConflictError } = require('../utils/errors');
const config = require('../config');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.stripe = new Stripe(config.stripe.secretKey);
  }

  async createPaymentIntent(userId, amount, currency = 'USD', paymentMethodId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get UC exchange rate (simplified - in production, would come from oracle)
      const ucRate = 1.0; // 1 USD = 1 UC for now
      const ucAmount = amount / ucRate;

      // Create Stripe payment intent
      const paymentIntentData = {
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: userId.toString(),
          ucAmount: ucAmount.toString(),
          exchangeRate: ucRate.toString(),
        },
        description: `UC Purchase - ${ucAmount} UC`,
      };

      if (paymentMethodId) {
        paymentIntentData.payment_method = paymentMethodId;
        paymentIntentData.confirm = true;
        paymentIntentData.return_url = 'https://your-app.com/payment-return';
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      // Create local payment record
      const payment = new Payment({
        userId,
        stripePaymentIntentId: paymentIntent.id,
        fiatAmount: amount,
        fiatCurrency: currency,
        ucAmount,
        exchangeRate: ucRate,
        status: paymentIntent.status.toUpperCase(),
        metadata: {
          clientSecret: paymentIntent.client_secret,
          paymentMethodId,
        },
        events: [{
          type: 'payment_intent.created',
          status: paymentIntent.status,
          data: {
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
        }],
      });

      await payment.save();

      await AuditLog.logAction({
        actor: userId,
        role: user.role,
        action: 'CREATE',
        object: { type: 'Payment', id: payment._id },
        after: {
          stripePaymentIntentId: paymentIntent.id,
          amount,
          currency,
          ucAmount,
          status: payment.status,
        },
        metadata: {
          notes: 'Payment intent created',
        },
      });

      logger.info('Payment intent created', {
        userId,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        ucAmount,
      });

      return {
        payment,
        clientSecret: paymentIntent.client_secret,
        stripePaymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      if (error.type && error.type.includes('Stripe')) {
        logger.error('Stripe error:', {
          type: error.type,
          code: error.code,
          message: error.message,
          userId,
        });
        throw new InternalServerError(`Payment processing error: ${error.message}`);
      }
      throw error;
    }
  }

  async processWebhook(rawBody, signature) {
    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.stripe.webhookSecret
      );

      logger.info('Stripe webhook received', {
        eventType: event.type,
        eventId: event.id,
      });

      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSucceeded(event.data.object);
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailed(event.data.object);
        case 'payment_intent.canceled':
          return await this.handlePaymentCanceled(event.data.object);
        case 'charge.dispute.created':
          return await this.handleChargeDispute(event.data.object);
        default:
          logger.info('Unhandled webhook event type:', { eventType: event.type });
          return { processed: false, reason: 'Unhandled event type' };
      }
    } catch (error) {
      if (error.type === 'StripeSignatureVerificationError') {
        logger.error('Invalid Stripe webhook signature:', error);
        throw new ValidationError('Invalid webhook signature');
      }
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  async handlePaymentSucceeded(paymentIntent) {
    try {
      const payment = await Payment.findOne({
        stripePaymentIntentId: paymentIntent.id,
      });

      if (!payment) {
        logger.warn('Payment not found for succeeded intent:', {
          paymentIntentId: paymentIntent.id,
        });
        return { processed: false, reason: 'Payment record not found' };
      }

      if (payment.status === 'SUCCEEDED') {
        logger.info('Payment already processed:', {
          paymentId: payment._id,
          paymentIntentId: paymentIntent.id,
        });
        return { processed: true, reason: 'Already processed' };
      }

      // Update payment status
      payment.status = 'SUCCEEDED';
      payment.events.push({
        type: 'payment_intent.succeeded',
        status: 'succeeded',
        data: paymentIntent,
      });

      // Get charge details for fees
      const charges = paymentIntent.charges?.data || [];
      if (charges.length > 0) {
        const charge = charges[0];
        payment.fees.stripeFee = charge.balance_transaction?.fee || 0;
        payment.metadata.receiptUrl = charge.receipt_url;
      }

      await payment.save();

      // Credit UC to user's account
      await this.creditUserAccount(payment);

      logger.info('Payment succeeded and processed', {
        paymentId: payment._id,
        userId: payment.userId,
        ucAmount: payment.ucAmount,
      });

      return {
        processed: true,
        paymentId: payment._id,
        userId: payment.userId,
        ucAmount: payment.ucAmount,
      };
    } catch (error) {
      logger.error('Error processing payment success:', error);
      throw error;
    }
  }

  async handlePaymentFailed(paymentIntent) {
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (!payment) {
      return { processed: false, reason: 'Payment record not found' };
    }

    payment.status = 'FAILED';
    payment.events.push({
      type: 'payment_intent.payment_failed',
      status: 'failed',
      data: paymentIntent,
    });

    if (paymentIntent.last_payment_error) {
      payment.metadata.failureReason = paymentIntent.last_payment_error.message;
    }

    await payment.save();

    await AuditLog.logAction({
      actor: payment.userId,
      role: 'user',
      action: 'UPDATE',
      object: { type: 'Payment', id: payment._id },
      before: { status: 'PROCESSING' },
      after: { status: 'FAILED' },
      metadata: {
        failureReason: payment.metadata.failureReason,
        notes: 'Payment failed',
      },
      result: { success: false },
    });

    logger.warn('Payment failed', {
      paymentId: payment._id,
      userId: payment.userId,
      reason: payment.metadata.failureReason,
    });

    return { processed: true, status: 'FAILED' };
  }

  async handlePaymentCanceled(paymentIntent) {
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (!payment) {
      return { processed: false, reason: 'Payment record not found' };
    }

    payment.status = 'CANCELED';
    payment.events.push({
      type: 'payment_intent.canceled',
      status: 'canceled',
      data: paymentIntent,
    });

    await payment.save();

    logger.info('Payment canceled', {
      paymentId: payment._id,
      userId: payment.userId,
    });

    return { processed: true, status: 'CANCELED' };
  }

  async handleChargeDispute(dispute) {
    const payment = await Payment.findOne({
      stripePaymentIntentId: dispute.payment_intent,
    });

    if (!payment) {
      return { processed: false, reason: 'Payment record not found' };
    }

    // Log dispute for admin review
    await AuditLog.logAction({
      actor: payment.userId,
      role: 'system',
      action: 'DISPUTE_CREATED',
      object: { type: 'Payment', id: payment._id },
      metadata: {
        disputeId: dispute.id,
        amount: dispute.amount,
        reason: dispute.reason,
        evidence: dispute.evidence,
        notes: 'Stripe charge dispute created',
      },
    });

    logger.warn('Charge dispute created', {
      paymentId: payment._id,
      userId: payment.userId,
      disputeId: dispute.id,
      amount: dispute.amount,
      reason: dispute.reason,
    });

    return { processed: true, status: 'DISPUTED' };
  }

  async creditUserAccount(payment) {
    try {
      // Get user's UC account
      const account = await Account.findOne({
        userId: payment.userId,
        asset: config.assets.UC,
      });

      if (!account) {
        throw new NotFoundError('User UC account not found');
      }

      // Create deposit journal entry
      const entries = [
        {
          accountId: account._id,
          credit: payment.ucAmount,
          meta: {
            type: config.transactionTypes.DEPOSIT,
            description: `UC purchase via Stripe - ${payment.fiatAmount} ${payment.fiatCurrency}`,
            reference: payment.stripePaymentIntentId,
            externalRef: {
              stripePaymentIntentId: payment.stripePaymentIntentId,
              status: 'completed',
            },
          },
        },
      ];

      // Add system debit entry (from cash/liability account)
      const systemCashAccount = await Account.findOne({
        accountType: 'SYSTEM',
        asset: config.assets.UC,
      });

      if (systemCashAccount) {
        entries.push({
          accountId: systemCashAccount._id,
          debit: payment.ucAmount,
          meta: {
            type: config.transactionTypes.DEPOSIT,
            description: `System UC issuance for Stripe payment`,
            reference: payment.stripePaymentIntentId,
          },
        });
      }

      const result = await LedgerService.createJournal(entries, {
        userId: payment.userId,
        transactionType: config.transactionTypes.DEPOSIT,
        description: `UC deposit from Stripe payment`,
        correlationId: payment.stripePaymentIntentId,
        amount: payment.ucAmount,
        currency: config.assets.UC,
      });

      // Link payment to journal
      payment.linkedJournalId = result.journalId;
      await payment.save();

      await AuditLog.logAction({
        actor: payment.userId,
        role: 'system',
        action: 'DEPOSIT',
        object: { type: 'Account', id: account._id },
        metadata: {
          paymentId: payment._id,
          journalId: result.journalId.toString(),
          amount: payment.ucAmount,
          currency: config.assets.UC,
          stripePaymentIntentId: payment.stripePaymentIntentId,
          notes: 'UC credited from Stripe payment',
        },
      });

      logger.info('UC credited to user account', {
        userId: payment.userId,
        paymentId: payment._id,
        ucAmount: payment.ucAmount,
        journalId: result.journalId.toString(),
      });

      return result;
    } catch (error) {
      logger.error('Failed to credit user account:', error);
      throw error;
    }
  }

  async getUserPayments(userId, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments({ userId })
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentDetails(userId, paymentId) {
    const payment = await Payment.findOne({ _id: paymentId, userId });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  async reconcilePayments(adminId, date = new Date()) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_TREASURY].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions for reconciliation');
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get local payments
    const localPayments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'SUCCEEDED',
    });

    // Get Stripe payments for the same period
    const stripePayments = await this.stripe.paymentIntents.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lt: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });

    const reconciliation = {
      date,
      localCount: localPayments.length,
      stripeCount: stripePayments.data.length,
      localTotal: localPayments.reduce((sum, p) => sum + p.fiatAmount, 0),
      stripeTotal: stripePayments.data.reduce((sum, p) => sum + (p.amount / 100), 0),
      discrepancies: [],
    };

    // Check for discrepancies
    const stripeIds = new Set(stripePayments.data.map(p => p.id));
    const localIds = new Set(localPayments.map(p => p.stripePaymentIntentId));

    // Find payments in Stripe but not locally
    stripePayments.data.forEach(stripePayment => {
      if (!localIds.has(stripePayment.id)) {
        reconciliation.discrepancies.push({
          type: 'missing_local',
          stripePaymentIntentId: stripePayment.id,
          amount: stripePayment.amount / 100,
          status: stripePayment.status,
        });
      }
    });

    // Find local payments not in Stripe
    localPayments.forEach(localPayment => {
      if (!stripeIds.has(localPayment.stripePaymentIntentId)) {
        reconciliation.discrepancies.push({
          type: 'missing_stripe',
          paymentId: localPayment._id,
          stripePaymentIntentId: localPayment.stripePaymentIntentId,
          amount: localPayment.fiatAmount,
        });
      }
    });

    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'REPORT_VIEW',
      object: { type: 'Payment', identifier: 'reconciliation' },
      metadata: {
        date: date.toISOString(),
        localCount: reconciliation.localCount,
        stripeCount: reconciliation.stripeCount,
        discrepancyCount: reconciliation.discrepancies.length,
        notes: 'Payment reconciliation performed',
      },
    });

    logger.info('Payment reconciliation completed', {
      adminId,
      date: date.toISOString(),
      localCount: reconciliation.localCount,
      stripeCount: reconciliation.stripeCount,
      discrepancyCount: reconciliation.discrepancies.length,
    });

    return reconciliation;
  }
}

module.exports = new PaymentService();