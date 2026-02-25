const Queue = require('bull');
const connectDatabase = require('./config/database');
const config = require('./config');
const logger = require('./utils/logger');

// Job processors
const emailProcessor = require('./workers/emailProcessor');
const notificationProcessor = require('./workers/notificationProcessor');
const reconciliationProcessor = require('./workers/reconciliationProcessor');
const invariantProcessor = require('./workers/invariantProcessor');
const reservesProcessor = require('./workers/reservesProcessor');
const cleanupProcessor = require('./workers/cleanupProcessor');

class WorkerService {
  constructor() {
    this.queues = {};
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      await connectDatabase();
      logger.info('Worker service database connected');

      // Initialize queues
      this.queues.email = new Queue('email processing', config.redis.url);
      this.queues.notifications = new Queue('push notifications', config.redis.url);
      this.queues.reconciliation = new Queue('payment reconciliation', config.redis.url);
      this.queues.invariants = new Queue('ledger invariants', config.redis.url);
      this.queues.reserves = new Queue('reserves snapshots', config.redis.url);
      this.queues.cleanup = new Queue('data cleanup', config.redis.url);

      // Set up job processors
      this.setupProcessors();
      
      // Set up recurring jobs
      this.setupRecurringJobs();

      // Set up error handling
      this.setupErrorHandling();

      logger.info('Worker service initialized successfully', {
        queues: Object.keys(this.queues),
        redis: config.redis.url,
      });
    } catch (error) {
      logger.error('Failed to initialize worker service:', error);
      process.exit(1);
    }
  }

  setupProcessors() {
    // Email processing
    this.queues.email.process('send-email', 10, emailProcessor.sendEmail);
    this.queues.email.process('send-bulk-email', 5, emailProcessor.sendBulkEmail);

    // Push notifications
    this.queues.notifications.process('send-push-notification', 20, notificationProcessor.sendPushNotification);
    this.queues.notifications.process('send-bulk-push-notification', 5, notificationProcessor.sendBulkPushNotification);
    this.queues.notifications.process('send-topic-notification', 10, notificationProcessor.sendTopicNotification);

    // Payment reconciliation
    this.queues.reconciliation.process('daily-reconciliation', reconciliationProcessor.dailyReconciliation);
    this.queues.reconciliation.process('stripe-reconciliation', reconciliationProcessor.stripeReconciliation);

    // Ledger invariants
    this.queues.invariants.process('check-invariants', invariantProcessor.checkInvariants);
    this.queues.invariants.process('fix-balance-discrepancy', invariantProcessor.fixBalanceDiscrepancy);

    // Reserves snapshots
    this.queues.reserves.process('create-snapshot', reservesProcessor.createSnapshot);
    this.queues.reserves.process('update-collateral-ratio', reservesProcessor.updateCollateralRatio);

    // Data cleanup
    this.queues.cleanup.process('cleanup-old-logs', cleanupProcessor.cleanupOldLogs);
    this.queues.cleanup.process('cleanup-expired-tokens', cleanupProcessor.cleanupExpiredTokens);
    this.queues.cleanup.process('cleanup-old-receipts', cleanupProcessor.cleanupOldReceipts);

    logger.info('Job processors registered');
  }

  setupRecurringJobs() {
    // Daily reconciliation at 2 AM
    this.queues.reconciliation.add('daily-reconciliation', {}, {
      repeat: { cron: '0 2 * * *' },
      removeOnComplete: 10,
      removeOnFail: 20,
    });

    // Ledger invariants check every hour
    this.queues.invariants.add('check-invariants', {}, {
      repeat: { cron: '0 * * * *' },
      removeOnComplete: 5,
      removeOnFail: 10,
    });

    // Reserves snapshot every 15 minutes
    this.queues.reserves.add('create-snapshot', {}, {
      repeat: { cron: '*/15 * * * *' },
      removeOnComplete: 100,
      removeOnFail: 20,
    });

    // Cleanup jobs
    this.queues.cleanup.add('cleanup-old-logs', {}, {
      repeat: { cron: '0 1 * * 0' }, // Weekly on Sunday at 1 AM
      removeOnComplete: 5,
      removeOnFail: 5,
    });

    this.queues.cleanup.add('cleanup-expired-tokens', {}, {
      repeat: { cron: '0 0 * * *' }, // Daily at midnight
      removeOnComplete: 5,
      removeOnFail: 5,
    });

    this.queues.cleanup.add('cleanup-old-receipts', {}, {
      repeat: { cron: '0 3 * * *' }, // Daily at 3 AM
      removeOnComplete: 5,
      removeOnFail: 5,
    });

    logger.info('Recurring jobs scheduled');
  }

  setupErrorHandling() {
    Object.values(this.queues).forEach((queue, index) => {
      const queueName = Object.keys(this.queues)[index];

      queue.on('error', (error) => {
        logger.error(`Queue ${queueName} error:`, error);
      });

      queue.on('waiting', (jobId) => {
        logger.debug(`Job ${jobId} is waiting in queue ${queueName}`);
      });

      queue.on('active', (job) => {
        logger.info(`Job ${job.id} started in queue ${queueName}`, {
          jobType: job.name,
          data: job.data,
        });
      });

      queue.on('completed', (job, result) => {
        logger.info(`Job ${job.id} completed in queue ${queueName}`, {
          jobType: job.name,
          duration: Date.now() - job.processedOn,
          result: typeof result === 'object' ? Object.keys(result) : result,
        });
      });

      queue.on('failed', (job, error) => {
        logger.error(`Job ${job.id} failed in queue ${queueName}:`, {
          jobType: job.name,
          error: error.message,
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts,
        });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} stalled in queue ${queueName}`, {
          jobType: job.name,
        });
      });
    });
  }

  async addJob(queueName, jobType, data, options = {}) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await this.queues[queueName].add(jobType, data, {
      removeOnComplete: 10,
      removeOnFail: 20,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options,
    });

    logger.info(`Job added to queue ${queueName}`, {
      jobId: job.id,
      jobType,
      data,
    });

    return job;
  }

  async getQueueStats() {
    const stats = {};

    for (const [name, queue] of Object.entries(this.queues)) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    }

    return stats;
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logger.info('Shutting down worker service...');

    try {
      // Close all queues
      await Promise.all(
        Object.values(this.queues).map(queue => queue.close())
      );

      logger.info('Worker service shut down gracefully');
    } catch (error) {
      logger.error('Error during worker shutdown:', error);
    }
  }
}

// Create and export worker instance
const workerService = new WorkerService();

// Initialize if running as main process
if (require.main === module) {
  workerService.initialize();

  // Graceful shutdown
  process.on('SIGTERM', () => workerService.shutdown());
  process.on('SIGINT', () => workerService.shutdown());

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception in worker:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection in worker:', { reason, promise });
    process.exit(1);
  });
}

module.exports = workerService;