# Kisan-SPO / KisanSetu AI Acceptance Checklist

Updated: 2026-10-18. Evidence is limited to the inspected source, test results, and explicitly noted browser checks. `VERIFIED` means that the stated behavior was exercised, not that the whole module is production-ready.

## PPT requirements

| Requirement | Status | Evidence |
|---|---|---|
| PPT-specific screens, wording, and acceptance criteria | BLOCKED | The provided implementation brief refers to PPT requirements but does not include the deck or enumerate its requirements. No PPT-specific behavior is inferred. |

## Additional Kisan-SPO prototype requirements

| Requirement | Status | Evidence |
|---|---|---|
| Preserve existing React/TypeScript/Vite application and navigation | IMPLEMENTED — UNVERIFIED | Existing stack retained; route and app-shell changes are in `src/App.tsx` and `src/components/AppShell.tsx`; production build must pass after this documentation/test repair. |
| Google/email authentication and server session flows | IN PROGRESS | Existing auth and expiry tests are present; Firebase server-token verification and account-switch race behavior are not established. |
| Role-specific dashboards and isolated demo personas | IN PROGRESS | Existing dashboard/context code remains; a full persona/account-isolation browser regression has not been run for this milestone. |
| Four-step onboarding route | IMPLEMENTED — UNVERIFIED | `/onboarding` renders the existing wizard in `src/App.tsx`; profile persistence/completion behavior has not been browser-tested here. |
| One canonical lot ID shared across passport, screening, compare, procurement, and sale | BLOCKED | Existing selected lots and the `/api/c2c` server lot map are not confirmed to share a durable canonical record; automatic duplicate creation is not safe. |
| Detect image selection, format/size feedback, and local preview | IMPLEMENTED — UNVERIFIED | `src/pages/CropToCashPage.tsx` validates image MIME/size and previews locally; image upload and screening are not implemented there. |
| Real screening results, uncertainty/unsupported handling, safe guidance, and referral | BLOCKED | Current server endpoint accepts metadata only and returns mock/demo screening; no real image inference is present. |
| Clearly distinguish demo from real screening | IMPLEMENTED — UNVERIFIED | UI copy states local preview only; backend mock labels exist in `src/services/cropToCashService.ts`. |
| Exact 50-qtl comparison fixture and downside arithmetic | VERIFIED | `tests/crop-to-cash.test.js` and `tests/crop-to-cash-calculations.test.js` assert the required values: ₹1,26,750; ₹1,11,000; ₹1,13,500; downside ₹1,12,500. |
| Demo comparison records an event for the same lot | VERIFIED | `tests/crop-to-cash-adapter.test.js` checks fixture result, event identity, and lot association. |
| Live, fresh, comparable FCI/mandi/buyer quotes and warning states | BLOCKED | No server quote-list route/provider is present; current quotes are a fictional fixture. |
| Backend-authoritative calculation for user-entered quantity and costs | BLOCKED | Server estimate route ignores the UI's custom inputs; current API adapter targets unimplemented `/api/v1` paths. |
| Boolean-only readiness UI | IMPLEMENTED — UNVERIFIED | Readiness checkboxes are present in `src/pages/CropToCashPage.tsx`; persistence and end-to-end behavior are not verified. |
| Procurement attempt states, centre verification, timestamps, and reasons | IMPLEMENTED — UNVERIFIED | Demo UI and `/api/c2c` route exist, but API schemas/defaults differ; omitted centre verification currently defaults to true on the server. |
| Sale quantity, price, deductions, net, and estimate-versus-actual display | IMPLEMENTED — UNVERIFIED | Demo sale form is present; production sale semantics and zero/default deduction behavior are unsafe/unconfirmed. |
| Payment status reflects a real provider transaction | BLOCKED | UI and server state fields are not evidence of an actual payment integration. |
| Demo ledger/history is clearly memory-only; production event history is durable | BLOCKED | Mock adapter is memory-only; backend lot/history storage is process-local and frontend `/api/v1` ledger endpoints are not implemented. |
| API schema validation and explicit error handling | VERIFIED | `tests/crop-to-cash-adapter.test.js` covers malformed responses and server errors; current adapter's routes remain incompatible with the server. |
| English/Hindi coverage for the complete workflow | IN PROGRESS | Main workflow labels are translated; full copy coverage and Hindi browser review remain incomplete. |
| Keyboard, screen-reader, dialog focus, and reduced-motion behavior | IN PROGRESS | Some existing ARIA/live-region patterns are present; no complete accessibility audit or automated coverage has been run. |
| Mobile layout without horizontal overflow | VERIFIED | Prior browser check at 390px found body `scrollWidth` equal to `clientWidth`; recheck after future layout changes. |
| Offline queue and synchronization indicators backed by real sync | NOT STARTED | No verified local queue/sync behavior is present; no offline/synced state should be claimed. |
| Dashboard/passport/advisory/payment/admin modules remain connected and truthful | IN PROGRESS | Existing modules were retained and Crop-to-Cash entry points added; full regression and simulation-label review remain outstanding. |
| Unit, production-build, and local C2C API integration commands | VERIFIED | `npm test`: 17 passed, 0 failed, 1 skipped; `npm run build` passed; `npm run test:integration` passed against an isolated local server. |
| Whole-project TypeScript check | BLOCKED | `npm run lint` reports unresolved `ProcurementAttempt` and `SaleRecord` names in backend-owned `server.ts`; no backend implementation was changed. |
| Local C2C API sequence from registration through screening, estimate, attempt, sale, and history | VERIFIED | `npm run test:integration` passed against a fresh local server; the test exercises source-level routes and process-memory/demo behavior only, not production durability. |
| Production service deployment, data durability, and 10x capacity are proven | BLOCKED | Source-level routes and local tests do not establish hosting configuration, durable storage, quotas, or deployed capacity. |
