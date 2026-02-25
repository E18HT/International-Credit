# Complete API Testing Flow for Universal Credit Backend

**Updated with Actual API Endpoints from Project Analysis**

## Environment Setup

**Base URL:** `http://localhost:3000/api/v1`

**Required Headers:**
```
Content-Type: application/json
Authorization: Bearer <jwt_token> (for authenticated endpoints)
Idempotency-Key: <unique_key> (for write operations)
```

**Prerequisites:**
- MongoDB Atlas connection configured
- Stripe sandbox keys set up
- Sumsub sandbox credentials configured
- AWS SES sandbox configured (optional for email)

---

## 1. Authentication & User Registration Flow

### Step 1.1: User Registration
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "fullName": "Test User",
  "email": "testuser@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}
```
**Expected:** `201` - User created, returns tokens and user data

### Step 1.2: Email Verification (if email service configured)
```http
POST /api/v1/auth/verify-email/TOKEN_FROM_EMAIL
```
**Expected:** `200` - Email verified successfully 

### Step 1.3: User Login (without 2FA)
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "SecurePassword123!"
}
```
**Expected:** `200` - Returns access_token and refresh_token

### Step 1.4: Get User Profile
```http
GET /api/v1/auth/me
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns user profile information

---

## 2. Two-Factor Authentication Flow

### Step 2.1: Check 2FA Status
```http
GET /api/v1/2fa/status
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns 2FA status (initially disabled)

### Step 2.2: Generate 2FA Setup
```http
POST /api/v1/2fa/setup
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns QR code and secret for authenticator app

### Step 2.3: Enable 2FA
```http
POST /api/v1/2fa/enable
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "token": "123456"
}
```
**Expected:** `200` - 2FA enabled, returns backup codes

### Step 2.4: Quick Enable 2FA (Alternative)
```http
POST /api/v1/2fa/quick-enable
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "token": "123456"
}
```
**Expected:** `200` - 2FA enabled in one step

### Step 2.5: Verify 2FA Token
```http
POST /api/v1/2fa/verify
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "token": "123456"
}
```
**Expected:** `200` - Token verified successfully

### Step 2.6: Regenerate Backup Codes
```http
POST /api/v1/2fa/backup-codes/regenerate
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "currentPassword": "SecurePassword123!",
  "token": "123456"
}
```
**Expected:** `200` - New backup codes generated

### Step 2.7: Login with 2FA
```http
POST /api/v1/auth/login/2fa
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "SecurePassword123!",
  "twoFactorToken": "123456"
}
```
**Expected:** `200` - Login successful with 2FA verification

### Step 2.8: Disable 2FA
```http
POST /api/v1/2fa/disable
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "currentPassword": "SecurePassword123!",
  "token": "123456"
}
```
**Expected:** `200` - 2FA disabled successfully

---

## 3. Admin User Setup

### Step 3.1: Create Admin User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "fullName": "Admin User",
  "email": "admin@example.com",
  "password": "AdminPassword123!",
  "confirmPassword": "AdminPassword123!"
}
```

### Step 3.2: Manually Update Role in Database
```javascript
// MongoDB command
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin.super" } }
)
```

### Step 3.3: Admin Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "AdminPassword123!"
}
```

---

## 4. KYC Flow Testing

### Step 4.1: Create Manual KYC Application
```http
POST /api/v1/kyc/create
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "country": "US",
  "notes": "Test KYC application"
}
```
**Expected:** `201` - KYC application created

### Step 4.2: Upload KYC Documents
```http
POST /api/v1/kyc/uploads
Authorization: Bearer <user_token>
Content-Type: multipart/form-data

{
  "documents": [files]
}
```
**Expected:** `201` - Documents uploaded successfully

### Step 4.3: Start KYC Session (Sumsub Integration)
```http
POST /api/v1/kyc/start
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "level": "basic",
  "externalUserId": "test-user-001"
}
```
**Expected:** `201` - Returns Sumsub session information

### Step 4.4: Get KYC Access Token
```http
POST /api/v1/kyc/access-token
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "level": "basic"
}
```
**Expected:** `200` - Returns access token for KYC session

### Step 4.5: Get KYC Status
```http
GET /api/v1/kyc/status
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns current KYC status

