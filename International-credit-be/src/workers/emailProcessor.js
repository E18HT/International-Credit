const AWS = require('aws-sdk');
const config = require('../config');
const logger = require('../utils/logger');

// Configure AWS SES
const ses = new AWS.SES({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

class EmailProcessor {
  async sendEmail(job) {
    const { to, subject, htmlBody, textBody, from, replyTo } = job.data;

    try {
      const params = {
        Source: from || `${config.aws.ses.fromName} <${config.aws.ses.fromEmail}>`,
        Destination: {
          ToAddresses: Array.isArray(to) ? to : [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      };

      if (replyTo) {
        params.ReplyToAddresses = [replyTo];
      }

      const result = await ses.sendEmail(params).promise();

      logger.info('Email sent successfully', {
        messageId: result.MessageId,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
      });

      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error) {
      logger.error('Failed to send email:', {
        error: error.message,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
      });
      throw error;
    }
  }

  async sendBulkEmail(job) {
    const { recipients, subject, htmlBody, textBody, from } = job.data;
    const results = [];
    const errors = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail({
          data: {
            to: recipient.email,
            subject: this.personalizeSubject(subject, recipient),
            htmlBody: this.personalizeBody(htmlBody, recipient),
            textBody: this.personalizeBody(textBody, recipient),
            from,
          }
        });
        results.push({ email: recipient.email, ...result });
      } catch (error) {
        errors.push({ email: recipient.email, error: error.message });
      }
    }

    logger.info('Bulk email completed', {
      total: recipients.length,
      successful: results.length,
      failed: errors.length,
    });

    return {
      total: recipients.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  personalizeSubject(template, recipient) {
    return template
      .replace(/\{\{name\}\}/g, recipient.name || 'User')
      .replace(/\{\{email\}\}/g, recipient.email);
  }

  personalizeBody(template, recipient) {
    return template
      .replace(/\{\{name\}\}/g, recipient.name || 'User')
      .replace(/\{\{email\}\}/g, recipient.email)
      .replace(/\{\{userId\}\}/g, recipient.userId || '');
  }

  // Email templates
  static getWelcomeEmail(user, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    
    return {
      subject: 'Welcome to Universal Credit!',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Universal Credit!</h1>
          <p>Hi ${user.email},</p>
          <p>Thank you for signing up for Universal Credit. To get started, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
          </div>
          <p>If you didn't create this account, please ignore this email.</p>
          <p>Best regards,<br>The Universal Credit Team</p>
        </div>
      `,
      textBody: `
        Welcome to Universal Credit!
        
        Hi ${user.email},
        
        Thank you for signing up for Universal Credit. To get started, please verify your email address by visiting:
        ${verificationUrl}
        
        If you didn't create this account, please ignore this email.
        
        Best regards,
        The Universal Credit Team
      `,
    };
  }

  static getKycApprovalEmail(user) {
    return {
      subject: 'KYC Verification Approved',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #28a745;">KYC Verification Approved</h1>
          <p>Hi ${user.email},</p>
          <p>Great news! Your identity verification has been approved. You can now access all Universal Credit features:</p>
          <ul>
            <li>Purchase UC with your credit/debit card</li>
            <li>Send UC transfers to other users</li>
            <li>Participate in governance voting</li>
            <li>Access premium features</li>
          </ul>
          <p>Thank you for completing the verification process!</p>
          <p>Best regards,<br>The Universal Credit Team</p>
        </div>
      `,
      textBody: `
        KYC Verification Approved
        
        Hi ${user.email},
        
        Great news! Your identity verification has been approved. You can now access all Universal Credit features including purchasing UC, sending transfers, and participating in governance.
        
        Thank you for completing the verification process!
        
        Best regards,
        The Universal Credit Team
      `,
    };
  }

  static getTransactionNotificationEmail(user, transaction) {
    const isDebit = transaction.type === 'TRANSFER' && transaction.amount < 0;
    const actionText = isDebit ? 'sent' : 'received';
    const amountText = `${Math.abs(transaction.amount)} ${transaction.asset}`;

    return {
      subject: `UC Transaction: ${amountText} ${actionText}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Transaction ${isDebit ? 'Sent' : 'Received'}</h1>
          <p>Hi ${user.email},</p>
          <p>You have ${actionText} ${amountText}.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;"><strong>Amount:</strong></td><td>${amountText}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Type:</strong></td><td>${transaction.type}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Date:</strong></td><td>${new Date(transaction.timestamp).toLocaleString()}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Transaction ID:</strong></td><td>${transaction.id}</td></tr>
            </table>
          </div>
          <p>Best regards,<br>The Universal Credit Team</p>
        </div>
      `,
      textBody: `
        Transaction ${isDebit ? 'Sent' : 'Received'}
        
        Hi ${user.email},
        
        You have ${actionText} ${amountText}.
        
        Amount: ${amountText}
        Type: ${transaction.type}
        Date: ${new Date(transaction.timestamp).toLocaleString()}
        Transaction ID: ${transaction.id}
        
        Best regards,
        The Universal Credit Team
      `,
    };
  }
}

module.exports = new EmailProcessor();