/**
 * Firestore Security Rules Verification Specification (Dirty Dozen Test Suite)
 * Verifies that all 12 adversarial payloads defined in security_spec.md are denied.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on UserProfile Create',
    collectionPath: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'ramesh@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Ramesh Patel',
      role: 'farmer',
      villageOrOrg: 'Khandwa',
      preferredLanguage: 'en',
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Role Escalation',
    collectionPath: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'ramesh@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Ramesh Patel',
      role: 'admin',
      villageOrOrg: 'Khandwa',
      preferredLanguage: 'en',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on UserProfile Create',
    collectionPath: '/users/user_2',
    operation: 'create',
    auth: { uid: 'user_1', email: 'ramesh@example.com', email_verified: true },
    payload: {
      uid: 'user_2',
      displayName: 'Spoofed Name',
      role: 'farmer',
      villageOrOrg: 'Khandwa',
      preferredLanguage: 'en',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified Email Spoof Attack on Bootstrapped Admin',
    collectionPath: '/admins/spoof_uid',
    operation: 'get',
    auth: {
      uid: 'spoof_uid',
      email: 'aashishbhumarkar888@gmail.com',
      email_verified: false,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-User PII Read on Isolated Private Subcollection',
    collectionPath: '/users/user_2/private/info',
    operation: 'get',
    auth: { uid: 'user_1', email: 'ramesh@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Subcollection Write Without Parent User Doc',
    collectionPath: '/users/non_existent_user/private/info',
    operation: 'create',
    auth: {
      uid: 'non_existent_user',
      email: 'ghost@example.com',
      email_verified: true,
    },
    payload: {
      uid: 'non_existent_user',
      email: 'ghost@example.com',
      emailVerified: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'ID Poisoning with Invalid Characters',
    collectionPath: '/cropLots/invalid$id!99',
    operation: 'create',
    auth: { uid: 'user_1', email: 'ramesh@example.com', email_verified: true },
    payload: {
      lotId: 'invalid$id!99',
      ownerId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Denial-of-Wallet Oversized String Payload',
    collectionPath: '/users/user_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'ramesh@example.com', email_verified: true },
    payload: {
      displayName: 'A'.repeat(1024),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immortal Field Mutation (ownerId modification)',
    collectionPath: '/cropLots/KS-MP-2025-089',
    operation: 'update',
    auth: { uid: 'user_1', email: 'ramesh@example.com', email_verified: true },
    payload: {
      ownerId: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client-Forged Past Timestamp on Create',
    collectionPath: '/cropLots/KS-MP-2025-089',
    operation: 'create',
    auth: { uid: 'user_1', email: 'ramesh@example.com', email_verified: true },
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unconstrained List Query Scraping Across Other Users Lots',
    collectionPath: '/cropLots',
    operation: 'list',
    auth: { uid: 'user_1', email: 'ramesh@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Immutable Audit Log Tampering (Delete)',
    collectionPath: '/auditLogs/log_001',
    operation: 'delete',
    auth: {
      uid: 'admin_1',
      email: 'aashishbhumarkar888@gmail.com',
      email_verified: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
