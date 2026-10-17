# Kisan-SPO / KisanSetu AI Integration Notes

**Status: blocked on backend-owner decisions and deployment verification.** Preserve the current React, TypeScript, Express, Firebase Auth, and Firestore architecture.

## Ownership and verified boundaries

- Frontend owns existing screens, typed adapters, explicit demo labeling, validation, and user-visible loading/error states.
- Backend/AI owner owns server authentication and authorization, canonical lot identity, durable storage, model inference, quote provenance, procurement/sale history, and file storage.
- `server.ts` contains `/api/c2c/lots` routes, but its lot/user state is process-local. Local route implementation and passing integration tests are not evidence of durable or production deployment.
- The screening endpoint accepts image metadata only and returns a mock/demo result; no image bytes are uploaded or analyzed.
- No live quote route is present in the current server. The frontend fixture is fictional and must remain labelled as such.
- Existing `/api/c2c` routes and the frontend `/api/v1` adapter differ in route names, payloads, and response types. The adapter is disabled by default and must remain disabled.
- The app's existing lot/profile data and the C2C server lot map are not confirmed to share a canonical persistent lot ID. Do not auto-create a C2C lot from a selected existing lot.
- Do not collect Aadhaar numbers, passbook images, or land-record images. Readiness must remain boolean-only.

## Security and environment

- Browser Firebase configuration is public client configuration, not a backend secret.
- Never place service-account credentials, model keys, or other secrets in `VITE_*` variables or client bundles.
- Server-side Firebase ID-token verification is not confirmed by the inspected route implementation.
- The API feature flag is a UI switch, not a credential or evidence that backend routes are deployed.
- Current backend process-memory state is not safe to describe as durable or horizontally consistent.

## Backend-owner actions required

1. Confirm the canonical lot identity/data source shared by login, onboarding, passport, and C2C.
2. Specify and deploy durable persistence plus ownership checks and authentication verification.
3. Approve one typed API contract for lot reads, screening, quotes, comparison, readiness, procurement, sale, and event history.
4. Provide real upload/storage and screening behavior, or confirm that screening remains a demo.
5. Provide quote sources and comparability/freshness metadata; confirm the exact calculation input/output contract.
6. Correct/document centre verification defaults, sale cost validation/defaults, and repeat-sale history semantics.
7. Supply deployed sample responses, error cases, and a test environment before enabling the API adapter.

## Frontend next steps after approval

- Reconcile `src/services/cropToCashAdapter.ts` with the approved routes and response schemas.
- Keep demo and production paths separate and visible; do not present local preview as a diagnosis or demo history as persisted.
- Add contract tests from backend-provided response/error fixtures and re-run the end-to-end workflow against the agreed test environment.
