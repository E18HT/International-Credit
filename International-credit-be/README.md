# International Credit Backend

A comprehensive Node.js backend for the International Credit MVP, featuring off-chain double-entry ledger accounting, Stripe payments, Sumsub KYC, and complete audit trails.

## 🏗️ Architecture

Based on the microservices architecture defined in `architecture.md`, this backend implements:

- **Off-chain MVP** with MongoDB double-entry ledger
- **Stripe integration** (sandbox) for fiat→UC purchases  
- **Sumsub integration** (sandbox) for KYC verification
- **Hedera Testnet** preparation (addresses stored, not invoked)
- **Complete RBAC** with audit trails instead of on-chain multisig
- **Background workers** for reconciliation, invariants, and cleanup

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7.0+
- Redis 7.0+
- Docker & Docker Compose (recommended)

### Environment Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd InternationalCredit
npm install
```

2. **Copy environment configuration:**
```bash
cp .env.example .env
```

3. **Configure environment variables in `.env`:**
```bash
# Required for development
JWT_SECRET=your-super-secret-jwt-key-here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
SUMSUB_APP_TOKEN=your_sumsub_app_token_here
SUMSUB_SECRET_KEY=your_sumsub_secret_key_here
```

### Development with Docker (Recommended)

```bash
# Start all services (API + Worker + MongoDB + Redis)
docker-compose up -d

# View logs
docker-compose logs -f app

# Start with admin tools (Mongo Express + Redis Commander)
docker-compose --profile tools up -d

# Stop all services
docker-compose down
```

**Access Points:**
- API: http://localhost:3000
- Swagger (via ngrok): https://d524875ff6b0.ngrok-free.app/v1/api/docs
- MongoDB Admin: http://localhost:8081 (admin/admin123)
- Redis Admin: http://localhost:8082 (admin/admin123)

### Manual Development Setup

1. **Start MongoDB and Redis:**
```bash
# MongoDB
mongod --dbpath ./data/db

# Redis  
redis-server
```

2. **Start the application:**
```bash
# Start API server
npm run dev

