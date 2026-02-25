const axios = require('axios');
const crypto = require('crypto');
const { KycApplication, User, AuditLog } = require('../models');
const { NotFoundError, ConflictError, InternalServerError } = require('../utils/errors');
const config = require('../config');
const logger = require('../utils/logger');
const EmailService = require('./EmailService');

class KycService {
  constructor() {
    this.sumsub = axios.create({
      baseURL: config.sumsub.baseUrl,
      headers: {
        'X-App-Token': config.sumsub.appToken,
        'Content-Type': 'application/json',
      },
    });
  }

  generateSumsubSignature(method, url, timestamp, body = '') {
    const signature = crypto
      .createHmac('sha256', config.sumsub.secretKey)
      .update(timestamp + method.toUpperCase() + url + body)
      .digest('hex');
    return signature;
  }

  async createApplicant(userId, level = 'basic', externalUserId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const existingApplication = await KycApplication.findOne({ 
        userId, 
        status: { $in: ['PENDING', 'APPROVED'] } 
      });
      
      if (existingApplication) {
        throw new ConflictError('Active KYC application already exists');
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const url = '/resources/applicants?levelName=' + level;
      const body = JSON.stringify({
        externalUserId: externalUserId || userId.toString(),
        info: {
          firstName: '',
          lastName: '',
          email: user.email,
        },
      });

      const signature = this.generateSumsubSignature('POST', url, timestamp, body);

      const response = await this.sumsub.post(url, JSON.parse(body), {
        headers: {
          'X-App-Access-Ts': timestamp,
          'X-App-Access-Sig': signature,
        },
      });

      const kycApplication = new KycApplication({
        userId,
        sumsubApplicantId: response.data.id,
        status: 'PENDING',
        level,
        externalUserId: externalUserId || userId.toString(),
      });

      await kycApplication.save();

      await AuditLog.logAction({
        actor: userId,
        role: user.role,
        action: 'CREATE',
        object: { type: 'KycApplication', id: kycApplication._id },
        after: {
          sumsubApplicantId: response.data.id,
          status: 'PENDING',
          level,
        },
        metadata: {
          notes: 'KYC application created',
        },
      });

      logger.info('KYC application created', {
        userId,
        sumsubApplicantId: response.data.id,
        level,
      });

      return {
        application: kycApplication,
        sumsubData: response.data,
      };
    } catch (error) {
      if (error.response) {
        logger.error('Sumsub API error:', {
          status: error.response.status,
          data: error.response.data,
          userId,
        });
        throw new InternalServerError(`KYC service error: ${error.response.data.description || 'Unknown error'}`);
      }
      throw error;
    }
  }

  async getAccessToken(externalUserId, level = 'basic', ttlInSecs = 1800) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const url = `/resources/accessTokens?userId=${externalUserId}&levelName=${level}&ttlInSecs=${ttlInSecs}`;

      const signature = this.generateSumsubSignature('POST', url, timestamp);

