const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

class FirebaseNotificationService {
  constructor() {
    this.initialized = false;
    this.smtpTransporter = null;
    this.init();
  }

  init() {
    try {
      // Initialize Firebase Admin SDK
      if (!admin.apps.length) {
        let serviceAccount = null;
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

        // Try environment variable first
        if (serviceAccountKey && serviceAccountKey.trim() !== '') {
          try {
            serviceAccount = JSON.parse(serviceAccountKey);
          } catch (parseError) {
            logger.warn('Firebase service account key is invalid JSON. Trying file path instead.', {
              error: parseError.message,
            });
            serviceAccount = null;
          }
        }

        // If env variable failed or doesn't exist, try JSON file
        if (!serviceAccount) {
          try {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.resolve(serviceAccountPath);

            if (fs.existsSync(filePath)) {
              const fileContent = fs.readFileSync(filePath, 'utf8');
              serviceAccount = JSON.parse(fileContent);
              logger.info('Firebase service account loaded from file:', filePath);
            } else {
              logger.warn('Firebase service account file not found:', filePath);
            }
          } catch (fileError) {
            logger.warn('Failed to load Firebase service account from file:', {
              path: serviceAccountPath,
              error: fileError.message
            });
          }
        }

        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
          this.initialized = true;
          logger.info('Firebase Admin SDK initialized successfully');
        } else {
          logger.warn('Firebase service account key not provided. Push notifications disabled.');
        }
      } else {
        this.initialized = true;
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
      this.initialized = false;
    }
  }

  getOrCreateSmtpTransporter() {
    // Validate SMTP config
    const { smtp } = config;
    if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
      throw new Error('SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, SMTP_PASS');
    }

    if (this.smtpTransporter) return this.smtpTransporter;