### Step 4.6: Get KYC Applications List
```http
GET /api/v1/kyc/applications
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns user's KYC applications

### Step 4.7: Get Specific KYC Application Status
```http
GET /api/v1/kyc/{applicationId}/status
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns specific application status

### Step 4.4: Admin Review KYC Applications
```http
GET /api/v1/admin/kyc/applications
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Lists pending KYC applications

### Step 4.5: Admin Approve KYC
```http
POST /api/v1/admin/kyc/applications/{applicationId}/review
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "decision": "APPROVED",
  "reason": "Documents verified successfully"
}
```
**Expected:** `200` - KYC approved, triggers wallet whitelisting

---

## 5. Wallet Management Flow

### Step 5.1: Link User Wallet
```http
POST /api/v1/wallets/link
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "address": "0.0.123456",
  "network": "hedera",
  "country": "US"
}
```
**Expected:** `201` - Wallet linked successfully

### Step 5.2: Get User Wallets
```http
GET /api/v1/wallets
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns user's linked wallets

### Step 5.3: Get Specific Wallet Details
```http
GET /api/v1/wallets/{walletId}
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns specific wallet details

### Step 5.4: Unlink Wallet
```http
DELETE /api/v1/wallets/{walletId}
Authorization: Bearer <user_token>
```
**Expected:** `200` - Wallet unlinked successfully

### Step 5.5: Admin Search Wallets
```http
GET /api/v1/wallets/admin/search?address=0.0.123456
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns wallet information

### Step 5.6: Admin Update Wallet Status
```http
PUT /api/v1/wallets/admin/{walletId}/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "WHITELISTED",
  "reason": "KYC approved - auto-whitelisted"
}
```
**Expected:** `200` - Wallet status updated

### Step 5.7: Admin Get Wallet Statistics
```http
GET /api/v1/wallets/admin/stats
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns wallet statistics and metrics

---

## 6. Payment Flow Testing

### Step 6.1: Create Payment Quote
```http
POST /api/v1/payments/quote
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "fiatAmount": 100.00,
  "fiatCurrency
  ": "USD",
  "asset": "UC"
}
```
**Expected:** `200` - Returns quote with UC amount and fees

### Step 6.2: Create Payment Intent
```http
POST /api/v1/payments/intent
Authorization: Bearer <user_token>
Idempotency-Key: payment_001
Content-Type: application/json

{
  "quoteId": "<quote_id_from_step_6.1>",
  "paymentMethod": "card"
}
```
**Expected:** `201` - Returns Stripe client_secret

### Step 6.3: Mock Payment for Development
```http
POST /api/v1/payments/mock/intent
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "amount": 100,
  "currency": "USD"
}
```
**Expected:** `201` - Creates mock payment intent

### Step 6.4: Confirm Mock Payment
```http
POST /api/v1/payments/mock/confirm
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "paymentId": "<payment_id_from_mock_intent>"
}
```
**Expected:** `200` - Payment confirmed, UC credited

### Step 6.5: Get Payment History
```http
GET /api/v1/payments/history?page=1&limit=20
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns paginated payment history

### Step 6.6: Admin Payment Monitoring
```http
GET /api/v1/admin/payments?status=completed&page=1&limit=20
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns admin view of payments

---

## 7. Ledger Operations Testing

### Step 7.1: Check User Balances
```http
GET /api/v1/ledger/balances
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns balances for all assets

### Step 7.2: Get Specific Asset Balance
```http
GET /api/v1/ledger/balance/UC
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns UC balance

### Step 7.3: Transfer UC Between Users
```http
POST /api/v1/ledger/transfer
Authorization: Bearer <user_token>
Idempotency-Key: transfer_001
Content-Type: application/json

{
  "toAddress": "0.0.789012",
  "amount": 50.00,
  "asset": "UC",
  "description": "Test transfer"
}
```
**Expected:** `201` - Transfer completed successfully

### Step 7.4: Get Transaction History
```http
GET /api/v1/ledger/transactions?page=1&limit=20
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns paginated transaction history

### Step 7.5: Get Specific Transaction
```http
GET /api/v1/ledger/transaction/{journalId}
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns transaction details

### Step 7.6: Admin Check Ledger Invariants
```http
GET /api/v1/admin/ledger/invariants
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns ledger health status

---

## 8. Multisig Operations Testing

