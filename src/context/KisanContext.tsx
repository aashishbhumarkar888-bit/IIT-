import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CROP_LOTS,
  FARM_PLOTS,
  INITIAL_PAYMENT,
} from '../data/kisanData';
import {
  auth,
  cleanupAllFirestoreSubscriptions,
  ensureFirestoreUserProfile,
  onAuthStateChanged,
  saveCropLotToFirestore,
  signInWithGoogle,
  signOutFromFirebase,
  subscribeToUserCropLots,
  updateFirestoreUserPreferences,
} from '../firebase';
import { calculateArbitrage } from '../services/kisanService';
import { getServerSessionExpiry } from '../sessionToken';
import {
  ArbitrageCalculationInput,
  ArbitrageCalculationResult,
  CropLot,
  DeliveryConfirmationStatus,
  FarmPlot,
  Language,
  OnboardingStatus,
  Payment,
  PaymentStatus,
  UserRole,
  VerificationStatus,
} from '../types/kisan';

export type AppRoute =
  | '/login'
  | '/signup'
  | '/forgot-password'
  | '/onboarding'
  | '/dashboard'
  | '/advisory'
  | '/crop-passport'
  | '/market-comparison'
  | '/harvest-payments'
  | '/profile'
  | '/showcase'
  | '/admin';

export const PUBLIC_ROUTES: AppRoute[] = [
  '/login',
  '/signup',
  '/forgot-password',
];