    this.smtpTransporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    return this.smtpTransporter;
  }

  async sendNotification(fcmToken, notification, data = {}) {
    if (!this.initialized) {
      logger.warn('Firebase not initialized. Skipping push notification.');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          image: notification.image,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#007bff',
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
              'content-available': 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            requireInteraction: true,
            actions: notification.actions || [],
          },
        },
      };

      const response = await admin.messaging().send(message);
      
      logger.info('Push notification sent successfully', {
        messageId: response,
        title: notification.title,
      });

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      logger.error('Failed to send push notification:', {
        error: error.message,
        errorCode: error.code,
        title: notification.title,
      });

      // Handle invalid/expired tokens
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        return {
          success: false,
          error: 'Invalid token',
          shouldRemoveToken: true,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendMulticastNotification(fcmTokens, notification, data = {}) {
    if (!this.initialized) {
      logger.warn('Firebase not initialized. Skipping push notifications.');
      return { success: false, error: 'Firebase not initialized' };
    }

    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) {
      return { success: false, error: 'No valid FCM tokens provided' };
    }

    try {
      const message = {
        tokens: fcmTokens,
        notification: {
          title: notification.title,
          body: notification.body,
          image: notification.image,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#007bff',
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
              'content-available': 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            requireInteraction: true,
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      const results = {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens: [],
        responses: response.responses,
      };

      // Collect invalid tokens for cleanup
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            results.invalidTokens.push(fcmTokens[idx]);
          }
        }
      });

      logger.info('Multicast push notification completed', {
        successCount: results.successCount,
        failureCount: results.failureCount,
        invalidTokensCount: results.invalidTokens.length,
        title: notification.title,
      });

      return {
        success: true,
        ...results,
      };
    } catch (error) {
      logger.error('Failed to send multicast push notification:', {
        error: error.message,
        title: notification.title,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async subscribeToTopic(fcmToken, topic) {
    if (!this.initialized) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      await admin.messaging().subscribeToTopic([fcmToken], topic);
      logger.info('Successfully subscribed to topic', { token: fcmToken, topic });
      return { success: true };
    } catch (error) {
      logger.error('Failed to subscribe to topic:', {
        error: error.message,
        topic,
      });
      return { success: false, error: error.message };
    }
  }

  async unsubscribeFromTopic(fcmToken, topic) {
    if (!this.initialized) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      await admin.messaging().unsubscribeFromTopic([fcmToken], topic);
      logger.info('Successfully unsubscribed from topic', { token: fcmToken, topic });
      return { success: true };
    } catch (error) {
      logger.error('Failed to unsubscribe from topic:', {
        error: error.message,
        topic,
      });
      return { success: false, error: error.message };
    }
  }

  async sendTopicNotification(topic, notification, data = {}) {
    if (!this.initialized) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message = {
        topic: topic,
        notification: {
          title: notification.title,
          body: notification.body,
          image: notification.image,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#007bff',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
          },
        },
      };

      const response = await admin.messaging().send(message);
      
      logger.info('Topic notification sent successfully', {
        messageId: response,
        topic: topic,
        title: notification.title,
      });

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      logger.error('Failed to send topic notification:', {
        error: error.message,
        topic: topic,
        title: notification.title,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Notification templates
  static getWelcomeNotification(user) {
    return {
      title: 'Welcome to Universal Credit!',
      body: `Hi ${user.email}! Welcome to Universal Credit. Please verify your email to get started.`,
      data: {
        type: 'welcome',
        userId: user._id.toString(),
      },
    };
  }

  static getKycApprovalNotification(user) {
    return {
      title: 'KYC Approved! 🎉',
      body: 'Your identity verification has been approved. You can now access all features!',
      data: {
        type: 'kyc_approved',
        userId: user._id.toString(),
      },
    };
  }

  static getTransactionNotification(user, transaction) {
    const isDebit = transaction.type === 'TRANSFER' && transaction.amount < 0;
    const actionText = isDebit ? 'sent' : 'received';
    const amountText = `${Math.abs(transaction.amount)} ${transaction.asset}`;

    return {
      title: `Transaction ${isDebit ? 'Sent' : 'Received'}`,
      body: `You have ${actionText} ${amountText}`,
      data: {
        type: 'transaction',
        userId: user._id.toString(),
        transactionId: transaction.id,
        amount: transaction.amount.toString(),
        asset: transaction.asset,
        transactionType: transaction.type,
      },
    };
  }

  static getPaymentNotification(user, payment) {
    return {
      title: 'Payment Successful! 💰',
      body: `Your payment of $${payment.fiatAmount} has been processed. ${payment.ucAmount} UC added to your account.`,
      data: {
        type: 'payment_success',
        userId: user._id.toString(),
        paymentId: payment._id.toString(),
        fiatAmount: payment.fiatAmount.toString(),
        ucAmount: payment.ucAmount.toString(),
      },
    };
  }

  static getSecurityAlertNotification(user, alertType) {
    const alerts = {
      login: {
        title: 'New Login Detected 🔐',
        body: 'A new login to your account was detected. If this wasn\'t you, please secure your account.',
      },
      password_change: {
        title: 'Password Changed 🔑',
        body: 'Your account password has been successfully changed.',
      },
      suspicious_activity: {
        title: 'Security Alert ⚠️',
        body: 'Suspicious activity detected on your account. Please review your recent activity.',
      },
    };

    return {
      ...alerts[alertType],
      data: {
        type: 'security_alert',
        alertType,
        userId: user._id.toString(),
      },
    };
  }

  /**
   * Send email via SMTP using Nodemailer
   */
  async sendEmail({ to, subject, htmlBody, textBody }) {
    try {
      const transporter = this.getOrCreateSmtpTransporter();

      const fromName = config.smtp.fromName || 'Universal Credit';
      const fromEmail = config.smtp.fromEmail || 'noreply@example.com';

      const info = await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        text: textBody,
        html: htmlBody,
      });

      logger.info('Email sent via SMTP', {
        to,
        subject,
        messageId: info.messageId,
        response: info.response,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email via SMTP:', {
        error: error.message,
        to,
        subject,
      });
      throw error;
    }
  }
}

module.exports = new FirebaseNotificationService();