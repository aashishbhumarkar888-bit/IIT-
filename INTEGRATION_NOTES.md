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