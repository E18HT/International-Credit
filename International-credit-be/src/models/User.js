const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: false,
    minlength: 8,
  },
  role: {
    type: String,
    enum: Object.values(config.roles),
    default: config.roles.END_USER,
  },
  kycStatus: {
    type: String,
    enum: Object.values(config.kycStatus),
    default: config.kycStatus.PENDING,
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
  },
  twoFactor: {
    isEnabled: { type: Boolean, default: false },
    setupCompleted: { type: Boolean, default: false }, // NEW: Track if setup is fully completed
    secret: { type: String, select: false }, // Don't include in regular queries
    backupCodes: [{
      code: String,
      used: { type: Boolean, default: false },
      usedAt: Date
    }],
    method: {
      type: String,
      enum: ['totp'],
      default: 'totp'
    },
    lastUsed: Date,
    enabledAt: Date, // NEW: When 2FA was enabled
    disabledAt: Date, // NEW: When 2FA was disabled
  },
  fcmTokens: [{
    token: { type: String, required: true },
    device: {
      type: { type: String, enum: ['web', 'ios', 'android'], required: true },
      userAgent: String,
      lastUsed: { type: Date, default: Date.now },
    },
    createdAt: { type: Date, default: Date.now },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  temporaryToken: String, // For 2FA login flow
  temporaryTokenExpires: Date, // Expiry for temporary token
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
}, {
  timestamps: true,
});

// Remove duplicate indexes - these are already defined in schema
// userSchema.index({ email: 1 }); // Already unique in schema
// userSchema.index({ role: 1 });
// userSchema.index({ kycStatus: 1 });

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, config.security.bcryptRounds);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { loginAttempts: 1, lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

// 2FA utility methods
userSchema.methods.verify2FA = function(token) {
  const speakeasy = require('speakeasy');

  if (!this.twoFactor.isEnabled || !this.twoFactor.secret) {
    return false;
  }

  // Try with current time window and allow for clock drift
  const verified = speakeasy.totp.verify({
    secret: this.twoFactor.secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps of drift (60 seconds)
  });

  if (verified) {
    this.twoFactor.lastUsed = new Date();
  }

  return verified;
};

userSchema.methods.verifyBackupCode = function(code) {
  if (!this.twoFactor.isEnabled) {
    return false;
  }

  const backupCode = this.twoFactor.backupCodes.find(
    bc => bc.code === code && !bc.used
  );

  if (backupCode) {
    backupCode.used = true;
    backupCode.usedAt = new Date();
    return true;
  }

  return false;
};

userSchema.methods.generateBackupCodes = function() {
  const crypto = require('crypto');
  const codes = [];

  for (let i = 0; i < 10; i++) {
    codes.push({
      code: crypto.randomBytes(5).toString('hex').toUpperCase(),
      used: false
    });
  }

  this.twoFactor.backupCodes = codes;
  return codes.map(c => c.code);
};

userSchema.methods.addFcmToken = function(token, deviceInfo) {
  // Remove existing token if it exists
  this.fcmTokens = this.fcmTokens.filter(t => t.token !== token);
  
  // Add new token
  this.fcmTokens.push({
    token,
    device: {
      type: deviceInfo.type,
      userAgent: deviceInfo.userAgent,
      lastUsed: new Date(),
    },
  });
  
  // Keep only the last 5 tokens per user
  if (this.fcmTokens.length > 5) {
    this.fcmTokens.sort((a, b) => b.device.lastUsed - a.device.lastUsed);
    this.fcmTokens = this.fcmTokens.slice(0, 5);
  }
  
  return this.save();
};

userSchema.methods.removeFcmToken = function(token) {
  this.fcmTokens = this.fcmTokens.filter(t => t.token !== token);
  return this.save();
};

userSchema.methods.getActiveFcmTokens = function() {
  // Return tokens that are less than 60 days old
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  return this.fcmTokens
    .filter(t => t.device.lastUsed > sixtyDaysAgo)
    .map(t => t.token);
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.fcmTokens; // Hide FCM tokens for security
  return user;
};

module.exports = mongoose.model('User', userSchema);