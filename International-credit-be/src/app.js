const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const connectDatabase = require('./config/database');
const config = require('./config');
const logger = require('./utils/logger');
const { swaggerSpec, swaggerUi, swaggerOptions } = require('./config/swagger');

// Middleware
const { globalErrorHandler, notFound } = require('./middleware/errorHandler');
const { 
  securityHeaders, 
  generalRateLimit, 
  sanitizeInput, 
  systemPauseCheck, 
  requestId, 
  requestLogger 
} = require('./middleware/security');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const kycRoutes = require('./routes/kyc');
const walletRoutes = require('./routes/wallets');
const ledgerRoutes = require('./routes/ledger');
const paymentRoutes = require('./routes/payments');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const faucetRoutes = require('./routes/faucet');
const pricingRoutes = require('./routes/pricing');
const swapRoutes = require('./routes/swap');
const msigRoutes = require('./routes/msig');
const adminRoutes = require('./routes/admin/index');
const twoFactorRoutes = require('./routes/twofactor');

const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Basic middleware
app.use(requestId);

// DevTunnel specific middleware
app.use((req, res, next) => {
  // Add DevTunnel-specific headers if request comes from DevTunnel
  if (req.headers.host && req.headers.host.includes('devtunnels.ms')) {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH');
    res.header('Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Idempotency-Key'
    );
  }

  // Handle preflight requests immediately for DevTunnel
  if (req.method === 'OPTIONS' && req.headers.host && req.headers.host.includes('devtunnels.ms')) {
    return res.status(200).end();
  }

  next();
});

app.use(securityHeaders);
app.use(compression());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://85vjctr3-3000.inc1.devtunnels.ms',
  'https://85vjctr3-3000.inc1.devtunnels.ms/',
  // Add any additional origins from environment variable
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Log origin for debugging
    console.log('CORS Origin:', origin);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('CORS: Allowing request with no origin');
      return callback(null, true);
    }

    // In development, be more permissive - just allow all origins
    if (config.env === 'development') {
      console.log('CORS: Development mode - allowing all origins');
      return callback(null, true);
    }

    // Production CORS check (this won't run in development)
    const isAllowed = allowedOrigins.some(allowedOrigin => origin === allowedOrigin) ||
                     origin.endsWith('.ngrok-free.app') ||
                     origin.endsWith('.ngrok.io') ||
                     origin.endsWith('.ngrok.app') ||
                     origin.endsWith('.devtunnels.ms') ||
                     origin.includes('localhost');

    if (isAllowed) {
      console.log('CORS: Allowing origin:', origin);
      return callback(null, true);
    }

    console.log('CORS: Blocking origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  // Allow comprehensive headers for all tunnel services
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name',
    'X-File-Size',
    'X-File-Type',
    'Idempotency-Key',
    'X-CSRF-Token',
    'ngrok-skip-browser-warning'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Range',
    'Content-Disposition'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  preflightContinue: false,
  maxAge: 86400 // Cache preflight for 24 hours
}));

// Logging
if (config.env !== 'test') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}
app.use(requestLogger);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/v1/kyc/webhook', express.raw({ type: 'application/json' }));

// Security middleware
app.use(sanitizeInput);
app.use(generalRateLimit);
app.use(systemPauseCheck);

// Health check endpoint (before auth)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
  });
});

