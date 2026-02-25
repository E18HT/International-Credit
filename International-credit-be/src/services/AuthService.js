const { User, AuditLog } = require('../models');
const { generateTokenPair } = require('../utils/jwt');
const { AuthenticationError, ConflictError, NotFoundError } = require('../utils/errors');
const crypto = require('crypto');
const logger = require('../utils/logger');
const EmailService = require('./EmailService');

class AuthService {
  async register(userData, metadata = {}) {
    const { fullName, email, password } = userData;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }
    
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    
    const user = new User({
      fullName,
      email,
      password,
      emailVerificationToken,
    });
    
    await user.save();
    
    await AuditLog.logAction({
      actor: user._id,
      role: user.role,
      action: 'CREATE',
      object: { type: 'User', id: user._id },
      after: { email: user.email, role: user.role },
      metadata: {
        ...metadata,
        notes: 'User registration',
      },
    });
    
    const tokens = generateTokenPair(user);

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(user, emailVerificationToken);
      logger.info(`Verification email sent to: ${email}`, {
        userId: user._id,
        email,
      });
    } catch (emailError) {
      logger.error('Failed to send verification email:', {
        userId: user._id,
        email,
        error: emailError.message,
      });
      // Don't fail registration if email fails - user can request resend
    }

    logger.info(`User registered: ${email}`, {
      userId: user._id,
      email,
      ip: metadata.ipAddress,
    });

    return {
      user,
      tokens,
      emailVerificationToken,
    };
  }
  
  async login(email, password, metadata = {}) {
    const user = await User.findOne({ email }).select('+password +loginAttempts');
    
    if (!user || !await user.comparePassword(password)) {
      if (user) {
        await user.incLoginAttempts();
      }
      
      await AuditLog.logAction({
        actor: user?._id || null,
        role: user?.role || 'anonymous',
        action: 'LOGIN',
        object: { type: 'User', identifier: email },
        metadata,
        result: { success: false, error: 'Invalid credentials' },
      });
      
      throw new AuthenticationError('Invalid credentials');
    }
    
    if (user.isLocked) {
      await AuditLog.logAction({
        actor: user._id,
        role: user.role,
        action: 'LOGIN',
        object: { type: 'User', id: user._id },
        metadata,
        result: { success: false, error: 'Account locked' },
      });
      
      throw new AuthenticationError('Account temporarily locked due to too many failed attempts');
    }
    
    if (!user.isActive) {
      throw new AuthenticationError('Account deactivated');
    }

    // Check if 2FA is enabled - if yes, return temporary token for 2FA verification
    if (user.twoFactor.isEnabled) {
      // Generate a temporary token valid for 5 minutes for 2FA verification
      const temporaryToken = crypto.randomBytes(32).toString('hex');
      const temporaryTokenExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store temporary token (you might want to use Redis for this in production)
      user.temporaryToken = temporaryToken;
      user.temporaryTokenExpires = temporaryTokenExpires;
      await user.save();

      await AuditLog.logAction({
        actor: user._id,
        role: user.role,
        action: 'LOGIN',
        object: { type: 'User', id: user._id },
        metadata,
        result: { success: false, error: '2FA required', temporaryToken: temporaryToken },
      });

      logger.info(`2FA required for user: ${email}`, {
        userId: user._id,
        email,
        ip: metadata.ipAddress,
      });

      return {
        requiresTwoFactor: true,
        temporaryToken,
        message: 'Please provide your 2FA code',
        user: {
          id: user._id,
          email: user.email,
          twoFactor: {
            isEnabled: user.twoFactor.isEnabled,
            setupCompleted: user.twoFactor.setupCompleted,
            method: user.twoFactor.method
          }
        }
      };
    }

    user.lastLogin = new Date();
    user.loginAttempts = undefined;
    user.lockUntil = undefined;
    await user.save();

    const tokens = generateTokenPair(user);

    await AuditLog.logAction({
      actor: user._id,
      role: user.role,
      action: 'LOGIN',
      object: { type: 'User', id: user._id },
      metadata: {
        ...metadata,
        notes: 'Successful login',
      },
      result: { success: true },
    });

    logger.info(`User logged in: ${email}`, {
      userId: user._id,
      email,
      ip: metadata.ipAddress,
    });

    return { user, tokens };
  }

  async verifyTwoFactor(temporaryToken, twoFactorToken, metadata = {}) {
    const TwoFactorService = require('./TwoFactorService');

    // Find user by temporary token
    const user = await User.findOne({
      temporaryToken,
      temporaryTokenExpires: { $gt: new Date() }
    }).select('+twoFactor.secret');

    if (!user) {
      await AuditLog.logAction({
        actor: null,
        role: 'anonymous',
        action: 'LOGIN_2FA',
        object: { type: 'User', identifier: 'unknown' },
        metadata,
        result: { success: false, error: 'Invalid or expired temporary token' },
      });

      throw new AuthenticationError('Invalid or expired temporary token');
    }

    if (!user.twoFactor.isEnabled) {
      throw new AuthenticationError('2FA is not enabled for this account');
    }

    // Verify 2FA token
    const verificationResult = await TwoFactorService.verify2FAToken(user._id, twoFactorToken);

    if (!verificationResult.verified) {
      await AuditLog.logAction({
        actor: user._id,
        role: user.role,
        action: 'LOGIN_2FA',
        object: { type: 'User', id: user._id },
        metadata,
        result: { success: false, error: 'Invalid 2FA token' },
      });

      throw new AuthenticationError('Invalid 2FA token');
    }

    // Clear temporary token and complete login
    user.temporaryToken = undefined;
    user.temporaryTokenExpires = undefined;
    user.lastLogin = new Date();
    user.loginAttempts = undefined;
    user.lockUntil = undefined;
    user.twoFactor.lastUsed = new Date();
    await user.save();

    const tokens = generateTokenPair(user);

    await AuditLog.logAction({
      actor: user._id,
      role: user.role,
      action: 'LOGIN_2FA',
      object: { type: 'User', id: user._id },
      metadata: {
        ...metadata,
        notes: 'Successful 2FA login',
        tokenType: verificationResult.tokenType || 'totp'
      },
      result: { success: true },
    });

    logger.info(`2FA login successful: ${user.email}`, {
      userId: user._id,
      email: user.email,
      ip: metadata.ipAddress,
      tokenType: verificationResult.tokenType
    });

    return { user, tokens };
  }

  async loginWith2FA(email, password, twoFactorToken, metadata = {}) {
    const TwoFactorService = require('./TwoFactorService');

    // First verify email and password
    const user = await User.findOne({ email }).select('+password +loginAttempts +twoFactor.secret');

    if (!user || !await user.comparePassword(password)) {
      if (user) {
        await user.incLoginAttempts();
      }

      await AuditLog.logAction({
        actor: user?._id || null,
        role: user?.role || 'anonymous',
        action: 'LOGIN_2FA',
        object: { type: 'User', identifier: email },
        metadata,
        result: { success: false, error: 'Invalid credentials' },
      });

      throw new AuthenticationError('Invalid credentials');
    }

    if (user.isLocked) {
      await AuditLog.logAction({
        actor: user._id,
        role: user.role,
        action: 'LOGIN_2FA',
        object: { type: 'User', id: user._id },
        metadata,
        result: { success: false, error: 'Account locked' },
      });

      throw new AuthenticationError('Account temporarily locked due to too many failed attempts');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account deactivated');
    }

    // Check if 2FA is enabled
    if (!user.twoFactor.isEnabled) {
      throw new AuthenticationError('2FA is not enabled for this account');
    }

    // Verify 2FA token
    const verificationResult = await TwoFactorService.verify2FAToken(user._id, twoFactorToken);

    if (!verificationResult.verified) {
      await AuditLog.logAction({
        actor: user._id,
        role: user.role,
        action: 'LOGIN_2FA',
        object: { type: 'User', id: user._id },
        metadata,
        result: { success: false, error: 'Invalid 2FA token' },
      });

      throw new AuthenticationError('Invalid 2FA token');
    }

    // Login successful
    user.lastLogin = new Date();
    user.loginAttempts = undefined;
    user.lockUntil = undefined;
    await user.save();

    const tokens = generateTokenPair(user);

    await AuditLog.logAction({
      actor: user._id,
      role: user.role,
      action: 'LOGIN_2FA',
      object: { type: 'User', id: user._id },
      metadata: {
        ...metadata,
        notes: 'Successful 2FA login',
        usedBackupCode: verificationResult.usedBackupCode
      },
      result: { success: true },
    });

    logger.info(`User logged in with 2FA: ${email}`, {
      userId: user._id,
      email,
      ip: metadata.ipAddress,
      usedBackupCode: verificationResult.usedBackupCode
    });

    return { user, tokens };
  }

  async logout(userId, metadata = {}) {
    await AuditLog.logAction({
      actor: userId,
      role: 'unknown',
      action: 'LOGOUT',
      object: { type: 'User', id: userId },
      metadata,
    });
    
    logger.info(`User logged out`, {
      userId,
      ip: metadata.ipAddress,
    });
  }
  
  async refreshToken(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid refresh token');
    }
    
    return generateTokenPair(user);
  }
  
  async forgotPassword(email, metadata = {}) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError('No account found with that email address');
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    
    await AuditLog.logAction({
      actor: user._id,
      role: user.role,
      action: 'UPDATE',
      object: { type: 'User', id: user._id },
      metadata: {
        ...metadata,
        notes: 'Password reset requested',
      },
    });
    
    // Send password reset email
    try {
      await EmailService.sendPasswordResetEmail(user, resetToken);
      logger.info(`Password reset email sent to: ${email}`, {
        userId: user._id,
        email,
      });
    } catch (emailError) {
      logger.error('Failed to send password reset email:', {
        userId: user._id,
        email,
        error: emailError.message,
      });
      // Don't fail the request if email fails
    }

    logger.info(`Password reset requested: ${email}`, {
      userId: user._id,
      email,
      ip: metadata.ipAddress,
    });

    return resetToken;
  }
  
  async resetPassword(token, newPassword, metadata = {}) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    
    if (!user) {
      throw new AuthenticationError('Token is invalid or has expired');
    }
    
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = undefined;
    user.lockUntil = undefined;
    await user.save();
    
    await AuditLog.logAction({
      actor: user._id,
      role: user.role,
      action: 'UPDATE',
      object: { type: 'User', id: user._id },
      metadata: {
        ...metadata,
        notes: 'Password reset completed',
      },
    });
    
    logger.info(`Password reset completed: ${user.email}`, {
      userId: user._id,
      email: user.email,
      ip: metadata.ipAddress,
    });
    
    const tokens = generateTokenPair(user);
    return { user, tokens };
  }
  
  async verifyEmail(token, metadata = {}) {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerified: false,
    });
    
    if (!user) {
      throw new AuthenticationError('Invalid or expired verification token');
    }
    
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
    
    await AuditLog.logAction({
      actor: user._id,
      role: user.role,
      action: 'UPDATE',
      object: { type: 'User', id: user._id },
      metadata: {
        ...metadata,
        notes: 'Email verification completed',
      },
    });
    
    logger.info(`Email verified: ${user.email}`, {
      userId: user._id,
      email: user.email,
    });
    
    return user;
  }

  async resendVerificationEmail(email, metadata = {}) {
    const user = await User.findOne({ email, emailVerified: false });
    if (!user) {
      throw new NotFoundError('User not found or email already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(user, emailVerificationToken);
      logger.info(`Verification email resent to: ${email}`, {
        userId: user._id,
        email,
      });
    } catch (emailError) {
      logger.error('Failed to resend verification email:', {
        userId: user._id,
        email,
        error: emailError.message,
      });
      throw emailError; // Fail the request if email sending fails for resend
    }

    await AuditLog.logAction({
      actor: user._id,
      role: user.role,
      action: 'UPDATE',
      object: { type: 'User', id: user._id },
      metadata: {
        ...metadata,
        notes: 'Email verification resent',
      },
    });

    return {
      message: 'Verification email sent successfully',
      email: user.email
    };
  }

  async updateProfile(userId, updates, metadata = {}) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    const before = {
      preferences: user.preferences,
    };
    
    if (updates.preferences) {
      user.preferences = { ...user.preferences, ...updates.preferences };
    }
    
    await user.save();
    
    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'UPDATE',
      object: { type: 'User', id: userId },
      before,
      after: { preferences: user.preferences },
      metadata,
    });
    
    return user;
  }
  
  async changePassword(userId, currentPassword, newPassword, metadata = {}) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    if (!await user.comparePassword(currentPassword)) {
      throw new AuthenticationError('Current password is incorrect');
    }
    
    user.password = newPassword;
    await user.save();
    
    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'UPDATE',
      object: { type: 'User', id: userId },
      metadata: {
        ...metadata,
        notes: 'Password changed',
      },
    });
    
    logger.info(`Password changed`, {
      userId,
      email: user.email,
      ip: metadata.ipAddress,
    });
    
    return user;
  }
}

module.exports = new AuthService();