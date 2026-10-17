import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CropLot, Language, UserRole, VerificationStatus } from './types/kisan';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { onAuthStateChanged };

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Defensive payload sanitization matching firebase-blueprint.json maxLength & pattern constraints
function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  return cleaned || 'default_id';
}

function sanitizeText(raw: string, maxLen: number, fallback: string): string {
  const trimmed = (raw || '').trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

export interface FirestoreUserProfileData {
  uid: string;
  displayName: string;
  role: UserRole;
  villageOrOrg: string;
  preferredLanguage: Language;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'aashishbhumarkar888@gmail.com';

export async function ensureFirestoreUserProfile(
  fbUser: FirebaseUser,
  defaultRole: UserRole = 'farmer',
  defaultVillageOrOrg: string = 'Khandwa Cluster'
): Promise<FirestoreUserProfileData> {
  const uid = sanitizeId(fbUser.uid);
  const userDocPath = `users/${uid}`;
  const privateDocPath = `users/${uid}/private/info`;
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  let existingRole: UserRole = defaultRole;
  let existingDisplayName = sanitizeText(
    fbUser.displayName || fbUser.email?.split('@')[0] || 'Kisan-SPO Member',
    120,
    'Kisan-SPO Member'
  );
  let existingVillage = sanitizeText(
    defaultVillageOrOrg,
    120,
    'Khandwa Cluster'
  );
  let existingLang: Language = 'en';

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (
        data.role === 'farmer' ||
        data.role === 'agent' ||
        data.role === 'buyer'
      ) {
        existingRole = data.role;
      }
      if (typeof data.displayName === 'string' && data.displayName.trim()) {
        existingDisplayName = sanitizeText(
          data.displayName,
          120,
          existingDisplayName
        );
      }
      if (typeof data.villageOrOrg === 'string' && data.villageOrOrg.trim()) {
        existingVillage = sanitizeText(
          data.villageOrOrg,
          120,
          existingVillage
        );
      }
      if (data.preferredLanguage === 'en' || data.preferredLanguage === 'hi') {
        existingLang = data.preferredLanguage;
      }

      // Update private PII login timestamp if verified
      if (fbUser.emailVerified && fbUser.email) {
        try {
          const privSnap = await getDoc(privateRef);
          if (privSnap.exists()) {
            await updateDoc(privateRef, {
              email: sanitizeText(fbUser.email, 254, 'user@kisan-spo.in'),
              emailVerified: Boolean(fbUser.emailVerified),
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(privateRef, {
              uid,
              email: sanitizeText(fbUser.email, 254, 'user@kisan-spo.in'),
              emailVerified: Boolean(fbUser.emailVerified),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, privateDocPath);
        }
      }
    } else if (fbUser.emailVerified) {
      // Atomic batch creation of /users/{uid} and /users/{uid}/private/info
      const batch = writeBatch(db);
      batch.set(userRef, {
        uid,
        displayName: existingDisplayName,
        role: existingRole,
        villageOrOrg: existingVillage,
        preferredLanguage: existingLang,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(privateRef, {
        uid,
        email: sanitizeText(
          fbUser.email || 'user@kisan-spo.in',
          254,
          'user@kisan-spo.in'
        ),
        emailVerified: Boolean(fbUser.emailVerified),
        updatedAt: serverTimestamp(),
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, userDocPath);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userDocPath);
  }

  const isBootstrappedAdmin =
    Boolean(fbUser.emailVerified) &&
    fbUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;

  return {
    uid,
    displayName: existingDisplayName,
    role: existingRole,
    villageOrOrg: existingVillage,
    preferredLanguage: existingLang,
    email: fbUser.email || 'user@kisan-spo.in',
    emailVerified: Boolean(fbUser.emailVerified),
    isAdmin: isBootstrappedAdmin,
  };
}

export async function signInWithGoogle(
  preferredRole: UserRole = 'farmer',
  preferredVillageOrOrg: string = 'Khandwa Cluster'
): Promise<FirestoreUserProfileData> {
  const credential = await signInWithPopup(auth, googleProvider);
  const profile = await ensureFirestoreUserProfile(
    credential.user,
    preferredRole,
    preferredVillageOrOrg
  );
  await recordFirestoreAuditEvent(
    profile.isAdmin ? 'admin' : profile.role,
    'GOOGLE_FIREBASE_SIGN_IN',
    profile.uid,
    `Authenticated via Google Sign-In (${profile.email})`,
    'SUCCESS'
  );
  return profile;
}

export async function signOutFromFirebase(): Promise<void> {
  if (auth.currentUser) {
    await firebaseSignOut(auth);
  }
}

export async function updateFirestoreUserPreferences(
  updates: Partial<{
    displayName: string;
    role: UserRole;
    villageOrOrg: string;
    preferredLanguage: Language;
  }>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const uid = sanitizeId(currentUser.uid);
  const userDocPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const current = snap.data();

    await updateDoc(userRef, {
      displayName: sanitizeText(
        updates.displayName ?? current.displayName,
        120,
        'Kisan-SPO Member'
      ),
      role: updates.role ?? current.role ?? 'farmer',
      villageOrOrg: sanitizeText(
        updates.villageOrOrg ?? current.villageOrOrg,
        120,
        'Khandwa Cluster'
      ),
      preferredLanguage:
        updates.preferredLanguage ?? current.preferredLanguage ?? 'en',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userDocPath);
  }
}

export async function saveCropLotToFirestore(
  lot: CropLot,
  newStatus?: VerificationStatus
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const uid = sanitizeId(currentUser.uid);
  const lotId = sanitizeId(lot.id);
  const lotDocPath = `cropLots/${lotId}`;
  const lotRef = doc(db, 'cropLots', lotId);
  const statusToSave = newStatus || lot.verificationStatus;

  try {
    const snap = await getDoc(lotRef);
    if (!snap.exists()) {
      await setDoc(lotRef, {
        lotId,
        ownerId: uid,
        shortCode: sanitizeText(lot.shortCode, 32, '#KS-089'),
        farmerName: sanitizeText(lot.farmerName, 120, 'Ramesh Patel'),
        cropName: sanitizeText(lot.cropName, 120, 'Sharbati Wheat'),
        quantityQuintals: Math.max(
          1,
          Math.min(100000, Number(lot.quantityQuintals) || 25)
        ),
        verificationStatus: statusToSave,
        sha256Hash: sanitizeText(
          lot.evidence.sha256Hash,
          128,
          '8f94e2c01a74b8c3a9f02d11e7d53c29a4f8b6c1d3e90a12b4c6d8e0f1a23f91'
        ),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(lotRef, {
        verificationStatus: statusToSave,
        quantityQuintals: Math.max(
          1,
          Math.min(100000, Number(lot.quantityQuintals) || 25)
        ),
        sha256Hash: sanitizeText(
          lot.evidence.sha256Hash,
          128,
          '8f94e2c01a74b8c3a9f02d11e7d53c29a4f8b6c1d3e90a12b4c6d8e0f1a23f91'
        ),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, lotDocPath);
  }
}

export async function recordFirestoreAuditEvent(
  actorRole: 'farmer' | 'agent' | 'buyer' | 'admin',
  action: string,
  target: string,
  reason: string,
  status: 'SUCCESS' | 'DENIED' | 'WARNING' = 'SUCCESS'
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const uid = sanitizeId(currentUser.uid);
  const logId = sanitizeId(`LOG-${Date.now()}-${uid.slice(0, 6)}`);
  const logDocPath = `auditLogs/${logId}`;
  const logRef = doc(db, 'auditLogs', logId);

  try {
    await setDoc(logRef, {
      actorUid: uid,
      actorRole,
      action: sanitizeText(action, 80, 'SYSTEM_EVENT'),
      target: sanitizeText(target, 128, 'WORKSPACE'),
      reason: sanitizeText(reason, 500, 'Operational action recorded'),
      status,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, logDocPath);
  }
}

export function subscribeToUserCropLots(
  uid: string,
  onLotsUpdated: (statusMap: Record<string, VerificationStatus>) => void
): () => void {
  const safeUid = sanitizeId(uid);
  const q = query(
    collection(db, 'cropLots'),
    where('ownerId', '==', safeUid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, VerificationStatus> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.lotId && data.verificationStatus) {
          map[data.lotId] = data.verificationStatus as VerificationStatus;
        }
      });
      onLotsUpdated(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cropLots');
    }
  );
}