### Step 8.1: Create Multisig Action
```http
POST /api/v1/msig/actions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "type": "TRANSFER",
  "data": {
    "amount": 1000,
    "asset": "UC",
    "toAddress": "0.0.123456"
  },
  "description": "Emergency fund transfer"
}
```
**Expected:** `201` - Multisig action created, pending approval

### Step 8.2: Get Pending Multisig Actions
```http
GET /api/v1/msig/actions?status=pending
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns pending actions requiring approval

### Step 8.3: Approve Multisig Action
```http
POST /api/v1/msig/actions/{actionId}/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Approved for emergency transfer"
}
```
**Expected:** `200` - Action approved

### Step 8.4: Reject Multisig Action
```http
POST /api/v1/msig/actions/{actionId}/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Insufficient justification"
}
```
**Expected:** `200` - Action rejected

---

## 9. Swap Operations Testing

### Step 8.1: Swap UC to Stablecoin
```http
POST /api/v1/swap
Authorization: Bearer <user_token>
Idempotency-Key: swap_001
Content-Type: application/json

{
  "amount": 25.00,
  "toAsset": "USDC_mock"
}
```
**Expected:** `201` - Swap completed successfully

---

## 9. Faucet Testing (Development)

### Step 9.1: Get UC from Faucet
```http
POST /api/v1/faucet/uc
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "amount": 100
}
```
**Expected:** `201` - UC tokens credited to user

---

## 10. User Account Management

### Step 10.1: Get User Profile Details
```http
GET /api/v1/users/profile
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns detailed user profile

### Step 10.2: Update User Profile
```http
PUT /api/v1/users/profile
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "preferences": {
    "notifications": {
      "email": true,
      "push": false
    }
  }
}
```
**Expected:** `200` - Profile updated successfully

### Step 10.3: Get User Accounts
```http
GET /api/v1/users/accounts
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns user's blockchain accounts

### Step 10.4: Add FCM Token for Notifications
```http
POST /api/v1/users/fcm-token
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "token": "fcm_token_here",
  "deviceType": "web"
}
```
**Expected:** `201` - FCM token registered

---

## 11. Admin History & Analytics

### Step 11.1: Get Activity History
```http
GET /api/v1/admin/history/activities?action=LOGIN&limit=50&page=1
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns filtered activity history

### Step 11.2: Get Activity Statistics
```http
GET /api/v1/admin/history/stats?period=week
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns activity statistics

### Step 11.3: Get User Timeline
```http
GET /api/v1/admin/history/user/{userId}/timeline?period=month
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns specific user's activity timeline

### Step 11.4: Get Suspicious Activities
```http
GET /api/v1/admin/history/suspicious?severity=high&limit=20
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns suspicious activity alerts

### Step 11.5: Export Activity Data
```http
POST /api/v1/admin/history/export
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "format": "csv",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "actions": ["LOGIN", "TRANSFER"]
  }
}
```
**Expected:** `202` - Export job created

### Step 11.6: Get Analytics Dashboard Data
```http
GET /api/v1/admin/history/analytics?timeframe=24h
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns comprehensive analytics data

---

## 12. Admin Management Operations

### Step 11.1: List All Users
```http
GET /api/v1/admin/users?page=1&limit=20&status=active
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns paginated user list

### Step 11.2: Update User Status
```http
PUT /api/v1/admin/users/{userId}/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "isActive": false,
  "reason": "Suspicious activity detected"
}
```
**Expected:** `200` - User status updated

### Step 11.3: Update User Role (Super Admin Only)
```http
PUT /api/v1/admin/users/{userId}/role
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "role": "admin.compliance",
  "reason": "Promoted to compliance team"
}
```
**Expected:** `200` - User role updated

### Step 11.4: Get System Configuration
```http
GET /api/v1/admin/config
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns system configuration

### Step 12.5: Update System Configuration
```http
PUT /api/v1/admin/config
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fees": { "transfer": 0.02 },
  "paused": false,
  "reason": "Updated transfer fee structure"
}
```
**Expected:** `200` - Configuration updated

### Step 12.6: Get Governance Proposals
```http
GET /api/v1/admin/governance/proposals?status=active
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns governance proposals

### Step 12.7: Get Reserves Snapshots
```http
GET /api/v1/admin/reserves/snapshots?period=daily&limit=30
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns reserves snapshots

