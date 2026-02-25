const PaymentService = require('../services/PaymentService');
const { AuditLog } = require('../models');
const logger = require('../utils/logger');

class ReconciliationProcessor {
  async dailyReconciliation(job) {
    const { date } = job.data;
    const reconciliationDate = date ? new Date(date) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

    try {
      logger.info('Starting daily reconciliation', {
        date: reconciliationDate.toISOString(),
      });

      // Perform Stripe reconciliation
      const reconciliation = await PaymentService.reconcilePayments(
        'system', // System user ID would be used here
        reconciliationDate
      );

      // Log any discrepancies
      if (reconciliation.discrepancies.length > 0) {
        logger.warn('Payment discrepancies found', {
          date: reconciliationDate.toISOString(),
          discrepancyCount: reconciliation.discrepancies.length,
          discrepancies: reconciliation.discrepancies,
        });

        // Create audit log for discrepancies
        await AuditLog.logAction({
          actor: null,
          role: 'system',
          action: 'RECONCILIATION_DISCREPANCY',
          object: { type: 'Payment', identifier: 'daily_reconciliation' },
          metadata: {
            date: reconciliationDate.toISOString(),
            discrepancyCount: reconciliation.discrepancies.length,
            discrepancies: reconciliation.discrepancies,
            notes: 'Daily payment reconciliation found discrepancies',
          },
          result: { success: false },
        });
      }

      logger.info('Daily reconciliation completed', {
        date: reconciliationDate.toISOString(),
        localCount: reconciliation.localCount,
        stripeCount: reconciliation.stripeCount,
        discrepancyCount: reconciliation.discrepancies.length,
      });

      return {
        success: true,
        date: reconciliationDate.toISOString(),
        ...reconciliation,
      };
    } catch (error) {
      logger.error('Daily reconciliation failed', {
        date: reconciliationDate.toISOString(),
        error: error.message,
      });

      await AuditLog.logAction({
        actor: null,
        role: 'system',
        action: 'RECONCILIATION_ERROR',
        object: { type: 'Payment', identifier: 'daily_reconciliation' },
        metadata: {
          date: reconciliationDate.toISOString(),
          error: error.message,
          notes: 'Daily payment reconciliation failed',
        },
        result: { success: false, error: error.message },
      });

      throw error;
    }
  }

  async stripeReconciliation(job) {
    const { startDate, endDate, adminId } = job.data;

    try {
      logger.info('Starting Stripe reconciliation', {
        startDate,
        endDate,
        adminId,
      });

      const reconciliation = await PaymentService.reconcilePayments(
        adminId || 'system',
        new Date(startDate)
      );

      // Additional Stripe-specific checks could be added here
      // Such as checking for refunds, disputes, etc.

      return {
        success: true,
        period: { startDate, endDate },
        ...reconciliation,
      };
    } catch (error) {
      logger.error('Stripe reconciliation failed', {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  async webhookReconciliation(job) {
    const { webhookType, startDate, endDate } = job.data;

    try {
      logger.info('Starting webhook reconciliation', {
        webhookType,
        startDate,
        endDate,
      });

      const start = new Date(startDate);
      const end = new Date(endDate);

      let results = {};

      switch (webhookType) {
        case 'stripe':
          results = await this.reconcileStripeWebhooks(start, end);
          break;
        case 'sumsub':
          results = await this.reconcileSumsubWebhooks(start, end);
          break;
        default:
          throw new Error(`Unknown webhook type: ${webhookType}`);
      }

      return {
        success: true,
        webhookType,
        period: { startDate, endDate },
        ...results,
      };
    } catch (error) {
      logger.error('Webhook reconciliation failed', {
        webhookType,
        error: error.message,
      });
      throw error;
    }
  }

  async reconcileStripeWebhooks(startDate, endDate) {
    // Check for missed Stripe webhooks by comparing local payment records
    // with Stripe payment intents that should have generated webhooks
    const { Payment } = require('../models');

    const paymentsWithoutWebhooks = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'PENDING',
      'webhook.lastProcessedAt': { $exists: false },
    });

    if (paymentsWithoutWebhooks.length > 0) {
      logger.warn('Found payments without webhook processing', {
        count: paymentsWithoutWebhooks.length,
        paymentIds: paymentsWithoutWebhooks.map(p => p._id),
      });
    }

    return {
      paymentsChecked: await Payment.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      paymentsWithoutWebhooks: paymentsWithoutWebhooks.length,
      issueDetails: paymentsWithoutWebhooks,
    };
  }

  async reconcileSumsubWebhooks(startDate, endDate) {
    // Check for missed Sumsub webhooks
    const { KycApplication } = require('../models');

    const applicationsWithoutWebhooks = await KycApplication.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'PENDING',
      'webhook.lastProcessedAt': { $exists: false },
    });

    if (applicationsWithoutWebhooks.length > 0) {
      logger.warn('Found KYC applications without webhook processing', {
        count: applicationsWithoutWebhooks.length,
        applicationIds: applicationsWithoutWebhooks.map(a => a._id),
      });
    }

    return {
      applicationsChecked: await KycApplication.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      applicationsWithoutWebhooks: applicationsWithoutWebhooks.length,
      issueDetails: applicationsWithoutWebhooks,
    };
  }
}

module.exports = new ReconciliationProcessor();