here’s a clear, end-to-end **technical architecture** for your UC MVP backend, tailored to your current constraints:

* Off-chain MVP (no contract calls yet) with a **MongoDB double-entry ledger**
* **Stripe** (sandbox) for fiat→UC
* **Sumsub** (sandbox) for KYC
* **Hedera Testnet** only referenced (addresses/IDs stored), not invoked
* **No on-chain multisig** (RBAC + audit + optional dual-review at app layer)

---

# 1) System Context (Logical)

```
[PWA (End User)] ──\
                    \        HTTPS (JWT, CORS)
[Admin Panel]  ──────>  [API Gateway / ALB]  ────────────────────────────────┐
                                                                             │
                                                              Internal VPC   │
                                                                             ▼
     ┌─────────────────────────────────────────────── Microservices (ECS/EKS) ─────────────────────────────────┐
     │  Auth & Users  |  KYC  |  Wallets  |  Ledger  |  Payments  |  Remit/Swap |  Oracles |  Governance | ... │
     └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                 │             │          │          │            │             │            │
                 ▼             ▼          ▼          ▼            ▼             ▼            ▼
             [MongoDB Atlas]  [S3]    [SQS/SNS]  [SES/Push]   [Stripe]      [Oracles]   [Sumsub]
                 (PII,         (docs,   (async)    (notif)      (sandbox)     (mock)      (sandbox)
                 ledger,       receipts,
                 config)       exports)

Observability: CloudWatch (logs/metrics/alarms), optional OpenTelemetry tracer
Security: WAF + IAM + KMS + Secrets Manager + VPC endpoints + least-privilege RBAC
```

---

# 2) Service Decomposition (Bounded Contexts)

**API Gateway / ALB**

* Single public entrypoint, TLS via ACM, WAF rules, rate limiting, request/response logging.

**Auth & Users Service**

* JWT issuance/refresh (optionally Cognito later), password reset hook, RBAC (`end_user`, `admin.super`, `admin.compliance`, `admin.treasury`).
* User preferences & notification settings.
* Central **audit writer** used by all services.

**KYC Service**

* Start Sumsub session, presigned uploads, webhook verifier (HMAC).
* KYC state machine: `PENDING → APPROVED|REJECTED`.
* On approval: emit `KYC.APPROVED` event → Wallet auto-whitelist.

**Wallets Service**

* Link wallets (address, network, country tag).
* Whitelist/Blacklist with reasons; server-side checks on any value-moving op.

**Ledger Service (core)**

* **Double-entry accounting** with Mongo transactions.
* Assets: `UC`, `USDC_mock`, `USDT_mock` (+ later `BBT_mock`, `GBT_mock` for reserves).
* Journal posting API, derived `balances` cache, periodic `balance_snapshots`.
* **Idempotency** on all writes (header + server token store).
* Invariants: no negative balances, journal sums match.

**Payments Service (Stripe)**

* Quote/Intent endpoints; webhook (signature verify, idempotent, DLQ).
* On success: **Deposit** journal crediting UC; on refund/failure: compensating entries.
* Daily reconciliation job & report.

**Remittance & Swap Service**

* Cross-border UC send (country check), receipts (PDF), notifications.
* Swap UC→mock stablecoin at FX table; both operations ledger-posted.

**Oracles & FX Service (mock, redundant)**

* Two sources for BTC & Gold; median/quorum; TTL freshness; `price_ticks` time-series.
* Derived UC valuation from reserve ratio.
* Alerts on stale sources.

**Governance Service (off-chain simulation)**

* Proposals (fee, ratio, faucet caps, pause), voting (1:1), quorum, execute → update **config**.
* Optional **dual-review** for sensitive changes (app-level, not on-chain).
* All governance actions audited.

**Transparency & Reporting Service**

* Collateralization, composition, reserves snapshots; activity stream (merge ledger + admin actions).
* Exports (CSV/PDF): KYC, wallet actions, ledger, reserves, payments/recon, proposals.

**Notifications Service**

* Email (SES) & web-push (VAPID). Subscription mgmt, retries, dead-letter.


