import { User as FirebaseUser } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppRoute,
  AuthenticatedUser,
  ProfileUpdatePayload,
  useKisan,
} from '../context/KisanContext';
import {
  auth,
  cleanupAllFirestoreSubscriptions,
  ensureFirestoreUserProfile,
  onAuthStateChanged,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutFromFirebase,
  subscribeToUserCropLots,
} from '../firebase';
import { CropLot, Language, UserRole, VerificationStatus } from '../types/kisan';

const SESSION_TOKEN_STORAGE_KEY = 'kisan_spo_session_token';

const PUBLIC_AUTH_ROUTES: AppRoute[] = [
  '/login',
  '/signup',
  '/forgot-password',
];

const PROTECTED_APP_ROUTES: AppRoute[] = [
  '/onboarding',
  '/dashboard',
  '/advisory',
  '/crop-passport',
  '/market-comparison',
  '/harvest-payments',
  '/profile',
  '/showcase',
  '/admin',
];

export type ProfileLifecycleStatus =
  | 'IDLE'
  | 'LOADING'
  | 'INITIALIZING'
  | 'READY'
  | 'ERROR';

export interface UseAuthSessionOptions {
  initialPath: AppRoute;
  intendedRoute: AppRoute;
  syncHistory: (nextRoute: AppRoute) => void;
  showToast: (
    message: string,
    type?: 'green' | 'saffron' | 'blue'
  ) => void;
  onRoleSynchronized: (role: UserRole) => void;
  onLanguageSynchronized: (lang: Language) => void;
  onLotsSynchronized: (
    lots: CropLot[],
    selectedId?: string,
    statusMap?: Record<string, VerificationStatus>
  ) => void;
  onWorkspaceReset: () => void;
  setAdminDialogOpen: (open: boolean) => void;
}

