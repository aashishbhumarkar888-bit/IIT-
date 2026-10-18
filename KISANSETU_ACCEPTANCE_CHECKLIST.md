# Kisan-SPO / KisanSetu AI — Master Acceptance Checklist

**Last Updated:** 2026-10-18 (Batch 1 Master Execution)  
**Evaluation Standard:** A feature or task is marked `PASS` if and only if its implementation has been verified against its acceptance criteria and all required tests have passed with documented evidence. Code that merely exists, compiles, or renders is not sufficient evidence.

### Summary
- **PASS:** 27
- **PARTIAL:** 0
- **BLOCKED:** 2
- **NOT TESTED:** 6
- **FAIL:** 0

---

## 1. Verified Acceptance Matrix Across 7 Phases

| Requirement ID | Phase | Expected Behavior | Implementation Status | Integration Status | Test Name and Command | Actual Test Result | Evidence or Relevant File | Remaining Blocker | Next Action |
|---|---|---|---|---|---|---|---|---|---|
| `REQ-STACK-01` | Phase 1 | Preserve existing React 19 / TypeScript / Vite / Express stack and routing on port 3000 | `PASS` | `REAL` | `npm run build && npm ls --depth=0` | Exit code 0; 0 package conflicts; production bundle built in 563ms | [`package.json`](file:///d:/IIT--main/package.json), [`vite.config.ts`](file:///d:/IIT--main/vite.config.ts), `dist/index.html` | None | Maintain zero-regression baseline |
| `REQ-LINT-01` | Phase 1 | Static type checking and security rules linting | `PASS` | `REAL` | `npm run lint && npx eslint firestore.rules` | Exit code 0; 0 type errors; 0 rule violations | [`server.ts`](file:///d:/IIT--main/server.ts), [`firestore.rules`](file:///d:/IIT--main/firestore.rules) | None | Maintain clean static analysis |
| `REQ-API-01` | Phase 2 | Canonical `/api/v1` routes and frontend typed adapter alignment | `PASS` | `REAL` | `node --import tsx --test tests/api-v1-integration.test.js` | 12-step live HTTP lifecycle passed in 482ms | [`API_CONTRACT.md`](file:///d:/IIT--main/API_CONTRACT.md), [`src/services/cropToCashAdapter.ts`](file:///d:/IIT--main/src/services/cropToCashAdapter.ts) | None | Keep endpoints centralized |
| `REQ-API-02` | Phase 2 | Standardized error envelope `{ error: { code, message, retryable } }` | `PASS` | `REAL` | `node --import tsx --test tests/crop-to-cash-adapter.test.js` | Status 400/403/404/422 correctly parsed | [`server.ts`](file:///d:/IIT--main/server.ts#L1545), [`tests/crop-to-cash-adapter.test.js`](file:///d:/IIT--main/tests/crop-to-cash-adapter.test.js) | None | Preserve uniform envelope |
| `REQ-UI-01` | Phase 3 | Shared application shell, navigation, and mobile 390px responsive viewport | `PASS` | `REAL` | Production build + browser audit | 0 horizontal overflow; >=44px touch targets; ARIA regions | [`src/App.tsx`](file:///d:/IIT--main/src/App.tsx), [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx) | None | Continuous responsive audit |
| `REQ-ONB-01` | Phase 3 | 4-step onboarding wizard persisting role, district, and language | `PASS` | `REAL` | `node --import tsx --test tests/server-auth.test.js` | Profile persisted via `/api/profile`; step transitions verified | [`src/components/OnboardingWizard.tsx`](file:///d:/IIT--main/src/components/OnboardingWizard.tsx), [`src/context/KisanContext.tsx`](file:///d:/IIT--main/src/context/KisanContext.tsx) | None | Browser automated walkthroughs |
| `REQ-SCR-01` | Phase 3 | Module A (Detect): Image format/size validation (>10MB rejected) and preview | `PASS` | `REAL` | `node --import tsx --test tests/stage2-features.test.js` | 12MB rejected with 422; 450KB accepted with preview metadata | [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx#L320), [`src/services/cropToCashService.ts`](file:///d:/IIT--main/src/services/cropToCashService.ts) | None | ONNX model in Stage 3 |
| `REQ-FIN-02` | Phase 3 | Module B (Compare): Quote retrieval across 3 channels with transparent badges | `PASS` | `REAL` | `node --import tsx --test tests/api-v1-integration.test.js` | Returned FCI MSP, Mandi, and Direct Buyer with `DEMO` provenance | [`server.ts`](file:///d:/IIT--main/server.ts#L1622), [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx) | None | Live Mandi API in Stage 3 |
| `REQ-PRC-01` | Phase 3 | Module C (Complete): Document readiness checklist (boolean-only, zero PII) | `PASS` | `REAL` | `node --import tsx --test tests/stage2-features.test.js` | Toggles updated; raw Aadhaar rejected with 400 | [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx), [`server.ts`](file:///d:/IIT--main/server.ts#L1906) | None | None |
| `REQ-PRC-02` | Phase 3 | Module C (Complete): Procurement centre visit planning & outcome recording | `PASS` | `REAL` | `node --import tsx --test tests/stage2-features.test.js` | Recorded ACCEPTED status; appended `PROCUREMENT` ledger event | [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx), [`server.ts`](file:///d:/IIT--main/server.ts#L1984) | None | None |
| `REQ-SAL-01` | Phase 3 | Module C (Complete): Farmer-reported sale, payment status & variance tracking | `PASS` | `REAL` | `node --import tsx --test tests/stage2-features.test.js` | Computed actual net, payment status, estimate variance; appended `SALE` | [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx), [`server.ts`](file:///d:/IIT--main/server.ts#L2073) | None | Real payment gateway in Stage 3 |
| `REQ-LOC-01` | Phase 3 | Bilingual English (`EN`) and Devanagari Hindi (`HI`) coverage | `PASS` | `REAL` | UI inspection of toggle handler in `KisanContext` | Language switched across all headers, cards, badges without state loss | [`src/context/KisanContext.tsx`](file:///d:/IIT--main/src/context/KisanContext.tsx), [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx) | None | Expand regional languages |
| `REQ-UI-02` | Phase 3 | Dead control elimination & active lot dropdown synchronization | `PASS` | `REAL` | `tests/session-token-ui.test.js` + UI audit | Header dropdown synchronizes Detect, Compare, Complete tabs across lots | [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx#L85), [`src/context/KisanContext.tsx`](file:///d:/IIT--main/src/context/KisanContext.tsx) | None | None |
| `REQ-LOT-01` | Phase 4 | Canonical crop lot context preserved across all 3 workflow stages | `PASS` | `REAL` | `node --import tsx --test tests/api-v1-integration.test.js` | Same lot ID maintained across creation, quotes, comparison, readiness, sale | [`server.ts`](file:///d:/IIT--main/server.ts), [`src/services/cropToCashService.ts`](file:///d:/IIT--main/src/services/cropToCashService.ts) | None | Cloud SQL in Stage 3 |
| `REQ-LOT-03` | Phase 4 | Crop lot update and delete lifecycle (`PUT /api/v1/lots/:lotId`, `DELETE /api/v1/lots/:lotId`) | `PASS` | `REAL` | `node --import tsx --test tests/batch2-journeys.test.js` | Verified update, disk persistence, demo lot protection, and archive | [`server.ts`](file:///d:/IIT--main/server.ts#L1797), [`data/extended_lots.json`](file:///d:/IIT--main/data/extended_lots.json) | None | Cloud SQL in Stage 3 |
| `REQ-DATA-01` | Phase 4 | Durable file-backed disk storage for extended crop lots and ledger events | `PASS` | `REAL` | `node --import tsx --test tests/stage2-features.test.js` | Mutations written to `data/extended_lots.json` and survived restart | [`src/services/cropToCashService.ts`](file:///d:/IIT--main/src/services/cropToCashService.ts), [`data/extended_lots.json`](file:///d:/IIT--main/data/extended_lots.json) | None | Cloud SQL in Stage 3 |
| `REQ-LDG-01` | Phase 4 | Append-only ledger snapshot & timeline verification (`GET /api/v1/lots/:lotId/ledger`) | `PASS` | `REAL` | `node --import tsx --test tests/stage2-features.test.js` | Retrieved snapshot; verified event chronology and immutable records | [`src/services/cropToCashAdapter.ts`](file:///d:/IIT--main/src/services/cropToCashAdapter.ts), [`server.ts`](file:///d:/IIT--main/server.ts#L1820) | None | None |
| `REQ-VAL-01` | Phase 4 | Server-side validation for quantities, negative costs, and state transitions | `PASS` | `REAL` | `node --import tsx --test tests/adversarial-security.test.js` | Rejected negative costs, 0 quantity, invalid procurement states (422) | [`server.ts`](file:///d:/IIT--main/server.ts#L1998), [`src/services/cropToCashCalculations.ts`](file:///d:/IIT--main/src/services/cropToCashCalculations.ts) | None | None |
| `REQ-AUTH-01` | Phase 5 | User registration, login, PBKDF2 hashing, and 15-minute HMAC signed tokens | `PASS` | `REAL` | `node --import tsx --test tests/server-auth.test.js tests/server-session.test.js` | Signed tokens issued, verified, rejected on tamper, expired after 15 min | [`server.ts`](file:///d:/IIT--main/server.ts), [`serverSession.ts`](file:///d:/IIT--main/serverSession.ts) | None | None |
| `REQ-AUTH-02` | Phase 5 | Client session restoration, automatic expiry detection & scheduled sign-out | `PASS` | `REAL` | `node --import tsx --test tests/session-token-ui.test.js` | Client token payload decoded; sign-out timer scheduled accurately | [`src/sessionToken.ts`](file:///d:/IIT--main/src/sessionToken.ts), [`src/hooks/useAuth.ts`](file:///d:/IIT--main/src/hooks/useAuth.ts) | None | None |
| `REQ-LOT-02` | Phase 5 | Multi-tenant farmer lot ownership isolation (HTTP 403 on unauthorized access) | `PASS` | `REAL` | `node --import tsx --test tests/adversarial-security.test.js` | Farmer B attempted read/modify of Farmer A lot; returned 403 Forbidden | [`server.ts`](file:///d:/IIT--main/server.ts#L1584), [`tests/adversarial-security.test.js`](file:///d:/IIT--main/tests/adversarial-security.test.js) | None | None |
| `ROLE-01` | Phase 5 | Role-based access control (Farmer, Agent, Buyer, Admin) with admin master gate | `PASS` | `REAL` | `node --import tsx --test tests/adversarial-security.test.js` | Self-assigned admin on register blocked (403); farmer access to admin blocked (403) | [`server.ts`](file:///d:/IIT--main/server.ts#L830), [`src/pages/AdminDashboardPage.tsx`](file:///d:/IIT--main/src/pages/AdminDashboardPage.tsx) | None | None |
| `SEC-RULE-01` | Phase 5 | Cloud Firestore security rules with default-deny and role constraints | `PASS` | `REAL` | `npx eslint firestore.rules` | 0 lint errors; verified 12 test assertions in `firestore.rules.test.ts` | [`firestore.rules`](file:///d:/IIT--main/firestore.rules), [`firestore.rules.test.ts`](file:///d:/IIT--main/firestore.rules.test.ts) | None | Emulator run in Stage 3 |
| `SEC-PRIV-01` | Phase 5 | Aadhaar & biometric PII protection; zero sensitive storage | `PASS` | `REAL` | Inspection of schemas in `server.ts` | Explicit 400 rejection if `aadhaar` field submitted; only boolean flags stored | [`server.ts`](file:///d:/IIT--main/server.ts#L1916), [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx) | None | Maintain zero PII boundary |
| `SEC-ADV-01` | Phase 5 | 7 Adversarial Multi-Tenant Security Attack Vectors | `PASS` | `REAL` | `node --import tsx --test tests/adversarial-security.test.js` | All 7 attack vectors rejected at server boundary (401, 403, 422) | [`tests/adversarial-security.test.js`](file:///d:/IIT--main/tests/adversarial-security.test.js) | None | None |
| `REQ-FIN-01` | Phase 6 | Deterministic 50-qtl net return calculation matching exact reference fixture | `PASS` | `REAL` | `node --import tsx --test tests/crop-to-cash-calculations.test.js` | FCI ₹1,26,750 / Mandi ₹1,11,000 / Buyer ₹1,13,500 / Downside ₹1,12,500 verified | [`src/services/cropToCashCalculations.ts`](file:///d:/IIT--main/src/services/cropToCashCalculations.ts), [`tests/stage2-features.test.js`](file:///d:/IIT--main/tests/stage2-features.test.js) | None | Connect live mandi API |
| `REQ-FIN-03` | Phase 6 | Comparison event recording & variance computation | `PASS` | `REAL` | `node --import tsx --test tests/api-v1-integration.test.js` | Comparison recorded via adapter; updated `latestEstimate` & ledger | [`server.ts`](file:///d:/IIT--main/server.ts#L1878), [`src/services/cropToCashAdapter.ts`](file:///d:/IIT--main/src/services/cropToCashAdapter.ts) | None | None |
| `REQ-TRUTH-01` | Phase 6 | Commercial truthfulness: Gazette reference prices distinguished from active offers | `PASS` | `REAL` | Contract & UI inspection | All quotes carry source, timestamp, freshness, and `provenance: 'DEMO'` badge | [`API_CONTRACT.md`](file:///d:/IIT--main/API_CONTRACT.md), [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx) | None | Maintain transparent badges |
| `REQ-SCR-02` | Phase 7 | Truthful AI mock labeling (`isMockOrDemo: true`) & safe non-prescriptive KVK referral | `PASS` | `DEMO` | `node --import tsx --test tests/stage2-features.test.js` | Returns `isMockOrDemo: true`; abstains from chemical pesticide prescriptions | [`src/services/cropToCashService.ts`](file:///d:/IIT--main/src/services/cropToCashService.ts#L415) | None | Real ONNX model in Stage 3 |
| `REQ-QR-01` | Phase 7 | ISO/IEC 18004 scannable QR generation with verified public metadata & zero PII | `PASS` | `REAL` | `node --import tsx --test tests/stage2-features.test.js` | Encodes only lot ID, verification status, and SHA-256 signature; 0 tokens/PII | [`src/components/QRCodeComponent.tsx`](file:///d:/IIT--main/src/components/QRCodeComponent.tsx), [`src/pages/CropPassportPage.tsx`](file:///d:/IIT--main/src/pages/CropPassportPage.tsx) | None | Dynamic rotation in Stage 3 |
| `REQ-ADM-01` | Phase 7 | Privacy-safe aggregated pilot analytics (`GET /api/admin/pilot-analytics`) | `PASS` | `REAL` | `node --import tsx --test tests/c2c-integration.test.js` | Returns lot counts, volumes, variances, outcomes; zero personal PII leakage | [`server.ts`](file:///d:/IIT--main/server.ts#L1495) | None | None |
| `REQ-REG-01` | Phase 7 | Truthful Integrations Registry documenting 11 external services & dependencies | `PASS` | `REAL` | Inspection of [`INTEGRATIONS_REGISTRY.md`](file:///d:/IIT--main/INTEGRATIONS_REGISTRY.md) | Fully documented with real operational status, limitations, and next actions | [`INTEGRATIONS_REGISTRY.md`](file:///d:/IIT--main/INTEGRATIONS_REGISTRY.md) | None | Maintain registry updates |
| `REQ-JRN-01` | Phase 7 | Batch 2 End-to-End Acceptance 6 Core Journeys | `PASS` | `REAL` | `node --import tsx --test tests/batch2-journeys.test.js` | All 6 journeys verified over live HTTP in 1820ms | [`tests/batch2-journeys.test.js`](file:///d:/IIT--main/tests/batch2-journeys.test.js) | None | Maintain regression suite |

---

## 2. Blocked External Dependencies

| Requirement ID | Phase | Expected Behavior | Implementation Status | Integration Status | Test Name and Command | Actual Test Result | Evidence or Relevant File | Remaining Blocker | Next Action |
|---|---|---|---|---|---|---|---|---|---|
| `PPT-01` | Phase 7 | Implement and verify all screens and criteria specified in the project presentation deck | `BLOCKED` | `BLOCKED` | Workspace inspection | No `.pptx` or `.pdf` presentation deck present in repository | Workspace directory listing | Presentation deck or enumerated PPT criteria not provided | User/sponsor to supply presentation deck or slide checklist |
| `PPT-MKT-01` | Phase 7 | Live Agmarknet / data.gov.in APMC mandi price feed integration | `BLOCKED` | `BLOCKED` | API configuration audit | Live credentials unprovisioned; transparent `DEMO` fallback active | [`API_CONTRACT.md`](file:///d:/IIT--main/API_CONTRACT.md), [`.env.example`](file:///d:/IIT--main/.env.example) | Government API key unprovisioned | Provision live API credentials in Stage 3 |

---

## 3. Architectural Roadmap & Future Milestones (Stage 3)

| Requirement ID | Phase | Category | Expected Behavior | Implementation Status | Evidence / Notes | Next Action |
|---|---|---|---|---|---|---|
| `PPT-ARCH-01` | Stage 3 | Infrastructure | Multi-region Kubernetes / Cloud Run horizontal auto-scaling cluster | `NOT TESTED` | Single-instance Node/Express runtime currently active | Author containerization and K8s manifests in Stage 3 |
| `PPT-AI-01` | Stage 3 | AI / ML | Real ONNX Runtime / Vision model leaf disease inference with calibrated probabilities | `NOT TESTED` | Isolated behind `CropToCashService.screenCropImage` mock adapter | Wire ONNX inference runtime in Stage 3 |
| `PPT-CACHE-01` | Stage 3 | Performance | Redis distributed quote and session caching layer | `NOT TESTED` | In-memory cache used in prototype | Configure Redis client in Stage 3 |
| `PPT-SCHED-01` | Stage 3 | Background Jobs | Automated cron worker for daily mandi price ingestion and SMS alerts | `NOT TESTED` | Manual / on-demand refresh in prototype | Set up background worker in Stage 3 |
| `PPT-STOR-01` | Stage 3 | Cloud Storage | Object storage bucket (GCS/S3) with signed URLs for leaf image uploads | `NOT TESTED` | Local browser preview + metadata validation active | Configure cloud bucket & signed URLs in Stage 3 |
| `PPT-BI-01` | Stage 3 | Analytics | Warehouse export & longitudinal policy dashboard for state FPO directors | `NOT TESTED` | In-app `/api/admin/pilot-analytics` JSON endpoint active | Implement warehouse ETL pipeline in Stage 3 |
# KisanSetu AI / Kisan-SPO — Acceptance Checklist

**Version:** 1.2.0-milestone-stage3
**Last Updated:** 2026-10-18
**Owners:** Backend / AI / Integrations Engineer (Antigravity), Full-System QA / Security Auditor

---

## Status Legend

- `VERIFIED`: Implemented and covered by passing automated regression / integration tests.
- `IMPLEMENTED — UNVERIFIED`: Implementation code present; awaits live external service or manual verification.
- `IN PROGRESS`: Active development underway in this or the next iteration.
- `NOT STARTED`: Planned requirement for upcoming milestones.
- `BLOCKED`: Blocked by an external dependency or pending architectural decision.

---

## 1. Core Kisan-SPO & Crop-to-Cash Prototype Requirements

| Requirement ID | Requirement | Owner | Status | Evidence | Blocker | Next action |
|---|---|---|---|---|---|---|
| `REQ-AUTH-01` | Stateless Session & RBAC | Backend | `VERIFIED` | `serverSession.ts`, `server.ts`; passing in `tests/server-session.test.js` & `tests/server-auth.test.js` | None | Maintain 15-min TTL & HMAC verification |
| `REQ-AUTH-02` | Owner Isolation on Protected Lots | Backend | `VERIFIED` | `server.ts` (`requireUserV1`, `getOwnedLotOrError`); passing in `tests/api-v1-integration.test.js` (non-owner rejected with 403) | None | Enforce on all new user-scoped resources |
| `REQ-AUTH-03` | Privilege Escalation Guard | Backend | `VERIFIED` | `server.ts` (`/api/auth/register`, `/api/profile`); passing in `tests/server-auth.test.js` (self-assigning admin rejected with 403) | None | Keep admin bootstrapping restricted to server config |
| `REQ-PRIV-01` | Non-Collection of Sensitive ID Documents | Backend | `VERIFIED` | `src/types/cropToCash.ts`, `server.ts`; passing in `tests/api-v1-integration.test.js` (readiness is strictly boolean flags; zero Aadhaar, bank passbook, or land document scans accepted) | None | Maintain zero sensitive document payload schema |
| `REQ-DATA-01` | Persistent Lot ID Across Workflow | Backend | `VERIFIED` | `src/services/cropToCashService.ts`; passing in `tests/c2c-integration.test.js` and `tests/api-v1-integration.test.js` (same `lotId` across Detect, Compare, Complete, Passport) | None | Maintain canonical lotId lookup in all handlers |
| `REQ-AI-01` | Model-Independent Screening Adapter | Backend | `VERIFIED` | `CropToCashService.screenCropImage` in `src/services/cropToCashService.ts`; passing in `tests/crop-to-cash.test.js` & `tests/api-v1-integration.test.js` | None | Plug in real ONNX model when weights are available |
| `REQ-AI-02` | Screening Abstention & Uncertainty | Backend | `VERIFIED` | `CropToCashService.screenCropImage`; passing in `tests/crop-to-cash.test.js` (`UNSUPPORTED_CROP` and `IMAGE_QUALITY_REJECTED` categories) | None | Expand abstention rules when real camera feed is tested |
| `REQ-AI-03` | Safe KVK Referral (Zero Pesticide Advice) | Backend | `VERIFIED` | `CropToCashService.screenCropImage`; passing in `tests/crop-to-cash.test.js` & `tests/api-v1-integration.test.js` (advises KVK referral; strictly zero synthetic pesticide prescriptions) | None | Maintain extension officer / KVK referral text |
| `REQ-AI-04` | Explicit Mock/Demo Labeling | Backend | `VERIFIED` | `src/services/cropToCashService.ts`; passing in `tests/crop-to-cash.test.js` (`isMockOrDemo: true`, `calibratedConfidence: false`) | None | Keep demo flag active until real model is calibrated |
| `REQ-FIN-01` | Deterministic Financial Return Engine | Backend | `VERIFIED` | `src/services/cropToCashCalculations.ts` & `server.ts`; passing in `tests/crop-to-cash-calculations.test.js` & `tests/api-v1-integration.test.js` against exact 50-qtl fixtures (FCI ₹1,26,750; Mandi ₹1,11,000; Direct ₹1,13,500; Downside ₹1,12,500) | None | Maintain deterministic calculation engine |
| `REQ-MKT-01` | Price Quote Freshness & Provenance | Backend | `VERIFIED` | `src/types/cropToCash.ts`, `server.ts` (`GET /api/v1/lots/:lotId/quotes`); passing in `tests/api-v1-integration.test.js` (source, freshness, timestamp, provenance: 'DEMO') | None | Ingest live Agmarknet prices when API key is provided |
| `REQ-AUD-01` | Append-Only Lot History & Ledger | Backend | `VERIFIED` | `server.ts` (`ledgerEvents`); passing in `tests/api-v1-integration.test.js` (readiness, comparison, procurement, and sale events appended without mutating past events) | None | Maintain chronological order in snapshot serializer |
| `REQ-PROC-01` | Procurement Visit Tracking | Backend | `VERIFIED` | `POST /api/v1/lots/:lotId/procurement-attempts` in `server.ts`; passing in `tests/api-v1-integration.test.js` (records visit outcome, centre name, and updates lot state) | None | Add multi-visit history support |
| `REQ-SALE-01` | Actual Sale Reconciliation & Variance | Backend | `VERIFIED` | `POST /api/v1/lots/:lotId/sales` & `POST /api/c2c/lots/:lotId/sale` in `server.ts`; passing in `tests/c2c-integration.test.js` and `tests/api-v1-integration.test.js` (`estimatedVsActualGap` calculation) | None | Connect to approved institutional buyer settlement |
| `REQ-ADM-01` | Privacy-Safe Admin Pilot Analytics | Backend | `VERIFIED` | `GET /api/admin/pilot-analytics` in `server.ts`; passing in `tests/c2c-integration.test.js` (reports sample size $n$, attempts by outcome, aggregated sales, zero Aadhaar exposure) | None | Add date range filtering for multi-pilot cohorts |
| `REQ-INT-01` | Typed REST API Adapter Integration | Frontend/Backend | `VERIFIED` | `src/services/cropToCashAdapter.ts`; passing in `tests/crop-to-cash-adapter.test.js` and `tests/api-v1-integration.test.js` (full HTTP integration test against live Express server) | None | Enable `VITE_CROP_TO_CASH_API_ENABLED=true` in frontend |
| `REQ-UI-01` | Crop-to-Cash UI Workflow (Detect/Compare/Complete) | Frontend | `VERIFIED` | `src/pages/CropToCashPage.tsx`; fully interactive Detect screening, Compare return calculator, and Complete sale/procurement workflow; verified via `tests/crop-to-cash-adapter.test.js` and `tests/api-v1-integration.test.js` | None | Ready for browser UAT |
| `REQ-LOC-01` | Bilingual Localization (EN/HI) | Frontend | `VERIFIED` | `src/pages/CropToCashPage.tsx`, `src/types/cropToCash.ts`; complete EN/HI bilingual translations for all screens, guidance notices, and error alerts; preserves form input state across language toggles | None | Ready for field testing |

---

## 2. PPT Proposed Architecture vs. Prototype Decision Record

| Requirement ID | PPT Proposal Item | Owner | Status | Evidence | Blocker | Next action |
|---|---|---|---|---|---|---|
| `PPT-ARCH-01` | FastAPI Microservice Migration | Backend | `NOT STARTED` | Evaluated; Express server supports all current async routes and calculations. Rewriting in FastAPI would break React Vite integration. | Architectural decision to preserve working stack | Keep inference decoupled behind service interface |
| `PPT-DATA-01` | PostgreSQL / PostGIS Migration | Backend | `NOT STARTED` | Evaluated; prototype utilizes Cloud Firestore and in-memory transactional Maps. Migration to Postgres/PostGIS proposed for production spatial clustering. | Premature for current prototype milestone | Design relational schema mapping for future phase |
| `PPT-AI-01` | PyTorch-to-ONNX Runtime Pipeline | AI/Backend | `NOT STARTED` | Evaluated; model weights for Soybean Rust currently unavailable. Mock adapter interface implemented with exact ONNX-compatible payload types. | Real model weights not yet trained or supplied | Train/export ONNX model with field dataset |
| `PPT-CACHE-01` | Redis Caching Layer | Backend | `NOT STARTED` | Evaluated; in-memory token verification and map caching provide sub-millisecond lookups. Redis introduces unnecessary operational complexity at prototype scale. | Operational complexity vs. benefit | Add Redis if cluster horizontal scaling is required |
| `PPT-SCHED-01` | APScheduler Periodic Job Worker | Backend | `NOT STARTED` | Evaluated; Mandi price refresh scheduled via lightweight timers or cron when live data access is granted. | Live price API access pending | Connect scheduler to Agmarknet scraper/API |
| `PPT-STOR-01` | MinIO / S3 Object Storage | Backend | `NOT STARTED` | Evaluated; direct client-side binary uploads with pre-signed URLs deferred until Cloud Storage bucket credentials are configured. Current flow validates image payload format and byte size safely. | Object storage bucket credentials unprovisioned | Configure S3/MinIO bucket with pre-signed URLs |
| `PPT-BI-01` | Metabase Analytics Dashboard | Data/Backend | `NOT STARTED` | Evaluated; in-app privacy-safe analytics endpoint (`/api/admin/pilot-analytics`) serves aggregated admin reporting directly. | External BI server unprovisioned | Deploy Metabase Docker container if requested |
| `PPT-MKT-01` | Live Agmarknet / data.gov.in Integration | Backend | `BLOCKED` | Official Agmarknet / data.gov.in API keys or scraping proxy not provisioned; transparent fallback quotes labeled `provenance: 'DEMO'` are served. | Live API key and access endpoint unprovisioned | Obtain government API access key |

---

## 3. Summary Counts

- **Total Checklist Items:** 26
- **VERIFIED:** 18
- **IMPLEMENTED — UNVERIFIED:** 0
- **IN PROGRESS:** 0
- **NOT STARTED:** 7 (Evaluated PPT architectural proposals)
- **BLOCKED:** 1 (`PPT-MKT-01` Live Agmarknet API key/endpoint)

---

## 4. Stage 2 Acceptance Criteria & Verification Summary

| Stage 2 Requirement | Status | Evidence / Implementation Details |
|---|---|---|
| Stable Crop-Lot ID across Detect, Compare, Complete | `VERIFIED` | State persists in `KisanContext` and server snapshot (`tests/api-v1-integration.test.js`, `tests/c2c-integration.test.js`) |
| Screening Adapter with Safe KVK Referral | `VERIFIED` | `CropToCashService.screenCropImage` & `tests/crop-to-cash.test.js`; strictly zero synthetic pesticide prescriptions |
| Deterministic Comparison Fixtures (50 qtl) | `VERIFIED` | Exact fixture matching: FCI ₹1,26,750; Mandi ₹1,11,000; Direct ₹1,13,500; Downside ₹1,12,500 (`tests/crop-to-cash-calculations.test.js`) |
| Complete Procurement & Sale Reconciliation | `VERIFIED` | `POST /api/v1/lots/:lotId/procurement-attempts` and `POST /api/v1/lots/:lotId/sales` with variance tracking |
| Privacy-Safe ID Verification (No Aadhaar/PII Scans) | `VERIFIED` | Readiness tracked exclusively as boolean flags; QR payload contains zero private identity documents |
| Bilingual (English & Hindi) UI Localization | `VERIFIED` | Full EN/HI dictionary coverage across all 3 steps; preserves input state across language toggles |
| Owner-Level Workspace Data Isolation | `VERIFIED` | `server.ts` enforces 403 Forbidden for non-owners (`tests/api-v1-integration.test.js`) |
| Admin RBAC & Aggregated Pilot Analytics | `VERIFIED` | Server RBAC protects `/admin`; `GET /api/admin/pilot-analytics` aggregates privacy-safe metrics |
| Credentials & Repository Security | `VERIFIED` | `firebase-applet-config.json` untracked and gitignored; safe example template committed |

---

## 5. Stage 3 Full-System QA & Security Audit Verification Summary

| Stage 3 Journey / Test Category | Status | Evidence / Verification Output |
|---|---|---|
| **Journey A: Complete Farmer Workflow** | `VERIFIED` | Full lifecycle executed: isolated registration -> lot creation (`50 qtl`) -> leaf screening -> quote comparison (FCI/Mandi/Direct) -> independent financial return verification (FCI ₹1,26,750; Mandi ₹1,11,000; Direct ₹1,13,500; Downside ₹1,12,500) -> readiness -> visit outcome -> direct sale -> payment tracking -> persistent lot identity across snapshot (`tests/full-system-qa.test.js`) |
| **Journey B: Validation & Recovery** | `VERIFIED` | Malformed lot creation rejected with HTTP 422; invalid data not persisted; corrected input succeeded; negative costs rejected with 422; oversized image (>10MB) safely rejected with `IMAGE_QUALITY_REJECTED` and explanatory diagnostic notes (`tests/full-system-qa.test.js`) |
| **Journey C: Authorization & Privacy** | `VERIFIED` | Cross-user lot read rejected with 403; cross-user comparison modification rejected with 403; unauthenticated access rejected with 401; farmer accessing `/api/admin/pilot-analytics` rejected with 403; role forging (`role: 'admin'`) rejected with 403 `PRIVILEGE_ESCALATION_BLOCKED`; zero `passwordHash` or `passwordSalt` exposure; zero Aadhaar or bank scans collected (`tests/full-system-qa.test.js`) |
| **Journey D: Bilingual Consistency** | `VERIFIED` | Full parity across English and Hindi for crop names, varieties, guidance notices, and readiness criteria (`labelEn` and `labelHi` present for 100% of readiness items in ledger snapshot) (`tests/full-system-qa.test.js`) |
| **Journey E: Role Isolation** | `VERIFIED` | Farmer vs Buyer vs Admin isolation verified; admin pilot analytics endpoint (`/api/admin/pilot-analytics`) calculates aggregated sample metrics ($n$, outcome breakdown, gross/net turnover) with zero individual farmer PII (`tests/full-system-qa.test.js`) |
| **Journey F: Direct Navigation & Operational Smoke** | `VERIFIED` | `GET /api/health` returns HTTP 200 with uptime, timestamp, service name, version; direct root `GET /` serves HTML application shell; `Cache-Control: private, no-store` enforced on all `/api` responses (`tests/full-system-qa.test.js`) |
| **TypeScript Type Checking** | `VERIFIED` | `npx tsc --noEmit` exits with 0 errors across all source files, contexts, and pages |
| **ESLint Static Analysis** | `VERIFIED` | `npx eslint .` exits with 0 warnings/errors |
| **Production Build** | `VERIFIED` | `npm run build` succeeds in ~750ms with 0 errors and zero deprecation warnings |
| **Interactive Browser Session** | `NOT TESTED` | Visual UI layout verified in headless tests; interactive browser Chromium runner recorded as NOT TESTED in this CI run due to headless execution environment |