---

# 3) Data Model (MongoDB) — Key Collections

**users**

* `_id`, `email`, `password_hash?`, `role`, `kyc_status`, `prefs`, `created_at`

**kyc\_applications**

* `_id`, `user_id`, `sumsub_applicant_id`, `status`, `notes`, `evidence_keys[]`, `decided_at`

**wallets**

* `_id`, `user_id`, `address`, `network`, `country`, `whitelist_state`, `reason`, `created_at`

**accounts**

* `_id`, `user_id`, `asset` (`UC|USDC_mock|USDT_mock|BBT_mock|GBT_mock|…`), `status`

**ledger\_entries**  *(append-only double-entry)*

* `_id`, `journal_id`, `account_id`, `debit`, `credit`, `meta{type,ref}`, `created_at`
* **Indexes**: `journal_id`, `account_id`, `created_at`, `meta.type`, `meta.idempotency_key` (unique)

**balances** *(derived/cached)*

* `_id`, `account_id`, `asset`, `available`, `pending`, `updated_at`

**payments**

* `_id`, `user_id`, `stripe_payment_intent_id`, `fiat_amount`, `uc_amount`, `status`, `linked_journal_id`, `events[]`, `created_at`

**proposals / votes / config**

* `proposals`: `{type, payload, status, open_at, close_at, quorum, tallies, executed_at}`
* `votes`: `{proposal_id, voter_id, choice, weight}`
* `config`: single document with `fee_bps`, `faucet_caps`, `reserve_ratio`, `paused`, `fx_table`

**price\_ticks** *(time-series)*

* `{asset:'BTC|XAU|UC', price, source, ts}`  (TTL for raw ticks; aggregated rollups)

**reserves\_snapshots**

* `{ts, bbt_qty, gbt_qty, uc_supply, collateral_pct, health}`

**audit\_log**

* `{ts, actor, role, action, object{type,id}, before?, after?, ip, user_agent, correlation_id}`

**receipts**

* `{id, journal_id, url, s3_key, meta, expires_at}`

---

# 4) Core Patterns & Guarantees

**Idempotency**

* All mutating endpoints require `Idempotency-Key` header.
* Server stores processed keys with expiry; identical repeats return original result.

**Mongo Transactions**

* Use sessions for multi-doc atomicity (journal legs + balance cache updates).
* Write concern `majority` for financial ops.

**Outbox Pattern**

* Persist business event → publish to SNS/SQS from outbox (retries safe).
* Consumers (notifications, recon) process idempotently.

**States & Invariants**

* Journal entries are immutable (append-only).
* Transaction states: `PENDING|POSTED|REVERSED`.
* Ledger invariant checker runs periodically; alert on violation.

**Pause Switch**

* Global `config.paused=true` blocks new deposits/transfers/swaps (reads unaffected).

---

# 5) End-to-End Flows (Sequences)

## A) Onboarding & KYC

1. User `signup` → JWT issued.
2. Start `KYC session` → user completes on Sumsub.
3. Sumsub webhook → verify HMAC → set `APPROVED|REJECTED`, append audit.
4. If `APPROVED` → auto-whitelist user’s wallet; notify via SES/push.

## B) Stripe Purchase → UC Credit

1. Client requests `payments/quote`, then `payments/intent`.
2. User completes card; Stripe webhook hits `/webhooks/stripe` (signature verified).
3. Payments svc checks idempotency → posts **Deposit** journal to Ledger → updates balances.
4. Notification → “UC credited”; receipt available if needed.
5. Recon job (daily): matches Stripe events ↔ internal `payments`.

## C) Remit & Swap (Simulation)

1. Sender transfers UC (country A) → receiver wallet (country B); ledger posts **Transfer**.
2. Receiver invokes `swap UC→USDC_mock`; ledger posts **Swap** legs, generates **PDF receipt**.
3. Activity appears in transparency feed.

## D) Governance Change (Off-chain)

1. User creates `proposal(type=fee|ratio|…)`.
2. Voting window open; tallies tracked.
3. On quorum & success → `execute` updates **config**.
4. All actions audited; subsequent ops reflect new config.

