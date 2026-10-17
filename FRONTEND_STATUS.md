# Frontend Audit — 2026-10-18

## Baseline

| Area | Status | Evidence / limitation |
|---|---|---|
| Stack and build | Present; partial validation | React 19, TypeScript, Tailwind v4, Vite; production build passes. `npm run lint` currently fails on missing `ProcurementAttempt` and `SaleRecord` names in backend-owned `server.ts`. |
| Authentication | Partial | Google Firebase Auth, server credential/demo flows, role-based admin UI exist. Backend users and signed-token identity lookup are process-local; no server Firebase ID-token verification confirmed. |
| Onboarding | Partial | `OnboardingWizard` exists and `/onboarding` now renders it. Profile completion and authoritative persistence still need backend verification. |
| Crop lots / passport | Partial | Add-lot UI and server endpoints exist; browser has Firestore profile/lot helpers and a listener. Some views use sample `CROP_LOTS`; backend-created records and Firestore data are not consistently one authoritative persistent source. |
| Detect / advisory | Demo only | Crop-to-cash flow accepts a validated image for local preview only; it does not upload or diagnose. No real screening endpoint or model-result contract is confirmed. |
| Compare | Demo only; integration blocked | The UI shows fictional FCI/MSP reference, mandi, and direct-buyer comparisons and records mock comparison events in memory. The server has an estimate route, but it ignores the UI's custom quantity/cost inputs; no live quote route exists. The draft API adapter targets different, unimplemented `/api/v1` endpoints and must remain disabled. |
| Procurement / sale ledger | Demo only; integration blocked | The UI records local mock readiness, procurement, and sale events. Server routes exist under `/api/c2c`, but their schemas differ from the draft adapter; backend state is process-memory, and verification/default/update semantics need correction before use. |
| Localization and accessibility | Partial | New workflow includes EN/HI labels and mobile-width checks; broader keyboard, screen-reader, reduced-motion, and bilingual content audits remain outstanding. |
| API integration contract | Blocked | Current Express routes and draft frontend adapter use incompatible paths/shapes. `API_CONTRACT.md` and `INTEGRATION_NOTES.md` now document the actual source-level routes and the gaps. The typed client remains feature-flagged off. |

## Baseline checks

- Baseline before implementation: `npm test` 7 passed, 0 failed, 1 skipped; lint/build passed with the existing Vite large-chunk warning.
- Current: `npm test` 17 passed, 0 failed, 1 skipped; `npm run test:integration` 1 passed against an isolated local server; `npm run build` passed with existing Vite config/large-chunk warnings; `git diff --check` passed. `npm run lint` fails on two unresolved backend-owned names in `server.ts` (`ProcurementAttempt`, `SaleRecord`); that backend file was not changed. The skipped cross-instance auth test requires explicit second-instance/account environment.

## Work completed in this audit

- Read the shared API/integration/status files, relevant C2C routes, adapter, workflow screen, and focused tests.
- Reconciled committed merge-conflict text in package scripts and shared API/integration documentation; recorded the actual source-level routes and their limitations.
- Added a separate `test:integration` script so the end-to-end API test can run against an explicitly started local server without making the default unit-test command depend on a running server.
- Added the `/crop-to-cash` same-lot Detect → Compare → Complete demo workflow, an isolated mock adapter and feature-flagged API adapter, and exact fixture/adapter tests. The comparison action now uses the adapter's `recordComparison` operation; production results are not presented as confirmed until the server response validates and matches the current input.
- Fixed `/onboarding` route rendering and added Crop-to-Cash entry points from the dashboard and app navigation.
- Kept the `/api/v1` adapter disabled because it does not match the current `/api/c2c` server routes.
- The image remains preview-only; no diagnosis, upload, real-time quote, or server persistence is claimed.

## Remaining

1. Agree a canonical, durable lot source and approve a frontend-compatible API; current C2C server data is in memory and route schemas do not match the adapter.
2. Have the backend owner resolve the two TypeScript errors in `server.ts`, then rerun the project type-check.
3. Add real image upload/screening and live quote provenance only after contract approval; finish bilingual, keyboard, screen-reader, reduced-motion, procurement, and sale browser tests.