// Swagger documentation
app.use(`/api/${config.apiVersion}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Swagger JSON endpoint
app.get(`/api/${config.apiVersion}/docs.json`, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Compatibility redirects (support /v1/api/docs for shared links)
app.get(`/v1/api/docs`, (req, res) => {
  res.redirect(301, `/api/${config.apiVersion}/docs`);
});
app.get(`/v1/api/docs.json`, (req, res) => {
  res.redirect(301, `/api/${config.apiVersion}/docs.json`);
});

// API routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/kyc', kycRoutes);
apiRouter.use('/wallets', walletRoutes);
apiRouter.use('/ledger', ledgerRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/faucet', faucetRoutes);
apiRouter.use('/pricing', pricingRoutes);
apiRouter.use('/swap', swapRoutes);
apiRouter.use('/2fa', twoFactorRoutes);
apiRouter.use('/admin', adminRoutes);

app.use(`/api/${config.apiVersion}`, apiRouter);

// Root endpoint - redirect to Swagger docs or show info
app.get('/', (req, res) => {
  // If the request accepts HTML (from browser), redirect to Swagger docs
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect(`/api/${config.apiVersion}/docs`);
  }

  // Otherwise return JSON info (for API clients)
  res.json({
    name: 'Universal Credit Backend API',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    documentation: `/api/${config.apiVersion}/docs`,
    swagger_json: `/api/${config.apiVersion}/docs.json`,
    health: '/health',
  });
});

// Error handling
app.use(notFound);
app.use(globalErrorHandler);

// Graceful shutdown
const server = app.listen(config.port, async () => {
  try {
    logger.info('🚀 Starting Universal Credit Backend server...', {
      environment: config.env,
      port: config.port,
      nodeVersion: process.version,
      pid: process.pid,
    });

    // Connect to database
    logger.info('Step 1: Connecting to database...');
    await connectDatabase();
    logger.info('✅ Database connection successful');

    // Initialize system accounts if needed
    logger.info('Step 2: Initializing system accounts...');
    await initializeSystemAccounts();
    logger.info('✅ System accounts initialized');

    logger.info(`🎉 Universal Credit Backend started successfully on port ${config.port}`, {
      environment: config.env,
      port: config.port,
      nodeVersion: process.version,
      pid: process.pid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to start server with detailed error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Additional context based on error type
    if (error.message?.includes('Database connection failed')) {
      logger.error('💡 Database connection troubleshooting:', {
        suggestions: [
          'Check MongoDB Atlas IP whitelist',
          'Verify internet connection',
          'Confirm MongoDB credentials',
          'Check if MongoDB Atlas cluster is running'
        ]
      });
    }

    process.exit(1);
  }
});

// Initialize system accounts for ledger operations
async function initializeSystemAccounts() {
  try {
    logger.info('🔧 Starting system accounts initialization...');
    const { Account, User } = require('./models');
    
    // Check if system user exists
    let systemUser = await User.findOne({ email: 'system@universalcredit.internal' });
    if (!systemUser) {
      systemUser = new User({
        fullName: 'System Account',
        email: 'system@universalcredit.internal',
        role: config.roles.ADMIN_SUPER,
        isActive: true,
        emailVerified: true,
      });
      await systemUser.save();
      logger.info('System user created');
    }
    
    // Create system accounts for each asset
    const systemAccountTypes = ['SYSTEM', 'FEE', 'RESERVE'];
    const assets = Object.values(config.assets);
    
    for (const accountType of systemAccountTypes) {
      for (const asset of assets) {
        const existingAccount = await Account.findOne({ 
          userId: systemUser._id,
          asset,
          accountType, 
        });
        
        if (!existingAccount) {
          const account = new Account({
            userId: systemUser._id,
            asset,
            status: 'ACTIVE',
            accountType,
            metadata: {
              description: `${accountType} account for ${asset}`,
              tags: ['system', 'auto-created'],
            },
          });
          await account.save();
          logger.info(`Created ${accountType} account for ${asset}`);
        }
      }
    }
    
    // Initialize system configuration
    const { Config } = require('./models');
    await Config.getConfig(); // This will create default config if it doesn't exist
    
    logger.info('✅ System accounts and configuration initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize system accounts with detailed error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Additional context for system account initialization errors
    if (error.name === 'ValidationError') {
      logger.error('💡 Validation Error - Check required fields in User/Account models');
    } else if (error.name === 'MongoError') {
      logger.error('💡 MongoDB Error - Check database permissions and constraints');
    }

    throw error;
  }
}

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    try {
      // Close database connections
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      
      logger.info('Server shut down gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  
  // Graceful shutdown instead of immediate exit
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? {
      message: reason.message,
      stack: reason.stack,
      name: reason.name
    } : reason,
    promiseState: promise ? 'rejected' : 'unknown'
  });
  
  // Don't crash the app - log and continue
  logger.warn('Application continuing despite unhandled rejection');
});

module.exports = app;