## E) Reserves & Transparency

1. Custody sim endpoints change `BBT_mock/GBT_mock` holdings; snapshot cron recomputes collateralization.
2. Transparency endpoints expose composition, collateral %, history, and activity.

---

# 6) Infrastructure (AWS Reference)

**Networking**

* 1 VPC, 3 AZs, public subnets (ALB/API GW), private subnets (services), NAT gateways per AZ.

**Compute**

* ECS on Fargate (simpler) or EKS (if you already run k8s). Autoscaling based on CPU/RAM/requests.

**Data**

* MongoDB Atlas (VPC peering), backups + PITR enabled.
* S3 buckets: `kyc/`, `receipts/`, `proofs/`, `exports/` (block public access, access logs, lifecycle).
* ElastiCache Redis *(optional)* for rate limits & ephemeral queues.

**Edge & Security**

* WAF (managed OWASP rules, rate-limit rules).
* ACM TLS; Route53 for DNS.
* Secrets Manager for Stripe, Sumsub, JWT keys; KMS CMK for encryption at rest.
* IAM least privilege per service; VPC endpoints (S3/Secrets).

**Messaging**

* SNS topics + SQS queues (with DLQs) for webhooks, notifications, exports, reconciliation.

**Observability**

* CloudWatch logs/metrics/alarms.
* Dashboards: API p95/p99, error rates, queue depths, webhook success, oracle freshness, ledger invariants.

**CI/CD**

* GitHub Actions or CodePipeline: build → unit/integration tests → image → deploy (blue/green or rolling).
* Infra as Code: Terraform/CDK.

---

# 7) Security Architecture

* JWT auth (short-lived access, long-lived refresh). Admin endpoints require elevated roles + MFA.
* Strict RBAC guards server-side; centralized authorization middleware.
* Input validation (zod/joi) and canonicalization; consistent error model.
* PII handling: KYC artifacts to S3 (private, presigned access), **no PII** in logs; data retention policy.
* Secrets rotation policy; audit all admin & value-moving actions.
* WAF + rate limits on faucet, transfer, swap, proposals, webhooks.
* Backup/restore runbooks; incident response (emergency pause, webhook failures, invariant breach).

---

# 8) Performance, Scale & SLOs

* **SLOs (MVP)**:
  Read API p95 < 300 ms; write API p95 < 1 s; webhook processing < 1 s from receipt; remittance success ≥ 95%; uptime ≥ 99% during demo windows.
* Horizontal scale at ALB and service layers; Mongo: size appropriately, shard-ready schema (journal write pattern), critical indexes:

  * `ledger_entries`: `{account_id, created_at}`, `{journal_id}`, `{meta.idempotency_key}` (unique)
  * `payments`: `{stripe_payment_intent_id}` (unique)
  * `wallets`: `{user_id}`, `{address,network}` unique
* Use Mongo sessions for atomic journals; keep journal documents small & append-only.

---

# 9) Error Handling & Recovery

* **Idempotent writes** everywhere; retries safe (network hiccups, webhook replays).
* DLQs for Stripe/Sumsub webhooks and notification sends; periodic re-drives.
* Ledger invariant checker + compensating jobs flagged for manual approval.
* Global `paused` mode for emergency.

---

# 10) Upgrade Path to On-Chain (Future-Proofing)

* Add `chain_ref` fields now: `chain_tx_hash`, `contract`, `method`, `status`.
* Keep unique **business idempotency keys** so the same action isn’t double-posted when bridging to chain.
* Governance “execute” can switch from config write → on-chain proposal txn, then apply on success.
* Mirror Node poller can enrich existing journals with chain hashes later.

---

# 11) API Surface (High-Level)

* Already defined in your spec (Auth, KYC, Wallets, Ledger, Payments, Remit/Swap, Governance, Oracles/FX, Transparency, Custody Sim, Notifications, Reports, System).
* All **write** routes enforce `Idempotency-Key`.

---

# 12) Documentation & Compliance

