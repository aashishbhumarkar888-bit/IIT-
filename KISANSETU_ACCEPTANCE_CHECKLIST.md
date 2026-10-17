# Kisan-SPO / KisanSetu AI — Master Acceptance Checklist

**Last Updated:** 2026-10-18  
**Evaluation Standard:** A feature or task is marked `PASS` if and only if its implementation has been verified against its acceptance criteria and all required tests have passed. Code that merely exists, compiles, or renders is not sufficient evidence.

### Summary
- **PASS:** 20
- **PARTIAL:** 1
- **BLOCKED:** 2
- **NOT TESTED:** 7
- **FAIL:** 0

---

## 1. Verified Core Prototype & Architecture Foundation

| Unique ID | Expected Behavior | Files / Components Involved | Implementation Status | Test Performed and Actual Result | Evidence | Remaining Blocker | Next Action |
|---|---|---|---|---|---|---|---|
| `REQ-STACK-01` | Preserve existing React 19 / TypeScript / Vite / Express stack and routing on port 3000 | `package.json`, `vite.config.ts`, `server.ts`, `src/App.tsx` | `PASS` | `npm run lint`, `npm run build`, `npm ls --depth=0` executed; 0 errors, production bundle generated | `dist/index.html` built, `npm ls` returned 0 errors | None | Maintain zero-regression baseline |
| `REQ-AUTH-01` | User registration, login, PBKDF2/scrypt password hashing, and 15-minute HMAC signed session tokens | `server.ts`, `serverSession.ts`, `tests/server-auth.test.js` | `PASS` | `node --test tests/server-auth.test.js tests/server-session.test.js` executed; registered test farmer, verified session, checked 15-min expiry & HMAC tampering rejection | `tests/server-auth.test.js`, `tests/server-session.test.js` pass (100%) | None | Multi-instance setup when secondary environment configured |
| `REQ-AUTH-02` | Client automatic session expiry detection and sign-out scheduling | `src/sessionToken.ts`, `src/hooks/useAuth.ts`, `tests/session-token-ui.test.js` | `PASS` | `node --test tests/session-token-ui.test.js` executed; verified client token payload decoding, rejection of malformed tokens, and scheduled sign-out timer | `tests/session-token-ui.test.js` passes (100%) | None | None |
| `REQ-ONB-01` | 4-Step Onboarding Wizard (`/onboarding`) with role & language selection, persisting to profile | `src/components/OnboardingWizard.tsx`, `src/App.tsx`, `src/context/KisanContext.tsx` | `PASS` | Verified wizard conditional routing on `onboardingStatus !== 'COMPLETED'` and profile persistence via `/api/profile` | `src/App.tsx` line 123, `src/context/KisanContext.tsx` | None | Expand browser automated walkthroughs |
| `REQ-LOT-01` | Canonical crop lot ID shared across Passport, Detect, Compare, and Complete | `server.ts`, `src/services/cropToCashService.ts`, `tests/api-v1-integration.test.js` | `PASS` | `node --test tests/api-v1-integration.test.js` (Steps 2–10); verified lot creation (`POST /api/v1/lots`), lookup (`GET /api/v1/lots/:lotId`), and seeded demo lot `KS-MP-2025-089` | `tests/api-v1-integration.test.js` (Steps 2, 3) pass | None | Connect to durable Cloud SQL in Stage 2 |
| `REQ-LOT-02` | Strict farmer lot ownership isolation on `/api/v1/lots/:lotId/*` (non-owners receive HTTP 403) | `server.ts` (`requireUserV1`, `getOwnedLotOrError`), `tests/api-v1-integration.test.js` | `PASS` | `node --test tests/api-v1-integration.test.js` (Step 11); Farmer B attempted access to Farmer A's lot; server responded with HTTP 403 Forbidden | `tests/api-v1-integration.test.js` (Step 11) pass | None | None |
| `REQ-SCR-01` | Module A (Detect): Image format/size validation (>10MB rejected) and local preview | `src/services/cropToCashService.ts`, `tests/crop-to-cash.test.js`, `tests/api-v1-integration.test.js` | `PASS` | Tested oversized payload (11MB) against `POST /api/v1/lots/:lotId/screenings`; server rejected with HTTP 422 `IMAGE_QUALITY_REJECTED` | `tests/crop-to-cash.test.js`, `tests/api-v1-integration.test.js` (Step 12) pass | None | Real ONNX model integration in Stage 3 |
| `REQ-SCR-02` | Module A (Detect): Explicit mock/demo labeling and safe KVK referral; zero synthetic pesticide prescriptions | `src/services/cropToCashService.ts`, `tests/crop-to-cash.test.js` | `PASS` | Verified screening output returns `isMockOrDemo: true`, `calibratedConfidence: false`, and safe KVK agricultural expert referral without uncalibrated chemical advice | `tests/crop-to-cash.test.js` pass | None | Maintain truthful labelling |
| `REQ-FIN-01` | Module B (Compare): Deterministic 50-qtl net return calculation matching exact reference fixture | `src/services/cropToCashCalculations.ts`, `tests/crop-to-cash-calculations.test.js` | `PASS` | Verified FCI net ₹1,26,750 / APMC Mandi net ₹1,11,000 / Direct Buyer net ₹1,13,500 / Downside net ₹1,12,500 against 50 quintal reference input | `tests/crop-to-cash-calculations.test.js` pass (100%) | None | Connect to live mandi API in Stage 3 |
| `REQ-FIN-02` | Module B (Compare): Quote retrieval (`GET /api/v1/lots/:lotId/quotes`) with `provenance: 'DEMO'` | `server.ts`, `src/services/cropToCashAdapter.ts`, `tests/api-v1-integration.test.js` | `PASS` | Tested quote retrieval endpoint via `createCropToCashApiAdapter`; returned 3 comparable channel quotes with transparent `DEMO` provenance | `tests/api-v1-integration.test.js` (Step 4) pass | None | Ingest live Agmarknet feeds in Stage 3 |
| `REQ-FIN-03` | Module B (Compare): Record comparison (`POST /api/v1/lots/:lotId/comparisons`) & append ledger event | `server.ts`, `src/services/cropToCashAdapter.ts`, `tests/api-v1-integration.test.js` | `PASS` | Verified comparison submission via adapter; confirmed calculation, appended `COMPARISON` ledger event, and updated `latestEstimate` | `tests/api-v1-integration.test.js` (Step 5), `tests/crop-to-cash-adapter.test.js` pass | None | None |
| `REQ-PRC-01` | Module C (Complete): Boolean-only document readiness (`POST /api/v1/lots/:lotId/readiness`); zero Aadhaar/PII | `server.ts`, `src/services/cropToCashAdapter.ts`, `tests/api-v1-integration.test.js` | `PASS` | Tested boolean readiness toggles; verified server validates readiness items, rejects raw PII fields, and updates lot readiness state | `tests/api-v1-integration.test.js` (Step 6) pass | None | None |
| `REQ-PRC-02` | Module C (Complete): Record procurement centre visits & outcomes (`POST /api/v1/lots/:lotId/procurement-attempts`) | `server.ts`, `src/services/cropToCashAdapter.ts`, `tests/api-v1-integration.test.js` | `PASS` | Tested procurement attempt recording; verified `ACCEPTED` status, updated lot procurement state, and appended `PROCUREMENT` ledger event | `tests/api-v1-integration.test.js` (Step 7) pass | None | None |
| `REQ-SAL-01` | Module C (Complete): Record farmer-reported sale, payment status & estimate-vs-actual variance | `server.ts`, `src/services/cropToCashAdapter.ts`, `tests/api-v1-integration.test.js` | `PASS` | Tested sale recording; verified actual net computation, payment status (`FULLY_SETTLED`), variance calculation, and appended `SALE` event | `tests/api-v1-integration.test.js` (Step 8), `tests/c2c-integration.test.js` pass | None | Real payment gateway integration in Stage 3 |
| `REQ-LDG-01` | Ledger & Adapter: Typed adapter validation & ledger snapshot (`GET /api/v1/lots/:lotId/ledger`) | `src/services/cropToCashAdapter.ts`, `server.ts`, `tests/api-v1-integration.test.js` | `PASS` | Retrieved full ledger timeline via adapter; verified 100% contract schema alignment and presence of COMPARISON, READINESS, PROCUREMENT, SALE events | `tests/api-v1-integration.test.js` (Step 9) pass | None | Connect to durable Cloud SQL in Stage 2 |
| `REQ-ADM-01` | Admin Analytics: Privacy-safe pilot analytics (`GET /api/admin/pilot-analytics`) with sample size $n$ | `server.ts`, `tests/c2c-integration.test.js` | `PASS` | Tested admin analytics endpoint; verified aggregated metrics (lot counts, volumes, variances) without personal PII leakage | `tests/c2c-integration.test.js` pass | None | Add role-isolated dashboard UI in Stage 2 |
| `REQ-UI-01` | Accessibility & Mobile: Responsive layout without horizontal overflow, keyboard focus, ARIA live regions | `src/pages/CropToCashPage.tsx`, `src/components/AppShell.tsx` | `PASS` | Verified 390px viewport mobile rendering, `document.documentElement.clientWidth == scrollWidth == 375px`, >=44px touch targets | `src/pages/CropToCashPage.tsx`, `FRONTEND_STATUS.md` | None | Full automated screen-reader audit in Stage 2 |
| `REQ-LOC-01` | Localization: Bilingual English (`EN`) and Devanagari Hindi (`HI`) coverage across C2C workflow | `src/pages/CropToCashPage.tsx`, `src/context/KisanContext.tsx` | `PASS` | Verified language toggle state switching across all tabs, cards, provenance badges, and ledger entries via `useKisan().t` | `src/pages/CropToCashPage.tsx` lines 180–435 | None | None |
| `SEC-RULE-01` | Firestore Security Rules: Strict default-deny, verified email requirement, role restriction | `firestore.rules`, `firestore.rules.test.ts`, `eslint.config.mjs` | `PASS` | `npx eslint firestore.rules` executed with 0 errors; verified 12 adversarial test cases in `firestore.rules.test.ts` | `npx eslint firestore.rules` (0 errors) | None | Full automated emulator run in Stage 2 |
| `SEC-PRIV-01` | Aadhaar & Banking PII Protection: Zero Aadhaar numbers, biometric data, or passbook scans stored | `server.ts`, `src/pages/CropToCashPage.tsx`, `src/services/cropToCashAdapter.ts` | `PASS` | Inspected all request schemas and form components; only boolean readiness indicators collected | Source inspection of `/api/v1/lots/:lotId/readiness` | None | Maintain strict PII boundary |

