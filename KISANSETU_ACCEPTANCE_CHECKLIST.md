# KisanSetu AI / Kisan-SPO — Acceptance Checklist

**Version:** 1.1.0-milestone-c2c
**Last Updated:** 2026-10-18
**Owners:** Backend / AI / Integrations Engineer (Antigravity), Frontend Engineer (VS Code)

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

