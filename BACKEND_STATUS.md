# KisanSetu AI — Backend & Security Architecture Status

## Status: VERIFIED & PASSING

### 1. Implemented API Endpoints (`server.ts`)

#### Authentication & Session Management
- `POST /api/auth/login` — Email/password & demo account sign-in issuing stateless HMAC-SHA256 signed session tokens (`serverSession.ts`, 15-minute TTL).
- `POST /api/auth/register` — Account registration with role, village/organization, and `INCOMPLETE` onboarding initialization.
- `POST /api/auth/firebase-sync` — Synchronizes authenticated Firebase users and Cloud Firestore profiles with server RBAC sessions.
- `POST /api/auth/admin-login` — Dedicated administrator credential verification.
- `GET /api/auth/session` — Restores active session, profile, and user-scoped crop lots.
- `POST /api/auth/verify-email` — Marks authenticated user email verified.
- `POST /api/auth/forgot-password` — Non-enumerating password reset request handler.
- `POST /api/auth/logout` — Revokes active session token and records audit event.

#### Profile & Personal Crop Lots
- `PUT /api/profile` — Updates user profile, location, role, language, and onboarding status/step.
- `POST /api/profile/crops` — Creates a personal crop lot and registers it in both the user workspace and the Crop-to-Cash store.
- `POST /api/demo/reset` — Resets demonstration dataset state without affecting real user profiles.

#### Crop-to-Cash v1 REST API (`/api/v1/lots/*`)
- `GET /api/v1/lots` — Lists crop lots owned by the authenticated user.
- `POST /api/v1/lots` — Creates a new crop lot with initialized readiness checklist and creation ledger event.
- `GET /api/v1/lots/:lotId` — Retrieves a single crop lot with strict owner/admin RBAC enforcement (`403 Forbidden` on cross-user access).
- `GET /api/v1/lots/:lotId/ledger` — Returns `CropToCashSnapshot` (`lotId`, `procurementState`, `readiness`, `events`).
- `GET /api/v1/lots/:lotId/quotes` — Returns labeled `SellingQuote[]` (`FCI_MSP_REFERENCE`, `MANDI`, `DIRECT_BUYER`) with explicit provenance.
- `POST /api/v1/lots/:lotId/comparisons` — Validates inputs, computes the four net return figures, appends a `COMPARISON` ledger event, and returns `ConfirmedComparisonResult`.
- `POST /api/v1/lots/:lotId/readiness` — Updates boolean readiness item and appends a `READINESS` ledger event.
- `POST /api/v1/lots/:lotId/procurement-attempts` — Updates lot procurement state (`PLANNED`, `VISITED`, `ACCEPTED`, `PENDING`, `REJECTED`, `RESCHEDULED`, `NOT_COMPLETED`) and appends a `PROCUREMENT` ledger event.
- `POST /api/v1/lots/:lotId/sales` — Validates actual sale & payment settlement and appends a `SALE` ledger event.
- `POST /api/v1/lots/:lotId/screenings` — Validates leaf image metadata (`jpeg`/`png`/`webp`, max 10 MB) and returns non-prescriptive KVK referral guidance.

#### Legacy Crop-to-Cash Endpoints (`/api/c2c/*`)
- `POST /api/c2c/lots/:id/quotes`
- `POST /api/c2c/lots/:id/procurement`
- `POST /api/c2c/lots/:id/sales`
- `POST /api/c2c/lots/:id/screenings`
- `GET /api/c2c/lots/:id/ledger`

### 2. Cloud Firestore Security Rules (`firestore.rules`)
- Default-deny catch-all across all paths.
- Strict schema validation (`hasAll` + `hasOnly`), type/length bounds, and ownership isolation on `/users/{userId}`, `/users/{userId}/private/{docId}`, `/cropLots/{lotId}`, `/auditLogs/{logId}`, and `/admins/{adminUid}`.
- Verified with `@firebase/eslint-plugin-security-rules` (`npx eslint firestore.rules` — 0 errors, 0 warnings).
