const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User, AuditLog } = require('../models');
const { AuthenticationError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');
const EmailService = require('./EmailService');

class TwoFactorService {
  /**
   * Generate 2FA setup information for a user
   */
  async generateSetup(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.twoFactor.isEnabled) {
      throw new ValidationError('2FA is already enabled for this user');
    }

    // Generate a secret
    const secret = speakeasy.generateSecret({
      name: `Universal Credit (${user.email})`,
      issuer: 'Universal Credit',
      length: 32
    });

    // Store the secret temporarily (not enabled yet)
    user.twoFactor.secret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'GENERATE_2FA_SETUP',
      object: { type: 'User', id: userId },
      metadata: {
        notes: '2FA setup initiated'
      }
    });

    logger.info('2FA setup generated', {
      userId,
      email: user.email
    });

    return {
      secret: secret.base32,
      qrCode: qrCodeDataURL,
      manualEntryKey: secret.base32,
      issuer: 'Universal Credit',
      account: user.email
    };
  }

  /**
   * Enable 2FA for a user by verifying the setup token
   */
  async enable2FA(userId, verificationToken) {
    const user = await User.findById(userId).select('+twoFactor.secret');
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.twoFactor.isEnabled) {
      throw new ValidationError('2FA is already enabled for this user');
    }

    if (!user.twoFactor.secret) {
      throw new ValidationError('2FA setup not initiated. Please generate setup first.');
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactor.secret,
      encoding: 'base32',
      token: verificationToken,
      window: 2
    });

    if (!verified) {
      throw new ValidationError('Invalid verification token');
    }

    // Generate backup codes
    const backupCodes = user.generateBackupCodes();

    // Enable 2FA
    user.twoFactor.isEnabled = true;
    user.twoFactor.setupCompleted = true; // NEW: Mark setup as completed
    user.twoFactor.enabledAt = new Date(); // NEW: When 2FA was enabled
    user.twoFactor.lastUsed = new Date();
    await user.save();

    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'ENABLE_2FA',
      object: { type: 'User', id: userId },
      metadata: {
        notes: '2FA enabled successfully'
      }
    });

    logger.info('2FA enabled', {
      userId,
      email: user.email
    });

    // Send 2FA enabled notification email
    try {
      await EmailService.send2FAEnabledEmail(user);
      logger.info('2FA enabled email sent', { userId, email: user.email });
    } catch (emailError) {
      logger.warn('Failed to send 2FA enabled email:', {
        userId,
        email: user.email,
        error: emailError.message
      });
      // Don't fail 2FA enable if email fails
    }

    return {
      enabled: true,
      backupCodes,
      message: '2FA has been successfully enabled'
    };
  }

  /**
   * Quick re-enable 2FA (if secret exists from previous setup)
   */
  async quickEnable2FA(userId, currentPassword, verificationToken) {
    const user = await User.findById(userId).select('+password +twoFactor.secret');
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.twoFactor.isEnabled) {
      throw new ValidationError('2FA is already enabled for this user');
    }

    if (!user.twoFactor.secret) {
      throw new ValidationError('No previous 2FA setup found. Please use full setup process.');
    }

    // Verify current password
    if (!await user.comparePassword(currentPassword)) {
      throw new AuthenticationError('Invalid current password');
    }

    // Verify the token with existing secret
    const verified = speakeasy.totp.verify({
      secret: user.twoFactor.secret,
      encoding: 'base32',
      token: verificationToken,
      window: 2
    });

    if (!verified) {
      throw new ValidationError('Invalid verification token');
    }

    // Re-enable 2FA
    user.twoFactor.isEnabled = true;
    // setupCompleted should already be true (that's why quick enable is available)
    // but ensure it's true just in case
    if (!user.twoFactor.setupCompleted) {
      user.twoFactor.setupCompleted = true;
    }
    user.twoFactor.enabledAt = new Date();
    user.twoFactor.lastUsed = new Date();
    user.twoFactor.disabledAt = undefined; // Clear disabled timestamp
    await user.save();

    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'QUICK_ENABLE_2FA',
      object: { type: 'User', id: userId },
      metadata: {
        notes: '2FA quickly re-enabled using previous setup'
      }
    });

    logger.info('2FA quickly re-enabled', {
      userId,
      email: user.email
    });

    return {
      enabled: true,
      quickReEnable: true,
      backupCodes: user.twoFactor.backupCodes.filter(bc => !bc.used).map(bc => bc.code),
      message: '2FA has been quickly re-enabled using your previous setup'
    };
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId, currentPassword, twoFactorToken) {
    const user = await User.findById(userId).select('+password +twoFactor.secret');
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.twoFactor.isEnabled) {
      throw new ValidationError('2FA is not enabled for this user');
    }

    // Verify current password
    if (!await user.comparePassword(currentPassword)) {
      throw new AuthenticationError('Invalid current password');
    }

    // Verify 2FA token
    if (!user.verify2FA(twoFactorToken)) {
      throw new ValidationError('Invalid 2FA token');
    }

    // Disable 2FA (preserve secret for quick re-enable)
    user.twoFactor.isEnabled = false;
    // DON'T change setupCompleted - once setup is complete, it stays true forever
    // user.twoFactor.setupCompleted = false; // ❌ WRONG - never reset this!
    user.twoFactor.disabledAt = new Date(); // Track when disabled
    // Keep secret and backup codes for quick re-enable
    // user.twoFactor.secret = undefined; // DON'T delete
    // user.twoFactor.backupCodes = []; // DON'T delete
    user.twoFactor.lastUsed = undefined;
    await user.save();

    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'DISABLE_2FA',
      object: { type: 'User', id: userId },
      metadata: {
        notes: '2FA disabled successfully'
      }
    });

    logger.info('2FA disabled', {
      userId,
      email: user.email
    });

    return {
      enabled: false,
      message: '2FA has been successfully disabled'
    };
  }

  /**
   * Verify 2FA token or backup code
   */
  async verify2FAToken(userId, token) {
    const user = await User.findById(userId).select('+twoFactor.secret');
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.twoFactor.isEnabled) {
      throw new ValidationError('2FA is not enabled for this user');
    }

    let verified = false;
    let usedBackupCode = false;

    // First try TOTP verification
    if (token.length === 6 && /^\d+$/.test(token)) {
      verified = user.verify2FA(token);
    }

    // If TOTP fails, try backup codes
    if (!verified && token.length === 10 && /^[A-Z0-9]+$/.test(token.toUpperCase())) {
      verified = user.verifyBackupCode(token.toUpperCase());
      usedBackupCode = verified;
    }

    if (verified) {
      await user.save(); // Save the lastUsed timestamp or backup code usage

      await AuditLog.logAction({
        actor: userId,
        role: user.role,
        action: 'VERIFY_2FA',
        object: { type: 'User', id: userId },
        metadata: {
          notes: usedBackupCode ? '2FA verified using backup code' : '2FA verified using TOTP',
          usedBackupCode
        }
      });

      logger.info('2FA verification successful', {
        userId,
        email: user.email,
        usedBackupCode
      });
    } else {
      await AuditLog.logAction({
        actor: userId,
        role: user.role,
        action: 'VERIFY_2FA',
        object: { type: 'User', id: userId },
        metadata: {
          notes: '2FA verification failed'
        },
        result: { success: false }
      });

      logger.warn('2FA verification failed', {
        userId,
        email: user.email
      });
    }

    return {
      verified,
      usedBackupCode
    };
  }

  /**
   * Get 2FA status for a user
   */
  async get2FAStatus(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const unusedBackupCodes = user.twoFactor.backupCodes.filter(bc => !bc.used).length;

    return {
      isEnabled: user.twoFactor.isEnabled,
      method: user.twoFactor.method,
      lastUsed: user.twoFactor.lastUsed,
      enabledAt: user.twoFactor.enabledAt,
      disabledAt: user.twoFactor.disabledAt,
      unusedBackupCodes,
      setupRequired: !user.twoFactor.isEnabled && !user.twoFactor.secret,
      quickEnableAvailable: !user.twoFactor.isEnabled && !!user.twoFactor.secret,
      setupCompleted: user.twoFactor.setupCompleted
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId, currentPassword, twoFactorToken) {
    const user = await User.findById(userId).select('+password +twoFactor.secret');
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.twoFactor.isEnabled) {
      throw new ValidationError('2FA is not enabled for this user');
    }

    // Verify current password
    if (!await user.comparePassword(currentPassword)) {
      throw new AuthenticationError('Invalid current password');
    }

    // Verify 2FA token
    if (!user.verify2FA(twoFactorToken)) {
      throw new ValidationError('Invalid 2FA token');
    }

    // Generate new backup codes
    const backupCodes = user.generateBackupCodes();
    await user.save();

    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'REGENERATE_BACKUP_CODES',
      object: { type: 'User', id: userId },
      metadata: {
        notes: 'Backup codes regenerated'
      }
    });

    logger.info('Backup codes regenerated', {
      userId,
      email: user.email
    });

    return {
      backupCodes,
      message: 'New backup codes generated successfully'
    };
  }

  /**
   * Completely reset 2FA (delete all data - for fresh start)
   */
  async reset2FA(userId, currentPassword, twoFactorToken) {
    const user = await User.findById(userId).select('+password +twoFactor.secret');
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.twoFactor.isEnabled && !user.twoFactor.secret) {
      throw new ValidationError('No 2FA configuration found to reset');
    }

    // Verify current password
    if (!await user.comparePassword(currentPassword)) {
      throw new AuthenticationError('Invalid current password');
    }

    // Verify 2FA token if 2FA is currently enabled
    if (user.twoFactor.isEnabled) {
      if (!user.verify2FA(twoFactorToken)) {
        throw new ValidationError('Invalid 2FA token');
      }
    }

    // Complete reset - delete everything
    user.twoFactor.isEnabled = false;
    user.twoFactor.setupCompleted = false;
    user.twoFactor.secret = undefined;
    user.twoFactor.backupCodes = [];
    user.twoFactor.lastUsed = undefined;
    user.twoFactor.enabledAt = undefined;
    user.twoFactor.disabledAt = undefined;
    await user.save();

    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'RESET_2FA',
      object: { type: 'User', id: userId },
      metadata: {
        notes: '2FA completely reset - all data deleted'
      }
    });

    logger.info('2FA completely reset', {
      userId,
      email: user.email
    });

    return {
      reset: true,
      message: '2FA has been completely reset. You will need to set it up again from scratch.'
    };
  }
}

module.exports = new TwoFactorService();