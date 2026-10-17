# Kisan-SPO / KisanSetu AI — Authoritative API Contract

**Status:** ACTIVE & VERIFIED  
**Version:** v1.0.0 (Stage 1 Baseline)  
**Base Convention:** `/api/v1` for Crop-to-Cash and core domain entities; `/api/auth` for session management; `/api/profile` for user workspaces; `/api/admin` for administrative controls. Legacy `/api/c2c` endpoints are preserved for backward compatibility.

---

## 1. Authentication & Security Conventions

1. **Transport & Tokens:** All requests require the `Authorization: Bearer <token>` header containing a 15-minute HMAC-SHA256 signed stateless session token issued by the server.
2. **Error Format:** All `/api/v1` endpoints return errors conforming to the standardized envelope:
   ```json
   {
     "error": {
       "code": "ERROR_CODE_STRING",
       "message": "Human readable error description",
       "retryable": false
     }
   }
   ```
3. **Role-Based Access Control (RBAC):**
   - Self-assigned `admin` role is strictly forbidden on registration (returns HTTP 403 `FORBIDDEN`).
   - All `/api/v1/lots/:lotId/*` endpoints enforce farmer ownership (`lot.ownerEmail === user.email || user.role === 'admin'`). Non-owners receive HTTP 403 `FORBIDDEN`. Pre-seeded demonstration lots (`KS-MP-2025-089`, `KS-MP-2025-094`, `KS-MH-2025-210`) are readable by all authenticated personas.

---

## 2. API Endpoint Matrix