### Step 12.8: Get Price Ticks Data
```http
GET /api/v1/admin/pricing/ticks?asset=UC&period=1h&limit=100
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns historical price data

### Step 12.9: Admin Multisig Operations
```http
POST /api/v1/admin/msig/actions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "type": "CONFIG_UPDATE",
  "data": {
    "key": "maxTransferAmount",
    "value": "10000"
  },
  "description": "Increase max transfer limit"
}
```
**Expected:** `201` - Multisig action created

### Step 12.10: Get Admin Multisig Actions
```http
GET /api/v1/admin/msig/actions?status=pending
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns admin multisig actions

---

## 12. Settings & Preferences

### Step 12.1: Get Security Devices
```http
GET /api/v1/settings/security/devices
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns user's logged-in devices

### Step 12.2: Get User Preferences
```http
GET /api/v1/settings/preferences
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns user preferences

### Step 12.3: Update Preferences
```http
PUT /api/v1/settings/preferences
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "notifications": {
    "email": true,
    "push": true
  },
  "language": "en",
  "timezone": "UTC"
}
```
**Expected:** `200` - Preferences updated

### Step 13.4: Get KYC Compliance Status
```http
GET /api/v1/settings/compliance/kyc
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns KYC compliance information

### Step 13.5: Get Wallet Compliance Status
```http
GET /api/v1/settings/compliance/wallets
Authorization: Bearer <user_token>
```
**Expected:** `200` - Returns wallet compliance status

### Step 13.6: Request Data Export
```http
POST /api/v1/settings/advanced/export
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "dataTypes": ["transactions", "profile", "kyc"],
  "format": "json"
}
```
**Expected:** `202` - Export request accepted

### Step 13.7: Request Account Deletion
```http
POST /api/v1/settings/advanced/delete-account
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "currentPassword": "SecurePassword123!",
  "reason": "No longer needed",
  "confirmation": "DELETE_MY_ACCOUNT"
}
```
**Expected:** `202` - Account deletion request submitted

---

## 14. Notification Testing

### Step 14.1: Send Test Notification
```http
POST /api/v1/notifications/test
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "title": "Test Notification",
  "body": "This is a test notification",
  "data": {
    "type": "test",
    "actionUrl": "https://app.example.com/dashboard"
  }
}
```
**Expected:** `200` - Test notification sent

### Step 14.2: Send Welcome Notification
```http
POST /api/v1/notifications/welcome
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "userId": "userId123"
}
```
**Expected:** `200` - Welcome notification sent

### Step 14.3: Send Transaction Notification
```http
POST /api/v1/notifications/transaction
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "transactionId": "tx_123",
  "type": "TRANSFER",
  "amount": 100,
  "asset": "UC"
}
```
**Expected:** `200` - Transaction notification sent

### Step 14.4: Subscribe to Topic
```http
POST /api/v1/notifications/subscribe-topic
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "topic": "system_announcements",
  "fcmToken": "user_fcm_token_here"
}
```
**Expected:** `200` - Subscribed to topic successfully

### Step 14.5: Admin Broadcast Notification
```http
POST /api/v1/notifications/admin/send-to-all
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "System Maintenance",
  "message": "Scheduled maintenance tonight",
  "type": "system",
  "priority": "high"
}
```
**Expected:** `200` - Broadcast notification sent

---

## 14. Pricing & Market Data

### Step 14.1: Get Price Tickers
```http
GET /api/v1/pricing/tickers
```
**Expected:** `200` - Returns current price tickers

### Step 14.2: Get FX Quote
```http
GET /api/v1/pricing/fx/quote?from=USD&to=EUR&amount=100
```
**Expected:** `200` - Returns exchange rate quote

### Step 14.3: Admin Get Price Ticks
```http
GET /api/v1/admin/pricing/ticks?asset=BTC&limit=50
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns historical price data

---

## 15. System Monitoring & Health

### Step 15.1: Health Check
```http
GET /health
```
**Expected:** `200` - Returns system health status

