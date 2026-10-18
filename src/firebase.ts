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
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import rawFirebaseConfig from '../firebase-applet-config.json';
import {
  CropLot,
  Language,
  OnboardingStatus,
  UserRole,
  VerificationStatus,
} from './types/kisan';

const firebaseConfig = {
  projectId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) ||
    rawFirebaseConfig?.projectId ||
    'kisan-spo-demo',
  appId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) ||
    rawFirebaseConfig?.appId ||
    '1:demo:web:kisan',
  apiKey:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) ||
    rawFirebaseConfig?.apiKey ||
    'AIzaSyDemoKeyForKisanSpo',
  authDomain:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) ||
    rawFirebaseConfig?.authDomain ||
    'kisan-spo-demo.firebaseapp.com',
  firestoreDatabaseId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID) ||
    rawFirebaseConfig?.firestoreDatabaseId ||
    '(default)',
  storageBucket:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) ||
    rawFirebaseConfig?.storageBucket ||
    'kisan-spo-demo.firebasestorage.app',
  messagingSenderId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
    rawFirebaseConfig?.messagingSenderId ||
    '1234567890',
  measurementId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) ||
    rawFirebaseConfig?.measurementId ||
    '',
  oAuthClientId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_OAUTH_CLIENT_ID) ||
    rawFirebaseConfig?.oAuthClientId ||
    '',
  recaptchaSiteKey:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_RECAPTCHA_SITE_KEY) ||
    rawFirebaseConfig?.recaptchaSiteKey ||
    '',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { onAuthStateChanged };

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

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  return cleaned || 'default_id';
}

function sanitizeText(raw: string, maxLen: number, fallback: string): string {
  const trimmed = (raw || '').trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

function sanitizeOptionalText(raw: string | undefined, maxLen: number): string {
  return (raw || '').trim().slice(0, maxLen);
}

export interface FirestoreUserProfileData {
  uid: string;
  displayName: string;
  role: UserRole;
  villageOrOrg: string;
  village: string;
  district: string;
  state: string;
  preferredLanguage: Language;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  profileCompletion: number;
  isDemoAccount: boolean;
  demoDatasetVersion: string;
  email: string;
  phoneNumber: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'aashishbhumarkar888@gmail.com';

const activeSnapshotUnsubscribers = new Set<() => void>();
const inFlightProfilePromises = new Map<
  string,
  Promise<FirestoreUserProfileData>
>();

export function cleanupAllFirestoreSubscriptions(): void {
  activeSnapshotUnsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch {
      // Ignore cleanup error
    }
  });
  activeSnapshotUnsubscribers.clear();
}

export async function ensureFirestoreUserProfile(
  fbUser: FirebaseUser,
  defaultRole: UserRole = 'farmer',
  defaultVillageOrOrg: string = ''
): Promise<FirestoreUserProfileData> {
  const uid = sanitizeId(fbUser.uid);
  const existingPromise = inFlightProfilePromises.get(uid);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = ensureFirestoreUserProfileInternal(
    fbUser,
    uid,
    defaultRole,
    defaultVillageOrOrg
  ).finally(() => {
    inFlightProfilePromises.delete(uid);
  });

  inFlightProfilePromises.set(uid, promise);
  return promise;
}

export function computeProfileCompletionFromFields(params: {
  displayName?: string;
  role?: string;
  preferredLanguage?: string;
  village?: string;
  district?: string;
  state?: string;
  onboardingStatus?: OnboardingStatus;
}): number {
  let score = 0;
  if (params.displayName && params.displayName.trim().length > 0) {
    score += 25;
  }
  if (
    (params.role === 'farmer' ||
      params.role === 'agent' ||
      params.role === 'buyer' ||
      params.role === 'admin') &&
    (params.preferredLanguage === 'en' || params.preferredLanguage === 'hi')
  ) {
    score += 25;
  }
  if (
    Boolean(
      (params.village && params.village.trim()) ||
        (params.district && params.district.trim()) ||
        (params.state && params.state.trim())
    )
  ) {
    score += 25;
  }
  if (params.onboardingStatus === 'COMPLETED') {
    score += 25;
  }
  return Math.max(25, Math.min(100, score));
}