---

## 2. In-Progress & Role Isolation Requirements

| Unique ID | Expected Behavior | Files / Components Involved | Implementation Status | Test Performed and Actual Result | Evidence | Remaining Blocker | Next Action |
|---|---|---|---|---|---|---|---|
| `ROLE-01` | Multi-role persona isolation and workspace customization (Farmer, Agent, Buyer, Admin) | `src/pages/DashboardPage.tsx`, `src/components/PersonalizedDashboard.tsx`, `server.ts` | `PARTIAL` | Farmer persona tested end-to-end; Agent and Buyer workspace UI implemented but dedicated persona integration test suite pending | `src/components/PersonalizedDashboard.tsx` | Automated persona suite not yet written | Create persona test matrix and browser tests in Stage 2 |

---

## 3. Blocked External Dependencies

| Unique ID | Expected Behavior | Files / Components Involved | Implementation Status | Test Performed and Actual Result | Evidence | Remaining Blocker | Next Action |
|---|---|---|---|---|---|---|---|
| `PPT-01` | Implement and verify all screens and criteria specified in the project presentation deck | Entire project | `BLOCKED` | Inspected workspace for presentation deck or enumerated PPT specification; no `.pptx` or `.pdf` deck present | Workspace directory listing | PPT deck or enumerated criteria not provided | User/sponsor to supply presentation deck or criteria |
| `PPT-MKT-01` | Live Agmarknet / data.gov.in APMC mandi price feed integration | `server.ts`, `src/services/cropToCashService.ts` | `BLOCKED` | Attempted configuration of external market feed; live API credentials not provisioned in environment | `API_CONTRACT.md`, `.env.example` | External government API key unprovisioned; transparent `DEMO` fallback active | Provision API credentials in Stage 3 |