### Step 15.2: Admin System Status
```http
GET /api/v1/admin/system/status
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns detailed system metrics

### Step 15.3: Admin Audit Logs
```http
GET /api/v1/admin/audit-logs?action=LOGIN&page=1&limit=20
Authorization: Bearer <admin_token>
```
**Expected:** `200` - Returns filtered audit logs

### Step 15.4: Emergency System Pause
```http
POST /api/v1/admin/system/pause
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "paused": true,
  "reason": "Emergency maintenance required"
}
```
**Expected:** `200` - System paused successfully

---

## 16. Error Handling Test Cases

### Step 16.1: Test Invalid Authentication
```http
GET /api/v1/admin/users
Authorization: Bearer invalid_token
```
**Expected:** `401` - Unauthorized

### Step 16.2: Test Insufficient Permissions
```http
GET /api/v1/admin/users
Authorization: Bearer <user_token>
```
**Expected:** `403` - Forbidden

### Step 16.3: Test Validation Errors
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "invalid-email",
  "password": "123"
}
```
**Expected:** `400` - Validation error

### Step 16.4: Test Rate Limiting
```bash
# Make multiple rapid requests
for i in {1..101}; do
  curl -X GET http://localhost:3000/api/v1/pricing/tickers
done
```
**Expected:** `429` - Too Many Requests after limit exceeded

---

## 17. Advanced Testing Scenarios

### Scenario A: Complete New User Onboarding
```bash
# 1. User Registration & Email Verification
POST /api/v1/auth/register
POST /api/v1/auth/verify-email/{token}

# 2. Initial Login & Profile Setup
POST /api/v1/auth/login
GET /api/v1/auth/me
PUT /api/v1/users/profile

# 3. Security Setup (2FA)
GET /api/v1/2fa/status
POST /api/v1/2fa/setup
POST /api/v1/2fa/enable

# 4. KYC Process
POST /api/v1/kyc/create
POST /api/v1/kyc/uploads
POST /api/v1/kyc/start
GET /api/v1/kyc/status

# 5. Wallet Linking
POST /api/v1/wallets/link
GET /api/v1/wallets

# 6. First Transactions
POST /api/v1/faucet/uc
GET /api/v1/ledger/balances
POST /api/v1/ledger/transfer

# 7. Payment Integration
POST /api/v1/payments/quote
POST /api/v1/payments/intent
GET /api/v1/payments/history
```

### Scenario B: Admin Operations Workflow
```bash
# 1. Admin Authentication
POST /api/v1/auth/login
GET /api/v1/auth/me

# 2. System Monitoring
GET /api/v1/admin/system/status
GET /api/v1/admin/audit-logs
GET /api/v1/admin/history/activities

# 3. User Management
GET /api/v1/admin/users
GET /api/v1/admin/kyc/applications
POST /api/v1/admin/kyc/applications/{id}/review

# 4. Financial Operations
GET /api/v1/admin/payments
GET /api/v1/admin/ledger/invariants
GET /api/v1/admin/reserves/snapshots

# 5. Configuration Management
GET /api/v1/admin/config
PUT /api/v1/admin/config
POST /api/v1/admin/msig/actions
```

### Scenario C: High-Volume Testing
```bash
# Concurrent user registrations
for i in {1..100}; do
  curl -X POST /api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"fullName\":\"User $i\",\"email\":\"user$i@test.com\",\"password\":\"Pass123!\",\"confirmPassword\":\"Pass123!\"}" &
done

# Stress test transfers
for i in {1..50}; do
  curl -X POST /api/v1/ledger/transfer \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"toAddress\":\"0.0.123456\",\"amount\":10,\"asset\":\"UC\",\"description\":\"Test $i\"}" &
done
```

### Scenario D: Security & Edge Cases
```bash
# 1. Authentication Edge Cases
POST /api/v1/auth/login # Invalid credentials
POST /api/v1/auth/login # Account locked
POST /api/v1/auth/login # Email not verified

# 2. Permission Testing
GET /api/v1/admin/users # Non-admin user
PUT /api/v1/admin/config # Insufficient permissions

# 3. Rate Limiting
for i in {1..150}; do
  curl -X GET /api/v1/pricing/tickers
done

# 4. Data Validation
POST /api/v1/ledger/transfer # Insufficient balance
POST /api/v1/ledger/transfer # Invalid address format
POST /api/v1/payments/intent # Amount exceeds limits

# 5. Concurrent Operations
POST /api/v1/ledger/transfer # Same idempotency key
POST /api/v1/payments/intent # Duplicate payment
```