# Start worker process (in separate terminal)
npm run worker
```

## 📚 API Documentation

### Core Endpoints

- **Authentication**: `/api/v1/auth/*`
- **Users**: `/api/v1/users/*` 
- **KYC**: `/api/v1/kyc/*`
- **Wallets**: `/api/v1/wallets/*`
- **Ledger**: `/api/v1/ledger/*`
- **Payments**: `/api/v1/payments/*`

### Health Check

```bash
curl http://localhost:3000/health
```

## 🔐 Authentication & Authorization

The system implements JWT-based authentication with role-based access control:

**Roles:**
- `end_user`: Regular users
- `admin.super`: Super admin (all permissions)
- `admin.compliance`: Compliance admin (KYC, user management)
- `admin.treasury`: Treasury admin (payments, ledger)

**Protected endpoints require:**
- Valid JWT token in `Authorization: Bearer <token>` header
- Appropriate role permissions
- `Idempotency-Key` header for write operations

## 💰 Core Services

### Ledger Service (Double-Entry Accounting)

Implements complete double-entry bookkeeping:

```javascript
// Transfer UC between users
POST /api/v1/ledger/transfer
{
  "toAddress": "0x...",
  "amount": 100.50,
  "asset": "UC", 
  "description": "Payment for services",
  "idempotencyKey": "uuid-here"
}
```

**Features:**
- Atomic transactions with MongoDB sessions
- Balance caching with real-time updates
- Transaction history and audit trails
- Invariant checking (balances must match ledger entries)
- Admin transaction reversal capabilities

### Payment Service (Stripe Integration)

Handles fiat-to-UC purchases:

```javascript
// Create payment intent
POST /api/v1/payments/create-intent
{
  "amount": 100.00,
  "currency": "USD"
}

// Webhook endpoint for Stripe events
POST /api/v1/payments/webhook
```

**Features:**
- Secure webhook signature verification
- Automatic UC crediting on successful payments
- Payment reconciliation jobs
- Fee calculation and tracking
- Dispute handling

### KYC Service (Sumsub Integration)

Manages identity verification:

```javascript
// Start KYC process
POST /api/v1/kyc/start
{
  "level": "basic"
}

// Webhook for verification results  
POST /api/v1/kyc/webhook
```

**Features:**
- Sumsub SDK integration with HMAC verification
- Automatic wallet whitelisting on approval
- Admin manual review capabilities
- Document upload and verification tracking

### Wallet Service

Manages user wallet addresses:

```javascript
// Link wallet to account
POST /api/v1/wallets/link
{
  "address": "0x123...",
  "network": "hedera",
  "country": "US"
}
```

**Features:**
- Address validation and ownership verification
- Whitelist/blacklist management
- Cross-border compliance checks
- Integration with KYC approval workflow

## 🔄 Background Workers

The worker system handles asynchronous processing:

### Job Types

1. **Email Processing**: Welcome emails, notifications, bulk campaigns
2. **Reconciliation**: Daily Stripe reconciliation, webhook verification  
3. **Invariant Checking**: Ledger balance validation, journal verification
4. **Reserves Snapshots**: Collateralization ratio monitoring
5. **Cleanup**: Old logs, expired tokens, inactive users

### Worker Management

```bash
# Start worker process
npm run worker

# Monitor job queues (Redis Commander)
http://localhost:8082
```

## 🛡️ Security Features

### Request Security
- **Rate limiting**: Configurable per endpoint type
- **Input sanitization**: MongoDB injection prevention
- **CORS protection**: Configurable allowed origins
- **Security headers**: Helmet.js with CSP
- **Request correlation**: Unique ID tracking

### Data Security  
- **JWT tokens**: Short-lived access + long-lived refresh
- **Password hashing**: bcrypt with configurable rounds
- **Audit logging**: Every significant action logged
- **Idempotency**: Duplicate request protection
- **System pause**: Emergency operation suspension

### Financial Security
- **Double-entry accounting**: Mathematically balanced ledger
- **Transaction atomicity**: MongoDB sessions for consistency  
- **Balance verification**: Automatic invariant checking
- **Admin controls**: Transaction reversal capabilities
- **Webhook verification**: HMAC signature validation

## 🗄️ Database Schema

### Key Collections

- **users**: Authentication, roles, KYC status
- **accounts**: Asset accounts per user (UC, USDC_mock, etc.)
- **ledger_entries**: Immutable double-entry records
- **balances**: Cached balances for performance
- **payments**: Stripe payment tracking
- **wallets**: Linked addresses with whitelist status
- **kyc_applications**: Sumsub verification records
- **audit_log**: Complete audit trail
- **config**: System configuration and limits

### Indexes

Critical indexes are automatically created for:
- User lookups (`email`, `role`)
- Wallet queries (`address + network`, `userId`)
- Ledger performance (`accountId + timestamp`, `journalId`)
- Audit queries (`timestamp`, `actor`, `action`)

## 📊 Monitoring & Operations

### Health Monitoring

```bash
# Application health
curl http://localhost:3000/health

# Database connection status
# Worker queue status  
# External service connectivity
```

### Admin Operations

```javascript
// Check ledger invariants
GET /api/v1/ledger/admin/invariants

// Payment reconciliation  
GET /api/v1/payments/admin/reconcile?date=2024-01-15

// User statistics
GET /api/v1/users/admin/stats

// System pause (emergency)
PUT /api/v1/system/pause
{
  "reason": "Emergency maintenance",
  "pauseAll": true
}
```

### Logging

Structured logging with Winston:
- **Development**: Console + file output
- **Production**: JSON format for log aggregation
- **Log levels**: error, warn, info, debug
- **Correlation IDs**: Request tracking across services

## 🚧 Development

### Code Organization

```
src/
├── config/          # Configuration and database setup
├── models/          # MongoDB models and schemas  
├── services/        # Business logic services
├── routes/          # Express route definitions
├── middleware/      # Authentication, validation, security
├── workers/         # Background job processors
├── utils/           # Utilities (logger, JWT, errors)
├── app.js           # Express application setup
└── worker.js        # Worker process entry point
```

### Development Commands

```bash
npm run dev          # Start API with nodemon
npm run worker       # Start worker process
npm test             # Run test suite  
npm run lint         # ESLint code checking
npm run lint:fix     # Auto-fix ESLint issues
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/services/LedgerService.test.js
```

## 🔄 Deployment

### Environment Configuration

**Required Environment Variables:**
```bash
# Core
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
JWT_SECRET=...

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Sumsub (Production)  
SUMSUB_APP_TOKEN=...
SUMSUB_SECRET_KEY=...

# AWS (Production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
SES_FROM_EMAIL=noreply@yourdomain.com
```

### Production Deployment

1. **Build and deploy application**
2. **Configure MongoDB Atlas** (M10+ for PITR)
3. **Set up Redis Cluster** for worker queues
4. **Configure AWS SES** for email delivery
5. **Set up monitoring** (CloudWatch, DataDog, etc.)
6. **Configure backup procedures**
7. **Set up SSL/TLS termination**
8. **Configure CDN and WAF**

## 🔍 Troubleshooting

### Common Issues

**MongoDB Connection Issues:**
```bash
# Check MongoDB connection
mongosh "mongodb://localhost:27017/International-credit-dev"

# Verify indexes
db.users.getIndexes()
```

**Redis Connection Issues:**
```bash
# Check Redis connectivity
redis-cli ping

# Monitor job queues
redis-cli monitor
```

**Webhook Issues:**
```bash
# Test Stripe webhook locally
stripe listen --forward-to localhost:3000/api/v1/payments/webhook

# Verify webhook signatures in logs
docker-compose logs app | grep "webhook"
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# MongoDB debug queries
DEBUG=mongoose:* npm run dev
```

## 📄 License

This project is proprietary software. All rights reserved.

---

## Next Steps

This backend provides the complete foundation for your International Credit MVP. The architecture is designed to scale from development through production, with clear upgrade paths to on-chain functionality when ready.

Key next steps:
1. **Frontend Integration**: Connect your PWA/Admin panel
2. **Testing**: Comprehensive test suite implementation  
3. **Monitoring**: Production monitoring and alerting setup
4. **Documentation**: API documentation generation
5. **Security Audit**: Third-party security review
6. **Load Testing**: Performance optimization and scaling
7. **On-chain Migration**: Future Hedera contract integration