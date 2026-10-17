# KisanSetu AI — Frontend & Full-Stack Status Report

## Status: VERIFIED & STABILIZED (Stage 1 Foundation Complete)

### 1. Crop-to-Cash Ledger & Decision Workspace (`src/pages/CropToCashPage.tsx`)
- **Route**: `/crop-to-cash` (integrated in `src/App.tsx`, `src/context/KisanContext.tsx`, and `src/components/AppShell.tsx`).
- **Bilingual Toggle**: English (`EN`) and Hindi (`हिंदी`) supported across all labels, provenance badges, readiness checklists, and timeline events.
- **Lot Selection**: Supports switching between user-created crop lots and the pre-seeded demonstration lot (`KS-MP-2025-089`) with explicit provenance badges (`DEMO` vs `USER_REPORTED`).
- **Four-Number Net Return Calculator**:
  - Computes and displays gross, deductions, net return, and net per quintal for **FCI / MSP Reference**, **APMC Mandi**, and **Direct / FPO Buyer**, plus **Downside / Rejection Net**.
  - Verified against the 50-quintal reference fixture (`₹1,26,750`, `₹1,11,000`, `₹1,13,500`, and `₹1,12,500`).
- **Readiness, Procurement & Actual vs Estimated Sale Recording**:
  - Interactive boolean toggles for bank, registration, moisture, and grading readiness.
  - Procurement attempt state recording (`PLANNED`, `VISITED`, `ACCEPTED`, `PENDING`, `REJECTED`, `RESCHEDULED`, `NOT_COMPLETED`).
  - Actual sale & payment settlement form computing exact variance from estimated net return.

### 2. Typed Client Adapter & API Integration (`src/services/cropToCashAdapter.ts`)
- Live HTTP adapter (`createCropToCashApiAdapter`) connected to `/api/v1/lots/*` with Bearer token authentication and runtime response validation.
- Deterministic offline/demo adapter (`createDemoCropToCashAdapter`) for zero-latency fallback when operating without a server token.
- Full 12-step API v1 live integration test (`tests/api-v1-integration.test.js`) verifies all `/api/v1/lots/*` endpoints including lot creation, quote retrieval, comparison recording, readiness updates, procurement attempts, sale recording, ledger retrieval, and RBAC ownership isolation.

### 3. Authentication & Profile Lifecycle (`src/hooks/useAuth.ts`, `src/context/KisanContext.tsx`, `src/App.tsx`)
- Unified `useAuthSession` hook powering `KisanProvider` and `useAuth()`.
- Full lifecycle state coverage (`LOADING`, `INITIALIZING`, `READY`, `ERROR`, `UNAUTHENTICATED`), onboarding wizard enforcement, and role-ordered personalized dashboard.
- Registration, login, and HMAC session token verification with 15-minute expiry and client auto-signout scheduling.
- Privilege escalation defense: self-assigned `admin` role is strictly rejected with HTTP 403.

### 4. Component Verification Matrix

| Route / component | Expected behavior | Observed behavior and evidence | Status | Defect / next action |
|---|---|---|---|---|
| Authentication & Session — `AuthPage.tsx`, `useAuth.ts`, `serverSession.ts` | Sign-in opens workspace; protected pages require valid session; self-assigned admin blocked. | `tests/server-auth.test.js`, `tests/server-session.test.js`, `tests/session-token-ui.test.js` pass (100%). Token tampering & expiry verified. | PASS | Complete multi-tenant cross-instance setup when secondary environment provisioned. |
| Onboarding — `OnboardingWizard.tsx`, `App.tsx` | 4-step wizard renders at `/onboarding` for new users; saves profile to backend & Firestore. | Rendered conditionally in `App.tsx` when `onboardingStatus !== 'COMPLETED'`; persists via `/api/profile`. | PASS | Add end-to-end browser automation for multi-step form transitions. |
| App Shell & Navigation — `AppShell.tsx` | Responsive shell with drawer, role badge, language switcher, and route navigation. | Renders on all authenticated routes; supports mobile breakpoints with no horizontal overflow. | PASS | Maintain semantic landmark accessibility. |
| Farmer Dashboard — `DashboardPage.tsx`, `PersonalizedDashboard.tsx` | Role-tailored workspace with quick actions, active lots, market alerts, and C2C launcher. | Renders personalized view based on `user.role`; launches C2C workflow and lot details. | PASS | Expand persona suites for Agent, Buyer, and Admin in Stage 2. |
| Crop-to-Cash Detect Tab — `CropToCashPage.tsx` | File chooser, preview, MIME/size validation (>10MB rejected), and transparent demo labeling. | Validates image size/format; passes `tests/crop-to-cash.test.js` and `api-v1-integration.test.js` Step 12. | PASS | Retain explicit demo label until real vision model endpoint is wired. |
| Crop-to-Cash Compare Tab — `CropToCashPage.tsx` | Four-number comparison against 50-qtl reference fixture; records comparison to lot ledger. | Verified in `tests/crop-to-cash.test.js`, `crop-to-cash-calculations.test.js`, and `crop-to-cash-adapter.test.js`. | PASS | Live APMC Mandi feeds to be integrated in Stage 3. |
| Crop-to-Cash Complete Tab — `CropToCashPage.tsx` | Boolean readiness checklist, procurement visit recording, and sale/payment settlement. | Verified in `tests/api-v1-integration.test.js` Steps 6–8 and `tests/c2c-integration.test.js`. | PASS | Real payment provider gateway to be integrated in Stage 3. |
| Crop Ledger & Adapter — `cropToCashAdapter.ts`, `server.ts` | Append-only ledger events, ownership isolation, and response schema validation. | Verified in `tests/crop-to-cash-adapter.test.js` and `api-v1-integration.test.js` Step 9 & 11. | PASS | Connect to durable Cloud SQL/PostgreSQL storage in Stage 2. |

### 5. Verification Results
- `npm run lint` (`tsc --noEmit`): **PASS (0 errors)**
- `npx eslint firestore.rules`: **PASS (0 errors)**
- `npm ls --depth=0`: **PASS (0 errors, 24/24 dependencies matched)**
- `npm test`: **PASS (15/15 unit tests passed)**
- `npm run test:integration`: **PASS (all integration tests passed against local server)**
- `npm run build` (`vite build`): **PASS (0 errors, dist generated)**