* OpenAPI (kept in repo, auto-published), Postman collection synced.
* Data dictionary (collections, fields, retention).
* Runbooks: emergency pause, webhook retries/DLQ, backup/restore, invariant breach.
* Audit & export formats (CSV/PDF specs) for KYC, ledger, reserves, payments, proposals.

---
awesome—here’s your **development / testnet–first** architecture with the exact **dependencies & prerequisites** you’ll use now, plus how it migrates to production later. I’ve kept your domains/services, but tuned them for a fast dev loop (mocked oracles, off-chain ledger, sandbox providers). Citations point to the official docs for each dependency.

---

# Dev/Testnet Architecture (v1)

## Environments (dev-first)

* `local` (docker-compose): API + worker + MongoDB (Atlas or local), S3 (real or LocalStack), Stripe CLI for webhooks (optional).
* `dev` (AWS): single ECS/Fargate **App API** + **Worker** service, ALB/API GW, S3, Secrets Manager, CloudWatch, SES (sandbox).
* `demo` (AWS): same as `dev`, demo data seeded, read-only dashboards.

> Keep infra minimal in dev: **2 services** (API + Worker) rather than many microservices. Split later if/when needed.

### Runtime layout (dev)

```
[PWA/Admin] ──HTTPS──> [ALB/API GW] ──> [App API (ECS)]
                                   └─> [Worker (ECS)]
App API ⇄ MongoDB Atlas (M0/M2)      App API/Worker → SES (sandbox), S3
App API → Stripe (sandbox) Webhook -> App API
App API → Sumsub (sandbox) Webhook -> App API
(App API reads mock BTC/XAU feeds; no on-chain calls)
```

---

## Testnet/Sandbox Dependencies (ready to use now)

### Hedera (for IDs/log lookups only; **no contract calls yet**)

* **JSON-RPC Relay (Hashio)** for EVM-style tooling (MetaMask etc.):
  **Testnet RPC:** `https://testnet.hashio.io/api` (public, rate-limited). ([docs.hedera.com][1], [Hashgraph][2], [Stack Overflow][3])
* **Mirror Node REST (testnet)** for read-only tx/state when you start anchoring:
  Root endpoint: `https://testnet.mirrornode.hedera.com` . ([docs.hedera.com][4])
* **HBAR Faucet** (helps fund test accounts later): Hedera Portal faucet (100 testnet HBAR/day). ([portal.hedera.com][5], [Hedera][6])

### Payments — Stripe (sandbox)

* **Keys**: `sk_test_*`, `pk_test_*` (Dashboard → Developers → API keys). Separate from live keys; data doesn’t mix. ([Stripe Docs][7])
* **Test cards**: e.g., 4242 4242 4242 4242 + any future date/CVC (simulate 3DS, declines, disputes). ([Stripe Docs][8])
* **Webhooks**: verify `Stripe-Signature` with endpoint secret (official libs). ([Stripe Docs][9])

### KYC — Sumsub (sandbox)

* **Single host**: `api.sumsub.com` with Sandbox/Test mode from Dashboard (no separate hostname). Use `X-App-Token` + **Secret Key**. ([docs.sumsub.com][10])
* **Simulate review**: change applicant review to GREEN/RED and receive `applicantReviewed` webhooks for E2E tests. ([docs.sumsub.com][11])
* **Webhook verification**: HMAC signatures (`X-Payload-Digest`, SHA256/512). ([docs.sumsub.com][12])
* **Webhook events**: user verification lifecycle. ([docs.sumsub.com][13])

### Email — Amazon SES (sandbox)

* In sandbox you must **verify sender and recipient** identities; request **production access** later to email any address. ([AWS Documentation][14])
* “Getting started” guide for initial setup. ([AWS Documentation][15])

### Database — MongoDB Atlas

* **Free M0** (dev/demo) is fine to start (512 MB, shared RAM/CPU, 1 per project, no backup features). Use **M2+** when you need PITR/backups. ([MongoDB][16])
* PITR/backups are Atlas features on paid tiers (plan your migration). ([MongoDB][17])

---

## Updated Component Design (dev profile)

### 1) App API (Node/Express, ECS)