async function ensureFirestoreUserProfileInternal(
  fbUser: FirebaseUser,
  uid: string,
  defaultRole: UserRole = 'farmer',
  defaultVillageOrOrg: string = ''
): Promise<FirestoreUserProfileData> {
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
  let existingVillage = sanitizeOptionalText(defaultVillageOrOrg, 80);
  let existingDistrict = '';
  let existingState = '';
  let existingVillageOrOrg = sanitizeText(
    defaultVillageOrOrg || 'Unassigned Workspace',
    120,
    'Unassigned Workspace'
  );
  let existingLang: Language = 'en';
  let existingOnboardingStatus: OnboardingStatus = 'INCOMPLETE';
  let existingOnboardingStep = 1;
  let existingProfileCompletion = 50;
  let existingIsDemoAccount = false;
  let existingDemoVersion = '';
  let existingPhoneNumber = '';

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
        existingVillageOrOrg = sanitizeText(
          data.villageOrOrg,
          120,
          existingVillageOrOrg
        );
      }
      if (typeof data.village === 'string') {
        existingVillage = sanitizeOptionalText(data.village, 80);
      }
      if (typeof data.district === 'string') {
        existingDistrict = sanitizeOptionalText(data.district, 80);
      }
      if (typeof data.state === 'string') {
        existingState = sanitizeOptionalText(data.state, 80);
      }
      if (data.preferredLanguage === 'en' || data.preferredLanguage === 'hi') {
        existingLang = data.preferredLanguage;
      }
      if (
        data.onboardingStatus === 'INCOMPLETE' ||
        data.onboardingStatus === 'COMPLETED' ||
        data.onboardingStatus === 'SKIPPED'
      ) {
        existingOnboardingStatus = data.onboardingStatus;
      }
      if (typeof data.onboardingStep === 'number') {
        existingOnboardingStep = Math.max(
          1,
          Math.min(4, Math.round(data.onboardingStep))
        );
      }
      existingProfileCompletion = computeProfileCompletionFromFields({
        displayName: existingDisplayName,
        role: existingRole,
        preferredLanguage: existingLang,
        village: existingVillage,
        district: existingDistrict,
        state: existingState,
        onboardingStatus: existingOnboardingStatus,
      });
      existingIsDemoAccount = Boolean(data.isDemoAccount);
      existingDemoVersion = sanitizeOptionalText(data.demoDatasetVersion, 32);

      if (fbUser.emailVerified && fbUser.email) {
        try {
          const privSnap = await getDoc(privateRef);
          if (privSnap.exists()) {
            const pData = privSnap.data();
            existingPhoneNumber = sanitizeOptionalText(pData.phoneNumber, 24);
            await updateDoc(privateRef, {
              email: sanitizeText(fbUser.email, 254, 'user@kisan-spo.in'),
              phoneNumber: existingPhoneNumber,
              emailVerified: Boolean(fbUser.emailVerified),
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(privateRef, {
              uid,
              email: sanitizeText(fbUser.email, 254, 'user@kisan-spo.in'),
              phoneNumber: existingPhoneNumber,
              emailVerified: Boolean(fbUser.emailVerified),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, privateDocPath);
        }
      }
    } else if (fbUser.emailVerified) {
      existingProfileCompletion = computeProfileCompletionFromFields({
        displayName: existingDisplayName,
        role: existingRole,
        preferredLanguage: existingLang,
        village: existingVillage,
        district: existingDistrict,
        state: existingState,
        onboardingStatus: existingOnboardingStatus,
      });
      // Idempotent atomic batch creation for brand-new account
      const batch = writeBatch(db);
      batch.set(userRef, {
        uid,
        displayName: existingDisplayName,
        role: existingRole,
        villageOrOrg: existingVillageOrOrg,
        village: existingVillage,
        district: existingDistrict,
        state: existingState,
        preferredLanguage: existingLang,
        onboardingStatus: existingOnboardingStatus,
        onboardingStep: existingOnboardingStep,
        profileCompletion: existingProfileCompletion,
        isDemoAccount: false,
        demoDatasetVersion: '',
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
        phoneNumber: '',
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
    villageOrOrg: existingVillageOrOrg,
    village: existingVillage,
    district: existingDistrict,
    state: existingState,
    preferredLanguage: existingLang,
    onboardingStatus: existingOnboardingStatus,
    onboardingStep: existingOnboardingStep,
    profileCompletion: existingProfileCompletion,
    isDemoAccount: existingIsDemoAccount,
    demoDatasetVersion: existingDemoVersion,
    email: fbUser.email || 'user@kisan-spo.in',
    phoneNumber: existingPhoneNumber,
    emailVerified: Boolean(fbUser.emailVerified),
    isAdmin: isBootstrappedAdmin,
  };
}

export async function signInWithGoogle(
  preferredRole: UserRole = 'farmer',
  preferredVillageOrOrg: string = ''
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
  cleanupAllFirestoreSubscriptions();
  if (auth.currentUser) {
    await firebaseSignOut(auth);
  }
}

export async function updateFirestoreUserPreferences(
  updates: Partial<{
    displayName: string;
    role: UserRole;
    villageOrOrg: string;
    village: string;
    district: string;
    state: string;
    preferredLanguage: Language;
    onboardingStatus: OnboardingStatus;
    onboardingStep: number;
    profileCompletion: number;
    phoneNumber: string;
  }>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const uid = sanitizeId(currentUser.uid);
  const userDocPath = `users/${uid}`;
  const privateDocPath = `users/${uid}/private/info`;
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  try {
    let snap = await getDoc(userRef);
    if (!snap.exists()) {
      await ensureFirestoreUserProfile(
        currentUser,
        updates.role || 'farmer',
        updates.villageOrOrg || updates.village || ''
      );
      snap = await getDoc(userRef);
      if (!snap.exists()) return;
    }
    const current = snap.data();

    const nextDisplayName = sanitizeText(
      updates.displayName !== undefined && updates.displayName.trim()
        ? updates.displayName
        : current.displayName,
      120,
      'Kisan-SPO Member'
    );
    const nextRole: UserRole =
      updates.role === 'farmer' ||
      updates.role === 'agent' ||
      updates.role === 'buyer'
        ? updates.role
        : current.role === 'agent' || current.role === 'buyer'
        ? current.role
        : 'farmer';
    const nextLang: Language =
      updates.preferredLanguage === 'en' || updates.preferredLanguage === 'hi'
        ? updates.preferredLanguage
        : current.preferredLanguage === 'hi'
        ? 'hi'
        : 'en';
    const nextOnboardingStatus: OnboardingStatus =
      updates.onboardingStatus === 'INCOMPLETE' ||
      updates.onboardingStatus === 'COMPLETED' ||
      updates.onboardingStatus === 'SKIPPED'
        ? updates.onboardingStatus
        : current.onboardingStatus || 'INCOMPLETE';

    const nextVillage =
      updates.village !== undefined
        ? sanitizeOptionalText(updates.village, 80)
        : sanitizeOptionalText(current.village, 80);
    const nextDistrict =
      updates.district !== undefined
        ? sanitizeOptionalText(updates.district, 80)
        : sanitizeOptionalText(current.district, 80);
    const nextState =
      updates.state !== undefined
        ? sanitizeOptionalText(updates.state, 80)
        : sanitizeOptionalText(current.state, 80);

    const computedLocationLabel = [nextVillage, nextDistrict, nextState]
      .filter(Boolean)
      .join(', ');

    const nextVillageOrOrg = sanitizeText(
      updates.villageOrOrg ||
        computedLocationLabel ||
        current.villageOrOrg ||
        'Unassigned Workspace',
      120,
      'Unassigned Workspace'
    );

    const computedCompletion = computeProfileCompletionFromFields({
      displayName: nextDisplayName,
      role: nextRole,
      preferredLanguage: nextLang,
      village: nextVillage,
      district: nextDistrict,
      state: nextState,
      onboardingStatus: nextOnboardingStatus,
    });

    await updateDoc(userRef, {
      displayName: nextDisplayName,
      role: nextRole,
      villageOrOrg: nextVillageOrOrg,
      village: nextVillage,
      district: nextDistrict,
      state: nextState,
      preferredLanguage: nextLang,
      onboardingStatus: nextOnboardingStatus,
      onboardingStep: Math.max(
        1,
        Math.min(
          4,
          Math.round(updates.onboardingStep ?? current.onboardingStep ?? 1)
        )
      ),
      profileCompletion: computedCompletion,
      demoDatasetVersion: sanitizeOptionalText(current.demoDatasetVersion, 32),
      updatedAt: serverTimestamp(),
    });

    if (updates.phoneNumber !== undefined && currentUser.email) {
      try {
        await updateDoc(privateRef, {
          email: sanitizeText(currentUser.email, 254, 'user@kisan-spo.in'),
          phoneNumber: sanitizeOptionalText(updates.phoneNumber, 24),
          emailVerified: Boolean(currentUser.emailVerified),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, privateDocPath);
      }
    }
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
  const docId = sanitizeId(`${uid}_${lotId}`);
  const lotDocPath = `cropLots/${docId}`;
  const lotRef = doc(db, 'cropLots', docId);
  const statusToSave = newStatus || lot.verificationStatus;

  try {
    const snap = await getDoc(lotRef);
    if (!snap.exists()) {
      await setDoc(lotRef, {
        lotId,
        ownerId: uid,
        shortCode: sanitizeText(lot.shortCode, 32, '#KS-101'),
        farmerName: sanitizeText(lot.farmerName, 120, 'Kisan-SPO Grower'),
        cropName: sanitizeText(lot.cropName, 120, 'Sharbati Wheat'),
        variety: sanitizeText(lot.variety || 'Standard Grade', 120, 'Standard Grade'),
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
        shortCode: sanitizeText(lot.shortCode, 32, '#KS-101'),
        farmerName: sanitizeText(lot.farmerName, 120, 'Kisan-SPO Grower'),
        cropName: sanitizeText(lot.cropName, 120, 'Sharbati Wheat'),
        variety: sanitizeText(lot.variety || 'Standard Grade', 120, 'Standard Grade'),
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
  onLotsUpdated: (
    statusMap: Record<string, VerificationStatus>,
    personalLots: CropLot[]
  ) => void
): () => void {
  const safeUid = sanitizeId(uid);
  if (!auth.currentUser || sanitizeId(auth.currentUser.uid) !== safeUid) {
    return () => {};
  }

  cleanupAllFirestoreSubscriptions();

  const q = query(
    collection(db, 'cropLots'),
    where('ownerId', '==', safeUid)
  );
  const rawUnsub = onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, VerificationStatus> = {};
      const lots: CropLot[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.lotId && data.verificationStatus) {
          map[data.lotId] = data.verificationStatus as VerificationStatus;
          lots.push({
            id: String(data.lotId),
            shortCode: String(data.shortCode || '#KS-NEW'),
            farmerId: safeUid,
            farmerName: String(data.farmerName || 'Kisan-SPO Grower'),
            farmerNameHi: String(data.farmerName || 'किसान'),
            cropName: String(data.cropName || 'Sharbati Wheat'),
            cropNameHi: String(data.cropName || 'फसल'),
            variety: String(data.variety || 'Standard Grade'),
            varietyHi: String(data.variety || 'मानक किस्म'),
            grade: 'Grade A',
            quantityQuintals: Number(data.quantityQuintals) || 20,
            harvestDate: 'Oct 2026',
            plotAreaHectares: 2.0,
            surveyNumber: 'Personal Plot',
            verificationStatus: data.verificationStatus as VerificationStatus,
            evidenceIds: [`EV-${data.lotId}`],
            evidence: {
              id: `EV-${data.lotId}`,
              labName: 'Farmer Declared / Pending Lab Audit',
              certificateNumber: `PENDING-${String(data.lotId).slice(-4)}`,
              testedDate: 'Oct 2026',
              mrlStatus:
                data.verificationStatus === 'INDEPENDENTLY_VERIFIED' ||
                data.verificationStatus === 'LABORATORY_TESTED'
                  ? 'ZERO_EXCEEDANCE'
                  : 'SELF_DECLARED',
              sha256Hash: String(
                data.sha256Hash ||
                  '8f94e2c01a74b8c3a9f02d11e7d53c29a4f8b6c1d3e90a12b4c6d8e0f1a23f91'
              ),
              moisturePercent: 11.2,
              foreignMatterPercent: 0.8,
            },
            mandiPricePerQuintal: 1820,
            directBuyerPricePerQuintal: 2150,
          });
        }
      });
      onLotsUpdated(map, lots);
    },
    (error) => {
      // Ignore listener teardown errors after sign-out or account switch
      if (!auth.currentUser || sanitizeId(auth.currentUser.uid) !== safeUid) {
        return;
      }
      handleFirestoreError(error, OperationType.LIST, 'cropLots');
    }
  );

  const wrappedUnsub = () => {
    activeSnapshotUnsubscribers.delete(wrappedUnsub);
    try {
      rawUnsub();
    } catch {
      // Ignore
    }
  };
  activeSnapshotUnsubscribers.add(wrappedUnsub);
  return wrappedUnsub;
}
