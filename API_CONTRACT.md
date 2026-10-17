# Kisan-SPO / KisanSetu AI API Contract

**Status: integration is blocked pending backend-owner confirmation.** This document distinguishes routes present in this repository from the separate `/api/v1` proposal used by the frontend adapter. Source presence and local tests do not establish production deployment, durable storage, or real AI/market integrations.

## Current routes found in `server.ts`

All routes use the app origin and the server-issued signed session token in the `Authorization` header. Owner checks are implemented in route handlers. The local server uses process-memory storage; data is not durable across restarts or shared across instances.

### Authentication

- `POST /api/auth/register` — register and return a signed session token and user data.
- `POST /api/auth/login` — authenticate and return a signed session token and user data.
- `POST /api/auth/firebase-sync` — synchronize a Firebase browser identity with the server profile and issue a signed session token. Firebase token verification by the server is not established by the current source.

### Crop-to-cash

- `POST /api/c2c/lots` — create a server-side lot with `cropName`, optional variety/grade, `quantityQuintals`, harvest date, and survey number. Returns an `ExtendedCropLotRecord` with `id`, `screeningResults`, `procurementAttempts`, `historyEvents`, and timestamps. The lot map is in memory.
- `GET /api/c2c/lots/:lotId` — return the lot with its current history after an ownership check.
- `POST /api/c2c/lots/:lotId/screening` — accepts `imageFormat`, `imageSizeBytes`, and `cropDeclared`; **it does not receive or analyze image bytes**. The current service result is explicitly marked mock/demo and is appended to the lot history.
- `POST /api/c2c/lots/:lotId/estimate` — computes the server's fixed return fixture for the lot quantity and stores `latestEstimate` plus a history event. The route currently ignores a request body and does not accept the frontend's custom quote/cost inputs.
- `POST /api/c2c/lots/:lotId/procurement-attempt` — appends an attempt. Outcomes are `ACCEPTED | REJECTED | PENDING | RESCHEDULED | NOT_COMPLETED`. The current route defaults an omitted centre to a named centre and omitted `isCentreVerified` to `true`; callers must not infer this default is verified evidence.
- `POST /api/c2c/lots/:lotId/sale` — records a sale and payment state. The route currently applies default values to omitted or zero-valued cost inputs and updates the lot's single `saleRecord` field; callers must send complete non-zero breakdowns and confirm expected repeat-sale semantics with the backend owner.

### Known gaps versus a production contract

- No server quote-list route or confirmed live quote provider is present in `server.ts`; the frontend's sample quotes are fictional.
- No binary upload or real model inference is present in the screening route.
- The server stores users, lots, and histories in process memory, not a durable database.
- There is no dedicated readiness event route. The current proposal's `/api/v1/lots/...` routes are not implemented by this Express server.
- Existing errors are not consistently returned in the proposed `{ error: { code, message, retryable } }` envelope.
- Existing event history and frontend ledger shapes differ and require an agreed mapping before integration.

## Frontend adapter status

`src/services/cropToCashAdapter.ts` currently targets proposed `/api/v1` ledger, quotes, comparison, readiness, procurement, and sales routes. Those routes and response shapes do not match the current Express routes above. Keep `VITE_CROP_TO_CASH_API_ENABLED` unset/false; do not treat the adapter as production-integrated.

## Backend-owner decisions required

1. Confirm a canonical lot source shared by the existing app and crop-to-cash journey; do not silently create a duplicate lot to satisfy the workflow.
2. Replace process-memory records with durable storage, and confirm ownership/authentication across instances.
3. Approve a complete response/error schema and map existing timeline events to a stable append-only ledger.
4. Confirm real image upload/storage, retention, deletion, and model-inference behavior; keep the current demo-only screening clearly labelled until then.
5. Provide a quote endpoint and provenance/freshness/comparability rules, plus a comparison endpoint that accepts or explicitly rejects user-entered inputs.
6. Fix or document centre-verification defaults and zero-value sale-deduction handling; clarify sale updates versus append-only sale history.
7. Approve readiness and procurement transitions, including whether a visit can be distinct from a pending outcome.

Do not enable the frontend API adapter or claim persistence, diagnosis, live pricing, verified procurement, or confirmed payment until these decisions are implemented and validated against deployed responses.
