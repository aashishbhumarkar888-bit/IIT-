# Kisan-SPO / KisanSetu AI — Acceptance Checklist

**Last Updated:** 2026-10-18  
**Totals:**
- **VERIFIED:** 18
- **IMPLEMENTED — UNVERIFIED:** 0
- **IN PROGRESS:** 0
- **NOT STARTED:** 7
- **BLOCKED:** 1

---

## 1. Core Prototype & Integration Requirements

| ID | Category | Requirement | Owner | Status | Verification Evidence | Notes / Boundaries |
|---|---|---|---|---|---|---|
| `REQ-STACK-01` | Architecture | Preserve existing React 19 / TypeScript / Vite / Express stack and navigation | Frontend + Backend | `VERIFIED` | `npm run lint` (0 errors), `npm run build` (`dist/` generated) | Full-stack SPA + Express server on port 3000 |
| `REQ-AUTH-01` | Security & Auth | Registration, login, scrypt/PBKDF2 hashing, and 15-min HMAC session token | Backend | `VERIFIED` | `tests/server-auth.test.js`, `tests/server-session.test.js` | Blocks self-assigned `admin` role with HTTP 403 |
| `REQ-AUTH-02` | Security & Auth | Client automatic session expiry detection and sign-out scheduling | Frontend | `VERIFIED` | `tests/session-token-ui.test.js` | Rejects malformed or expired tokens |
| `REQ-ONB-01` | User Journey | 4-Step Onboarding Wizard (`/onboarding`) with role & language selection | Frontend | `VERIFIED` | `src/components/OnboardingWizard.tsx`, `src/App.tsx` | Persists via `/api/profile` and Cloud Firestore |
| `REQ-LOT-01` | Data Model | Canonical crop lot ID shared across Passport, Detect, Compare, and Complete | Backend + Frontend | `VERIFIED` | `tests/api-v1-integration.test.js` (Steps 2–10) | Pre-seeds `KS-MP-2025-089` and supports user-created lots |
| `REQ-LOT-02` | Security & RBAC | Strict farmer lot ownership isolation on `/api/v1/lots/:lotId/*` | Backend | `VERIFIED` | `tests/api-v1-integration.test.js` (Step 11) | Non-owner receives HTTP 403 Forbidden |
| `REQ-SCR-01` | Module A (Detect) | Image format/size validation (>10MB rejected) and local preview | Frontend + Backend | `VERIFIED` | `tests/crop-to-cash.test.js`, `tests/api-v1-integration.test.js` (Step 12) | Rejects >10MB with HTTP 422 |
| `REQ-SCR-02` | Module A (Detect) | Explicit mock/demo labeling (`isMockOrDemo: true`, `calibratedConfidence: false`) and safe KVK referral | Backend + Frontend | `VERIFIED` | `tests/crop-to-cash.test.js`, `tests/api-v1-integration.test.js` (Step 12) | Zero synthetic pesticide prescription |
| `REQ-FIN-01` | Module B (Compare) | Deterministic 50-qtl net return calculation matching exact fixture | Backend + Frontend | `VERIFIED` | `tests/crop-to-cash.test.js`, `tests/crop-to-cash-calculations.test.js` | FCI ₹1,26,750 / Mandi ₹1,11,000 / Direct ₹1,13,500 / Downside ₹1,12,500 |
| `REQ-FIN-02` | Module B (Compare) | Quote retrieval (`GET /api/v1/lots/:lotId/quotes`) with `provenance: 'DEMO'` | Backend + Frontend | `VERIFIED` | `tests/api-v1-integration.test.js` (Step 4) | Returns FCI, Mandi (min/modal/max), and Direct Buyer quotes |
| `REQ-FIN-03` | Module B (Compare) | Record comparison (`POST /api/v1/lots/:lotId/comparisons`) & append ledger event | Backend + Frontend | `VERIFIED` | `tests/api-v1-integration.test.js` (Step 5), `tests/crop-to-cash-adapter.test.js` | Appends `COMPARISON` event to lot ledger |
| `REQ-PRC-01` | Module C (Complete) | Boolean-only document readiness (`POST /api/v1/lots/:lotId/readiness`); zero Aadhaar/PII | Backend + Frontend | `VERIFIED` | `tests/api-v1-integration.test.js` (Step 6) | Rejects raw Aadhaar fields with HTTP 400 |
| `REQ-PRC-02` | Module C (Complete) | Record procurement centre visits & outcomes (`POST /api/v1/lots/:lotId/procurement-attempts`) | Backend + Frontend | `VERIFIED` | `tests/api-v1-integration.test.js` (Step 7) | Validates `ProcurementState` including `ACCEPTED` |
| `REQ-SAL-01` | Module C (Complete) | Record farmer-reported sale, payment status & estimate-vs-actual variance (`POST /api/v1/lots/:lotId/sales`) | Backend + Frontend | `VERIFIED` | `tests/api-v1-integration.test.js` (Step 8), `tests/c2c-integration.test.js` | Appends `SALE` event and updates `saleRecord` |
| `REQ-LDG-01` | Ledger & Adapter | Typed adapter validation & ledger snapshot (`GET /api/v1/lots/:lotId/ledger`) | Frontend + Backend | `VERIFIED` | `tests/crop-to-cash-adapter.test.js`, `tests/api-v1-integration.test.js` (Step 9) | 100% contract alignment between adapter and Express server |
| `REQ-ADM-01` | Admin Analytics | Privacy-safe pilot analytics (`GET /api/admin/pilot-analytics`) with sample size $n$ | Backend | `VERIFIED` | `tests/c2c-integration.test.js`, `server.ts` | Exposes aggregated metrics only; zero personal PII |
| `REQ-UI-01` | Accessibility & Mobile | Responsive layout without horizontal overflow, keyboard focus, and ARIA live regions | Frontend | `VERIFIED` | `src/pages/CropToCashPage.tsx`, `src/components/AppShell.tsx` | Minimum 44px touch targets and semantic landmarks |
| `REQ-LOC-01` | Localization | Bilingual English (`EN`) and Devanagari Hindi (`HI`) coverage across Detect, Compare, Complete | Frontend | `VERIFIED` | `src/pages/CropToCashPage.tsx` | Instant language switch via `useKisan().t` |