export const PROTECTED_ROUTES: AppRoute[] = [
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

const ALL_VALID_ROUTES: AppRoute[] = [...PUBLIC_ROUTES, ...PROTECTED_ROUTES];

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  nameHi: string;
  role: 'farmer' | 'agent' | 'buyer' | 'admin';
  villageOrOrg: string;
  village?: string;
  district?: string;
  state?: string;
  phoneNumber?: string;
  preferredLanguage?: Language;
  onboardingStatus?: OnboardingStatus;
  onboardingStep?: number;
  profileCompletion?: number;
  isDemoAccount?: boolean;
  demoDatasetVersion?: string;
  uidLabel: string;
  emailVerified: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface ProfileUpdatePayload {
  name?: string;
  preferredLanguage?: Language;
  phoneNumber?: string;
  role?: UserRole;
  village?: string;
  district?: string;
  state?: string;
  onboardingStatus?: OnboardingStatus;
  onboardingStep?: number;
  profileCompletion?: number;
}

export interface NewPersonalCropInput {
  cropName: string;
  variety: string;
  quantityQuintals: number;
  surveyNumber?: string;
  harvestDate?: string;
}

function parsePathname(): AppRoute {
  if (typeof window === 'undefined') return '/login';
  const raw = window.location.pathname.replace(/\/+$/, '') || '/dashboard';
  if ((ALL_VALID_ROUTES as string[]).includes(raw)) {
    return raw as AppRoute;
  }
  return '/dashboard';
}

interface KisanContextValue {
  // Authentication & Session
  authStatus: 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';
  authSuccessTransition: boolean;
  user: AuthenticatedUser | null;
  token: string | null;
  devDemoMode: boolean;
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
  updateUserProfile: (
    updates: ProfileUpdatePayload
  ) => Promise<{ ok: boolean; error?: string }>;
  addPersonalCropLot: (
    input: NewPersonalCropInput
  ) => Promise<{ ok: boolean; lot?: CropLot; error?: string }>;
  resetDemoDataset: () => Promise<void>;
  verifyEmailWithServer: () => Promise<void>;
  logout: (sessionExpired?: boolean) => Promise<void>;

  // Dashboard Mode (Personal Assistant vs Operations Desk)
  workspaceViewMode: 'PERSONAL' | 'OPERATIONS_DESK';
  setWorkspaceViewMode: (mode: 'PERSONAL' | 'OPERATIONS_DESK') => void;
  addCropModalOpen: boolean;
  setAddCropModalOpen: (open: boolean) => void;

  // Admin Shortcut Dialog (Ctrl+Shift+A / Cmd+Shift+A)
  adminDialogOpen: boolean;
  setAdminDialogOpen: (open: boolean) => void;

  // Navigation & Role
  route: AppRoute;
  intendedRoute: AppRoute;
  navigate: (nextRoute: AppRoute) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (en: string, hi: string) => string;

  // Crop Lots & Verification (Scoped by User / Demo Account)
  personalLots: CropLot[];
  selectedLotId: string;
  setSelectedLotId: (lotId: string) => void;
  currentLot: CropLot;
  currentPlot: FarmPlot;
  allLots: CropLot[];
  updateLotVerificationStatus: (
    lotId: string,
    status: VerificationStatus
  ) => void;

  // Arbitrage Calculator
  arbitrageInput: ArbitrageCalculationInput;
  updateArbitrageInput: (partial: Partial<ArbitrageCalculationInput>) => void;
  resetArbitrageInput: () => void;
  arbitrageResult: ArbitrageCalculationResult;
  processorPivotApproved: boolean;
  approveProcessorPivot: (secondaryBuyerName: string) => void;
  selectedSaleOption: 'DIRECT_BUYER' | 'MANDI' | 'SALVAGE_PIVOT';
  setSelectedSaleOption: (
    opt: 'DIRECT_BUYER' | 'MANDI' | 'SALVAGE_PIVOT'
  ) => void;
  contractLocked: boolean;
  setContractLocked: (locked: boolean) => void;

  // Payments & Toast
  payment: Payment;
  setPaymentStatus: (
    status: PaymentStatus,
    deliveryStatus?: DeliveryConfirmationStatus
  ) => void;
  toast: { message: string; type: 'green' | 'saffron' | 'blue' } | null;
  showToast: (message: string, type?: 'green' | 'saffron' | 'blue') => void;
  clearToast: () => void;
}

const DEFAULT_ARBITRAGE_INPUT: ArbitrageCalculationInput = {
  quantityQuintals: 25,
  mandiPricePerQuintal: 1820,
  directPricePerQuintal: 2150,
  mandiTransportCost: 1500,
  mandiLoadingCost: 600,
  mandiCessPercent: 2.5,
  directPlatformFee: 500,
  directTransportCost: 0,
};

const SESSION_TOKEN_STORAGE_KEY = 'kisan_spo_session_token';

const KisanContext = createContext<KisanContextValue | undefined>(undefined);

export const KisanProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialPath = useMemo(() => parsePathname(), []);
  const [intendedRoute, setIntendedRoute] = useState<AppRoute>(() =>
    PROTECTED_ROUTES.includes(initialPath) && initialPath !== '/admin'
      ? initialPath
      : '/dashboard'
  );
  const [route, setRouteState] = useState<AppRoute>(() =>
    PUBLIC_ROUTES.includes(initialPath) ? initialPath : '/login'
  );

  const [authStatus, setAuthStatus] = useState<
    'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED'
  >('LOADING');
  const [authSuccessTransition, setAuthSuccessTransition] =
    useState<boolean>(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [devDemoMode, setDevDemoMode] = useState<boolean>(true);
  const [adminDialogOpen, setAdminDialogOpen] = useState<boolean>(false);
  const [addCropModalOpen, setAddCropModalOpen] = useState<boolean>(false);
  const [workspaceViewMode, setWorkspaceViewMode] = useState<
    'PERSONAL' | 'OPERATIONS_DESK'
  >('PERSONAL');

  const [role, setRoleState] = useState<UserRole>('farmer');
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('kisan_spo_lang');
      if (saved === 'en' || saved === 'hi') return saved;
    } catch {
      // Ignore
    }
    return 'en';
  });

  const [personalLots, setPersonalLots] = useState<CropLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('KS-MP-2025-089');
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, VerificationStatus>
  >({});

  const [arbitrageInput, setArbitrageInput] =
    useState<ArbitrageCalculationInput>(DEFAULT_ARBITRAGE_INPUT);
  const [processorPivotApproved, setProcessorPivotApproved] =
    useState<boolean>(false);
  const [selectedSaleOption, setSelectedSaleOption] = useState<
    'DIRECT_BUYER' | 'MANDI' | 'SALVAGE_PIVOT'
  >('DIRECT_BUYER');
  const [contractLocked, setContractLocked] = useState<boolean>(false);
  const [paymentBase, setPaymentBase] = useState<Payment>(INITIAL_PAYMENT);

  const [toast, setToast] = useState<{
    message: string;
    type: 'green' | 'saffron' | 'blue';
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'green' | 'saffron' | 'blue' = 'green') => {
      setToast({ message, type });
    },
    []
  );

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const syncHistory = useCallback((nextRoute: AppRoute) => {
    setRouteState(nextRoute);
    try {
      if (window.location.pathname !== nextRoute) {
        window.history.pushState({}, '', nextRoute);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Ignore sandbox history restrictions
    }
  }, []);

  const determinePostLoginDestination = useCallback(
    (authedUser: AuthenticatedUser, preferredDest?: AppRoute): AppRoute => {
      if (authedUser.role === 'admin' && preferredDest === '/admin') {
        return '/admin';
      }
      if (authedUser.onboardingStatus === 'INCOMPLETE') {
        return '/onboarding';
      }
      if (
        preferredDest &&
        PROTECTED_ROUTES.includes(preferredDest) &&
        preferredDest !== '/admin' &&
        preferredDest !== '/onboarding'
      ) {
        return preferredDest;
      }
      return '/dashboard';
    },
    []
  );

  // Verify existing Firebase Auth or Server session on initial load
  useEffect(() => {
    let cancelled = false;
    let unsubscribeLots: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (cancelled) return;

      if (!fbUser) {
        if (unsubscribeLots) {
          unsubscribeLots();
          unsubscribeLots = null;
        }
        cleanupAllFirestoreSubscriptions();
      }

      if (fbUser) {
        try {
          const profile = await ensureFirestoreUserProfile(fbUser);
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

          if (!cancelled && syncRes.ok && syncData.token && syncData.user) {
            try {
              sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, syncData.token);
            } catch {
              // Ignore
            }
            setToken(syncData.token);
            setUser(syncData.user);
            setDevDemoMode(Boolean(syncData.devDemoMode));
            setRoleState(profile.role);
            setLanguageState(profile.preferredLanguage);
            setWorkspaceViewMode(
              syncData.user.isDemoAccount ? 'PERSONAL' : 'PERSONAL'
            );
            setAuthStatus('AUTHENTICATED');

            if (unsubscribeLots) unsubscribeLots();
            if (auth.currentUser && auth.currentUser.uid === fbUser.uid) {
              unsubscribeLots = subscribeToUserCropLots(
                profile.uid,
                (lotMap, fbPersonalLots) => {
                  setStatusOverrides((prev) => ({ ...prev, ...lotMap }));
                  if (fbPersonalLots.length > 0) {
                    setPersonalLots(fbPersonalLots);
                    setSelectedLotId(fbPersonalLots[0].id);
                  }
                }
              );
            }

            const target = determinePostLoginDestination(
              syncData.user,
              initialPath
            );
            syncHistory(target);
            return;
          }
        } catch {
          // Fall back to server session check
        }
      }

      // Check existing server session token if not signed in via Firebase
      let savedToken: string | null = null;
      try {
        savedToken = sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
      } catch {
        // Ignore
      }

      if (!savedToken) {
        if (!cancelled) {
          setAuthStatus('UNAUTHENTICATED');
          syncHistory(
            PUBLIC_ROUTES.includes(initialPath) ? initialPath : '/login'
          );
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        const data = await res.json();
        if (!cancelled && res.ok && data.authenticated && data.user) {
          setToken(savedToken);
          setUser(data.user);
          setPersonalLots(data.personalLots || []);
          if (data.personalLots?.length > 0) {
            setSelectedLotId(data.personalLots[0].id);
          } else if (data.user.isDemoAccount) {
            setSelectedLotId('KS-MP-2025-089');
          }
          setDevDemoMode(Boolean(data.devDemoMode));
          if (data.user.role !== 'admin') {
            setRoleState(data.user.role as UserRole);
          }
          if (
            data.user.preferredLanguage === 'en' ||
            data.user.preferredLanguage === 'hi'
          ) {
            setLanguageState(data.user.preferredLanguage);
          }
          setWorkspaceViewMode('PERSONAL');
          setAuthStatus('AUTHENTICATED');
          const target = determinePostLoginDestination(data.user, initialPath);
          syncHistory(target);
        } else if (!cancelled) {
          try {
            sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
          } catch {
            // Ignore
          }
          setAuthStatus('UNAUTHENTICATED');
          syncHistory('/login');
        }
      } catch {
        if (!cancelled) {
          setAuthStatus('UNAUTHENTICATED');
          syncHistory('/login');
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
      if (unsubscribeLots) unsubscribeLots();
    };
  }, [initialPath, syncHistory, determinePostLoginDestination]);

  // Global keyboard shortcut: Ctrl + Shift + A (Windows/Linux) or Cmd + Shift + A (macOS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isKeyA = e.key === 'A' || e.key === 'a' || e.code === 'KeyA';

      if (!isModifier || !isShift || !isKeyA) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      e.preventDefault();
      setAdminDialogOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Browser back/forward navigation with auth guard
  useEffect(() => {
    const handlePopState = () => {
      const target = parsePathname();
      if (
        authStatus !== 'AUTHENTICATED' &&
        PROTECTED_ROUTES.includes(target)
      ) {
        if (target !== '/admin') setIntendedRoute(target);
        syncHistory('/login');
        return;
      }
      if (target === '/admin' && user?.role !== 'admin') {
        showToast(
          'Unauthorized: Administrator verification is required for /admin.',
          'saffron'
        );
        syncHistory('/dashboard');
        return;
      }
      setRouteState(target);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authStatus, user, syncHistory, showToast]);

  const navigate = useCallback(
    (nextRoute: AppRoute) => {
      if (
        authStatus !== 'AUTHENTICATED' &&
        PROTECTED_ROUTES.includes(nextRoute)
      ) {
        if (nextRoute !== '/admin') {
          setIntendedRoute(nextRoute);
        }
        syncHistory('/login');
        return;
      }

      if (nextRoute === '/admin' && user?.role !== 'admin') {
        setAdminDialogOpen(true);
        return;
      }

      syncHistory(nextRoute);
    },
    [authStatus, user, syncHistory]
  );

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
      setPersonalLots(userLots);
      if (userLots.length > 0) {
        setSelectedLotId(userLots[0].id);
      } else if (authedUser.isDemoAccount) {
        setSelectedLotId('KS-MP-2025-089');
      }
      if (authedUser.role !== 'admin') {
        setRoleState(authedUser.role as UserRole);
      }
      if (
        authedUser.preferredLanguage === 'en' ||
        authedUser.preferredLanguage === 'hi'
      ) {
        setLanguageState(authedUser.preferredLanguage);
      }
      setWorkspaceViewMode('PERSONAL');
      setAuthSuccessTransition(true);
      setTimeout(() => {
        setAuthStatus('AUTHENTICATED');
        setAuthSuccessTransition(false);
        syncHistory(destination);
      }, 260);
    },
    [syncHistory]
  );

  const loginWithGoogle = useCallback(
    async (
      preferredRole: UserRole = 'farmer',
      preferredVillageOrOrg: string = '',
      openAdminAfter: boolean = false
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const profile = await signInWithGoogle(
          preferredRole,
          preferredVillageOrOrg
        );
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
        if (!syncRes.ok || !syncData.token) {
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
      }
    },
    [
      intendedRoute,
      determinePostLoginDestination,
      completeAuthTransition,
      showToast,
    ]
  );

  const loginWithServer = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
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
    [intendedRoute, determinePostLoginDestination, completeAuthTransition]
  );

  const registerWithServer = useCallback(
    async (params: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      villageOrOrg: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.token) {
          return {
            ok: false,
            error: data.error || 'Registration could not be completed.',
          };
        }
        completeAuthTransition(
          data.token,
          data.user,
          [],
          '/onboarding'
        );
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'Network error during account registration.',
        };
      }
    },
    [completeAuthTransition]
  );

  const adminLoginWithServer = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
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
    [completeAuthTransition, showToast]
  );

  const updateUserProfile = useCallback(
    async (
      updates: ProfileUpdatePayload
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!token) {
        return { ok: false, error: 'Not authenticated.' };
      }
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok || !data.user) {
          return {
            ok: false,
            error: data.error || 'Could not save profile changes.',
          };
        }
        setUser(data.user);
        if (
          updates.role &&
          (updates.role === 'farmer' ||
            updates.role === 'agent' ||
            updates.role === 'buyer')
        ) {
          setRoleState(updates.role);
        }
        if (
          updates.preferredLanguage === 'en' ||
          updates.preferredLanguage === 'hi'
        ) {
          setLanguageState(updates.preferredLanguage);
          try {
            localStorage.setItem('kisan_spo_lang', updates.preferredLanguage);
          } catch {
            // Ignore
          }
        }

        // Also persist to Cloud Firestore if authenticated with Firebase
        await updateFirestoreUserPreferences({
          displayName: updates.name,
          role: updates.role,
          village: updates.village,
          district: updates.district,
          state: updates.state,
          preferredLanguage: updates.preferredLanguage,
          onboardingStatus: updates.onboardingStatus,
          onboardingStep: updates.onboardingStep,
          profileCompletion: updates.profileCompletion,
          phoneNumber: updates.phoneNumber,
        }).catch(() => {
          // Ignore if local server auth
        });

        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'Network error while saving your profile.',
        };
      }
    },
    [token]
  );

  const addPersonalCropLot = useCallback(
    async (
      input: NewPersonalCropInput
    ): Promise<{ ok: boolean; lot?: CropLot; error?: string }> => {
      if (!token) {
        return { ok: false, error: 'Authentication required.' };
      }
      try {
        const res = await fetch('/api/profile/crops', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok || !data.lot) {
          return {
            ok: false,
            error: data.error || 'Could not add crop lot.',
          };
        }
        const createdLot: CropLot = data.lot;
        setPersonalLots(data.personalLots || [createdLot]);
        setSelectedLotId(createdLot.id);
        setArbitrageInput((prev) => ({
          ...prev,
          quantityQuintals: createdLot.quantityQuintals,
        }));

        await saveCropLotToFirestore(createdLot).catch(() => {
          // Ignore if local server auth
        });

        showToast(
          `Added ${createdLot.quantityQuintals} Quintals of ${createdLot.cropName} (${createdLot.shortCode}) to your workspace.`,
          'green'
        );
        return { ok: true, lot: createdLot };
      } catch {
        return {
          ok: false,
          error: 'Network error while saving your crop lot.',
        };
      }
    },
    [token, showToast]
  );

  const resetDemoDataset = useCallback(async () => {
    setStatusOverrides({});
    setArbitrageInput(DEFAULT_ARBITRAGE_INPUT);
    setProcessorPivotApproved(false);
    setSelectedSaleOption('DIRECT_BUYER');
    setContractLocked(false);
    setPaymentBase(INITIAL_PAYMENT);
    if (token) {
      try {
        await fetch('/api/demo/reset', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore
      }
    }
    showToast(
      'Demo dataset reset to clean baseline (Real user profiles unaffected).',
      'blue'
    );
  }, [token, showToast]);

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
        showToast('Email address verified for your Kisan-SPO account.', 'green');
      }
    } catch {
      // Ignore
    }
  }, [token, showToast]);

  const logout = useCallback(async (sessionExpired = false) => {
    cleanupAllFirestoreSubscriptions();
    try {
      await signOutFromFirebase();
    } catch {
      // Ignore
    }
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore
      }
    }
    try {
      sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setToken(null);
    setUser(null);
    setPersonalLots([]);
    setContractLocked(false);
    setProcessorPivotApproved(false);
    setAuthStatus('UNAUTHENTICATED');
    syncHistory('/login');
    showToast(
      sessionExpired
        ? 'Your server session expired. Please sign in again.'
        : 'Signed out. Any copied server token expires within 15 minutes.',
      sessionExpired ? 'saffron' : 'blue'
    );
  }, [token, syncHistory, showToast]);

  useEffect(() => {
    if (!token) return;
    const expiresAt = getServerSessionExpiry(token);
    if (expiresAt === null || expiresAt <= Date.now()) {
      void logout(true);
      return;
    }

    const timer = window.setTimeout(() => {
      void logout(true);
    }, expiresAt - Date.now());
    return () => window.clearTimeout(timer);
  }, [token, logout]);

  const setRole = useCallback(
    (nextRole: UserRole) => {
      setRoleState(nextRole);
      if (token) {
        updateUserProfile({ role: nextRole }).catch(() => {
          // Ignore
        });
      }
      const roleLabels: Record<UserRole, string> = {
        farmer: 'Farmer / Family Proxy (किसान / पारिवारिक प्रतिनिधि)',
        agent: 'Village Agent / Arhtiya Partner (ग्रामीण एजेंट / आढ़तिया साथी)',
        buyer: 'Institutional Buyer (संस्थागत खरीदार)',
      };
      showToast(`Active workspace switched to: ${roleLabels[nextRole]}`, 'blue');
    },
    [token, updateUserProfile, showToast]
  );

  const setLanguage = useCallback(
    (nextLang: Language) => {
      setLanguageState(nextLang);
      try {
        localStorage.setItem('kisan_spo_lang', nextLang);
      } catch {
        // Ignore
      }
      if (token) {
        updateUserProfile({ preferredLanguage: nextLang }).catch(() => {
          // Ignore
        });
      }
      showToast(
        nextLang === 'hi'
          ? 'भाषा बदली गई: हिंदी (Hindi Active)'
          : 'Language switched to English',
        'blue'
      );
    },
    [token, updateUserProfile, showToast]
  );

  const t = useCallback(
    (en: string, hi: string) => (language === 'hi' ? hi : en),
    [language]
  );

  // Scoped Lots:
  // - Demo accounts or Admin see the isolated Demo Dataset (+ any personal lots they add).
  // - Real accounts with personal lots see their own personal lots first (plus can inspect labeled Demo Sample Lots on the Crop Passport screen if needed).
  const allLots = useMemo(() => {
    const mergedSource =
      user?.isDemoAccount || user?.role === 'admin'
        ? [...personalLots, ...CROP_LOTS]
        : personalLots.length > 0
        ? personalLots
        : CROP_LOTS;

    return mergedSource.map((l) => {
      const override = statusOverrides[l.id];
      return override ? { ...l, verificationStatus: override } : l;
    });
  }, [user, personalLots, statusOverrides]);

  const currentLot = useMemo(() => {
    return allLots.find((l) => l.id === selectedLotId) || allLots[0];
  }, [allLots, selectedLotId]);

  const currentPlot = useMemo(() => {
    return FARM_PLOTS[currentLot.id] || FARM_PLOTS['KS-MP-2025-089'];
  }, [currentLot.id]);

  const updateLotVerificationStatus = useCallback(
    (lotId: string, status: VerificationStatus) => {
      setStatusOverrides((prev) => ({ ...prev, [lotId]: status }));
      const targetLot =
        personalLots.find((l) => l.id === lotId) ||
        CROP_LOTS.find((l) => l.id === lotId);
      if (targetLot) {
        saveCropLotToFirestore(targetLot, status).catch(() => {
          // Ignore if demo mode without Firebase user
        });
      }
      showToast(
        `Lot ${lotId} credential state updated to ${status.replace(/_/g, ' ')}`,
        status === 'INDEPENDENTLY_VERIFIED' || status === 'LABORATORY_TESTED'
          ? 'green'
          : 'saffron'
      );
    },
    [personalLots, showToast]
  );

  const updateArbitrageInput = useCallback(
    (partial: Partial<ArbitrageCalculationInput>) => {
      setArbitrageInput((prev) => ({ ...prev, ...partial }));
    },
    []
  );

  const resetArbitrageInput = useCallback(() => {
    setArbitrageInput(DEFAULT_ARBITRAGE_INPUT);
    setProcessorPivotApproved(false);
    setSelectedSaleOption('DIRECT_BUYER');
    showToast(
      'Reset arbitrage calculator to standard 25 Quintal lot parameters.',
      'blue'
    );
  }, [showToast]);

  const arbitrageResult = useMemo(
    () => calculateArbitrage(arbitrageInput),
    [arbitrageInput]
  );

  const approveProcessorPivot = useCallback(
    (secondaryBuyerName: string) => {
      setProcessorPivotApproved(true);
      setSelectedSaleOption('SALVAGE_PIVOT');
      showToast(
        `Processor Pivot Approved: 4-Hour Fallback allocated to ${secondaryBuyerName}`,
        'saffron'
      );
    },
    [showToast]
  );

  const payment: Payment = useMemo(() => {
    if (!arbitrageResult.isValid) return paymentBase;
    return {
      ...paymentBase,
      totalPayableAmount: arbitrageResult.directGross,
      firstInstallment: arbitrageResult.firstInstallment50,
      remainingAmount: arbitrageResult.remainingInstallment50,
    };
  }, [paymentBase, arbitrageResult]);

  const setPaymentStatus = useCallback(
    (
      status: PaymentStatus,
      deliveryStatus?: DeliveryConfirmationStatus
    ) => {
      setPaymentBase((prev) => ({
        ...prev,
        status,
        deliveryConfirmationStatus:
          deliveryStatus || prev.deliveryConfirmationStatus,
        updatedAt: 'Just now (Simulated Local Event)',
      }));
      showToast(
        `Simulated Escrow State Updated: ${status.replace(/_/g, ' ')}`,
        status === 'PAYMENT_FAILED' || status === 'DISPUTE_OPENED'
          ? 'saffron'
          : 'green'
      );
    },
    [showToast]
  );

  return (
    <KisanContext.Provider
      value={{
        authStatus,
        authSuccessTransition,
        user,
        token,
        devDemoMode,
        loginWithGoogle,
        loginWithServer,
        registerWithServer,
        adminLoginWithServer,
        updateUserProfile,
        addPersonalCropLot,
        resetDemoDataset,
        verifyEmailWithServer,
        logout,
        workspaceViewMode,
        setWorkspaceViewMode,
        addCropModalOpen,
        setAddCropModalOpen,
        adminDialogOpen,
        setAdminDialogOpen,
        route,
        intendedRoute,
        navigate,
        role,
        setRole,
        language,
        setLanguage,
        t,
        personalLots,
        selectedLotId,
        setSelectedLotId,
        currentLot,
        currentPlot,
        allLots,
        updateLotVerificationStatus,
        arbitrageInput,
        updateArbitrageInput,
        resetArbitrageInput,
        arbitrageResult,
        processorPivotApproved,
        approveProcessorPivot,
        selectedSaleOption,
        setSelectedSaleOption,
        contractLocked,
        setContractLocked,
        payment,
        setPaymentStatus,
        toast,
        showToast,
        clearToast,
      }}
    >
      {children}
    </KisanContext.Provider>
  );
};

export function useKisan(): KisanContextValue {
  const ctx = useContext(KisanContext);
  if (!ctx) {
    throw new Error('useKisan must be used within a KisanProvider');
  }
  return ctx;
}