| Method & Route | Purpose | Auth & RBAC | Request Schema | Response Schema | Validation & Error Behavior | Frontend Consumer | Test Evidence | Classification |
|---|---|---|---|---|---|---|---|---|
| `POST /api/auth/register` | Register new user account with hashed password | Public | `{ email, password, name, role, villageOrOrg, preferredLanguage? }` | `{ message, user, token }` | 400 on missing fields; 403 on self-assigned admin; 409 on duplicate email | `src/hooks/useAuth.ts` | `tests/server-auth.test.js` | REAL |
| `POST /api/auth/login` | Authenticate user credentials & issue signed token | Public | `{ email, password }` | `{ message, user, token }` | 400 on empty inputs; 401 on invalid credentials | `src/hooks/useAuth.ts` | `tests/server-auth.test.js` | REAL |
| `POST /api/auth/admin-login` | Authenticate platform administrator with master key | Public | `{ email, adminKey }` | `{ message, user, token }` | 401 on invalid master credentials | `src/components/AdminLoginDialog.tsx` | Manual & unit inspection | REAL |
| `POST /api/auth/firebase-sync` | Synchronize client Firebase identity to server profile | Public | `{ uid, email, displayName, role?, preferredLanguage?, villageOrOrg? }` | `{ message, user, token }` | Issues token matching Firebase UID | `src/hooks/useAuth.ts` | Source inspection | REAL |
| `GET /api/auth/session` | Validate session token & return active user identity | Bearer Token | None | `{ authenticated: true, user }` | 401 on missing, expired, or tampered token | `src/hooks/useAuth.ts` | `tests/server-session.test.js`, `server-auth.test.js` | REAL |
| `POST /api/auth/logout` | Client sign-out confirmation | Bearer Token | None | `{ message: "Logged out successfully" }` | 200 OK | `src/hooks/useAuth.ts` | `tests/server-auth.test.js` | REAL |
| `GET /api/profile` | Retrieve user profile & personal lots | Bearer Token (`requireUser`) | None | `{ user, personalLots, demoLots }` | 401 on unauthorized | `src/context/KisanContext.tsx` | Live server inspection | REAL |
| `PUT /api/profile` | Update profile fields & onboarding status | Bearer Token (`requireUser`) | `{ displayName?, phone?, villageOrOrg?, onboardingStatus?, preferredLanguage? }` | `{ user }` | 401 on unauthorized; sanitizes role | `src/context/KisanContext.tsx`, `OnboardingWizard.tsx` | Live server inspection | REAL |
| `POST /api/profile/crops` | Create personal crop lot from dashboard | Bearer Token (`requireUser`) | `{ cropName, variety?, quantityQuintals, ... }` | `{ lot, personalLots }` | 400 on missing cropName or non-positive quantity | `src/context/KisanContext.tsx` | `tests/server-auth.test.js` | REAL |
| `GET /api/v1/lots` | List all crop lots accessible to user | Bearer Token (`requireUserV1`) | None | `ExtendedCropLotRecord[]` | Returns user's lots + pre-seeded demo lots | `src/services/cropToCashAdapter.ts` | `tests/api-v1-integration.test.js` (Step 3) | REAL |
| `POST /api/v1/lots` | Create canonical crop lot in v1 format | Bearer Token (`requireUserV1`) | `{ cropName, variety?, grade?, quantityQuintals, harvestDate?, surveyNumber? }` | `ExtendedCropLotRecord` (HTTP 201) | 400 on missing cropName; validates positive quantity | `src/services/cropToCashAdapter.ts` | `tests/api-v1-integration.test.js` (Step 2) | REAL |
| `GET /api/v1/lots/:lotId` | Retrieve single crop lot with ownership check | Bearer Token (`requireUserV1`) | None | `ExtendedCropLotRecord` | 404 if missing; 403 if not owner and non-admin | `src/services/cropToCashAdapter.ts` | `tests/api-v1-integration.test.js` (Step 3, 11) | REAL |
| `GET /api/v1/lots/:lotId/ledger` | Retrieve append-only ledger snapshot & events | Bearer Token (`requireUserV1`) | None | `CropToCashSnapshot` | 404 if missing; 403 if not owner | `src/services/cropToCashAdapter.ts` (`fetchLotLedger`) | `tests/api-v1-integration.test.js` (Step 9) | REAL |
| `GET /api/v1/lots/:lotId/quotes` | Retrieve selling quotes across 3 channels | Bearer Token (`requireUserV1`) | None | `SellingQuote[]` | 404 if missing; quotes carry `provenance: 'DEMO'` | `src/services/cropToCashAdapter.ts` (`fetchQuotes`) | `tests/api-v1-integration.test.js` (Step 4) | DEMO |
| `POST /api/v1/lots/:lotId/comparisons` | Deterministic 4-number return calculation | Bearer Token (`requireUserV1`) | `{ quotes, transportCost?, loadingCost?, handlingCost?, commissionRate?, moistureDeductionRate? }` | `ComparisonResult` | 422 if inputs invalid; appends COMPARISON event | `src/services/cropToCashAdapter.ts` (`recordComparison`) | `tests/api-v1-integration.test.js` (Step 5), `crop-to-cash-adapter.test.js` | REAL |
| `POST /api/v1/lots/:lotId/readiness` | Record boolean document readiness items | Bearer Token (`requireUserV1`) | `{ readiness: CropReadinessItem[] }` | `CropLedgerEvent` | Rejects raw Aadhaar/PII fields with 400; updates readiness | `src/services/cropToCashAdapter.ts` (`recordReadiness`) | `tests/api-v1-integration.test.js` (Step 6) | REAL |
| `POST /api/v1/lots/:lotId/procurement-attempts` | Record procurement visit & acceptance status | Bearer Token (`requireUserV1`) | `{ state, reason, centreId?, centreName?, isCentreVerified? }` | `CropLedgerEvent` | 422 on invalid `ProcurementState`; appends event | `src/services/cropToCashAdapter.ts` (`recordProcurementAttempt`) | `tests/api-v1-integration.test.js` (Step 7) | REAL |
| `POST /api/v1/lots/:lotId/sales` | Record farmer-reported sale & payment status | Bearer Token (`requireUserV1`) | `{ quantityQtl, agreedPricePerQtl, deductions, actualNet?, paymentStatus }` | `CropLedgerEvent` | Validates positive numbers; computes variance; appends event | `src/services/cropToCashAdapter.ts` (`recordSale`) | `tests/api-v1-integration.test.js` (Step 8), `tests/c2c-integration.test.js` | REAL |
| `POST /api/v1/lots/:lotId/screenings` | Leaf image quality check & safe KVK advisory | Bearer Token (`requireUserV1`) | `{ imageFormat, imageSizeBytes, cropDeclared? }` | `CropScreeningResult` | Rejects >10MB with 422; flags `isMockOrDemo: true`; zero chemical advice | `src/pages/CropToCashPage.tsx` | `tests/api-v1-integration.test.js` (Step 12), `crop-to-cash.test.js` | DEMO |
| `GET /api/admin/dashboard` | Administrative metrics, user directory, all lots | Bearer Token (`requireAdmin`) | None | `{ stats, users, lots, activity }` | 403 Forbidden for non-admin | `src/pages/AdminDashboardPage.tsx` | `tests/adversarial-security.test.js` (Vector 4) | REAL |
| `POST / PUT /api/admin/users/:userId/role` | Modify user assigned role | Bearer Token (`requireAdmin`) | `{ role: 'farmer' \| 'agent' \| 'buyer' \| 'admin', reason }` | `{ user, auditLogs }` | 403 Forbidden for non-admin; 400 on missing audit reason or invalid role | `src/pages/AdminDashboardPage.tsx` | `tests/adversarial-security.test.js` (Vector 4 & 6) | REAL |
| `POST / PUT /api/admin/users/:userId/status` | Modify user status (activate / deactivate) | Bearer Token (`requireAdmin`) | `{ active: boolean, reason }` | `{ user, auditLogs }` | 403 Forbidden for non-admin; cannot deactivate self | `src/pages/AdminDashboardPage.tsx` | `tests/adversarial-security.test.js` | REAL |
| `POST / PUT /api/admin/lots/:lotId/verification` | Set lot official verification status | Bearer Token (`requireAdmin`) | `{ status: 'VERIFIED' \| 'REJECTED' \| 'FLAGGED', reason }` | `{ lotId, override, auditLogs }` | 403 Forbidden for non-admin; min 5 char reason required | `src/pages/AdminDashboardPage.tsx` | Live server inspection | REAL |
| `GET /api/admin/pilot-analytics` | Aggregated pilot performance & variance analytics | Bearer Token | None | `{ totalLotsTracked, totalQuantityQuintals, avgVariance, channelDistribution }` | Privacy-safe: zero personal PII returned | `server.ts` | `tests/c2c-integration.test.js` | REAL |
| `POST /api/demo/reset` | Safe reset of in-memory demo data | Bearer Token | None | `{ message: "Demo lots reset successfully" }` | Only resets seeded demo lots; does not delete user accounts | `src/context/KisanContext.tsx` | `tests/c2c-integration.test.js` | REAL |

---

## 3. Legacy `/api/c2c` Compatibility Endpoints

The following routes are preserved in `server.ts` for backward compatibility with prototype test suites:
- `POST /api/c2c/lots`
- `GET /api/c2c/lots/:lotId`
- `POST /api/c2c/lots/:lotId/screening`
- `POST /api/c2c/lots/:lotId/estimate`
- `POST /api/c2c/lots/:lotId/procurement-attempt`
- `POST /api/c2c/lots/:lotId/sale`

All new client code and UI components MUST use the `/api/v1` routes documented in Section 2.