---

## 2. PPT Architectural Roadmap & External Integrations

| ID | Category | Requirement | Owner | Status | Verification Evidence | Notes / Boundaries |
|---|---|---|---|---|---|---|
| `PPT-MKT-01` | External API | Live Agmarknet / data.gov.in APMC mandi price feed integration | Backend | `BLOCKED` | `API_CONTRACT.md` | External API key unprovisioned; transparent `DEMO` fixture active |
| `PPT-ARCH-01` | Infrastructure | Multi-region Kubernetes / Cloud Run horizontal auto-scaling cluster | DevOps | `NOT STARTED` | Architecture roadmap | Single-instance Node/Express runtime active |
| `PPT-DATA-01` | Persistence | Migrate process-memory C2C lot ledger to durable PostgreSQL / Cloud SQL | Backend | `NOT STARTED` | `server.ts`, `cropToCashService.ts` | Current C2C lot map is in process memory |
| `PPT-AI-01` | AI / ML | Real ONNX Runtime / Vision model leaf disease inference with calibrated probabilities | AI / ML | `NOT STARTED` | `cropToCashService.ts` | Isolated behind `CropToCashService.screenCropImage` mock adapter |
| `PPT-CACHE-01` | Performance | Redis distributed quote and session caching layer | Backend | `NOT STARTED` | Architecture roadmap | In-memory map used in prototype |
| `PPT-SCHED-01` | Background Jobs | Automated cron worker for daily mandi price ingestion and SMS alerts | Backend | `NOT STARTED` | Architecture roadmap | Manual / on-demand refresh in prototype |
| `PPT-STOR-01` | Cloud Storage | Object storage bucket (GCS/S3) with signed URLs for leaf image uploads | Backend | `NOT STARTED` | `CropToCashPage.tsx` | Local browser preview + metadata validation active |
| `PPT-BI-01` | Analytics | Warehouse export & longitudinal policy dashboard for state FPO directors | Data / BI | `NOT STARTED` | `/api/admin/pilot-analytics` | In-app JSON summary endpoint active |
