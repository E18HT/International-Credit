const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const { Config } = require('../models');
const { ServiceUnavailableError, TooManyRequestsError, ValidationError } = require('../utils/errors');
const config = require('../config');
const logger = require('../utils/logger');

const securityHeaders = (req, res, next) => {
  // Check if request is coming from tunnel services (ngrok or DevTunnel)
  const isTunnelRequest = req.hostname && (
    req.hostname.endsWith('.ngrok-free.app') ||
    req.hostname.endsWith('.ngrok.io') ||
    req.hostname.endsWith('.ngrok.app') ||
    req.hostname.endsWith('.devtunnels.ms') ||
    req.hostname.includes('85vjctr3-3000.inc1.devtunnels.ms') ||
    req.headers.host && (
      req.headers.host.includes('ngrok') ||
      req.headers.host.includes('devtunnels.ms') ||
      req.headers.host.includes('85vjctr3-3000.inc1.devtunnels.ms') ||
      req.headers['ngrok-skip-browser-warning']
    )
  );
  
  // Relaxed CSP for Swagger UI
  if (req.path.startsWith('/api/v1/docs')) {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      // Disable HSTS for tunnel services
      hsts: isTunnelRequest ? false : undefined,
    })(req, res, next);
  }
  
  // Strict CSP for all other routes
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    // Disable HSTS for tunnel services
    hsts: isTunnelRequest ? false : undefined,
  })(req, res, next);
};

const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
      });
      next(new TooManyRequestsError(message));
    },
  });
};

const generalRateLimit = createRateLimit(
  config.security.rateLimitWindowMs,
  config.security.rateLimitMaxRequests,
  'Too many requests, please try again later'
);

const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

const strictRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 requests
  'Rate limit exceeded for this operation'
);

const sanitizeInput = mongoSanitize({
  replaceWith: '_',
});

const idempotency = () => {
  const store = new Map();
  
  // Paths that don't require idempotency keys (all auth operations + read operations)
  const exemptPaths = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/refresh-token',
    '/api/v1/auth/change-password',
    '/api/v1/auth/me'
  ];
  
  return async (req, res, next) => {
    const idempotencyKey = req.get('Idempotency-Key');
    
    if (!idempotencyKey) {
      // Skip idempotency requirement for GET, HEAD, and exempt auth paths
      if (req.method === 'GET' || req.method === 'HEAD' || exemptPaths.includes(req.path)) {
        return next();
      }
      return next(new ValidationError('Idempotency-Key header required for write operations'));
    }
    
    const key = `${req.user?.id || 'anonymous'}:${idempotencyKey}`;
    const existing = store.get(key);
    
    if (existing) {
      if (existing.processing) {
        return res.status(409).json({
          error: 'Request is being processed',
          retryAfter: 5,
        });
      }
      
      return res.status(existing.status).json(existing.response);
    }
    
    store.set(key, { processing: true });
    
    const originalSend = res.send;
    res.send = function(body) {
      if (!res.headersSent) {
        store.set(key, {
          processing: false,
          status: res.statusCode,
          response: typeof body === 'string' ? JSON.parse(body) : body,
          timestamp: Date.now(),
        });
        
        setTimeout(() => store.delete(key), 24 * 60 * 60 * 1000);
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
};

const systemPauseCheck = async (req, res, next) => {
  try {
    const systemConfig = await Config.getConfig();
    
    if (systemConfig.paused.system) {
      return next(new ServiceUnavailableError('System is temporarily paused for maintenance'));
    }
    
    const writeOperations = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (writeOperations.includes(req.method)) {
      if (req.path.includes('/deposits') && systemConfig.paused.deposits) {
        return next(new ServiceUnavailableError('Deposits are temporarily paused'));
      }
      
      if (req.path.includes('/withdrawals') && systemConfig.paused.withdrawals) {
        return next(new ServiceUnavailableError('Withdrawals are temporarily paused'));
      }
      
      if (req.path.includes('/transfers') && systemConfig.paused.transfers) {
        return next(new ServiceUnavailableError('Transfers are temporarily paused'));
      }
      
      if (req.path.includes('/swaps') && systemConfig.paused.swaps) {
        return next(new ServiceUnavailableError('Swaps are temporarily paused'));
      }
      
      if (req.path.includes('/proposals') && systemConfig.paused.governance) {
        return next(new ServiceUnavailableError('Governance is temporarily paused'));
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error checking system pause status:', error);
    next();
  }
};

const requestId = (req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      contentLength: res.get('Content-Length'),
    };
    
    if (res.statusCode >= 400) {
      logger.warn('Request failed', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });
  
  next();
};

module.exports = {
  securityHeaders,
  generalRateLimit,
  authRateLimit,
  strictRateLimit,
  sanitizeInput,
  idempotency,
  systemPauseCheck,
  requestId,
  requestLogger,
};