# Kisan-SPO × KisanSetu AI API Contract — Proposal

**Status: DRAFT — not approved by the backend owner.**  
This proposal is not evidence that these endpoints exist. Frontend production integration must wait for backend agreement.

## Shared requirements

- Base path: `/api/v1`.
- Authentication: Firebase ID token in `Authorization: Bearer <idToken>`. The backend verifies it; the authenticated UID determines ownership. Never trust a client-supplied owner ID or role.
- JSON responses use ISO-8601 UTC timestamps and the canonical lot ID across screening, quotes, procurement, and sale records.
- Errors: `{ "error": { "code": string, "message": string, "retryable": boolean } }`; use standard HTTP status codes. Return `401` for missing/expired identity, `403` for forbidden ownership/action, `404` for missing resources, `409` for conflicting transitions, `422` for validation failures, and `503` for temporary service failure.
- Unknown/unavailable live data must be reported as unavailable, never substituted with fictional live-looking values.

## Proposed resources

### Lots and ledger

- `GET /lots` — list lots owned by the authenticated UID; optional `cursor` and `pageSize`.
- `POST /lots` — create a lot from `{ crop, variety?, grade?, quantityQtl, harvestDate?, documentReadiness? }`. The server assigns one immutable `lotId`. Readiness fields are booleans only; no Aadhaar, passbook, or land-document images/data.
- `GET /lots/{lotId}` — return an owned lot.
- `GET /lots/{lotId}/ledger` — return chronologically ordered ledger events for that owned lot. Every event has `eventId`, `lotId`, `type`, `occurredAt`, `source`, `verification`, and its typed payload.
- `POST /lots/{lotId}/readiness` — append a readiness yes/no event. Accept only a readiness item key and boolean; never accept identity-document numbers or images.

### Image screening

- Backend to confirm the storage mechanism before implementation. Preferred flow: `POST /lots/{lotId}/screenings/upload` returns a short-lived, scoped upload URL and object key; the client uploads directly to approved object storage; `POST /lots/{lotId}/screenings` submits `{ objectKey }` for analysis.
- Screening result: `{ screeningId, lotId, status, topResult?, runnerUp?, confidence?, confidenceBand?, explanation?, guidance?, expertReferral?, explanationImageUrl?, source, createdAt }`.
- `status` is `COMPLETED | UNCERTAIN | UNSUPPORTED | REJECTED | PROCESSING | FAILED`. Only return diagnosis/guidance when produced by the model service. No pesticide recommendations from image screening alone.

### Selling options

- `GET /lots/{lotId}/quotes` — return comparable `FCI_MSP_REFERENCE | MANDI | DIRECT_BUYER` quotes, each with price, commodity, grade, market/date, source, timestamp, freshness, and provenance `VERIFIED | ESTIMATED | CACHED | MANUAL | DEMO`.
- `POST /lots/{lotId}/comparisons` — calculate options from quantity, price, transport, loading, fees, quality deductions, and extra trip costs; append the inputs/results to the lot ledger. Response includes each option's estimated net, downside, calculation version, and confirmed ledger event. Rounding and formulas require backend confirmation against the four fixtures in the product prompt.

### Procurement and sale

- `POST /lots/{lotId}/procurement-attempts` — append a selected-option/state event `PLANNED | VISITED | PENDING | REJECTED | RESCHEDULED | NOT_COMPLETED`. Centre/schedule are optional and must include approved verification metadata.
- `POST /lots/{lotId}/sales` — append sale quantity, agreed price, deductions, actual net, payment status, provenance, and the referenced comparison/attempt. Do not overwrite prior events.

## Open questions for backend-owner approval

1. Confirm Firebase ID-token verification and ownership enforcement for every route.
2. Confirm Cloud Storage (or provider equivalent) and the upload URL flow, size/content limits, retention, and deletion rules.
3. Confirm exact field names, status transitions, pagination, rate freshness thresholds, and rounding behavior.
4. Confirm which endpoints will be implemented and deployed, and provide sample responses/error cases.