      const response = await this.sumsub.post(url, {}, {
        headers: {
          'X-App-Access-Ts': timestamp,
          'X-App-Access-Sig': signature,
        },
      });

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (ttlInSecs * 1000));

      return {
        accessToken: response.data.token,
        userId: response.data.userId,
        expiresAt: expiresAt.toISOString(),
        ttlInSecs
      };
    } catch (error) {
      if (error.response) {
        logger.error('Sumsub access token error:', {
          status: error.response.status,
          data: error.response.data,
          externalUserId,
          level,
        });
        throw new InternalServerError(`Failed to generate access token: ${error.response.data.description || 'Unknown error'}`);
      }
      throw error;
    }
  }

  async getApplicantStatus(sumsubApplicantId) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const url = `/resources/applicants/${sumsubApplicantId}/status`;
      
      const signature = this.generateSumsubSignature('GET', url, timestamp);

      const response = await this.sumsub.get(url, {
        headers: {
          'X-App-Access-Ts': timestamp,
          'X-App-Access-Sig': signature,
        },
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        logger.error('Sumsub status check error:', {
          status: error.response.status,
          data: error.response.data,
          sumsubApplicantId,
        });
        throw new InternalServerError(`Failed to get applicant status: ${error.response.data.description || 'Unknown error'}`);
      }
      throw error;
    }
  }

  async processWebhook(rawBody, signature, algorithm = 'sha256') {
    try {
      // Verify webhook signature using raw body bytes (CRITICAL)
      const expectedSignature = crypto
        .createHmac(algorithm, config.sumsub.webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.error('Webhook signature verification failed', {
          expected: expectedSignature,
          received: signature,
          algorithm,
        });
        throw new Error('Invalid webhook signature');
      }

      const payload = JSON.parse(rawBody.toString());

      const { type, applicantId, reviewResult, externalUserId, inspectionId } = payload;

      if (type !== 'applicantReviewed') {
        logger.info('Unhandled webhook type:', { type, applicantId });
        return { processed: false, reason: 'Unhandled webhook type' };
      }

      // Idempotency check using inspectionId or payload hash
      const webhookId = inspectionId || crypto.createHash('sha256').update(rawBody).digest('hex');

      const application = await KycApplication.findOne({
        sumsubApplicantId: applicantId
      }).populate('userId');

      if (!application) {
        logger.warn('KYC application not found for webhook:', { applicantId });
        return { processed: false, reason: 'Application not found' };
      }

      // Check if this webhook was already processed
      if (application.webhook.lastWebhookId === webhookId) {
        logger.info('Webhook already processed (idempotent):', {
          applicantId,
          webhookId,
          userId: application.userId?._id
        });
        return {
          processed: true,
          idempotent: true,
          status: application.status,
          userId: application.userId?._id
        };
      }

      const oldStatus = application.status;
      let newStatus = 'PENDING';

      switch (reviewResult.reviewAnswer) {
        case 'GREEN':
          newStatus = 'APPROVED';
          break;
        case 'RED':
          newStatus = 'REJECTED';
          break;
        default:
          newStatus = 'PENDING';
      }

      // Update application
      application.status = newStatus;
      application.reviewResult = reviewResult;
      application.decidedAt = new Date();
      application.webhook.lastProcessedAt = new Date();
      application.webhook.attempts = (application.webhook.attempts || 0) + 1;
      application.webhook.lastWebhookId = webhookId;

      if (reviewResult.rejectLabels && reviewResult.rejectLabels.length > 0) {
        application.rejectionReasons = reviewResult.rejectLabels;
      }

      await application.save();

      // Update user KYC status
      if (application.userId) {
        application.userId.kycStatus = newStatus;
        await application.userId.save();
      }

      // Log the change
      await AuditLog.logAction({
        actor: application.userId._id,
        role: application.userId.role,
        action: newStatus === 'APPROVED' ? 'KYC_APPROVE' : 'KYC_REJECT',
        object: { type: 'KycApplication', id: application._id },
        before: { status: oldStatus },
        after: { status: newStatus },
        metadata: {
          sumsubApplicantId: applicantId,
          reviewAnswer: reviewResult.reviewAnswer,
          rejectLabels: reviewResult.rejectLabels,
          moderationComment: reviewResult.moderationComment,
          notes: 'KYC status updated via Sumsub webhook',
        },
      });

      logger.info('KYC webhook processed', {
        userId: application.userId._id,
        applicantId,
        oldStatus,
        newStatus,
        reviewAnswer: reviewResult.reviewAnswer,
      });

      // Auto-whitelist wallet if KYC approved
      if (newStatus === 'APPROVED') {
        try {
          const WalletService = require('./WalletService');
          await WalletService.autoWhitelistOnKycApproval(application.userId._id);
        } catch (error) {
          logger.error('Failed to auto-whitelist wallet after KYC approval:', error);
        }
      }

      return { 
        processed: true, 
        status: newStatus,
        userId: application.userId._id 
      };
    } catch (error) {
      logger.error('KYC webhook processing failed:', error);
      throw error;
    }
  }

  async getUserKycStatus(userId) {
    const application = await KycApplication.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'kycStatus');

    if (!application) {
      return {
        status: 'NOT_STARTED',
        canStart: true,
      };
    }

    let canRetry = false;
    if (application.status === 'REJECTED') {
      // Allow retry after 24 hours
      const daysSinceRejection = (Date.now() - application.decidedAt) / (1000 * 60 * 60 * 24);
      canRetry = daysSinceRejection >= 1;
    }

    return {
      application,
      status: application.status,
      canRetry,
      canStart: application.status === 'REJECTED' && canRetry,
    };
  }

  async createManualApplication(userId, { country, notes, files = [] } = {}) {
    const { v4: uuidv4 } = require('uuid');
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const existing = await KycApplication.findOne({ userId, status: { $in: ['PENDING', 'APPROVED'] } });
    if (existing) {
      throw new ConflictError('Active KYC application already exists');
    }

    const manualId = `manual_${uuidv4()}`;
    const application = new KycApplication({
      userId,
      sumsubApplicantId: manualId,
      status: 'PENDING',
      level: 'basic',
      country,
      notes,
      evidenceKeys: files.map(f => f.s3_key || f.key).filter(Boolean),
      externalUserId: userId.toString(),
    });

    await application.save();

    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'CREATE',
      object: { type: 'KycApplication', id: application._id },
      after: { status: 'PENDING', manual: true, country, evidenceCount: application.evidenceKeys.length },
      metadata: { notes: 'Manual KYC application created' },
    });

    logger.info('Manual KYC application created', { userId, applicationId: application._id, manualId });
    return application;
  }

  async addEvidenceKeys(userId, files = []) {
    const application = await KycApplication.findOne({ userId }).sort({ createdAt: -1 });
    if (!application) {
      throw new NotFoundError('No KYC application found');
    }
    const beforeCount = application.evidenceKeys?.length || 0;
    const newKeys = files.map(f => f.s3_key || f.key).filter(Boolean);
    application.evidenceKeys = Array.from(new Set([...(application.evidenceKeys || []), ...newKeys]));
    await application.save();

    await AuditLog.logAction({
      actor: userId,
      role: 'user',
      action: 'UPDATE',
      object: { type: 'KycApplication', id: application._id },
      metadata: { added: newKeys.length, beforeCount, afterCount: application.evidenceKeys.length },
    });

    return application;
  }

  async getKycApplications(adminId, filters = {}, pagination = {}) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_COMPLIANCE].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.level) query.level = filters.level;
    if (filters.country) query.country = filters.country;

    const [applications, total] = await Promise.all([
      KycApplication.find(query)
        .populate('userId', 'email role createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      KycApplication.countDocuments(query)
    ]);

    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'REPORT_VIEW',
      object: { type: 'KycApplication', identifier: 'kyc_applications_list' },
      metadata: {
        filters,
        pagination,
        resultCount: applications.length,
        notes: 'KYC applications viewed',
      },
    });

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async manualReview(adminId, applicationId, decision, reason) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_COMPLIANCE].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    const application = await KycApplication.findById(applicationId).populate('userId');
    if (!application) {
      throw new NotFoundError('KYC application not found');
    }

    const oldStatus = application.status;
    application.status = decision;
    application.decidedAt = new Date();
    application.decidedBy = adminId;
    application.notes = reason;
    await application.save();

    // Update user KYC status
    application.userId.kycStatus = decision;
    await application.userId.save();

    // Send KYC approval email if approved
    if (decision === 'APPROVED') {
      try {
        await EmailService.sendKycApprovalEmail(application.userId);
        logger.info('KYC approval email sent', {
          userId: application.userId._id,
          email: application.userId.email
        });
      } catch (emailError) {
        logger.warn('Failed to send KYC approval email:', {
          userId: application.userId._id,
          email: application.userId.email,
          error: emailError.message
        });
        // Don't fail KYC approval if email fails
      }
    }

    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: decision === 'APPROVED' ? 'KYC_APPROVE' : 'KYC_REJECT',
      object: { type: 'KycApplication', id: applicationId },
      before: { status: oldStatus },
      after: { status: decision },
      metadata: {
        reason,
        notes: 'Manual KYC review by admin',
      },
    });

    logger.warn('Manual KYC review performed', {
      adminId,
      applicationId,
      userId: application.userId._id,
      oldStatus,
      newStatus: decision,
      reason,
    });

    return application;
  }

  async syncApplicantByExternalUserId(externalUserId, adminId = null) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const url = `/resources/applicants/-;externalUserId=${externalUserId}/one`;

      const signature = this.generateSumsubSignature('GET', url, timestamp);

      const response = await this.sumsub.get(url, {
        headers: {
          'X-App-Access-Ts': timestamp,
          'X-App-Access-Sig': signature,
        },
      });

      const sumsubData = response.data;

      // Find local application and update it
      const application = await KycApplication.findOne({
        externalUserId,
      }).populate('userId');

      if (application && sumsubData) {
        const oldStatus = application.status;
        let newStatus = 'PENDING';

        // Map Sumsub status to our status
        if (sumsubData.review && sumsubData.review.reviewAnswer) {
          switch (sumsubData.review.reviewAnswer) {
            case 'GREEN':
              newStatus = 'APPROVED';
              break;
            case 'RED':
              newStatus = 'REJECTED';
              break;
            default:
              newStatus = 'PENDING';
          }
        }

        application.status = newStatus;
        application.reviewResult = sumsubData.review;
        if (sumsubData.review && sumsubData.review.reviewAnswer !== 'INIT') {
          application.decidedAt = new Date();
        }
        await application.save();

        // Update user status
        if (application.userId && application.userId.kycStatus !== newStatus) {
          const oldUserStatus = application.userId.kycStatus;
          application.userId.kycStatus = newStatus;
          await application.userId.save();

          // Send KYC approval email if approved via Sumsub webhook
          if (newStatus === 'APPROVED' && oldUserStatus !== 'APPROVED') {
            try {
              await EmailService.sendKycApprovalEmail(application.userId);
              logger.info('KYC approval email sent (Sumsub webhook)', {
                userId: application.userId._id,
                email: application.userId.email
              });
            } catch (emailError) {
              logger.warn('Failed to send KYC approval email (Sumsub webhook):', {
                userId: application.userId._id,
                email: application.userId.email,
                error: emailError.message
              });
              // Don't fail webhook processing if email fails
            }
          }
        }

        if (adminId) {
          await AuditLog.logAction({
            actor: adminId,
            role: 'admin',
            action: 'UPDATE',
            object: { type: 'KycApplication', id: application._id },
            before: { status: oldStatus },
            after: { status: newStatus },
            metadata: {
              sumsubApplicantId: sumsubData.id,
              externalUserId,
              notes: 'Admin sync from Sumsub',
            },
          });
        }

        logger.info('KYC application synced from Sumsub', {
          externalUserId,
          sumsubApplicantId: sumsubData.id,
          oldStatus,
          newStatus,
          adminId,
        });
      }

      return {
        sumsubData,
        localApplication: application,
        synced: !!application,
      };
    } catch (error) {
      if (error.response) {
        logger.error('Sumsub sync error:', {
          status: error.response.status,
          data: error.response.data,
          externalUserId,
        });
        throw new InternalServerError(`Failed to sync applicant: ${error.response.data.description || 'Unknown error'}`);
      }
      throw error;
    }
  }

  async getUserKycCompliance(userId) {
    const application = await KycApplication.findOne({ userId })
      .sort({ createdAt: -1 });

    if (!application) {
      return {
        kycStatus: 'NOT_STARTED',
        documents: [],
        expiresAt: null,
      };
    }

    return {
      kycStatus: application.status,
      documents: application.reviewResult?.rejectLabels || [],
      expiresAt: null, // KYC doesn't expire in this implementation
      sumsubApplicantId: application.sumsubApplicantId,
      lastUpdated: application.updatedAt,
    };
  }
}

module.exports = new KycService();