// MongoDB initialization script for Docker
db = db.getSiblingDB('universal-credit-dev');

// Create initial indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ kycStatus: 1 });

db.wallets.createIndex({ userId: 1 });
db.wallets.createIndex({ address: 1, network: 1 }, { unique: true });
db.wallets.createIndex({ whitelistState: 1 });

db.accounts.createIndex({ userId: 1, asset: 1 }, { unique: true });
db.accounts.createIndex({ asset: 1 });

db.ledgerentries.createIndex({ journalId: 1 });
db.ledgerentries.createIndex({ accountId: 1, createdAt: -1 });
db.ledgerentries.createIndex({ 'meta.idempotencyKey': 1 }, { unique: true, sparse: true });

db.balances.createIndex({ accountId: 1 }, { unique: true });

db.payments.createIndex({ userId: 1 });
db.payments.createIndex({ stripePaymentIntentId: 1 }, { unique: true });
db.payments.createIndex({ status: 1 });

db.kycapplications.createIndex({ userId: 1 });
db.kycapplications.createIndex({ sumsubApplicantId: 1 }, { unique: true });

db.auditlogs.createIndex({ timestamp: -1 });
db.auditlogs.createIndex({ actor: 1, timestamp: -1 });
db.auditlogs.createIndex({ action: 1, timestamp: -1 });

print('Database initialized with indexes');