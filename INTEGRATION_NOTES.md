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