* **Modules**: Auth/RBAC, Users, KYC (Sumsub), Wallets, Ledger (double-entry), Payments (Stripe), Swap (mock FX), Governance (off-chain), Transparency, Custody Sim, Receipts (PDF), Reports, Notifications (enqueue), System/Health.
* **Policies**: require `Idempotency-Key` on **all writes**, centralized input validation, RBAC guards, global **pause** flag.

### 2) Worker (ECS scheduled/queue consumers)

* Stripe/Sumsub **webhook handlers** (also run as HTTP in App API; Worker re-drives from DLQ).
* Reconciliation jobs (Stripe vs internal), oracle tickers ingestion (mock), reserve snapshots, invariant checker, exports, email/push send.

### 3) Data layer (MongoDB Atlas)

* Collections (as defined earlier): `users`, `wallets`, `kyc_applications`, `accounts`, `ledger_entries` (append-only), `balances`, `payments`, `proposals`, `votes`, `config`, `price_ticks`, `reserves_snapshots`, `audit_log`, `receipts`.
* **Transactions** (sessions) around journals + balance updates. (M0 supports replica set; for real PITR use M2+). ([MongoDB][18])

### 4) External services (sandbox/testnet)

* Stripe sandbox (quotes/intents/webhooks). ([Stripe Docs][7])
* Sumsub sandbox (sessions/webhooks/HMAC, simulated approvals). ([docs.sumsub.com][11])
* SES sandbox (verified identities only). ([AWS Documentation][14])
* Hedera Hashio RPC & Mirror Node (for future anchoring/visibility), Faucet for HBAR. ([docs.hedera.com][1])

### 5) Infra (dev)

* **ALB/API GW** (TLS via ACM) + **WAF** (managed OWASP rules).
* **S3** buckets: `kyc/`, `receipts/`, `exports/` (block public, presigned access).
* **Secrets Manager** for all creds; **CloudWatch** logs/metrics/alarms.

---

## Dev/Prod Switches (how you’ll migrate later)

| Concern  | Dev/Testnet (now)                           | Production (later)                                                                      |
| -------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Payments | Stripe **sandbox** keys + test cards        | Stripe **live** keys, full webhooks + disputes handling ([Stripe Docs][7])              |
| KYC      | Sumsub **sandbox** with simulated reviews   | Sumsub **production** + tuned verification levels & watchlists ([docs.sumsub.com][10])  |
| Email    | SES **sandbox** (verified sender+recipient) | SES **prod access** (any recipient), domain warm-up ([AWS Documentation][19])           |
| Ledger   | Mongo Atlas **M0/M2**, no PITR              | Atlas **M10+** with PITR/backup policy & DR plan ([MongoDB][17])                        |
| Oracles  | **Mock** dual-source + quorum/TTL           | Real feeds (Pyth/Chainlink) + monitoring                                                |
| Chain    | **No calls**, store placeholders            | Enable contract calls + Mirror correlation; Hashio/partner RPCs ([docs.hedera.com][20]) |
| Security | WAF baseline, rate limits, RBAC, audit      | Pen test, threat modeling, key rotation, compliance exports                             |

---

## Dev Prereq Matrix (values you’ll actually set)

**Environment variables / secrets**

* `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...` (sandbox). ([Stripe Docs][7])
* `SUMSUB_APP_TOKEN=...`, `SUMSUB_SECRET_KEY=...`, `SUMSUB_WEBHOOK_SECRET=...` (sandbox). ([docs.sumsub.com][10])
* `MONGODB_URI=...` (Atlas M0/M2), `JWT_SIGNING_KEY=...`
* `SES_REGION=...`, `SES_FROM=...` (both sender **and** recipient verified in sandbox). ([AWS Documentation][14])
* `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (web push)
* `HASHIO_RPC_URL=https://testnet.hashio.io/api` (optional for wallet tooling), `MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com` (future use). ([docs.hedera.com][1])

**Allow-lists / callbacks**

* Stripe webhook URL (public), Sumsub webhook URL (public), CORS origins for PWA/Admin.

