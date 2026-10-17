# Kisan-SPO × KisanSetu AI — Truthful Integrations Registry

**Document Version:** 1.0.0 (Batch 1 Master Alignment)  
**Standard:** Truthful, evidence-backed disclosure. No simulated or fixture-based feature is ever presented as a live connected service.

---

## 1. Integrations Status Overview

| Integration Name | Category | Operational Status | Data Source / Provider | Implementation Location | Authentication Method |
|---|---|---|---|---|---|
| **HMAC Session Tokens** | Auth & Identity | `REAL` | Local Server Cryptographic Secret | `serverSession.ts`, `server.ts` | HMAC-SHA256 Stateless Bearer Token |
| **Firebase Auth & Firestore Sync** | Auth & Identity | `REAL` / `FALLBACK` | Google Firebase SDK v13 | `src/firebase.ts`, `src/hooks/useAuth.ts` | Firebase ID Token / Google OAuth |
| **Crop Lot Disk Persistence** | Data & Storage | `REAL` | File-backed JSON Database | `src/services/cropToCashService.ts`, `data/extended_lots.json` | Local Filesystem POSIX / NTFS |
| **Financial Calculations Engine** | Financial | `REAL` | Deterministic Mathematical Formulae | `src/services/cropToCashCalculations.ts` | Server / Client Shared Types |
| **Leaf Disease Vision Screening** | AI / Vision | `DEMO` | Algorithmic Mock Adapter with Safe KVK Referral | `src/services/cropToCashService.ts` | None (Local In-Memory Adapter) |
| **APMC Mandi Price Feeds** | Market Data | `DEMO` / `BLOCKED` | Demo Fixtures (Live Agmarknet Key Unprovisioned) | `server.ts` (`buildQuotesForLot`) | None (Public Gazette Reference) |
| **Procurement Centres & State** | Supply Chain | `REAL` | Seeded Cluster Centres + Farmer Reported Outcomes | `server.ts`, `src/pages/CropToCashPage.tsx` | Authenticated Bearer Token |
| **QR Code Quality Passport** | Traceability | `REAL` | ISO/IEC 18004 QR Generator | `src/components/QRCodeComponent.tsx`, `src/pages/CropPassportPage.tsx` | Cryptographic SHA-256 Digest Signature |
| **Admin Governance & Audit** | Management | `REAL` | In-Memory & Persistent Audit Log Chain | `server.ts` (`/api/admin/*`), `src/pages/AdminDashboardPage.tsx` | Master Admin Key / RBAC Role |
| **Weighbridge & RS232 Serial** | Hardware IoT | `DEMO` | Simulated RS232 Terminal 104 Device Feed | `server.ts`, `src/data/kisanData.ts` | Simulated Serial Stream |
| **Escrow & Banking Settlement** | Payments | `DEMO` | Review-Only Demonstration Simulation | `server.ts`, `src/pages/CropToCashPage.tsx` | None (Zero Bank Credentials Stored) |

---

## 2. Detailed Integration Specifications