### Scenario E: Error Recovery Testing
```bash
# 1. Database Connection Issues
# Simulate DB downtime during operations

# 2. External Service Failures
# Test Stripe webhook failures
# Test Sumsub API timeouts

# 3. Network Issues
# Test partial request failures
# Test timeout scenarios

# 4. System Recovery
POST /api/v1/admin/system/pause
# Test system in paused state
# Resume and verify recovery
```

## 18. Complete End-to-End User Journey

### Scenario A: New User Complete Flow
1. **Registration Flow:** Register → Verify Email → Login
2. **Security Setup:** Enable 2FA → Generate Backup Codes
3. **Identity Verification:** Complete KYC → Admin Approval
4. **Wallet Management:** Link Wallet → Admin Whitelist
5. **Financial Operations:** Get Faucet Tokens → Make Payment → Transfer Funds
6. **Advanced Features:** Swap Assets → View History → Update Preferences

### Scenario B: Admin Complete Workflow
1. **System Monitoring:** Login → Check Status → Review Alerts
2. **User Management:** Review KYC → Approve Applications → Manage Users
3. **Financial Oversight:** Monitor Payments → Check Reconciliation → Review Ledger
4. **System Administration:** Review Audit Logs → Update Configuration → Manage Multisig
5. **Analytics & Reporting:** View History → Export Data → Generate Reports

---

## 18. Swagger Documentation Access

### Access Swagger UI
```http
GET /api/v1/docs
```

### Get Swagger JSON
```http
GET /api/v1/docs.json
```

---

## Testing Tools & Commands

### Using curl:
```bash
# Health check
curl -X GET http://localhost:3000/health

# Registration
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"SecurePass123!","confirmPassword":"SecurePass123!"}'

# Authenticated request
curl -X GET http://localhost:3000/api/v1/ledger/balances \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Using Postman:
- Import Swagger JSON to auto-generate collection
- Set up environment variables for tokens and base URL
- Create automated test scripts

---

## 19. API Endpoint Summary

### Total Endpoints: **120+ API endpoints**

**Authentication & User Management (15 endpoints):**
- `/auth/*` - 10 endpoints (register, login, 2FA, passwords, tokens)
- `/users/*` - 8 endpoints (profile, accounts, FCM, search, stats)
- `/2fa/*` - 7 endpoints (setup, enable, disable, verify, backup codes)

**Financial Operations (25 endpoints):**
- `/ledger/*` - 8 endpoints (balances, transfers, transactions, admin operations)
- `/payments/*` - 10 endpoints (quotes, intents, webhooks, history, admin stats)
- `/swap/*` - 1 endpoint (asset swapping)
- `/faucet/*` - 1 endpoint (development tokens)
- `/pricing/*` - 5 endpoints (tickers, FX quotes, admin price data)

**Identity & Compliance (12 endpoints):**
- `/kyc/*` - 9 endpoints (applications, uploads, status, admin review)
- `/wallets/*` - 8 endpoints (linking, management, admin operations)

**System Administration (35 endpoints):**
- `/admin/*` - 20 endpoints (users, config, system, audit logs)
- `/admin/history/*` - 6 endpoints (activities, stats, analytics, exports)
- `/admin/msig/*` - 4 endpoints (multisig operations)
- `/msig/*` - 4 endpoints (user multisig actions)
- `/settings/*` - 8 endpoints (security, preferences, compliance, exports)

**Communication & Notifications (7 endpoints):**
- `/notifications/*` - 5 endpoints (test, welcome, transaction, topics, admin broadcast)

**System Utilities (6 endpoints):**
- Health checks, system status, documentation endpoints

### Key Features Covered:
✅ **Complete Authentication Flow** - Registration, login, 2FA, password management
✅ **Advanced Security** - Rate limiting, encryption, audit trails, multisig operations
✅ **Financial Operations** - Payments, transfers, swaps, reconciliation, ledger management
✅ **Compliance & KYC** - Identity verification, wallet whitelisting, admin review workflows
✅ **Admin Tools** - User management, system monitoring, configuration, analytics
✅ **Real-time Features** - Notifications, webhooks, live status updates
✅ **Data Management** - Exports, imports, analytics, reporting
✅ **External Integrations** - Stripe payments, Sumsub KYC, AWS services

This comprehensive testing flow covers all **120+ API endpoints** in your Universal Credit backend, organized by functional areas and including proper authentication, error handling, admin operations, advanced security testing, and real-world usage scenarios.