**Accounts**

* Stripe test account; Sumsub sandbox project; AWS account (SES verified domain); MongoDB Atlas project (M0/M2).

---

## What changed from the earlier architecture (dev-mode tweaks)

* **Collapsed services** into **App API + Worker** for speed; same APIs, fewer deployables.
* **Sandbox/testnet** everywhere (Stripe, Sumsub, SES); **mock** price feeds; **off-chain** ledger only.
* **Hedera** present only as **endpoints/IDs** and testnet faucets for later; no contract calls yet.
* **Atlas M0** allowed for quick start; call out that backups/PITR require upgrade.

---


## Quick checks to confirm readiness

* Stripe test charge succeeds (card 4242…), webhook verified → UC credited; recon job shows zero discrepancies. ([Stripe Docs][8])
* Sumsub sandbox flow + **simulated GREEN** review triggers webhook → wallet auto-whitelisted. ([docs.sumsub.com][11])
* SES sandbox can deliver email **only** between verified identities (sender+recipient). ([AWS Documentation][14])
* (Optional) Wallet tooling pointed at **Hashio Testnet RPC**; Mirror Node reachable for read APIs when you start anchoring. ([docs.hedera.com][1])

---

]
[1]: https://docs.hedera.com/hedera/tutorials/more-tutorials/json-rpc-connections/hashio?utm_source=chatgpt.com "Configuring Hashio RPC endpoints"
[2]: https://www.hashgraph.com/hashio/?utm_source=chatgpt.com "Hashio"
[3]: https://stackoverflow.com/questions/76153239/how-can-i-connect-to-hedera-testnet-over-rpc?utm_source=chatgpt.com "How can I connect to Hedera Testnet over RPC?"
[4]: https://docs.hedera.com/hedera/core-concepts/mirror-nodes/hedera-mirror-node?utm_source=chatgpt.com "Hedera Mirror Node"
[5]: https://portal.hedera.com/faucet?utm_source=chatgpt.com "Faucet"
[6]: https://hedera.com/blog/introducing-a-new-testnet-faucet-and-hedera-portal-changes?utm_source=chatgpt.com "Introducing a New Testnet Faucet and Hedera Portal ..."
[7]: https://docs.stripe.com/keys?utm_source=chatgpt.com "API keys"
[8]: https://docs.stripe.com/testing?utm_source=chatgpt.com "Test card numbers"
[9]: https://docs.stripe.com/webhooks?utm_source=chatgpt.com "Receive Stripe events in your webhook endpoint"
[10]: https://docs.sumsub.com/reference/about-sumsub-api?utm_source=chatgpt.com "About Sumsub API"
[11]: https://docs.sumsub.com/reference/simulate-review-response-in-sandbox?utm_source=chatgpt.com "Simulate review response in Sandbox"


[12]: https://docs.sumsub.com/docs/webhook-manager?utm_source=chatgpt.com "Manage webhooks"
[13]: https://docs.sumsub.com/docs/user-verification-webhooks?utm_source=chatgpt.com "User verification webhooks"
[14]: https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html?utm_source=chatgpt.com "Creating and verifying identities in Amazon SES"
[15]: https://docs.aws.amazon.com/ses/latest/dg/getting-started.html?utm_source=chatgpt.com "Getting started with Amazon Simple Email Service"
[16]: https://www.mongodb.com/pricing?utm_source=chatgpt.com "MongoDB Pricing"
[17]: https://www.mongodb.com/docs/atlas/recover-pit-continuous-cloud-backup/?utm_source=chatgpt.com "Recover a Point In Time with Continuous Cloud Backup"
[18]: https://www.mongodb.com/community/forums/t/is-there-any-way-to-use-transactions-with-m0-sandbox/7847?utm_source=chatgpt.com "Is there any way to use transactions with M0 Sandbox?"
[19]: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html?utm_source=chatgpt.com "Request production access (Moving out of the Amazon SES ..."
[20]: https://docs.hedera.com/hedera/core-concepts/smart-contracts/json-rpc-relay?utm_source=chatgpt.com "JSON-RPC Relay"



