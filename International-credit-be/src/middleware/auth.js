const { User } = require('../models');
const { verifyToken, extractToken } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const config = require('../config');

const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }
    
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('+loginAttempts');
    
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    
    if (!user.isActive) {
      throw new AuthenticationError('Account deactivated');
    }
    
    if (user.isLocked) {
      throw new AuthenticationError('Account temporarily locked');
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }
    
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive && !user.isLocked) {
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`));
    }
    
    next();
  };
};

const requireKyc = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }
  
  if (req.user.kycStatus !== config.kycStatus.APPROVED) {
    return next(new AuthorizationError('KYC verification required'));
  }
  
  next();
};

const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }
  
  if (!req.user.emailVerified) {
    return next(new AuthorizationError('Email verification required'));
  }
  
  next();
};

const adminOnly = authorize(
  config.roles.ADMIN_SUPER,
  config.roles.ADMIN_COMPLIANCE,
  config.roles.ADMIN_TREASURY
);

const superAdminOnly = authorize(config.roles.ADMIN_SUPER);

const complianceOnly = authorize(
  config.roles.ADMIN_SUPER,
  config.roles.ADMIN_COMPLIANCE
);

const treasuryOnly = authorize(
  config.roles.ADMIN_SUPER,
  config.roles.ADMIN_TREASURY
);

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requireKyc,
  requireEmailVerification,
  adminOnly,
  superAdminOnly,
  complianceOnly,
  treasuryOnly,
};