# Frontend Audit — 2026-10-18

## Baseline

| Area | Status | Evidence / limitation |
|---|---|---|
| Stack and build | Present | React 19, TypeScript, Tailwind v4, Vite; build and TypeScript check pass. |
| Authentication | Partial | Google Firebase Auth, server credential/demo flows, role-based admin UI exist. Backend users and signed-token identity lookup are process-local; no server Firebase ID-token verification confirmed. |
| Onboarding | Partial | `OnboardingWizard` exists and `/onboarding` now renders it. Profile completion and authoritative persistence still need backend verification. |
| Crop lots / passport | Partial | Add-lot UI and server endpoints exist; browser has Firestore profile/lot helpers and a listener. Some views use sample `CROP_LOTS`; backend-created records and Firestore data are not consistently one authoritative persistent source. |
| Detect / advisory | Demo only | Crop-to-cash flow accepts a validated image for local preview only; it does not upload or diagnose. No real screening endpoint or model-result contract is confirmed. |
| Compare | Demo; API behind explicit flag | New same-lot FCI/MSP reference, mandi, and direct-buyer comparison shows provenance and freshness, validates inputs, and records demo comparison events in the in-memory mock ledger. API mode posts comparisons and displays backend-confirmed results only after a valid response. Its endpoints remain unapproved/unverified. |
| Procurement / sale ledger | Demo; API behind explicit flag | Crop-to-cash UI appends readiness, procurement, and sale events through a typed adapter. Mock events are memory-only. Production persistence requires deployed, approved backend routes. |
| Localization and accessibility | Partial | New workflow includes EN/HI labels and mobile-width checks; broader keyboard, screen-reader, reduced-motion, and bilingual content audits remain outstanding. |
| API integration contract | Blocked | `API_CONTRACT.md` remains a proposal. The typed client is feature-flagged off by default; no new endpoint is assumed deployed or approved. |

## Baseline checks

- Baseline before implementation: `npm test` 7 passed, 0 failed, 1 skipped; lint/build passed with the existing Vite large-chunk warning.
- Current: `npm test` 15 passed, 0 failed, 1 skipped; `npm run lint` passed; `npm run build` passed with the existing Vite configuration and large-chunk warnings; `git diff --check` passed. The skipped cross-instance auth test requires explicit second-instance/account environment.

## Work completed in this audit

- Read the existing shared contract/integration/status files (they were empty), package scripts, routes, core context/types/services, and advisory, market, passport, dashboard, and payment screens.
- Added a clearly marked draft API proposal and recorded verified integration boundaries.
- Added the `/crop-to-cash` same-lot Detect → Compare → Complete demo workflow, an isolated mock adapter and feature-flagged API adapter, and exact fixture/adapter tests. The comparison action now uses the adapter's `recordComparison` operation; production results are not presented as confirmed until the server response validates and matches the current input.
- Fixed `/onboarding` route rendering and added Crop-to-Cash entry points from the dashboard and app navigation.
- The image remains preview-only; no diagnosis, upload, real-time quote, or server persistence is claimed.

## Remaining

1. Get the backend owner to approve/amend `API_CONTRACT.md` and answer the open storage/auth/calculation questions in `INTEGRATION_NOTES.md`; verify endpoints are deployed before enabling API mode.
2. Implement approved image upload/screening and persistent lot/ledger storage; current image and demo data are not persisted.
3. Verify all bilingual, keyboard, screen-reader, and reduced-motion states and expand browser/component coverage.