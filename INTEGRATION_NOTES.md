<<<<<<< HEAD
# Frontend / Backend Integration Notes

**Status: awaiting backend-owner review of the draft in `API_CONTRACT.md`.**

## Ownership

- Frontend: existing React screens, bilingual accessible interactions, typed API adapter, clearly labelled demo adapter, validation and user-visible loading/error/offline states.
- Backend/AI teammate: API contract, Firebase ID-token verification, authorization and ownership, persistent records, model inference, quote provenance, procurement/sale event history, and file storage.

## Verified current repository state

- Browser Firebase Auth and Firestore are initialized in `src/firebase.ts`; profile and crop-lot helpers exist.
- Existing Express session/auth, user records, crop lots, audit events, and admin overrides are process-memory state in `server.ts`. Do not treat those server responses as durable across restarts or instances.
- Crop-lot Firestore helpers use the browser Firebase SDK. This does not establish that backend routes verify Firebase ID tokens or persist the same user/lot records.
- No Firebase Storage client integration, real image-diagnosis API, or persisted procurement/sale event API was found in the inspected frontend.
- Do not upload sensitive identity or land-record documents. Readiness is boolean-only.

## Environment

- Existing browser Firebase config is `firebase-applet-config.json`; it contains public client configuration, not backend credentials.
- Do not add service-account credentials, model keys, or other secrets to `VITE_*` variables or the client bundle.
- Required backend AI, quote-provider, storage, and API-base environment variable names remain TBD pending backend owner.
- `VITE_CROP_TO_CASH_API_ENABLED=true` is a client feature switch for the draft HTTP adapter, not an endpoint/service credential. Leave it unset/false until the backend owner approves and deploys the contract.

## Decisions / blockers

- The API contract and integration-notes files were empty at audit time; the API document is now a proposal, not an agreed contract.
- No new endpoints are to be called from the production UI until the backend owner confirms the contract. If frontend-only work proceeds first, use a separately injected typed mock adapter, with all outputs visibly marked as demo data and never presented as live/verified.
- Ask the backend teammate to approve or amend the auth, lot/ledger, screening/upload, quotes/comparison, procurement, and sale shapes before wiring them.
=======
# INTEGRATION NOTES — KISAN-SPO × KISANSETU AI

## 1. Architectural Decisions & Stack Boundary

- **Preserved Existing Stack:** The application is retained on the working Express + TypeScript + Vite + Firebase Auth / Cloud Firestore architecture. We did not switch to FastAPI, ONNX Runtime, or PostgreSQL/PostGIS for this milestone because Express is running smoothly and all frontend routes interface directly with it.
- **Model Adapter Pattern:** Implemented the `CropToCashService.screenCropImage` interface. This allows plugging in real ONNX Runtime inference in Python or Node.js via an external microservice or native bindings later without modifying frontend or business logic.
- **Single Source of Truth:**
  - Crop lot identity (`lotId`) remains persistent across screening, return estimates, procurement attempts, actual sales, and payment settlement.
  - History is stored in an append-only timeline (`historyEvents`), preserving the evidence trail instead of mutating prior records.
- **Privacy & Security By Design:**
  - Strict privacy enforcement: **NO Aadhaar numbers, passbook images, or land-record scans** are accepted or stored anywhere. Document readiness is tracked exclusively as binary flags (`yes`/`no` booleans).
  - Farmer private crop lots are isolated at the server level by owner identity (`ownerEmail` / `ownerId`), preventing other farmers or public users from reading or mutating them.
  - Role escalation prevention: `admin` role cannot be self-assigned during registration or profile update.

## 2. Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | Optional (default: `3000`) | Server listening port |
| `KISAN_SESSION_SECRET` | Required in prod (min 32 chars) | HMAC secret for stateless session tokens |
| `ADMIN_PASSWORD_HASH` | Optional | When set, locks down dev demo admin bypass |
| `VITE_CONFIG_NATIVE_IGNORE_WARNING` | Optional | Suppresses Vite configLoader warning |

## 3. Frontend Teammate Integration Tasks

1. **Advisory / Camera Screen:** When a farmer takes a photo or selects an image, call `POST /api/c2c/lots/:lotId/screening` instead of running local mock timers. The returned `explanation.safeExpertReferral` should be rendered to the user to avoid unprescribed pesticide usage.
2. **Market Comparison:** Use `POST /api/c2c/lots/:lotId/estimate` to fetch deterministic net return options, displaying the 4 options: FCI/MSP, Mandi, Direct Buyer, and Downside fallback.
3. **Passport & Audit Trail:** Use `GET /api/c2c/lots/:lotId` to populate the Crop Passport QR code and full verification event timeline.
>>>>>>> 66bcde4bbfe113ab0a5b4f9ed9ab6eec0c704ad6
