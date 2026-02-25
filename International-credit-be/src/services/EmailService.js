const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Create AWS SES SMTP transporter
    this.transporter = nodemailer.createTransport({
      host: config.aws.smtp.host,
      port: config.aws.smtp.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.aws.smtp.user,
        pass: config.aws.smtp.password,
      },
    });
  }

  /**
   * Send email verification email to new users
   */
  async sendVerificationEmail(user, verificationToken) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email/${verificationToken}`;

      const mailOptions = {
        from: `${config.aws.ses.fromName} <${config.aws.ses.fromEmail}>`,
        to: user.email,
        subject: 'Welcome to Universal Credit - Please Verify Your Email',
        html: this.getVerificationEmailTemplate(user, verificationUrl),
        text: this.getVerificationEmailTextTemplate(user, verificationUrl)
      };

      // Send email using AWS SES SMTP
      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Verification email sent successfully', {
        userId: user._id,
        email: user.email,
        verificationToken: verificationToken.substring(0, 8) + '...' // Log partial token for debugging
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send verification email:', {
        userId: user._id,
        email: user.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password/${resetToken}`;

      const mailOptions = {
        from: `${config.aws.ses.fromName} <${config.aws.ses.fromEmail}>`,
        to: user.email,
        subject: 'Universal Credit - Password Reset Request',
        html: this.getPasswordResetEmailTemplate(user, resetUrl),
        text: this.getPasswordResetEmailTextTemplate(user, resetUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Password reset email sent successfully', {
        userId: user._id,
        email: user.email
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send password reset email:', {
        userId: user._id,
        email: user.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send 2FA enabled notification email
   */
  async send2FAEnabledEmail(user) {
    try {
      const mailOptions = {
        from: `${config.aws.ses.fromName} <${config.aws.ses.fromEmail}>`,
        to: user.email,
        subject: 'Universal Credit - Two-Factor Authentication Enabled',
        html: this.get2FAEnabledEmailTemplate(user),
        text: this.get2FAEnabledEmailTextTemplate(user)
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('2FA enabled email sent successfully', {
        userId: user._id,
        email: user.email
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send 2FA enabled email:', {
        userId: user._id,
        email: user.email,
        error: error.message
      });
      // Don't throw error for notification emails
      return { success: false, error: error.message };
    }
  }

  /**
   * Send KYC approval email
   */
  async sendKycApprovalEmail(user) {
    try {
      const mailOptions = {
        from: `${config.aws.ses.fromName} <${config.aws.ses.fromEmail}>`,
        to: user.email,
        subject: 'Universal Credit - KYC Verification Approved',
        html: this.getKycApprovalEmailTemplate(user),
        text: this.getKycApprovalEmailTextTemplate(user)
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('KYC approval email sent successfully', {
        userId: user._id,
        email: user.email
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send KYC approval email:', {
        userId: user._id,
        email: user.email,
        error: error.message
      });
      // Don't throw error for notification emails
      return { success: false, error: error.message };
    }
  }

  // Email Templates
  getVerificationEmailTemplate(user, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Universal Credit</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
          .btn { display: inline-block; padding: 12px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .btn:hover { background: #0056b3; }
          .security-note { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Universal Credit!</h1>
            <p>Your journey to financial empowerment starts here</p>
          </div>

          <div class="content">
            <h2>Hi ${user.fullName || user.email}!</h2>

            <p>Thank you for joining Universal Credit. To complete your registration and secure your account, please verify your email address.</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="btn">Verify Email Address</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
              ${verificationUrl}
            </p>

            <div class="security-note">
              <strong>Security Note:</strong> This link will expire in 24 hours for your security. If you didn't create this account, please ignore this email.
            </div>

            <p>Once verified, you'll be able to:</p>
            <ul>
              <li>Complete your KYC verification</li>
              <li>Purchase UC with your credit/debit card</li>
              <li>Send and receive UC transfers</li>
              <li>Participate in governance voting</li>
            </ul>

            <p>If you have any questions, feel free to contact our support team.</p>

            <p>Welcome aboard!<br>
            <strong>The Universal Credit Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Universal Credit. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getVerificationEmailTextTemplate(user, verificationUrl) {
    return `
      Welcome to Universal Credit!

      Hi ${user.fullName || user.email},

      Thank you for joining Universal Credit. To complete your registration and secure your account, please verify your email address by visiting:

      ${verificationUrl}

      This link will expire in 24 hours for your security. If you didn't create this account, please ignore this email.

      Once verified, you'll be able to:
      - Complete your KYC verification
      - Purchase UC with your credit/debit card
      - Send and receive UC transfers
      - Participate in governance voting

      If you have any questions, feel free to contact our support team.

      Welcome aboard!
      The Universal Credit Team

      ---
      © ${new Date().getFullYear()} Universal Credit. All rights reserved.
      This is an automated message. Please do not reply to this email.
    `;
  }

  getPasswordResetEmailTemplate(user, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Universal Credit</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
          .btn { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .btn:hover { background: #c82333; }
          .security-note { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
            <p>Universal Credit</p>
          </div>

          <div class="content">
            <h2>Hi ${user.fullName || user.email}!</h2>

            <p>We received a request to reset your password for your Universal Credit account.</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
              ${resetUrl}
            </p>

            <div class="security-note">
              <strong>Security Note:</strong> This link will expire in 10 minutes for your security. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>

            <p>For your security, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Enabling two-factor authentication</li>
              <li>Not sharing your login credentials</li>
            </ul>

            <p>If you continue to have issues, please contact our support team.</p>

            <p>Best regards,<br>
            <strong>The Universal Credit Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Universal Credit. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetEmailTextTemplate(user, resetUrl) {
    return `
      Password Reset Request - Universal Credit

      Hi ${user.fullName || user.email},

      We received a request to reset your password for your Universal Credit account.

      To reset your password, visit: ${resetUrl}

      This link will expire in 10 minutes for your security. If you didn't request this password reset, please ignore this email and your password will remain unchanged.

      For your security, we recommend:
      - Using a strong, unique password
      - Enabling two-factor authentication
      - Not sharing your login credentials

      If you continue to have issues, please contact our support team.

      Best regards,
      The Universal Credit Team

      ---
      © ${new Date().getFullYear()} Universal Credit. All rights reserved.
      This is an automated message. Please do not reply to this email.
    `;
  }

  get2FAEnabledEmailTemplate(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Two-Factor Authentication Enabled - Universal Credit</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
          .security-note { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 2FA Enabled Successfully</h1>
            <p>Your account is now more secure</p>
          </div>

          <div class="content">
            <h2>Hi ${user.fullName || user.email}!</h2>

            <p>Two-factor authentication has been successfully enabled on your Universal Credit account.</p>

            <div class="security-note">
              <strong>✅ Your account is now protected with 2FA</strong><br>
              You'll need to enter a code from your authenticator app when logging in.
            </div>

            <p><strong>Important reminders:</strong></p>
            <ul>
              <li>Keep your backup codes in a safe place</li>
              <li>Don't share your authenticator app with others</li>
              <li>If you lose access to your authenticator app, use your backup codes</li>
              <li>You can disable 2FA anytime from your account settings</li>
            </ul>

            <p>If you didn't enable 2FA, please contact our support team immediately.</p>

            <p>Thank you for keeping your account secure!<br>
            <strong>The Universal Credit Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Universal Credit. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  get2FAEnabledEmailTextTemplate(user) {
    return `
      Two-Factor Authentication Enabled - Universal Credit

      Hi ${user.fullName || user.email},

      Two-factor authentication has been successfully enabled on your Universal Credit account.

      Your account is now protected with 2FA. You'll need to enter a code from your authenticator app when logging in.

      Important reminders:
      - Keep your backup codes in a safe place
      - Don't share your authenticator app with others
      - If you lose access to your authenticator app, use your backup codes
      - You can disable 2FA anytime from your account settings

      If you didn't enable 2FA, please contact our support team immediately.

      Thank you for keeping your account secure!
      The Universal Credit Team

      ---
      © ${new Date().getFullYear()} Universal Credit. All rights reserved.
      This is an automated message. Please do not reply to this email.
    `;
  }

  getKycApprovalEmailTemplate(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KYC Verification Approved - Universal Credit</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
          .success-note { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 20px 0; }
          .feature-list { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 KYC Verification Approved!</h1>
            <p>Welcome to the Universal Credit community</p>
          </div>

          <div class="content">
            <h2>Hi ${user.fullName || user.email}!</h2>

            <div class="success-note">
              <strong>✅ Congratulations!</strong><br>
              Your identity verification has been approved. Your Universal Credit account is now fully activated.
            </div>

            <div class="feature-list">
              <h3>🚀 You can now access all features:</h3>
              <ul>
                <li><strong>💳 Purchase UC</strong> - Buy Universal Credit with your credit/debit card</li>
                <li><strong>💸 Send Transfers</strong> - Send UC to other users instantly</li>
                <li><strong>📥 Receive Payments</strong> - Accept UC from other users</li>
                <li><strong>🗳️ Governance Voting</strong> - Participate in community decisions</li>
                <li><strong>⭐ Premium Features</strong> - Access advanced trading and analytics</li>
                <li><strong>🔒 Enhanced Security</strong> - Full account protection and monitoring</li>
              </ul>
            </div>

            <p>Your verification was completed on <strong>${new Date().toLocaleDateString()}</strong>.</p>

            <p>Ready to get started? Log in to your account and explore everything Universal Credit has to offer.</p>

            <p>Thank you for being part of our community!<br>
            <strong>The Universal Credit Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Universal Credit. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getKycApprovalEmailTextTemplate(user) {
    return `
      KYC Verification Approved! - Universal Credit

      Hi ${user.fullName || user.email},

      Congratulations! Your identity verification has been approved. Your Universal Credit account is now fully activated.

      You can now access all features:
      - Purchase UC with your credit/debit card
      - Send UC transfers to other users instantly
      - Receive UC payments from other users
      - Participate in governance voting
      - Access premium features and analytics
      - Full account protection and monitoring

      Your verification was completed on ${new Date().toLocaleDateString()}.

      Ready to get started? Log in to your account and explore everything Universal Credit has to offer.

      Thank you for being part of our community!
      The Universal Credit Team

      ---
      © ${new Date().getFullYear()} Universal Credit. All rights reserved.
      This is an automated message. Please do not reply to this email.
    `;
  }
}

module.exports = new EmailService();