export interface UseAuthSessionReturn {
  authStatus: 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';
  profileStatus: ProfileLifecycleStatus;
  profileError: string | null;
  authSuccessTransition: boolean;
  user: AuthenticatedUser | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  devDemoMode: boolean;
  setUser: React.Dispatch<React.SetStateAction<AuthenticatedUser | null>>;
  retryProfileInit: () => Promise<void>;
  loginWithGoogle: (
    preferredRole?: UserRole,
    preferredVillageOrOrg?: string,
    openAdminAfter?: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  loginWithServer: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  registerWithServer: (params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    villageOrOrg: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  adminLoginWithServer: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  requestPasswordReset: (
    email: string
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
  verifyEmailWithServer: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Core authentication and session lifecycle hook that interfaces with Firebase
 * Authentication (`auth`, `signInWithGoogle`, `onAuthStateChanged`), Cloud Firestore
 * (`ensureFirestoreUserProfile`, `subscribeToUserCropLots`), and Kisan-SPO server RBAC,
 * keeping `KisanContext` global authentication and profile state synchronized.
 */
export function useAuthSession({
  initialPath,
  intendedRoute,
  syncHistory,
  showToast,
  onRoleSynchronized,
  onLanguageSynchronized,
  onLotsSynchronized,
  onWorkspaceReset,
  setAdminDialogOpen,
}: UseAuthSessionOptions): UseAuthSessionReturn {
  const [authStatus, setAuthStatus] = useState<
    'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED'
  >('LOADING');
  const [profileStatus, setProfileStatus] =
    useState<ProfileLifecycleStatus>('LOADING');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authSuccessTransition, setAuthSuccessTransition] =
    useState<boolean>(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(
    () => auth.currentUser
  );
  const [token, setToken] = useState<string | null>(null);
  const [devDemoMode, setDevDemoMode] = useState<boolean>(true);

  const unsubscribeLotsRef = useRef<(() => void) | null>(null);
  const authOperationSeqRef = useRef<number>(0);
  const googleSignInActiveRef = useRef<boolean>(false);

  const detachLotsSubscription = useCallback(() => {
    if (unsubscribeLotsRef.current) {
      unsubscribeLotsRef.current();
      unsubscribeLotsRef.current = null;
    }
    cleanupAllFirestoreSubscriptions();
  }, []);

  const determinePostLoginDestination = useCallback(
    (authedUser: AuthenticatedUser, preferredDest?: AppRoute): AppRoute => {
      if (authedUser.role === 'admin' && preferredDest === '/admin') {
        return '/admin';
      }
      if (
        authedUser.role !== 'admin' &&
        authedUser.onboardingStatus === 'INCOMPLETE'
      ) {
        return '/onboarding';
      }
      if (
        preferredDest &&
        PROTECTED_APP_ROUTES.includes(preferredDest) &&
        preferredDest !== '/admin' &&
        preferredDest !== '/onboarding'
      ) {
        return preferredDest;
      }
      return '/dashboard';
    },
    []
  );

  const attachUserCropLotListener = useCallback(
    (uid: string) => {
      detachLotsSubscription();
      if (auth.currentUser && auth.currentUser.uid === uid) {
        unsubscribeLotsRef.current = subscribeToUserCropLots(
          uid,
          (lotMap, fbPersonalLots) => {
            onLotsSynchronized(
              fbPersonalLots,
              fbPersonalLots.length > 0 ? fbPersonalLots[0].id : undefined,
              lotMap
            );
          }
        );
      }
    },
    [detachLotsSubscription, onLotsSynchronized]
  );

  const initializeFirebaseSession = useCallback(
    async (
      fbUser: FirebaseUser,
      preferredDest: AppRoute | undefined,
      seq: number
    ): Promise<boolean> => {
      setProfileStatus('INITIALIZING');
      setProfileError(null);

      try {
        const profile = await ensureFirestoreUserProfile(fbUser);
        if (seq !== authOperationSeqRef.current) return false;

        const syncRes = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: profile.uid,
            email: profile.email,
            displayName: profile.displayName,
            role: profile.role,
            villageOrOrg: profile.villageOrOrg,
            village: profile.village,
            district: profile.district,
            state: profile.state,
            phoneNumber: profile.phoneNumber,
            preferredLanguage: profile.preferredLanguage,
            onboardingStatus: profile.onboardingStatus,
            onboardingStep: profile.onboardingStep,
            profileCompletion: profile.profileCompletion,
            emailVerified: profile.emailVerified,
          }),
        });
        const syncData = await syncRes.json();

        if (seq !== authOperationSeqRef.current) return false;

        if (syncRes.ok && syncData.token && syncData.user) {
          try {
            sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, syncData.token);
          } catch {
            // Ignore storage quota errors
          }
          setToken(syncData.token);
          setUser(syncData.user);
          setDevDemoMode(Boolean(syncData.devDemoMode));
          if (syncData.user.role !== 'admin') {
            onRoleSynchronized(syncData.user.role as UserRole);
          }
          onLanguageSynchronized(
            syncData.user.preferredLanguage === 'hi' ? 'hi' : 'en'
          );
          setProfileStatus('READY');
          setProfileError(null);
          setAuthStatus('AUTHENTICATED');

          attachUserCropLotListener(profile.uid);

          const target = determinePostLoginDestination(
            syncData.user,
            preferredDest
          );
          syncHistory(target);
          return true;
        } else {
          setProfileStatus('ERROR');
          setProfileError(
            syncData.error ||
              'Unable to synchronize your authenticated profile with the Kisan-SPO server.'
          );
          setAuthStatus('AUTHENTICATED');
          return false;
        }
      } catch (err) {
        if (seq !== authOperationSeqRef.current) return false;
        setProfileStatus('ERROR');
        setProfileError(
          err instanceof Error
            ? err.message
            : 'Failed to initialize your Firestore user profile. Check your connection and retry.'
        );
        setAuthStatus('AUTHENTICATED');
        return false;
      }
    },
    [
      attachUserCropLotListener,
      determinePostLoginDestination,
      onLanguageSynchronized,
      onRoleSynchronized,
      syncHistory,
    ]
  );

  // Listen to Firebase Auth state changes and synchronize with Kisan-SPO session state
  useEffect(() => {
    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (cancelled) return;
      setFirebaseUser(fbUser);

      // If an explicit Google Sign-In popup workflow is actively running, let it complete atomically
      if (googleSignInActiveRef.current) {
        return;
      }

      const seq = ++authOperationSeqRef.current;

      if (!fbUser) {
        detachLotsSubscription();
      }

      if (fbUser) {
        await initializeFirebaseSession(fbUser, initialPath, seq);
        return;
      }

      // Check existing server session token if not signed in via Firebase
      let savedToken: string | null = null;
      try {
        savedToken = sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
      } catch {
        // Ignore
      }

      if (!savedToken) {
        if (!cancelled && seq === authOperationSeqRef.current) {
          setUser(null);
          setToken(null);
          onWorkspaceReset();
          setProfileStatus('IDLE');
          setProfileError(null);
          setAuthStatus('UNAUTHENTICATED');
          syncHistory(
            PUBLIC_AUTH_ROUTES.includes(initialPath) ? initialPath : '/login'
          );
        }
        return;
      }

      setProfileStatus('LOADING');
      try {
        const res = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        const data = await res.json();
        if (cancelled || seq !== authOperationSeqRef.current) return;

        if (res.ok && data.authenticated && data.user) {
          setToken(savedToken);
          setUser(data.user);
          const restoredLots: CropLot[] = data.personalLots || [];
          const defaultLotId =
            restoredLots.length > 0
              ? restoredLots[0].id
              : data.user.isDemoAccount
              ? 'KS-MP-2025-089'
              : undefined;
          onLotsSynchronized(restoredLots, defaultLotId);
          setDevDemoMode(Boolean(data.devDemoMode));
          if (data.user.role !== 'admin') {
            onRoleSynchronized(data.user.role as UserRole);
          }
          if (
            data.user.preferredLanguage === 'en' ||
            data.user.preferredLanguage === 'hi'
          ) {
            onLanguageSynchronized(data.user.preferredLanguage);
          }
          setProfileStatus('READY');
          setProfileError(null);
          setAuthStatus('AUTHENTICATED');
          const target = determinePostLoginDestination(data.user, initialPath);
          syncHistory(target);
        } else {
          try {
            sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
          } catch {
            // Ignore
          }
          setUser(null);
          setToken(null);
          onWorkspaceReset();
          setProfileStatus('IDLE');
          setProfileError(null);
          setAuthStatus('UNAUTHENTICATED');
          syncHistory('/login');
        }
      } catch {
        if (!cancelled && seq === authOperationSeqRef.current) {
          setProfileStatus('ERROR');
          setProfileError(
            'Could not verify your saved session due to a network error. Please retry or sign in again.'
          );
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
      detachLotsSubscription();
    };
  }, [
    initialPath,
    syncHistory,
    determinePostLoginDestination,
    detachLotsSubscription,
    initializeFirebaseSession,
    onRoleSynchronized,
    onLanguageSynchronized,
    onLotsSynchronized,
    onWorkspaceReset,
  ]);

  const retryProfileInit = useCallback(async () => {
    const seq = ++authOperationSeqRef.current;
    if (auth.currentUser) {
      await initializeFirebaseSession(auth.currentUser, intendedRoute, seq);
      return;
    }

    let savedToken: string | null = null;
    try {
      savedToken = sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore
    }
    if (!savedToken) {
      setProfileStatus('IDLE');
      setProfileError(null);
      setAuthStatus('UNAUTHENTICATED');
      syncHistory('/login');
      return;
    }

    setProfileStatus('LOADING');
    setProfileError(null);
    try {
      const res = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      const data = await res.json();
      if (seq !== authOperationSeqRef.current) return;

      if (res.ok && data.authenticated && data.user) {
        setToken(savedToken);
        setUser(data.user);
        onLotsSynchronized(
          data.personalLots || [],
          data.personalLots?.length > 0
            ? data.personalLots[0].id
            : data.user.isDemoAccount
            ? 'KS-MP-2025-089'
            : undefined
        );
        setProfileStatus('READY');
        setProfileError(null);
        setAuthStatus('AUTHENTICATED');
        const target = determinePostLoginDestination(data.user, intendedRoute);
        syncHistory(target);
      } else {
        setProfileStatus('IDLE');
        setProfileError(null);
        setAuthStatus('UNAUTHENTICATED');
        syncHistory('/login');
      }
    } catch {
      if (seq === authOperationSeqRef.current) {
        setProfileStatus('ERROR');
        setProfileError('Profile initialization retry failed. Check network.');
      }
    }
  }, [
    determinePostLoginDestination,
    initializeFirebaseSession,
    intendedRoute,
    onLotsSynchronized,
    syncHistory,
  ]);

  const completeAuthTransition = useCallback(
    (
      sessionToken: string,
      authedUser: AuthenticatedUser,
      userLots: CropLot[],
      destination: AppRoute
    ) => {
      try {
        sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
      } catch {
        // Ignore
      }
      setToken(sessionToken);
      setUser(authedUser);
      setProfileStatus('READY');
      setProfileError(null);
      const selectedId =
        userLots.length > 0
          ? userLots[0].id
          : authedUser.isDemoAccount
          ? 'KS-MP-2025-089'
          : undefined;
      onLotsSynchronized(userLots, selectedId);
      if (authedUser.role !== 'admin') {
        onRoleSynchronized(authedUser.role as UserRole);
      }
      if (
        authedUser.preferredLanguage === 'en' ||
        authedUser.preferredLanguage === 'hi'
      ) {
        onLanguageSynchronized(authedUser.preferredLanguage);
      }
      setAuthSuccessTransition(true);
      setTimeout(() => {
        setAuthStatus('AUTHENTICATED');
        setAuthSuccessTransition(false);
        syncHistory(destination);
      }, 260);
    },
    [
      syncHistory,
      onLotsSynchronized,
      onRoleSynchronized,
      onLanguageSynchronized,
    ]
  );

  const loginWithGoogle = useCallback(
    async (
      preferredRole: UserRole = 'farmer',
      preferredVillageOrOrg: string = '',
      openAdminAfter: boolean = false
    ): Promise<{ ok: boolean; error?: string }> => {
      const seq = ++authOperationSeqRef.current;
      googleSignInActiveRef.current = true;
      // Clear any previous user's state before starting new authentication
      detachLotsSubscription();
      onWorkspaceReset();

      try {
        const profile = await firebaseSignInWithGoogle(
          preferredRole,
          preferredVillageOrOrg
        );
        setFirebaseUser(auth.currentUser);
        setProfileStatus('INITIALIZING');
        setProfileError(null);

        const syncRes = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: profile.uid,
            email: profile.email,
            displayName: profile.displayName,
            role: profile.role,
            villageOrOrg: profile.villageOrOrg,
            village: profile.village,
            district: profile.district,
            state: profile.state,
            phoneNumber: profile.phoneNumber,
            preferredLanguage: profile.preferredLanguage,
            onboardingStatus: profile.onboardingStatus,
            onboardingStep: profile.onboardingStep,
            profileCompletion: profile.profileCompletion,
            emailVerified: profile.emailVerified,
          }),
        });
        const syncData = await syncRes.json();
        if (seq !== authOperationSeqRef.current) {
          return { ok: false, error: 'Authentication superseded.' };
        }
        if (!syncRes.ok || !syncData.token) {
          setProfileStatus('ERROR');
          setProfileError(
            syncData.error ||
              'Failed to synchronize Firebase session with Kisan-SPO server.'
          );
          return {
            ok: false,
            error:
              syncData.error ||
              'Failed to synchronize Firebase session with Kisan-SPO server.',
          };
        }

        if (openAdminAfter && syncData.user.role !== 'admin') {
          return {
            ok: false,
            error: `Signed in as ${syncData.user.email} (${syncData.user.role}), which is not an authorized Administrator account.`,
          };
        }

        setAdminDialogOpen(false);
        const destination: AppRoute =
          openAdminAfter && syncData.user.role === 'admin'
            ? '/admin'
            : determinePostLoginDestination(syncData.user, intendedRoute);
        completeAuthTransition(
          syncData.token,
          syncData.user,
          syncData.personalLots || [],
          destination
        );
        attachUserCropLotListener(profile.uid);
        showToast(
          `Signed in with Google (${profile.email}) • Synced with Cloud Firestore`,
          'green'
        );
        return { ok: true };
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Google Sign-In popup was closed or blocked.';
        return {
          ok: false,
          error: msg.includes('auth/popup-closed-by-user')
            ? 'Google Sign-In popup was closed before completing authentication.'
            : msg,
        };
      } finally {
        googleSignInActiveRef.current = false;
      }
    },
    [
      intendedRoute,
      determinePostLoginDestination,
      completeAuthTransition,
      attachUserCropLotListener,
      detachLotsSubscription,
      onWorkspaceReset,
      setAdminDialogOpen,
      showToast,
    ]
  );

  const loginWithServer = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const seq = ++authOperationSeqRef.current;
      detachLotsSubscription();
      onWorkspaceReset();
      if (auth.currentUser) {
        try {
          await signOutFromFirebase();
          setFirebaseUser(null);
        } catch {
          // Ignore
        }
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (seq !== authOperationSeqRef.current) {
          return { ok: false, error: 'Authentication superseded.' };
        }
        if (!res.ok || !data.token) {
          return {
            ok: false,
            error: data.error || 'Authentication failed. Check credentials.',
          };
        }
        const target =
          data.user.role === 'admin'
            ? '/admin'
            : determinePostLoginDestination(data.user, intendedRoute);
        completeAuthTransition(
          data.token,
          data.user,
          data.personalLots || [],
          target
        );
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'Network error communicating with authentication server.',
        };
      }
    },
    [
      intendedRoute,
      determinePostLoginDestination,
      completeAuthTransition,
      detachLotsSubscription,
      onWorkspaceReset,
    ]
  );

  const registerWithServer = useCallback(
    async (params: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      villageOrOrg: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      const seq = ++authOperationSeqRef.current;
      detachLotsSubscription();
      onWorkspaceReset();
      if (auth.currentUser) {
        try {
          await signOutFromFirebase();
          setFirebaseUser(null);
        } catch {
          // Ignore
        }
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (seq !== authOperationSeqRef.current) {
          return { ok: false, error: 'Registration superseded.' };
        }
        if (!res.ok || !data.token) {
          return {
            ok: false,
            error: data.error || 'Registration could not be completed.',
          };
        }
        completeAuthTransition(data.token, data.user, [], '/onboarding');
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'Network error during account registration.',
        };
      }
    },
    [completeAuthTransition, detachLotsSubscription, onWorkspaceReset]
  );

  const adminLoginWithServer = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const seq = ++authOperationSeqRef.current;
      detachLotsSubscription();
      onWorkspaceReset();
      if (auth.currentUser) {
        try {
          await signOutFromFirebase();
          setFirebaseUser(null);
        } catch {
          // Ignore
        }
      }

      try {
        const res = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (seq !== authOperationSeqRef.current) {
          return { ok: false, error: 'Admin verification superseded.' };
        }
        if (!res.ok || !data.token) {
          return {
            ok: false,
            error:
              data.error ||
              'Administrator verification failed. Unauthorized access denied.',
          };
        }
        setAdminDialogOpen(false);
        completeAuthTransition(
          data.token,
          data.user,
          data.personalLots || [],
          '/admin'
        );
        showToast(
          `Verified Administrator Session: ${data.user.name}`,
          'green'
        );
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'Unable to reach administrator verification server.',
        };
      }
    },
    [
      completeAuthTransition,
      detachLotsSubscription,
      onWorkspaceReset,
      setAdminDialogOpen,
      showToast,
    ]
  );

  const requestPasswordReset = useCallback(
    async (
      email: string
    ): Promise<{ ok: boolean; message?: string; error?: string }> => {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            ok: false,
            error: data.error || 'Could not process recovery request.',
          };
        }
        return {
          ok: true,
          message:
            data.message ||
            'Password recovery instructions have been sent to your email address.',
        };
      } catch {
        return {
          ok: false,
          error: 'Network error while requesting password reset.',
        };
      }
    },
    []
  );

  const verifyEmailWithServer = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        showToast(
          'Email address verified for your Kisan-SPO account.',
          'green'
        );
      }
    } catch {
      // Ignore
    }
  }, [token, showToast]);

  const logout = useCallback(async () => {
    ++authOperationSeqRef.current;
    // Immediately clear private user state before async network / Firebase sign-out completes
    detachLotsSubscription();
    onWorkspaceReset();
    setToken(null);
    setUser(null);
    setProfileStatus('IDLE');
    setProfileError(null);
    setAuthStatus('UNAUTHENTICATED');

    try {
      sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore
    }

    try {
      await signOutFromFirebase();
    } catch {
      // Ignore Firebase sign-out error
    }
    setFirebaseUser(null);

    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network error on logout
      }
    }

    syncHistory('/login');
    showToast('Signed out securely from Firebase & Kisan-SPO.', 'blue');
  }, [token, detachLotsSubscription, onWorkspaceReset, syncHistory, showToast]);

  return {
    authStatus,
    profileStatus,
    profileError,
    authSuccessTransition,
    user,
    firebaseUser,
    token,
    devDemoMode,
    setUser,
    retryProfileInit,
    loginWithGoogle,
    loginWithServer,
    registerWithServer,
    adminLoginWithServer,
    requestPasswordReset,
    verifyEmailWithServer,
    logout,
  };
}

