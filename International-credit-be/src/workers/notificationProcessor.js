const FirebaseNotificationService = require('../services/FirebaseNotificationService');
const { User } = require('../models');
const logger = require('../utils/logger');

class NotificationProcessor {
  async sendPushNotification(job) {
    const { userId, notification, data = {} } = job.data;

    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn('User not found for push notification', { userId });
        return { success: false, error: 'User not found' };
      }

      if (!user.preferences.notifications.push) {
        logger.info('Push notifications disabled for user', { userId: user._id });
        return { success: false, error: 'Push notifications disabled' };
      }

      const fcmTokens = user.getActiveFcmTokens();
      if (fcmTokens.length === 0) {
        logger.info('No active FCM tokens for user', { userId: user._id });
        return { success: false, error: 'No active FCM tokens' };
      }

      const results = [];
      const invalidTokens = [];

      // Send to each token
      for (const token of fcmTokens) {
        const result = await FirebaseNotificationService.sendNotification(
          token,
          notification,
          {
            ...data,
            userId: user._id.toString(),
          }
        );

        if (result.success) {
          results.push(result);
        } else if (result.shouldRemoveToken) {
          invalidTokens.push(token);
          logger.info('Removing invalid FCM token', { token: token.substring(0, 20) + '...' });
        }
      }

      // Clean up invalid tokens
      for (const invalidToken of invalidTokens) {
        await user.removeFcmToken(invalidToken);
      }

      logger.info('Push notification job completed', {
        userId: user._id,
        totalTokens: fcmTokens.length,
        successCount: results.length,
        invalidTokens: invalidTokens.length,
        title: notification.title,
      });

      return {
        success: results.length > 0,
        results,
        invalidTokens: invalidTokens.length,
        totalSent: results.length,
      };
    } catch (error) {
      logger.error('Failed to send push notification:', {
        error: error.message,
        userId,
        title: notification.title,
      });
      throw error;
    }
  }

  async sendBulkPushNotification(job) {
    const { userIds, notification, data = {} } = job.data;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, error: 'No user IDs provided' };
    }

    try {
      const users = await User.find({
        _id: { $in: userIds },
        'preferences.notifications.push': true,
        isActive: true,
      });

      if (users.length === 0) {
        logger.info('No users found with push notifications enabled', { userIds });
        return { success: false, error: 'No eligible users found' };
      }

      // Collect all FCM tokens
      const allTokens = [];
      const userTokenMap = new Map();

      users.forEach(user => {
        const tokens = user.getActiveFcmTokens();
        tokens.forEach(token => {
          allTokens.push(token);
          userTokenMap.set(token, user._id);
        });
      });

      if (allTokens.length === 0) {
        logger.info('No active FCM tokens found for users', { userCount: users.length });
        return { success: false, error: 'No active FCM tokens found' };
      }

      // Send multicast notification
      const result = await FirebaseNotificationService.sendMulticastNotification(
        allTokens,
        notification,
        data
      );

      // Clean up invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        const tokenCleanupPromises = result.invalidTokens.map(async (invalidToken) => {
          const userId = userTokenMap.get(invalidToken);
          if (userId) {
            const user = users.find(u => u._id.equals(userId));
            if (user) {
              await user.removeFcmToken(invalidToken);
            }
          }
        });

        await Promise.all(tokenCleanupPromises);
      }

      logger.info('Bulk push notification job completed', {
        userCount: users.length,
        totalTokens: allTokens.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
        invalidTokens: result.invalidTokens ? result.invalidTokens.length : 0,
        title: notification.title,
      });

      return {
        success: result.success,
        userCount: users.length,
        totalTokens: allTokens.length,
        ...result,
      };
    } catch (error) {
      logger.error('Failed to send bulk push notification:', {
        error: error.message,
        userCount: userIds.length,
        title: notification.title,
      });
      throw error;
    }
  }

  async sendTopicNotification(job) {
    const { topic, notification, data = {} } = job.data;

    try {
      const result = await FirebaseNotificationService.sendTopicNotification(
        topic,
        notification,
        data
      );

      logger.info('Topic notification job completed', {
        topic,
        success: result.success,
        title: notification.title,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send topic notification:', {
        error: error.message,
        topic,
        title: notification.title,
      });
      throw error;
    }
  }

  // Helper methods for common notifications
  async sendWelcomeNotification(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return { success: false, error: 'User not found' };

      const notification = FirebaseNotificationService.getWelcomeNotification(user);
      
      return this.sendPushNotification({
        data: {
          userId,
          notification: notification,
          data: notification.data,
        },
      });
    } catch (error) {
      logger.error('Failed to send welcome notification:', error);
      throw error;
    }
  }

  async sendKycApprovalNotification(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return { success: false, error: 'User not found' };

      const notification = FirebaseNotificationService.getKycApprovalNotification(user);
      
      return this.sendPushNotification({
        data: {
          userId,
          notification: notification,
          data: notification.data,
        },
      });
    } catch (error) {
      logger.error('Failed to send KYC approval notification:', error);
      throw error;
    }
  }

  async sendTransactionNotification(userId, transaction) {
    try {
      const user = await User.findById(userId);
      if (!user) return { success: false, error: 'User not found' };

      const notification = FirebaseNotificationService.getTransactionNotification(user, transaction);
      
      return this.sendPushNotification({
        data: {
          userId,
          notification: notification,
          data: notification.data,
        },
      });
    } catch (error) {
      logger.error('Failed to send transaction notification:', error);
      throw error;
    }
  }

  async sendPaymentNotification(userId, payment) {
    try {
      const user = await User.findById(userId);
      if (!user) return { success: false, error: 'User not found' };

      const notification = FirebaseNotificationService.getPaymentNotification(user, payment);
      
      return this.sendPushNotification({
        data: {
          userId,
          notification: notification,
          data: notification.data,
        },
      });
    } catch (error) {
      logger.error('Failed to send payment notification:', error);
      throw error;
    }
  }

  async sendSecurityAlertNotification(userId, alertType) {
    try {
      const user = await User.findById(userId);
      if (!user) return { success: false, error: 'User not found' };

      const notification = FirebaseNotificationService.getSecurityAlertNotification(user, alertType);
      
      return this.sendPushNotification({
        data: {
          userId,
          notification: notification,
          data: notification.data,
        },
      });
    } catch (error) {
      logger.error('Failed to send security alert notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationProcessor();