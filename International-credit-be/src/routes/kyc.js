const express = require('express');
const Joi = require('joi');
const KycService = require('../services/KycService');
const { validate, kycSchemas, commonSchemas } = require('../middleware/validation');
const { authenticate, adminOnly, requireEmailVerification } = require('../middleware/auth');
const { strictRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /kyc/start:
 *   post:
 *     tags: [KYC]
 *     summary: Start KYC verification process
 *     description: Initialize KYC verification with Sumsub for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [basic, full]
 *                 default: basic
 *                 description: KYC verification level
 *               externalUserId:
 *                 type: string
 *                 description: Optional external user identifier
 *     responses:
 *       201:
 *         description: KYC application created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: KYC application created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     application:
 *                       type: object
 *                     sumsubApplicantId:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Manual KYC create (dev/manual mode)
/**
 * @swagger
 * /kyc/create:
 *   post:
 *     tags: [KYC]
 *     summary: Create manual KYC application
 *     description: Create a manual KYC application and attach evidence keys (S3) if available.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country:
 *                 type: string
 *                 example: US
 *               notes:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     s3_key:
 *                       type: string
 *                       example: kyc/user123/passport.png
 *     responses:
 *       201:
 *         description: KYC application created
 */
router.post('/create',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    country: Joi.string().length(2).uppercase().optional(),
    notes: Joi.string().max(500).optional(),
    files: Joi.array().items(Joi.object({ s3_key: Joi.string().required() })).optional(),
  })),
  asyncHandler(async (req, res) => {
    const app = await KycService.createManualApplication(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { application: app } });
  })
);

// Add evidence files to current KYC
/**
 * @swagger
 * /kyc/uploads:
 *   post:
 *     tags: [KYC]
 *     summary: Attach evidence files to KYC
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     s3_key:
 *                       type: string
 *     responses:
 *       200:
 *         description: Evidence added
 */
router.post('/uploads',
  authenticate,
  strictRateLimit,
  validate(Joi.object({ files: Joi.array().items(Joi.object({ s3_key: Joi.string().required() })).required() })),
  asyncHandler(async (req, res) => {
    const app = await KycService.addEvidenceKeys(req.user.id, req.body.files);
    res.json({ status: 'success', data: { application: app } });
  })
);

router.post('/start',
  authenticate,
  requireEmailVerification,
  strictRateLimit,
  validate(kycSchemas.startSession),
  asyncHandler(async (req, res) => {
    const { level, externalUserId } = req.body;
    
    const result = await KycService.createApplicant(req.user.id, level, externalUserId);
    
    res.status(201).json({
      status: 'success',
      message: 'KYC application created successfully',
      data: {
        application: result.application,
        sumsubApplicantId: result.sumsubData.id,
      },
    });
  })
);

