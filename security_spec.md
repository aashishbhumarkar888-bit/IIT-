# Kisan-SPO Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Global Default-Deny**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity**: All writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **PII Split-Collection Isolation**: User email addresses are isolated in `/users/{userId}/private/{docId}` and may only be read or written by the document owner (`request.auth.uid == userId`) or a verified administrator (`isAdmin()`). Furthermore, the subcollection enforces the Master Gate check `exists(/databases/$(database)/documents/users/$(userId))`.
4. **No Self-Assigned Admin Privilege**: Regular users can only set `role` in `/users/{userId}` to `'farmer'`, `'agent'`, or `'buyer'`. Never `'admin'`.
5. **Strict Key & Size Boundaries**: Every entity enforces `hasAll` and `hasOnly` on creation, `affectedKeys().hasOnly(...)` on action-based updates, regex ID validation (`^[a-zA-Z0-9_\-]+$`), and maximum string lengths matching `firebase-blueprint.json`.
6. **Temporal & Ownership Immutability**: `createdAt`, `uid`, `ownerId`, and `lotId` are immutable on update; `createdAt` and `updatedAt` must equal `request.time`.
7. **Secure List Queries**: Every `allow list` rule restricts `resource.data` by owner (`resource.data.ownerId == request.auth.uid` or `resource.data.actorUid == request.auth.uid`) or `isAdmin()`, never delegating filtering to the client.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on UserProfile Create**: `{ uid: "u1", displayName: "Ramesh", role: "farmer", villageOrOrg: "Khandwa", preferredLanguage: "en", isAdmin: true, createdAt: request.time, updatedAt: request.time }` -> Rejected by `hasOnly`.
2. **Privilege Escalation Role Value (`role: "admin"`)**: `{ uid: "u1", displayName: "Ramesh", role: "admin", villageOrOrg: "Khandwa", preferredLanguage: "en", createdAt: request.time, updatedAt: request.time }` -> Rejected by `data.role in ['farmer', 'agent', 'buyer']`.
3. **Identity Spoofing on UserProfile Create (`uid != request.auth.uid`)**: Authenticated as `u1`, writing `/users/u2` with `uid: "u2"` -> Rejected by `isOwner(userId)` and `data.uid == request.auth.uid`.
4. **Unverified Email Spoof Attack on Admin**: Authenticated with `email: "aashishbhumarkar888@gmail.com"` but `email_verified: false` -> Rejected by `request.auth.token.email_verified == true`.
5. **Cross-User PII Read on `/users/u2/private/info`**: Authenticated as `u1` (`u1 != u2`, non-admin) attempting `get` on `/users/u2/private/info` -> Rejected by `isOwner(userId) || isAdmin()`.
6. **Orphaned Subcollection Write on `/users/u1/private/info`**: Writing private info when parent `/users/u1` does not exist -> Rejected by Master Gate `exists(/databases/$(database)/documents/users/$(userId))`.
7. **ID Poisoning Attack**: Creating `/cropLots/bad$id!with/slashes` or 500-char ID -> Rejected by `isValidId(lotId)`.
8. **Denial-of-Wallet Oversized String**: Updating `displayName` with a 10,000-character string -> Rejected by `data.displayName.size() <= 120`.
9. **Immortal Field Mutation (`createdAt` or `ownerId`)**: Updating `/cropLots/KS-MP-2025-089` with a modified `ownerId` or `createdAt` -> Rejected by `incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`.
10. **Client-Forged Timestamp**: Creating `/cropLots/KS-MP-2025-089` with `createdAt: timestamp.date(2020, 1, 1)` -> Rejected by `incoming().createdAt == request.time`.
11. **Unauthorized Blanket List Scraping on `/cropLots`**: Authenticated user `u1` executing an unconstrained `list` across all users' crop lots -> Rejected unless `resource.data.ownerId == request.auth.uid || isAdmin()`.
12. **Audit Log Tampering (Update/Delete)**: Attempting to `update` or `delete` `/auditLogs/{logId}` -> Rejected (`allow update, delete: if false;`).
