const FirebaseNotificationService = require('./FirebaseNotificationService');
const logger = require('../utils/logger');

/**
 * Web Notification Service
 * Handles web-specific notification logic and integrations
 */
class WebNotificationService {
  
  /**
   * Send notification when user completes KYC
   */
  static async sendKycApprovalNotification(user) {
    try {
      if (!user.preferences.notifications.push) {
        logger.info('Push notifications disabled for user', { userId: user._id });
        return;
      }

      const fcmTokens = user.getActiveFcmTokens();
      if (fcmTokens.length === 0) {
        logger.info('No FCM tokens found for KYC notification', { userId: user._id });
        return;
      }

      const notification = FirebaseNotificationService.getKycApprovalNotification(user);
      const result = await FirebaseNotificationService.sendMulticastNotification(
        fcmTokens,
        notification,
        notification.data
      );

      // Clean up invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        for (const invalidToken of result.invalidTokens) {
          await user.removeFcmToken(invalidToken);
        }
      }

      logger.info('KYC approval notification sent', {
        userId: user._id,
        sentCount: result.successCount,
        failedCount: result.failureCount,
      });

    } catch (error) {
      logger.error('Failed to send KYC approval notification:', {
        userId: user._id,
        error: error.message,
      });
    }
  }

  /**
   * Send notification when payment is successful
   */
  static async sendPaymentSuccessNotification(user, payment) {
    try {
      if (!user.preferences.notifications.push) {
        return;
      }

      const fcmTokens = user.getActiveFcmTokens();
      if (fcmTokens.length === 0) {
        return;
      }

      const notification = FirebaseNotificationService.getPaymentNotification(user, payment);
      const result = await FirebaseNotificationService.sendMulticastNotification(
        fcmTokens,
        notification,
        notification.data
      );

      // Clean up invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        for (const invalidToken of result.invalidTokens) {
          await user.removeFcmToken(invalidToken);
        }
      }

      logger.info('Payment success notification sent', {
        userId: user._id,
        paymentId: payment._id,
        sentCount: result.successCount,
      });

    } catch (error) {
      logger.error('Failed to send payment success notification:', {
        userId: user._id,
        paymentId: payment._id,
        error: error.message,
      });
    }
  }

  /**
   * Send security alert notification
   */
  static async sendSecurityAlert(user, alertType, metadata = {}) {
    try {
      if (!user.preferences.notifications.push) {
        return;
      }

      const fcmTokens = user.getActiveFcmTokens();
      if (fcmTokens.length === 0) {
        return;
      }

      const notification = FirebaseNotificationService.getSecurityAlertNotification(user, alertType);
      notification.data = {
        ...notification.data,
        ...metadata,
      };

      const result = await FirebaseNotificationService.sendMulticastNotification(
        fcmTokens,
        notification,
        notification.data
      );

      // Clean up invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        for (const invalidToken of result.invalidTokens) {
          await user.removeFcmToken(invalidToken);
        }
      }

      logger.info('Security alert notification sent', {
        userId: user._id,
        alertType,
        sentCount: result.successCount,
      });

    } catch (error) {
      logger.error('Failed to send security alert:', {
        userId: user._id,
        alertType,
        error: error.message,
      });
    }
  }

  /**
   * Send transaction notification
   */
  static async sendTransactionNotification(user, transaction) {
    try {
      if (!user.preferences.notifications.push) {
        return;
      }

      const fcmTokens = user.getActiveFcmTokens();
      if (fcmTokens.length === 0) {
        return;
      }

      const notification = FirebaseNotificationService.getTransactionNotification(user, transaction);
      const result = await FirebaseNotificationService.sendMulticastNotification(
        fcmTokens,
        notification,
        notification.data
      );

      // Clean up invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        for (const invalidToken of result.invalidTokens) {
          await user.removeFcmToken(invalidToken);
        }
      }

      logger.info('Transaction notification sent', {
        userId: user._id,
        transactionId: transaction.id,
        sentCount: result.successCount,
      });

    } catch (error) {
      logger.error('Failed to send transaction notification:', {
        userId: user._id,
        transactionId: transaction.id,
        error: error.message,
      });
    }
  }

  /**
   * Send welcome notification to new users
   */
  static async sendWelcomeNotification(user) {
    try {
      // Wait a bit to allow FCM token registration
      setTimeout(async () => {
        if (!user.preferences.notifications.push) {
          return;
        }

        const fcmTokens = user.getActiveFcmTokens();
        if (fcmTokens.length === 0) {
          logger.info('No FCM tokens found for welcome notification', { userId: user._id });
          return;
        }

        const notification = FirebaseNotificationService.getWelcomeNotification(user);
        const result = await FirebaseNotificationService.sendMulticastNotification(
          fcmTokens,
          notification,
          notification.data
        );

        logger.info('Welcome notification sent', {
          userId: user._id,
          sentCount: result.successCount,
        });
      }, 5000); // Wait 5 seconds for token registration

    } catch (error) {
      logger.error('Failed to send welcome notification:', {
        userId: user._id,
        error: error.message,
      });
    }
  }

  /**
   * Auto-subscribe new users to general topics
   */
  static async subscribeUserToDefaultTopics(user) {
    try {
      const fcmTokens = user.getActiveFcmTokens();
      if (fcmTokens.length === 0) {
        return;
      }

      const defaultTopics = ['general_announcements', 'security_alerts'];
      
      for (const topic of defaultTopics) {
        for (const token of fcmTokens) {
          await FirebaseNotificationService.subscribeToTopic(token, topic);
        }
      }

      logger.info('User subscribed to default topics', {
        userId: user._id,
        topics: defaultTopics,
        tokenCount: fcmTokens.length,
      });

    } catch (error) {
      logger.error('Failed to subscribe user to default topics:', {
        userId: user._id,
        error: error.message,
      });
    }
  }

  /**
   * Get notification statistics for user
   */
  static async getNotificationStats(user) {
    try {
      const fcmTokens = user.getActiveFcmTokens();
      const webTokens = fcmTokens.filter(token => 
        user.fcmTokens.find(t => t.token === token && t.deviceInfo.type === 'web')
      );

      return {
        totalDevices: fcmTokens.length,
        webDevices: webTokens.length,
        mobileDevices: fcmTokens.length - webTokens.length,
        notificationsEnabled: user.preferences.notifications.push,
      };
    } catch (error) {
      logger.error('Failed to get notification stats:', {
        userId: user._id,
        error: error.message,
      });
      return null;
    }
  }
}

module.exports = WebNotificationService;