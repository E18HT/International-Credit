const { AuditLog, Receipt, User } = require('../models');
const logger = require('../utils/logger');

class CleanupProcessor {
  async cleanupOldLogs(job) {
    const { retentionDays = 90 } = job.data;

    try {
      logger.info('Starting cleanup of old audit logs', { retentionDays });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete old audit logs (keep critical ones longer)
      const criticalActions = [
        'KYC_APPROVE', 'KYC_REJECT',
        'WALLET_WHITELIST', 'WALLET_BLACKLIST',
        'DEPOSIT', 'WITHDRAWAL', 'REVERSAL',
        'INVARIANT_VIOLATION', 'RECONCILIATION_DISCREPANCY'
      ];

      // Delete non-critical logs older than retention period
      const deleteResult = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate },
        action: { $nin: criticalActions }
      });

      // For critical logs, use longer retention (1 year)
      const criticalCutoffDate = new Date();
      criticalCutoffDate.setDate(criticalCutoffDate.getDate() - 365);

      const deleteCriticalResult = await AuditLog.deleteMany({
        timestamp: { $lt: criticalCutoffDate },
        action: { $in: criticalActions }
      });

      const totalDeleted = deleteResult.deletedCount + deleteCriticalResult.deletedCount;

      logger.info('Audit log cleanup completed', {
        regularLogsDeleted: deleteResult.deletedCount,
        criticalLogsDeleted: deleteCriticalResult.deletedCount,
        totalDeleted,
        retentionDays,
      });

      return {
        success: true,
        regularLogsDeleted: deleteResult.deletedCount,
        criticalLogsDeleted: deleteCriticalResult.deletedCount,
        totalDeleted,
        cutoffDate,
      };
    } catch (error) {
      logger.error('Failed to cleanup old audit logs', {
        error: error.message,
        retentionDays,
      });
      throw error;
    }
  }

  async cleanupExpiredTokens(job) {
    try {
      logger.info('Starting cleanup of expired tokens');

      const now = new Date();
      let totalCleaned = 0;

      // Clean expired password reset tokens
      const passwordResetResult = await User.updateMany(
        {
          passwordResetExpires: { $lt: now },
          passwordResetToken: { $exists: true }
        },
        {
          $unset: {
            passwordResetToken: 1,
            passwordResetExpires: 1
          }
        }
      );

      totalCleaned += passwordResetResult.modifiedCount;

      // Clean old email verification tokens (older than 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const emailVerificationResult = await User.updateMany(
        {
          createdAt: { $lt: weekAgo },
          emailVerified: false,
          emailVerificationToken: { $exists: true }
        },
        {
          $unset: {
            emailVerificationToken: 1
          }
        }
      );

      totalCleaned += emailVerificationResult.modifiedCount;

      logger.info('Token cleanup completed', {
        passwordResetTokensCleaned: passwordResetResult.modifiedCount,
        emailVerificationTokensCleaned: emailVerificationResult.modifiedCount,
        totalCleaned,
      });

      return {
        success: true,
        passwordResetTokensCleaned: passwordResetResult.modifiedCount,
        emailVerificationTokensCleaned: emailVerificationResult.modifiedCount,
        totalCleaned,
      };
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', {
        error: error.message,
      });
      throw error;
    }
  }

  async cleanupOldReceipts(job) {
    const { retentionDays = 30 } = job.data;

    try {
      logger.info('Starting cleanup of old receipts', { retentionDays });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete expired receipts
      const deleteResult = await Receipt.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } }, // Already expired
          { createdAt: { $lt: cutoffDate } } // Older than retention period
        ]
      });

      // TODO: Also cleanup associated S3 files
      // This would require AWS SDK integration to delete files from S3

      logger.info('Receipt cleanup completed', {
        receiptsDeleted: deleteResult.deletedCount,
        retentionDays,
      });

      return {
        success: true,
        receiptsDeleted: deleteResult.deletedCount,
        cutoffDate,
      };
    } catch (error) {
      logger.error('Failed to cleanup old receipts', {
        error: error.message,
        retentionDays,
      });
      throw error;
    }
  }

  async cleanupInactiveUsers(job) {
    const { inactiveDays = 365 } = job.data; // 1 year

    try {
      logger.info('Starting cleanup of inactive users', { inactiveDays });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

      // Find users who haven't logged in for the specified period
      // and have no recent activity
      const inactiveUsers = await User.find({
        $and: [
          { isActive: true },
          {
            $or: [
              { lastLogin: { $lt: cutoffDate } },
              { lastLogin: { $exists: false }, createdAt: { $lt: cutoffDate } }
            ]
          },
          { emailVerified: false }, // Only cleanup unverified users
        ]
      }).limit(100); // Limit batch size

      let deactivatedCount = 0;

      for (const user of inactiveUsers) {
        // Check if user has any balances before deactivating
        const { Balance } = require('../models');
        const hasBalance = await Balance.findOne({
          accountId: { $in: await this.getUserAccountIds(user._id) },
          $or: [
            { available: { $gt: 0 } },
            { pending: { $gt: 0 } }
          ]
        });

        // Only deactivate users with no balances
        if (!hasBalance) {
          user.isActive = false;
          await user.save();
          deactivatedCount++;

          logger.info('Deactivated inactive user', {
            userId: user._id,
            email: user.email,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
          });
        }
      }

      logger.info('Inactive user cleanup completed', {
        usersChecked: inactiveUsers.length,
        usersDeactivated: deactivatedCount,
        inactiveDays,
      });

      return {
        success: true,
        usersChecked: inactiveUsers.length,
        usersDeactivated: deactivatedCount,
        cutoffDate,
      };
    } catch (error) {
      logger.error('Failed to cleanup inactive users', {
        error: error.message,
        inactiveDays,
      });
      throw error;
    }
  }

  async getUserAccountIds(userId) {
    const { Account } = require('../models');
    const accounts = await Account.find({ userId }).select('_id');
    return accounts.map(acc => acc._id);
  }

  async cleanupOldSessions(job) {
    const { retentionHours = 72 } = job.data; // 3 days

    try {
      logger.info('Starting cleanup of old sessions', { retentionHours });

      // This would cleanup Redis sessions or JWT blacklist entries
      // For now, this is a placeholder since we're using stateless JWTs
      
      // In a real implementation, you might:
      // 1. Clean up Redis session keys
      // 2. Clean up JWT blacklist entries
      // 3. Clean up remember me tokens

      logger.info('Session cleanup completed (placeholder)', {
        retentionHours,
      });

      return {
        success: true,
        message: 'Session cleanup placeholder - implement based on session storage',
        retentionHours,
      };
    } catch (error) {
      logger.error('Failed to cleanup old sessions', {
        error: error.message,
        retentionHours,
      });
      throw error;
    }
  }

  async optimizeDatabase(job) {
    try {
      logger.info('Starting database optimization');

      const mongoose = require('mongoose');
      const db = mongoose.connection.db;

      // Get collection stats
      const collections = await db.listCollections().toArray();
      const stats = {};

      for (const collection of collections) {
        const collectionName = collection.name;
        try {
          const collStats = await db.collection(collectionName).stats();
          stats[collectionName] = {
            documents: collStats.count,
            avgObjSize: collStats.avgObjSize,
            dataSize: collStats.size,
            storageSize: collStats.storageSize,
            indexes: collStats.nindexes,
          };
        } catch (error) {
          logger.warn(`Failed to get stats for collection ${collectionName}:`, error.message);
        }
      }

      // Log large collections for monitoring
      const largeCollections = Object.entries(stats)
        .filter(([name, stat]) => stat.documents > 100000)
        .map(([name, stat]) => ({ name, ...stat }));

      if (largeCollections.length > 0) {
        logger.info('Large collections detected', { largeCollections });
      }

      logger.info('Database optimization completed', {
        totalCollections: collections.length,
        largeCollections: largeCollections.length,
      });

      return {
        success: true,
        totalCollections: collections.length,
        largeCollections,
        stats,
      };
    } catch (error) {
      logger.error('Failed to optimize database', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new CleanupProcessor();