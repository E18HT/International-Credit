const dotenv = require('dotenv');

dotenv.config();

// Log environment variable loading
console.log('🔧 Loading environment variables...');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI preview:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'NOT SET');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || 'v1',

  database: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/universal-credit-dev?retryWrites=true&w=majority',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRE || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  sumsub: {
    appToken: process.env.SUMSUB_APP_TOKEN,
    secretKey: process.env.SUMSUB_SECRET_KEY,
    webhookSecret: process.env.SUMSUB_WEBHOOK_SECRET,
    baseUrl: process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com',
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    
    ses: {
      fromEmail: process.env.SES_FROM_EMAIL || 'noreply@example.com',
      fromName: process.env.SES_FROM_NAME || 'Universal Credit',
    },

    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
    },
    
    s3: {
      buckets: {
        kyc: process.env.S3_BUCKET_KYC || 'uc-kyc-dev',
        receipts: process.env.S3_BUCKET_RECEIPTS || 'uc-receipts-dev',
        exports: process.env.S3_BUCKET_EXPORTS || 'uc-exports-dev',
      },
    },
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : false,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@example.com',
    fromName: process.env.SMTP_FROM_NAME || 'Universal Credit',
  },

  hedera: {
    hashioRpcUrl: process.env.HASHIO_RPC_URL || 'https://testnet.hashio.io/api',
    mirrorNodeUrl: process.env.MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com',
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  assets: {
    UC: 'UC',
    USDC_MOCK: 'USDC_mock',
    USDT_MOCK: 'USDT_mock',
    BBT_MOCK: 'BBT_mock',
    GBT_MOCK: 'GBT_mock',
  },

  roles: {
    END_USER: 'end_user',
    ADMIN_SUPER: 'admin.super',
    ADMIN_COMPLIANCE: 'admin.compliance',
    ADMIN_TREASURY: 'admin.treasury',
  },

  kycStatus: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
  },

  walletStatus: {
    WHITELISTED: 'WHITELISTED',
    BLACKLISTED: 'BLACKLISTED',
    PENDING: 'PENDING',
  },

  transactionTypes: {
    DEPOSIT: 'DEPOSIT',
    TRANSFER: 'TRANSFER',
    SWAP: 'SWAP',
    WITHDRAWAL: 'WITHDRAWAL',
    FEE: 'FEE',
    REVERSAL: 'REVERSAL',
  },

  proposalTypes: {
    FEE_CHANGE: 'FEE_CHANGE',
    RATIO_CHANGE: 'RATIO_CHANGE',
    FAUCET_CAP_CHANGE: 'FAUCET_CAP_CHANGE',
    PAUSE_SYSTEM: 'PAUSE_SYSTEM',
  },
};

module.exports = config;