/**
 * @swagger
 * /kyc/access-token:
 *   post:
 *     tags: [KYC]
 *     summary: Get Sumsub access token
 *     description: Get an access token for Sumsub SDK integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access token retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: Sumsub access token
 *                     userId:
 *                       type: string
 *                       description: User identifier for Sumsub
 *       400:
 *         description: KYC not started or already approved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/access-token',
  authenticate,
  strictRateLimit,
  validate(Joi.object({
    levelName: Joi.string().default('basic'),
    ttlInSecs: Joi.number().min(300).max(3600).default(1800),
  })),
  asyncHandler(async (req, res) => {
    const { levelName, ttlInSecs } = req.body;
    const kycStatus = await KycService.getUserKycStatus(req.user.id);

    if (kycStatus.status === 'NOT_STARTED') {
      return res.status(400).json({
        status: 'error',
        message: 'Please start KYC process first',
      });
    }

    if (kycStatus.status === 'APPROVED') {
      return res.status(400).json({
        status: 'error',
        message: 'KYC already approved',
      });
    }

    const tokenData = await KycService.getAccessToken(
      kycStatus.application.externalUserId,
      levelName || kycStatus.application.level,
      ttlInSecs
    );

    res.json({
      status: 'success',
      data: {
        accessToken: tokenData.accessToken,
        externalUserId: kycStatus.application.externalUserId,
        expiresAt: tokenData.expiresAt,
        ttlInSecs: tokenData.ttlInSecs,
      },
    });
  })
);

/**
 * @swagger
 * /kyc/status:
 *   get:
 *     tags: [KYC]
 *     summary: Get KYC verification status
 *     description: Check the current status of user's KYC verification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [NOT_STARTED, PENDING, APPROVED, REJECTED]
 *                       example: PENDING
 *                     application:
 *                       type: object
 *                       description: KYC application details
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const kycStatus = await KycService.getUserKycStatus(req.user.id);
    
    res.json({
      status: 'success',
      data: kycStatus,
    });
  })
);

/**
 * @swagger
 * /kyc/webhook:
 *   post:
 *     tags: [KYC]
 *     summary: Process Sumsub webhook
 *     description: Handle webhook notifications from Sumsub for KYC status updates
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Sumsub webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid webhook signature or payload
 */
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.get('X-Payload-Digest');
    const algorithm = req.get('X-Payload-Digest-Alg') || 'sha256';
    const rawBody = req.body;

    if (!signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing webhook signature',
      });
    }

    const result = await KycService.processWebhook(rawBody, signature, algorithm);

    res.json({
      status: 'success',
      data: result,
    });
  })
);

// Admin routes
router.get('/applications',
  authenticate,
  adminOnly,
  validate(Joi.object({
    status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED').optional(),
    level: Joi.string().valid('basic', 'full').optional(),
    country: Joi.string().length(2).uppercase().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    
    const result = await KycService.getKycApplications(
      req.user.id,
      filters,
      { page, limit }
    );
    
    res.json({
      status: 'success',
      data: result,
    });
  })
);

router.put('/:applicationId/review',
  authenticate,
  adminOnly,
  validate(Joi.object({
    decision: Joi.string().valid('APPROVED', 'REJECTED').required(),
    reason: Joi.string().required().min(10).max(500),
  })),
  validate(Joi.object({
    applicationId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const { decision, reason } = req.body;
    
    const application = await KycService.manualReview(req.user.id, applicationId, decision, reason);
    
    res.json({
      status: 'success',
      message: 'KYC application reviewed successfully',
      data: { application },
    });
  })
);

router.get('/:applicationId/status',
  authenticate,
  adminOnly,
  validate(Joi.object({
    applicationId: commonSchemas.objectId.required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    
    const application = await KycApplication.findById(applicationId).populate('userId', 'email');
    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'KYC application not found',
      });
    }
    
    // Get live status from Sumsub
    let sumsubStatus = null;
    try {
      sumsubStatus = await KycService.getApplicantStatus(application.sumsubApplicantId);
    } catch (error) {
      // Continue without live status if API fails
    }
    
    res.json({
      status: 'success',
      data: {
        application,
        sumsubStatus,
      },
    });
  })
);

/**
 * @swagger
 * /kyc/admin/sync/{externalUserId}:
 *   post:
 *     tags: [KYC]
 *     summary: Sync applicant data from Sumsub
 *     description: Admin endpoint to sync KYC data from Sumsub by external user ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: externalUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: External user ID to sync
 *     responses:
 *       200:
 *         description: Applicant data synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     sumsubData:
 *                       type: object
 *                     localApplication:
 *                       type: object
 *                     synced:
 *                       type: boolean
 */
router.post('/admin/sync/:externalUserId',
  authenticate,
  adminOnly,
  validate(Joi.object({
    externalUserId: Joi.string().required(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const { externalUserId } = req.params;

    const result = await KycService.syncApplicantByExternalUserId(externalUserId, req.user.id);

    res.json({
      status: 'success',
      message: 'Applicant data synced successfully',
      data: result,
    });
  })
);

module.exports = router;