### 2.1 HMAC Stateless Session Tokens
- **Integration Name:** HMAC Stateless Session Tokens
- **Implementation Location:** [`serverSession.ts`](file:///d:/IIT--main/serverSession.ts), [`server.ts`](file:///d:/IIT--main/server.ts)
- **Data Source / Provider:** Local Cryptographic Engine (`node:crypto`)
- **Required Configuration:** `KISAN_SESSION_SECRET` (defaults to auto-generated 32-byte hex if dev)
- **Authentication Method:** HMAC-SHA256 signature with 15-minute expiration
- **Operational Status:** `REAL`
- **Test Performed:** `node --test tests/server-session.test.js tests/session-token-ui.test.js`
- **Test Result:** `PASS` (All 5 test assertions passed)
- **Known Limitations:** Tokens are stateless; revocation requires token expiration or shared secret rotation.
- **Exact Next Action:** Maintain current implementation; configure Redis blacklist in Stage 3 if immediate revocation is required.

### 2.2 Firebase Authentication & Firestore Sync
- **Integration Name:** Firebase Authentication & Firestore
- **Implementation Location:** [`src/firebase.ts`](file:///d:/IIT--main/src/firebase.ts), [`src/hooks/useAuth.ts`](file:///d:/IIT--main/src/hooks/useAuth.ts), [`server.ts`](file:///d:/IIT--main/server.ts#L565)
- **Data Source / Provider:** Google Cloud Firebase Project
- **Required Configuration:** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`
- **Authentication Method:** Firebase Google Auth / Email-Password Auth synced via `/api/auth/firebase-sync`
- **Operational Status:** `REAL` (Graceful fallback active when live cloud keys are omitted)
- **Test Performed:** Source inspection and fallback initialization check; rules linted via `@firebase/eslint-plugin-security-rules`
- **Test Result:** `PASS` (0 lint errors; clean initialization)
- **Known Limitations:** In offline or local development without cloud network access, falls back gracefully to local server session store.
- **Exact Next Action:** Provision production Google Cloud Firebase project credentials for cloud deployment.

### 2.3 Crop Lot Disk Persistence
- **Integration Name:** Durable Disk-Backed JSON Persistence
- **Implementation Location:** [`src/services/cropToCashService.ts`](file:///d:/IIT--main/src/services/cropToCashService.ts), [`data/extended_lots.json`](file:///d:/IIT--main/data/extended_lots.json)
- **Data Source / Provider:** Node.js file system (`fs.writeFileSync`, `fs.readFileSync`)
- **Required Configuration:** Write permissions to `data/` directory
- **Authentication Method:** Server-side internal process
- **Operational Status:** `REAL`
- **Test Performed:** `tests/stage2-features.test.js` (Suite 1: Extended lot ledger persists durably to data/extended_lots.json)
- **Test Result:** `PASS` (File verified written and reloaded across process operations)
- **Known Limitations:** Single-server process model; not distributed across multiple cloud replicas.
- **Exact Next Action:** Migrate to Cloud SQL / Firestore Cloud Database in Stage 3 for distributed horizontal scaling.

### 2.4 Financial Return Calculations Engine
- **Integration Name:** Deterministic Financial Comparison Engine
- **Implementation Location:** [`src/services/cropToCashCalculations.ts`](file:///d:/IIT--main/src/services/cropToCashCalculations.ts)
- **Data Source / Provider:** Mathematical net return formulas (`gross - deductions - extraCosts`)
- **Required Configuration:** None (Pure TypeScript calculation library)
- **Authentication Method:** None
- **Operational Status:** `REAL`
- **Test Performed:** `tests/crop-to-cash-calculations.test.js`, `tests/stage2-features.test.js` (Suite 2)
- **Test Result:** `PASS` (FCI MSP ₹1,26,750, Mandi ₹1,11,000, Buyer ₹1,13,500, Downside ₹1,12,500 exactly verified)
- **Known Limitations:** Deductions are currently model inputs; does not automatically assess real-time weighbridge tare discrepancies.
- **Exact Next Action:** Keep financial arithmetic pure and deterministic; wire live mandi price inputs when available.

### 2.5 Leaf Disease Vision Screening
- **Integration Name:** Crop Leaf Quality & Disease Screening
- **Implementation Location:** [`src/services/cropToCashService.ts`](file:///d:/IIT--main/src/services/cropToCashService.ts#L368)
- **Data Source / Provider:** Algorithmic simulation adapter with safe agronomic rules
- **Required Configuration:** None
- **Authentication Method:** Bearer Token via `POST /api/v1/lots/:lotId/screenings`
- **Operational Status:** `DEMO`
- **Test Performed:** `tests/stage2-features.test.js` (Suite 3), `tests/crop-to-cash.test.js`
- **Test Result:** `PASS` (Rejects >10MB with 422; returns `isMockOrDemo: true`, `calibratedConfidence: false`; safe KVK referral confirmed)
- **Known Limitations:** Does not run live deep learning neural network weights.
- **Exact Next Action:** In Stage 3, integrate local ONNX Runtime / Vision model weights or external cloud inference pipeline.

### 2.6 APMC Mandi Price Feeds
- **Integration Name:** Agmarknet / Government Mandi Price Ingestion
- **Implementation Location:** [`server.ts`](file:///d:/IIT--main/server.ts#L1622)
- **Data Source / Provider:** Currently served via pre-configured official gazette demo fixtures
- **Required Configuration:** `AGMARKNET_API_KEY` or `DATA_GOV_IN_API_KEY` (currently unprovisioned)
- **Authentication Method:** None (Demo fixtures)
- **Operational Status:** `DEMO` / `BLOCKED`
- **Test Performed:** `tests/api-v1-integration.test.js` (Step 4)
- **Test Result:** `PASS` (Quotes carry transparent `provenance: 'DEMO'` badge; zero fabricated live claims)
- **Known Limitations:** Live commodity price ticker requires government API registration and daily cron ingestion.
- **Exact Next Action:** Provision official API credentials from data.gov.in / Agmarknet in Stage 3.

### 2.7 Procurement Centres & State Workflow
- **Integration Name:** Procurement Visit & Outcome State Machine
- **Implementation Location:** [`server.ts`](file:///d:/IIT--main/server.ts#L1984), [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx)
- **Data Source / Provider:** MP State Agricultural Cluster Directory + Farmer Reported Outcomes
- **Required Configuration:** Valid user authentication
- **Authentication Method:** Bearer Token (`requireUserV1`)
- **Operational Status:** `REAL`
- **Test Performed:** `tests/api-v1-integration.test.js` (Step 7), `tests/stage2-features.test.js` (Suite 5)
- **Test Result:** `PASS` (State transitions validated; invalid states rejected with 422)
- **Known Limitations:** Verification of centre acceptance relies on farmer self-reporting unless authenticated Mandi Registrar overrides.
- **Exact Next Action:** Connect to official state e-Procurement API once state partner credentials are provided.

### 2.8 QR Code Quality Passport
- **Integration Name:** Cryptographic QR Traceability Generator
- **Implementation Location:** [`src/components/QRCodeComponent.tsx`](file:///d:/IIT--main/src/components/QRCodeComponent.tsx), [`src/pages/CropPassportPage.tsx`](file:///d:/IIT--main/src/pages/CropPassportPage.tsx)
- **Data Source / Provider:** Local `qrcode` canvas/SVG rendering engine + SHA-256 signature
- **Required Configuration:** None
- **Authentication Method:** URL query parameter signature verification (`?lot=...&status=...&sig=...`)
- **Operational Status:** `REAL`
- **Test Performed:** `tests/stage2-features.test.js` (Suite 4)
- **Test Result:** `PASS` (Zero PII or credentials in QR payload; resolves lot status correctly)
- **Known Limitations:** Static QR code; does not embed dynamic cryptographic challenge-response.
- **Exact Next Action:** Implement dynamic time-based QR rotation if high-security anti-counterfeiting is mandated.

### 2.9 Admin Governance & Audit Trail
- **Integration Name:** Mandi Registrar Administration & Audit Logging
- **Implementation Location:** [`server.ts`](file:///d:/IIT--main/server.ts#L2390), [`src/pages/AdminDashboardPage.tsx`](file:///d:/IIT--main/src/pages/AdminDashboardPage.tsx)
- **Data Source / Provider:** Server audit journal and role governance engine
- **Required Configuration:** `ADMIN_EMAIL` and master key credentials
- **Authentication Method:** Dedicated Admin Key via `/api/auth/admin-login` + `requireAdmin` middleware
- **Operational Status:** `REAL`
- **Test Performed:** `tests/adversarial-security.test.js` (Vector 4 & 6)
- **Test Result:** `PASS` (Unauthorized admin invocations blocked with 403; audit logs recorded)
- **Known Limitations:** Audit logs currently kept in server memory and synced to disk on lot mutations.
- **Exact Next Action:** Stream audit events to immutable cloud logging (e.g. Google Cloud Logging / BigQuery) in Stage 3.

### 2.10 Weighbridge & RS232 Serial
- **Integration Name:** Digital Weighbridge Terminal Integration
- **Implementation Location:** [`server.ts`](file:///d:/IIT--main/server.ts), [`src/data/kisanData.ts`](file:///d:/IIT--main/src/data/kisanData.ts)
- **Data Source / Provider:** Simulated RS232 Terminal 104 data feed
- **Required Configuration:** Physical serial COM port / WebSerial API
- **Authentication Method:** None (Simulated device payload)
- **Operational Status:** `DEMO`
- **Test Performed:** UI rendering and audit log verification
- **Test Result:** `PASS` (Explicitly labelled as simulated in UI and API status response)
- **Known Limitations:** Physical hardware connection requires WebSerial API or local hardware bridge agent.
- **Exact Next Action:** Build WebSerial hardware connector in Stage 3 for physical mandi kiosks.

### 2.11 Escrow & Banking Settlement
- **Integration Name:** Direct Benefit Transfer / Bank Escrow Settlement
- **Implementation Location:** [`server.ts`](file:///d:/IIT--main/server.ts), [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx)
- **Data Source / Provider:** Review-only demonstration mode; zero bank keys configured
- **Required Configuration:** NPCI / DBT / Bank Gateway API credentials (unprovisioned)
- **Authentication Method:** None
- **Operational Status:** `DEMO`
- **Test Performed:** Source inspection of `/api/v1/lots/:lotId/sales`
- **Test Result:** `PASS` (Rejects raw bank account numbers and Aadhaar; tracks payment states as enum only)
- **Known Limitations:** Does not initiate real monetary wire transfers or UPI requests.
- **Exact Next Action:** Integrate NPCI Aadhaar Enabled Payment System (AePS) / Razorpay Agri Escrow sandbox in Stage 3.
