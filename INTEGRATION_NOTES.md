# INTEGRATION NOTES — KISAN-SPO × KISANSETU AI

**Status:** APPROVED & DEPLOYED (Shared Contract Synchronized)

---

## 1. Ownership & Responsibilities

- **Frontend Teammate (VS Code):**
  - React 19 screens, Tailwind CSS v4 styling, bilingual (EN/HI) UI strings.
  - Typed API adapter (`src/services/cropToCashAdapter.ts`).
  - Feature flag `VITE_CROP_TO_CASH_API_ENABLED=true` in `.env` enables direct live backend connectivity.
  - Image acquisition, local preview, and validation (JPEG/PNG/WebP, max 10MB).
  - Rendering safe KVK referral guidance with zero synthetic pesticide prescriptions.

- **Backend / Applied-AI Owner (Antigravity):**
  - Express server, route controllers, and stateless HMAC session management (`serverSession.ts`).
  - Strict server-side RBAC and owner isolation on all protected operations.
  - Authoritative persistence for `CropLot` and append-only event ledgers.
  - Model screening service adapter with abstention and quality gates.
  - Deterministic financial return engine matching the exact 50-quintal verification fixtures.
  - Privacy safeguards: strict non-collection of Aadhaar numbers, passbook scans, or land documents.

---

## 2. Architectural Decisions & Stack Boundary

1. **Preserved Existing Stack:**
   - The application is retained on the working Express + TypeScript + Vite + Firebase Auth / Cloud Firestore architecture.
   - We did not disrupt the working prototype by migrating to FastAPI, PostgreSQL/PostGIS, Redis, or ONNX Runtime at this stage. All requirements are safely met within the current stack.
   - Any future migration to Python/FastAPI/ONNX is decoupled behind the `CropToCashService.screenCropImage` interface.

2. **Single Source of Truth:**
   - The canonical `lotId` (e.g., `KS-MP-2025-089`) remains persistent across Detect (screening), Compare (return estimates), Complete (procurement visits), Crop Passport, and Payment records.
   - History is preserved in an append-only timeline (`ledgerEvents` / `historyEvents`), maintaining an auditable evidentiary trail.

3. **Privacy & Security by Design:**
   - **No Aadhaar numbers, passbook images, or land-record scans** are accepted or stored. Document readiness is tracked exclusively as boolean flags (`ready: true/false`).
   - Private crop lots are isolated at the server level by owner identity (`ownerEmail` / `ownerId`), preventing unauthorized reads or mutations.
   - Privilege escalation guard: The `admin` role cannot be self-assigned during registration or profile updates.

4. **Deterministic Calculation Standard:**
   - Net return calculations are deterministic business logic executed with the formula:
     $$\text{Net} = (\text{accepted quantity} \times \text{price}) - \text{transport} - \text{loading/handling} - \text{fees} - \text{extra visit costs} - \text{deductions}$$
   - Fictional 50-quintal reference fixtures verified:
     - FCI/MSP: ₹1,26,750 net
     - Mandi: ₹1,11,000 net
     - Direct Buyer: ₹1,13,500 net
     - Downside (FCI rejected fallback): ₹1,12,500 net

---

## 3. Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | Optional | `3000` | Express server port |
| `KISAN_SESSION_SECRET` | Required in prod | Auto-generated in dev | HMAC secret for stateless session tokens (min 32 chars in production) |
| `ADMIN_PASSWORD_HASH` | Optional | Unset (dev demo mode) | Locks down administrative endpoints with password authentication |
| `VITE_CROP_TO_CASH_API_ENABLED` | Optional | `false` | Frontend feature flag: switch from mock demo adapter to live REST API adapter |
| `VITE_CONFIG_NATIVE_IGNORE_WARNING` | Optional | `true` | Suppresses Vite configLoader warning |

---

## 4. Frontend Teammate Integration Instructions

1. **Enabling the Live Backend:**
   Set `VITE_CROP_TO_CASH_API_ENABLED=true` in your local `.env`. The typed client `createCropToCashApiAdapter` will automatically communicate with the deployed `/api/v1/lots/*` endpoints.

2. **Detect / Image Screening:**
   When a farmer captures an image in `CropToCashPage.tsx`, invoke `POST /api/v1/lots/:lotId/screenings`. Display the returned `explanation.safeExpertReferral` in the UI to ensure farmers receive official extension guidance.

3. **Compare / Selling Options:**
   Call `POST /api/v1/lots/:lotId/comparisons` with `{ quantityQtl, costs }`. The response returns verified estimates for FCI/MSP, Mandi, Direct Buyer, and Downside fallback along with the recorded ledger event.

4. **Complete / Procurement & Sale:**
   Append readiness changes via `POST /api/v1/lots/:lotId/readiness`, visits via `POST /api/v1/lots/:lotId/procurement-attempts`, and transactions via `POST /api/v1/lots/:lotId/sales`. Fetch the full ledger via `GET /api/v1/lots/:lotId/ledger`.
