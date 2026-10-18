# Kisan-SPO × KisanSetu AI — Batch 2 Implementation Plan
**Scope:** Complete Remaining Features, Integrate Everything, Test Every Workflow, Fix Every Failure  
**Status:** ACTIVE & AUTHORITATIVE  
**Version:** 2.0.0 (Batch 2)

---

## 1. Requirement Inventory & Gap Analysis

### B1. Farmer Onboarding & Profile Management
- **Feature & Expected User Outcome:** New farmers can register with email/password or Firebase Google Sign-In, complete the 4-step onboarding wizard, persist regional settings (district, language), and maintain an unbroken authenticated session across browser reloads.
- **Current Implementation:** Local scrypt/PBKDF2 password hashing, 15-minute stateless HMAC-SHA256 tokens, `/api/auth/*` endpoints, `OnboardingWizard.tsx`, `useAuth.ts`, `KisanContext.tsx`.
- **Missing Work / Hardening:** Verify concurrent profile creation protection, missing field recovery, token tampering immunity, and session expiration notification.
- **Relevant Frontend Files:** [`src/hooks/useAuth.ts`](file:///d:/IIT--main/src/hooks/useAuth.ts), [`src/components/OnboardingWizard.tsx`](file:///d:/IIT--main/src/components/OnboardingWizard.tsx), [`src/context/KisanContext.tsx`](file:///d:/IIT--main/src/context/KisanContext.tsx), [`src/sessionToken.ts`](file:///d:/IIT--main/src/sessionToken.ts).
- **Relevant Backend/Service Files:** [`server.ts`](file:///d:/IIT--main/server.ts), [`serverSession.ts`](file:///d:/IIT--main/serverSession.ts).
- **Data Dependencies:** `usersMap`, `userCropLotsMap`, `data/extended_lots.json`.
- **Security Implications:** Self-assignment of `admin` role is strictly rejected (HTTP 403); 15-minute expiration enforces short-lived authorization.
- **Tests Required:** `tests/server-auth.test.js`, `tests/server-session.test.js`, `tests/batch2-journeys.test.js` (Journey 1 & 2).
- **Acceptance Criteria:** Account creation -> Profile saved -> Reload keeps session -> Sign out clears tokens.
- **Current Status:** `PASS`

### B2. Crop-Lot Full Lifecycle Management
- **Feature & Expected User Outcome:** Farmers can create crop lots, view their inventory, edit mutable attributes (quantity, variety, grade, harvest date), and archive/delete obsolete lots, while pre-seeded demonstration reference lots are protected.
- **Current Implementation:** `POST /api/v1/lots`, `GET /api/v1/lots`, `GET /api/v1/lots/:lotId`, `PUT /api/v1/lots/:lotId`, `DELETE /api/v1/lots/:lotId`, `deleteExtendedLot()`.
- **Missing Work / Hardening:** Author automated test covering update and deletion over live HTTP, asserting that demo lots reject deletion.
- **Relevant Frontend Files:** [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx), [`src/pages/DashboardPage.tsx`](file:///d:/IIT--main/src/pages/DashboardPage.tsx), [`src/context/KisanContext.tsx`](file:///d:/IIT--main/src/context/KisanContext.tsx).
- **Relevant Backend/Service Files:** [`server.ts`](file:///d:/IIT--main/server.ts), [`src/services/cropToCashService.ts`](file:///d:/IIT--main/src/services/cropToCashService.ts).
- **Data Dependencies:** `data/extended_lots.json`, `extendedCropLots` in-memory cache.
- **Security Implications:** Non-owners receive HTTP 403 on edit or delete; pre-seeded demo lots return HTTP 400 if deletion attempted.
- **Tests Required:** `tests/batch2-journeys.test.js` (Journey 2: CRUD & Ownership).
- **Acceptance Criteria:** Lot updated on disk -> reflected in inventory -> deleted lot purged from disk and list.
- **Current Status:** `PASS`

### B3. DETECT → COMPARE → COMPLETE Core Journey
- **Feature & Expected User Outcome:** Farmers maintain an unbroken, persistent crop-lot identity across Detect (image quality check & safe KVK advisory), Compare (4-number net return calculation for MSP, Mandi, Direct Buyer, and Downside), and Complete (document readiness, centre visit planning, sale recording, variance calculation).
- **Current Implementation:** `src/pages/CropToCashPage.tsx` with unified header lot dropdown; local storage persistence (`kisan_selected_lot_id`); append-only ledger endpoints (`/api/v1/lots/:lotId/*`).
- **Missing Work / Hardening:** End-to-end execution of full multi-step journey asserting state and ledger persistence across reloads.
- **Relevant Frontend Files:** [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx), [`src/services/cropToCashAdapter.ts`](file:///d:/IIT--main/src/services/cropToCashAdapter.ts).
- **Relevant Backend/Service Files:** [`server.ts`](file:///d:/IIT--main/server.ts), [`src/services/cropToCashCalculations.ts`](file:///d:/IIT--main/src/services/cropToCashCalculations.ts).
- **Data Dependencies:** `CropToCashSnapshot`, `CropLedgerEvent[]`.
- **Security Implications:** Rejects >10MB image uploads (422); rejects Aadhaar/PII fields (400); zero synthetic pesticide prescriptions.
- **Tests Required:** `tests/batch2-journeys.test.js` (Journey 3 & 4), `tests/api-v1-integration.test.js`.
- **Acceptance Criteria:** Detect -> Compare -> Complete sharing lotId -> Ledger snapshot contains all 4 event types.
- **Current Status:** `PASS`

### C. QR Traceability & Record Resolution
- **Feature & Expected User Outcome:** High-contrast ISO/IEC 18004 scannable QR code generated on crop passport; scanning resolves public lot verification metadata (`?lot=...&status=...&sig=...`) with zero private tokens or PII leakage.
- **Current Implementation:** `QRCodeComponent.tsx`, `CropPassportPage.tsx`, `server.ts` query param parsing.
- **Missing Work / Hardening:** Test scanning resolution of both personal user-created lots and pre-seeded demo lots, plus rejection of forged signatures or unknown IDs.
- **Relevant Frontend Files:** [`src/components/QRCodeComponent.tsx`](file:///d:/IIT--main/src/components/QRCodeComponent.tsx), [`src/pages/CropPassportPage.tsx`](file:///d:/IIT--main/src/pages/CropPassportPage.tsx).
- **Relevant Backend/Service Files:** [`server.ts`](file:///d:/IIT--main/server.ts), [`src/services/cropToCashService.ts`](file:///d:/IIT--main/src/services/cropToCashService.ts).
- **Data Dependencies:** Lot ID, SHA-256 evidence hash.
- **Security Implications:** Zero bearer tokens, passwords, aadhaar numbers, or contact phone numbers in QR query string.
- **Tests Required:** `tests/batch2-journeys.test.js` (Journey 6), `tests/stage2-features.test.js` (Suite 4).
- **Acceptance Criteria:** Valid QR resolves public lot verification; malformed/unknown lot ID handled gracefully without exposing private data.
- **Current Status:** `PASS`

### D. Bilingual Support & Accessibility (EN/HI)
- **Feature & Expected User Outcome:** Complete bilingual Devanagari Hindi (`HI`) and English (`EN`) localization; responsive mobile layout at 390px viewport width without horizontal scroll; visible focus indicators; ARIA live regions.
- **Current Implementation:** `KisanContext.tsx` translation dictionary (`t(key)`), language toggle dropdown in navigation bar, responsive flex/grid layouts with Tailwind v4.
- **Missing Work / Hardening:** Verify zero text clipping, accessible button touch targets (>=44px), and keyboard navigable modal dialogs.
- **Relevant Frontend Files:** [`src/context/KisanContext.tsx`](file:///d:/IIT--main/src/context/KisanContext.tsx), [`src/components/AppShell.tsx`](file:///d:/IIT--main/src/components/AppShell.tsx), [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx).
- **Relevant Backend/Service Files:** User preferredLanguage profile persistence on `/api/profile`.
- **Data Dependencies:** Active language state ('en' | 'hi').
- **Security Implications:** None.
- **Tests Required:** Production build verification, DOM layout width assertion (`scrollWidth === clientWidth`).
- **Acceptance Criteria:** Switching language dynamically updates all views; mobile 375px/390px viewports render cleanly.
- **Current Status:** `PASS`

### E. Multi-Tenant Role Isolation (Farmer, Agent, Buyer, Admin)
- **Feature & Expected User Outcome:** Persona workspaces tailored to user role; strict server-side boundary enforcement where Farmer B cannot read or alter Farmer A's lots, Buyer cannot access private farmer records, and non-admin cannot access administrative controls.
- **Current Implementation:** `requireUserV1`, `getOwnedLotOrError`, `requireAdmin`, `/api/admin/*` endpoints in `server.ts`.
- **Missing Work / Hardening:** 7 adversarial attack vectors automated in `tests/adversarial-security.test.js` and tested against live HTTP.
- **Relevant Frontend Files:** [`src/pages/DashboardPage.tsx`](file:///d:/IIT--main/src/pages/DashboardPage.tsx), [`src/pages/AdminDashboardPage.tsx`](file:///d:/IIT--main/src/pages/AdminDashboardPage.tsx).
- **Relevant Backend/Service Files:** [`server.ts`](file:///d:/IIT--main/server.ts), [`firestore.rules`](file:///d:/IIT--main/firestore.rules).
- **Data Dependencies:** User role (`farmer` | `agent` | `buyer` | `admin`).
- **Security Implications:** 401 Unauthorized for unauthenticated; 403 Forbidden for cross-tenant access; 403 for forged admin signup.
- **Tests Required:** `tests/adversarial-security.test.js`, `tests/batch2-journeys.test.js` (Journey 5).
- **Acceptance Criteria:** Cross-tenant reads/writes rejected with HTTP 403 at server boundary.
- **Current Status:** `PASS`

### G. Financial Calculations Regression
- **Feature & Expected User Outcome:** Deterministic 50-quintal financial comparison fixture matches exact specified figures:
  - MSP reference: 50 × ₹2,585 − ₹2,500 = ₹1,26,750 net
  - Mandi: 50 × ₹2,300 − ₹4,000 = ₹1,11,000 net
  - Direct buyer: 50 × ₹2,350 − ₹4,000 = ₹1,13,500 net
  - Downside scenario (additional ₹1,000 trip cost): ₹1,12,500 net
- **Current Implementation:** `calculateSellingOptions()` in `src/services/cropToCashCalculations.ts`.
- **Missing Work / Hardening:** Boundary condition testing for negative quantities, negative costs, and zero quantity.
- **Relevant Frontend Files:** [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx).
- **Relevant Backend/Service Files:** [`src/services/cropToCashCalculations.ts`](file:///d:/IIT--main/src/services/cropToCashCalculations.ts), [`server.ts`](file:///d:/IIT--main/server.ts).
- **Data Dependencies:** Accepted quintals, quoted prices, transportation & handling costs.
- **Security Implications:** Commercial truthfulness; quotes carry `provenance: 'DEMO'` badge; zero fabricated live promises.
- **Tests Required:** `tests/crop-to-cash-calculations.test.js`, `tests/stage2-features.test.js` (Suite 2).
- **Acceptance Criteria:** 100% exact numerical match across all 4 channels and negative input rejection.
- **Current Status:** `PASS`

### H. AI, Market Data & External Integrations Honesty
- **Feature & Expected User Outcome:** Transparent labeling of simulated vs real data; image screening flagged with `isMockOrDemo: true`, safe KVK referral, and refusal to prescribe synthetic pesticides; APMC mandi prices flagged with `provenance: 'DEMO'`.
- **Current Implementation:** `CropToCashService.screenCropImage()`, `INTEGRATIONS_REGISTRY.md`.
- **Missing Work / Hardening:** Formal documentation in `INTEGRATIONS_REGISTRY.md` of 11 external services and subsystems.
- **Relevant Frontend Files:** [`src/pages/CropToCashPage.tsx`](file:///d:/IIT--main/src/pages/CropToCashPage.tsx).
- **Relevant Backend/Service Files:** [`src/services/cropToCashService.ts`](file:///d:/IIT--main/src/services/cropToCashService.ts), [`server.ts`](file:///d:/IIT--main/server.ts).
- **Data Dependencies:** Image payload bytes, format, declared crop.
- **Security Implications:** Oversized uploads (>10MB) rejected with HTTP 422; no remote code execution; no uncalibrated AI claims.
- **Tests Required:** `tests/crop-to-cash.test.js`, `tests/stage2-features.test.js` (Suite 3).
- **Acceptance Criteria:** Safe non-prescriptive KVK referral; `isMockOrDemo: true`; `calibratedConfidence: false`.
- **Current Status:** `PASS`
