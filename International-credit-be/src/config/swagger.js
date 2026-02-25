const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./index');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Universal Credit Backend API',
    version: '1.0.0',
    description: `
      A comprehensive Node.js backend for the Universal Credit MVP, featuring:
      - Off-chain double-entry ledger accounting
      - Stripe payments integration (sandbox)
      - Sumsub KYC integration (sandbox)
      - Complete audit trails and RBAC
      - Background workers for reconciliation and cleanup
    `,
    contact: {
      name: 'Universal Credit Team',
      email: 'admin@universalcredit.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    // Current host (relative) - ensures Try it out uses the same origin the docs are served from
    {
      url: `/api/${config.apiVersion}`,
      description: 'Current host',
    },
    // Explicit production hosts
    {
      url: `https://dev-be.internationalcredit.io/api/${config.apiVersion}`,
      description: 'Dev Backend (International Credit)',
    },
    {
      url: `http://13.62.73.96:3000/api/${config.apiVersion}`,
      description: 'AWS Production Server (direct IP)',
    },
    // DevTunnel URL
    {
      url: `https://85vjctr3-3000.inc1.devtunnels.ms/api/${config.apiVersion}`,
      description: 'DevTunnel',
    },
    // Ngrok URL if set
    ...(process.env.NGROK_URL ? [{
      url: `${process.env.NGROK_URL}/api/${config.apiVersion}`,
      description: 'Ngrok tunnel',
    }] : []),
    // Local development
    {
      url: `http://localhost:${config.port}/api/${config.apiVersion}`,
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /auth/login endpoint',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error',
          },
          message: {
            type: 'string',
            example: 'An error occurred',
          },
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
          details: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'success',
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully',
          },
          data: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          role: {
            type: 'string',
            enum: ['end_user', 'admin.super', 'admin.compliance', 'admin.treasury'],
            example: 'end_user',
          },
          isActive: {
            type: 'boolean',
            example: true,
          },
          emailVerified: {
            type: 'boolean',
            example: false,
          },
          kycStatus: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            example: 'PENDING',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          expiresIn: {
            type: 'number',
            example: 86400,
            description: 'Access token expiration time in seconds',
          },
        },
      },
      Wallet: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          userId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          address: {
            type: 'string',
            example: '0x1234567890abcdef1234567890abcdef12345678',
          },
          network: {
            type: 'string',
            example: 'hedera',
          },
          country: {
            type: 'string',
            example: 'US',
          },
          whitelistStatus: {
            type: 'string',
            enum: ['WHITELISTED', 'BLACKLISTED', 'PENDING'],
            example: 'PENDING',
          },
          reason: {
            type: 'string',
            example: 'Pending KYC approval',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Balance: {
        type: 'object',
        properties: {
          asset: {
            type: 'string',
            enum: ['UC', 'USDC_mock', 'USDT_mock', 'BBT_mock', 'GBT_mock'],
            example: 'UC',
          },
          available: {
            type: 'number',
            example: 1000.50,
          },
          pending: {
            type: 'number',
            example: 0,
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          userId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          stripePaymentIntentId: {
            type: 'string',
            example: 'pi_1234567890abcdef',
          },
          fiatAmount: {
            type: 'number',
            example: 100.00,
          },
          ucAmount: {
            type: 'number',
            example: 100.00,
          },
          currency: {
            type: 'string',
            example: 'USD',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
            example: 'PENDING',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      LedgerEntry: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          journalId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          accountId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          debit: {
            type: 'number',
            example: 100.00,
            nullable: true,
          },
          credit: {
            type: 'number',
            example: 100.00,
            nullable: true,
          },
          asset: {
            type: 'string',
            enum: ['UC', 'USDC_mock', 'USDT_mock', 'BBT_mock', 'GBT_mock'],
            example: 'UC',
          },
          metadata: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['DEPOSIT', 'TRANSFER', 'SWAP', 'WITHDRAWAL', 'FEE', 'REVERSAL'],
                example: 'DEPOSIT',
              },
              reference: {
                type: 'string',
                example: 'stripe_pi_1234567890abcdef',
              },
              description: {
                type: 'string',
                example: 'Stripe deposit from credit card',
              },
              idempotencyKey: {
                type: 'string',
                example: 'unique-operation-id-123',
              },
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
    parameters: {},
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              status: 'error',
              message: 'Access denied. No token provided.',
              code: 'UNAUTHORIZED',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              status: 'error',
              message: 'Insufficient permissions',
              code: 'FORBIDDEN',
            },
          },
        },
      },
      ValidationError: {
        description: 'Invalid input data',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              status: 'error',
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: {
                email: 'Invalid email format',
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              status: 'error',
              message: 'Resource not found',
              code: 'NOT_FOUND',
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              status: 'error',
              message: 'Internal server error',
              code: 'INTERNAL_ERROR',
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization',
    },
    {
      name: 'Users',
      description: 'User management operations',
    },
    {
      name: 'KYC',
      description: 'Know Your Customer verification',
    },
    {
      name: 'Wallets',
      description: 'Wallet management and linking',
    },
    {
      name: 'Ledger',
      description: 'Double-entry ledger operations',
    },
    {
      name: 'Payments',
      description: 'Stripe payment processing',
    },
    {
      name: 'Account Settings - Security',
      description: '2FA, device management, and security settings',
    },
    {
      name: 'Account Settings - Preferences',
      description: 'Language, currency, theme, and notification preferences',
    },
    {
      name: 'Account Settings - Compliance',
      description: 'KYC documents and wallet compliance status',
    },
    {
      name: 'Account Settings - Advanced',
      description: 'Data export and account deletion',
    },
    {
      name: 'Notifications',
      description: 'Push notifications and FCM token management',
    },
    {
      name: 'Notifications - Admin',
      description: 'Admin notification broadcast features',
    },
    {
      name: 'System',
      description: 'System health and configuration',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/routes/**/*.js',
    './src/app.js',
  ],
};

const swaggerSpec = swaggerJSDoc(options);

const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    // Force the first server (ngrok if available) to be selected by default
    servers: process.env.NGROK_URL ? [{
      url: `${process.env.NGROK_URL}/api/${config.apiVersion}`,
      description: 'Ngrok tunnel (recommended for external access)',
    }] : undefined,
    requestInterceptor: (req) => {
      // Automatically add headers for tunnel services
      if (req.url.includes('ngrok-free.app') || req.url.includes('ngrok.io') || req.url.includes('ngrok.app')) {
        req.headers['ngrok-skip-browser-warning'] = 'true';
      }

      // Add headers for DevTunnel
      if (req.url.includes('devtunnels.ms')) {
        req.headers['Accept'] = 'application/json';
        req.headers['Content-Type'] = 'application/json';
      }

      return req;
    },
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info hgroup.main { margin: 0 0 20px 0; }
    .swagger-ui .scheme-container { background: #fff; box-shadow: none; }
  `,
  customSiteTitle: 'Universal Credit API Documentation',
  customfavIcon: '/favicon.ico',
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerOptions,
};