export interface UseAuthReturn {
  user: AuthenticatedUser | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  authStatus: 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';
  profileStatus: ProfileLifecycleStatus;
  profileError: string | null;
  authSuccessTransition: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isFirebaseSession: boolean;
  devDemoMode: boolean;
  retryProfileInit: () => Promise<void>;
  signInWithGoogle: (
    preferredRole?: UserRole,
    preferredVillageOrOrg?: string,
    openAdminAfter?: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: (
    preferredRole?: UserRole,
    preferredVillageOrOrg?: string,
    openAdminAfter?: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  loginWithServer: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  registerWithServer: (params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    villageOrOrg: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  adminLoginWithServer: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  requestPasswordReset: (
    email: string
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
  verifyEmailWithServer: () => Promise<void>;
  updateUserProfile: (
    updates: ProfileUpdatePayload
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Public consumer hook for accessing Kisan-SPO user session state, Firebase Auth
 * Google Sign-In (`signInWithGoogle` / `loginWithGoogle`), server/demo sign-in
 * (`signIn` / `loginWithServer`), registration, email verification, and sign-out
 * (`signOut` / `logout`), synchronized with `KisanContext`.
 */
export function useAuth(): UseAuthReturn {
  const {
    user,
    firebaseUser,
    token,
    authStatus,
    profileStatus,
    profileError,
    authSuccessTransition,
    devDemoMode,
    retryProfileInit,
    loginWithGoogle,
    loginWithServer,
    registerWithServer,
    adminLoginWithServer,
    requestPasswordReset,
    verifyEmailWithServer,
    updateUserProfile,
    logout,
  } = useKisan();

  return {
    user,
    firebaseUser,
    token,
    authStatus,
    profileStatus,
    profileError,
    authSuccessTransition,
    isAuthenticated:
      authStatus === 'AUTHENTICATED' &&
      profileStatus === 'READY' &&
      user !== null,
    isLoading:
      authStatus === 'LOADING' ||
      profileStatus === 'LOADING' ||
      profileStatus === 'INITIALIZING',
    isAdmin: user?.role === 'admin',
    isFirebaseSession: firebaseUser !== null,
    devDemoMode,
    retryProfileInit,
    signInWithGoogle: loginWithGoogle,
    loginWithGoogle,
    signIn: loginWithServer,
    loginWithServer,
    registerWithServer,
    adminLoginWithServer,
    requestPasswordReset,
    verifyEmailWithServer,
    updateUserProfile,
    signOut: logout,
    logout,
  };
}