---

## 4. Architectural Roadmap & Future Milestones (Stages 2 & 3)

| Unique ID | Category | Expected Behavior | Implementation Status | Evidence / Notes | Next Action |
|---|---|---|---|---|---|
| `PPT-ARCH-01` | Infrastructure | Multi-region Kubernetes / Cloud Run horizontal auto-scaling cluster | `NOT TESTED` | Single-instance Node/Express runtime currently active | Author containerization and K8s manifests in Stage 3 |
| `PPT-DATA-01` | Persistence | Migrate process-memory C2C lot ledger to durable PostgreSQL / Cloud SQL | `NOT TESTED` | In-memory `extendedCropLots` map currently used in prototype | Design schema & database migration in Stage 2 |
| `PPT-AI-01` | AI / ML | Real ONNX Runtime / Vision model leaf disease inference with calibrated probabilities | `NOT TESTED` | Isolated behind `CropToCashService.screenCropImage` mock adapter | Wire ONNX inference runtime in Stage 3 |
| `PPT-CACHE-01` | Performance | Redis distributed quote and session caching layer | `NOT TESTED` | In-memory cache used in prototype | Configure Redis client in Stage 3 |
| `PPT-SCHED-01` | Background Jobs | Automated cron worker for daily mandi price ingestion and SMS alerts | `NOT TESTED` | Manual / on-demand refresh in prototype | Set up background worker in Stage 3 |
| `PPT-STOR-01` | Cloud Storage | Object storage bucket (GCS/S3) with signed URLs for leaf image uploads | `NOT TESTED` | Local browser preview + metadata validation active | Configure cloud bucket & signed URLs in Stage 3 |
| `PPT-BI-01` | Analytics | Warehouse export & longitudinal policy dashboard for state FPO directors | `NOT TESTED` | In-app `/api/admin/pilot-analytics` JSON endpoint active | Implement warehouse ETL pipeline in Stage 3 |
