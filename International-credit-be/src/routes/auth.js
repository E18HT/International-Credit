const express = require('express');
const Joi = require('joi');
const AuthService = require('../services/AuthService');
const UserService = require('../services/UserService');
const { validate, authSchemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     description: Creates a new user account and returns authentication tokens
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePassword123!
 *               confirmPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePassword123!
 *     responses:
 *       201:
 *         description: Account created successfully
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
 *                   example: Account created successfully. Please check your email to verify your account.
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/register',
  authRateLimit,
  validate(authSchemas.register),
  asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const result = await AuthService.register({ fullName, email, password }, metadata);
    
    res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  })
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login with email and password
 *     description: Authenticates user credentials and returns JWT tokens
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: SecurePassword123!
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/login',
  authRateLimit,
  validate(authSchemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const result = await AuthService.login(email, password, metadata);

    // Handle 2FA required case
    if (result.requiresTwoFactor) {
      return res.status(200).json({
        status: 'success',
        requiresTwoFactor: true,
        message: result.message,
        data: {
          temporaryToken: result.temporaryToken,
          user: result.user,
        },
      });
    }

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  })
);

/**
 * @swagger
 * /auth/verify-2fa:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify 2FA token and complete login
 *     description: Verify 2FA token using temporary token from login step
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - temporaryToken
 *               - twoFactorToken
 *             properties:
 *               temporaryToken:
 *                 type: string
 *                 example: "abc123..."
 *                 description: Temporary token received from login endpoint
 *               twoFactorToken:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 10
 *                 example: "123456"
 *                 description: 6-digit TOTP code or 10-character backup code
 *     responses:
 *       200:
 *         description: Login successful with 2FA verification
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         description: Invalid 2FA token
 *       401:
 *         description: Invalid or expired temporary token
 *       429:
 *         description: Too many requests
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/verify-2fa',
  authRateLimit,
  validate(Joi.object({
    temporaryToken: Joi.string().required(),
    twoFactorToken: Joi.string().min(6).max(10).required(),
  })),
  asyncHandler(async (req, res) => {
    const { temporaryToken, twoFactorToken } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const result = await AuthService.verifyTwoFactor(temporaryToken, twoFactorToken, metadata);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  })
);

/**
 * @swagger
 * /auth/login/2fa:
 *   post:
 *     tags: [Authentication]
 *     summary: Complete login with 2FA
 *     description: Complete the login process by providing 2FA token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - twoFactorToken
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePassword123!
 *               twoFactorToken:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 10
 *                 example: "123456"
 *                 description: 6-digit TOTP code or 10-character backup code
 *     responses:
 *       200:
 *         description: Login successful with 2FA verification
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         description: Invalid 2FA token
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many requests
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/login/2fa',
  authRateLimit,
  validate(Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    twoFactorToken: Joi.string().min(6).max(10).required()
  })),
  asyncHandler(async (req, res) => {
    const { email, password, twoFactorToken } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const result = await AuthService.loginWith2FA(email, password, twoFactorToken, metadata);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  })
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout current user
 *     description: Invalidates the current user's session
 *     responses:
 *       200:
 *         description: Logout successful
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
 *                   example: Logout successful
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    await AuthService.logout(req.user.id, metadata);
    
    res.json({
      status: 'success',
      message: 'Logout successful',
    });
  })
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Generate a new access token using a valid refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
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
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/refresh-token',
  validate(authSchemas.refreshToken),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    const tokens = await AuthService.refreshToken(refreshToken);
    
    res.json({
      status: 'success',
      data: { tokens },
    });
  })
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send a password reset link to the user's email address
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
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
 *                   example: Password reset link sent to your email
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetToken:
 *                       type: string
 *                       description: Reset token (only shown in development)
 *                       example: a1b2c3d4e5f6...
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         description: Email address not found
 *       429:
 *         description: Too many requests
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/forgot-password',
  authRateLimit,
  validate(authSchemas.forgotPassword),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const resetToken = await AuthService.forgotPassword(email, metadata);
    
    res.json({
      status: 'success',
      message: 'Password reset link sent to your email',
      data: {
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      },
    });
  })
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with token
 *     description: Reset user password using the token received via email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token from email
 *                 example: a1b2c3d4e5f6g7h8i9j0...
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: New password
 *                 example: NewSecurePassword123!
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: Password reset successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid or expired reset token
 *       429:
 *         description: Too many requests
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/reset-password',
  authRateLimit,
  validate(authSchemas.resetPassword),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const result = await AuthService.resetPassword(token, password, metadata);
    
    res.json({
      status: 'success',
      message: 'Password reset successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  })
);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email address
 *     description: Verify user's email address using the verification token
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *         example: abc123def456ghi789...
 *     responses:
 *       200:
 *         description: Email verified successfully
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
 *                   example: Email verified successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid verification token
 *       401:
 *         description: Token expired or already used
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/verify-email/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const user = await AuthService.verifyEmail(token, metadata);

    res.json({
      status: 'success',
      message: 'Email verified successfully',
      data: { user },
    });
  })
);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend email verification
 *     description: Resend email verification link to user's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Verification email sent successfully
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
 *                   example: Verification email sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/resend-verification',
  validate(Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Valid email is required',
      'any.required': 'Email is required'
    })
  })),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const result = await AuthService.resendVerificationEmail(email, metadata);

    res.json({
      status: 'success',
      message: result.message,
      data: { email: result.email },
    });
  })
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change user password
 *     description: Change the authenticated user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: User's current password
 *                 example: OldPassword123!
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password
 *                 example: NewSecurePassword123!
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: Password changed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid current password or unauthorized
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/change-password',
  authenticate,
  validate(Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: authSchemas.register.extract('password'),
  })),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    const user = await AuthService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
      metadata
    );
    
    res.json({
      status: 'success',
      message: 'Password changed successfully',
      data: { user },
    });
  })
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     description: Returns the current authenticated user's profile information including linked wallet addresses
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     user:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             wallets:
 *                               type: array
 *                               description: User's linked wallet addresses
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   _id:
 *                                     type: string
 *                                     example: "507f1f77bcf86cd799439011"
 *                                   address:
 *                                     type: string
 *                                     example: "0.0.123456"
 *                                     description: Wallet address
 *                                   network:
 *                                     type: string
 *                                     enum: [hedera, ethereum, bitcoin]
 *                                     example: "hedera"
 *                                     description: Blockchain network
 *                                   whitelistState:
 *                                     type: string
 *                                     enum: [WHITELISTED, BLACKLISTED, PENDING]
 *                                     example: "WHITELISTED"
 *                                     description: Wallet verification status
 *                                   country:
 *                                     type: string
 *                                     example: "US"
 *                                     description: Country code
 *                                   metadata:
 *                                     type: object
 *                                     properties:
 *                                       isMultisig:
 *                                         type: boolean
 *                                         example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await UserService.getProfile(req.user.id);

    res.json({
      status: 'success',
      data: { user },
    });
  })
);

module.exports = router;