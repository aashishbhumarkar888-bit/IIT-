# Kisan-SPO — Authentication, Onboarding & Demo Account Guide

## 1. Three Distinct User Experiences

Kisan-SPO distinguishes between three authenticated account states:

1. **Experience A — Brand-New Registered User (`onboardingStatus: 'INCOMPLETE'`)**
   - Receives a clean, personal profile associated with their unique UID (`Firebase Auth` or server session).
   - Guided through the 4-Step Onboarding Wizard (`/onboarding`) with saved step-by-step progress.
   - Lands on the **Simplified Personal Workspace** on `/dashboard` with genuine empty states (`My Crops`, `Buyer Offers`, `Payments`) and a primary action (`Add your first crop` / `Set up your first pickup` / `Explore available crop lots`).
   - Does **not** display another farmer's private crops, pickups, or global escrow totals as personal user data.

2. **Experience B — Seeded Demo User (`isDemoAccount: true`)**
   - Dedicated demonstration farmer account: **Ramesh Patel** (`ramesh.patel@kisan-spo.in`).
   - Pre-populated with coherent, isolated demonstration data (`KS-MP-2025-089`, `KS-2025-0124`, `KS-MP-2025-104`, buyer bids, weighbridge telemetry, and 50-50 split escrow milestones).
   - Clearly labeled with a **Demo Profile • Sample Data** badge and banner across views, with a **Reset Demo Data** action that safely resets only the demo dataset.

3. **Experience C — Returning Authenticated User (`onboardingStatus: 'COMPLETED'`, `isDemoAccount: false`)**
   - Restores the user's saved display name, role preference, preferred language, location, and personal crop lots from Cloud Firestore (`/users/{uid}` and `/cropLots`) and backend storage without repeating the onboarding wizard.

## 2. Authentication Methods

- **Primary Production Auth**: **Google Sign-In with Firebase Authentication** (`signInWithPopup`) backed by **Cloud Firestore** (`/users/{userId}`, isolated PII vault `/users/{userId}/private/info`, `/cropLots/{lotId}`, `/auditLogs/{logId}`).
- **Server API tokens**: Signed tokens are stateless and expire 15 minutes after issue. Set `KISAN_SESSION_SECRET` to the same random value (at least 32 characters) on every production instance. Logout clears the browser's token and signs out of Firebase; a copied server token cannot be revoked immediately and remains valid only until its expiry.
- **Local Development / Evaluation Accounts**: When running in local development mode (`devDemoMode: true`), quick-fill buttons on `/login` allow testing all three experiences:
  - **Demo Farmer (Experience B)**: `ramesh.patel@kisan-spo.in`
  - **Returning Farmer (Experience C)**: `suresh.kumar@kisan-spo.in` (has 1 saved personal Soybean lot `#KS-0124`)
  - **Fresh New User (Experience A)**: `anita.verma@kisan-spo.in` (incomplete onboarding, 0 personal crops)
  - **Administrator Console (`/admin`, `Ctrl + Shift + A`)**: `aashishbhumarkar888@gmail.com` (via Google Sign-In) or `registrar.admin@kisan-spo.org.in` in local dev mode.
