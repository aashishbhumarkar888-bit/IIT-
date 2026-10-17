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
import { calculateArbitrage } from '../services/kisanService';
import {
  ArbitrageCalculationInput,
  ArbitrageCalculationResult,
  CropLot,
  DeliveryConfirmationStatus,
  FarmPlot,
  Language,
  Payment,
  PaymentStatus,
  UserRole,
  VerificationStatus,
} from '../types/kisan';

export type AppRoute =
  | '/login'
  | '/signup'
  | '/forgot-password'
  | '/dashboard'
  | '/advisory'
  | '/crop-passport'
  | '/market-comparison'
  | '/harvest-payments'
  | '/showcase'
  | '/admin';

export const PUBLIC_ROUTES: AppRoute[] = [
  '/login',
  '/signup',
  '/forgot-password',
];

export const PROTECTED_ROUTES: AppRoute[] = [
  '/dashboard',
  '/advisory',
  '/crop-passport',
  '/market-comparison',
  '/harvest-payments',
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
  uidLabel: string;
  emailVerified: boolean;
  active: boolean;
  createdAt?: string;
  lastLoginAt?: string;
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
  loginWithServer: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
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
  verifyEmailWithServer: () => Promise<void>;
  logout: () => Promise<void>;

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

  // Crop Lots & Verification
  selectedLotId: string;
  setSelectedLotId: (lotId: string) => void;
  currentLot: CropLot;
  currentPlot: FarmPlot;
  allLots: CropLot[];
  updateLotVerificationStatus: (lotId: string, status: VerificationStatus) => void;

  // Arbitrage Calculator
  arbitrageInput: ArbitrageCalculationInput;
  updateArbitrageInput: (partial: Partial<ArbitrageCalculationInput>) => void;
  resetArbitrageInput: () => void;
  arbitrageResult: ArbitrageCalculationResult;
  processorPivotApproved: boolean;
  approveProcessorPivot: (secondaryBuyerName: string) => void;
  selectedSaleOption: 'DIRECT_BUYER' | 'MANDI' | 'SALVAGE_PIVOT';
  setSelectedSaleOption: (opt: 'DIRECT_BUYER' | 'MANDI' | 'SALVAGE_PIVOT') => void;
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

  const [role, setRoleState] = useState<UserRole>('agent');
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('kisan_spo_lang');
      if (saved === 'en' || saved === 'hi') return saved;
    } catch {
      // Ignore
    }
    return 'en';
  });

  const [selectedLotId, setSelectedLotId] = useState<string>('KS-MP-2025-089');
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, VerificationStatus>
  >({});

  const [arbitrageInput, setArbitrageInput] = useState<ArbitrageCalculationInput>(
    DEFAULT_ARBITRAGE_INPUT
  );
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

  // Verify existing session token on initial load
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
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
          setDevDemoMode(Boolean(data.devDemoMode));
          if (data.user.role !== 'admin') {
            setRoleState(data.user.role as UserRole);
          }
          setAuthStatus('AUTHENTICATED');
          const target: AppRoute =
            initialPath === '/admin' && data.user.role === 'admin'
              ? '/admin'
              : PROTECTED_ROUTES.includes(initialPath) && initialPath !== '/admin'
              ? initialPath
              : '/dashboard';
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
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [initialPath, syncHistory]);

  // Global keyboard shortcut: Ctrl + Shift + A (Windows/Linux) or Cmd + Shift + A (macOS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isKeyA = e.key === 'A' || e.key === 'a' || e.code === 'KeyA';

      if (!isModifier || !isShift || !isKeyA) return;

      // Do not trigger while typing inside an editable control
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

      // Do not trigger if another modal dialog is currently open
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
      if (authStatus !== 'AUTHENTICATED' && PROTECTED_ROUTES.includes(target)) {
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
      if (authStatus !== 'AUTHENTICATED' && PROTECTED_ROUTES.includes(nextRoute)) {
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

  // Animation 3 & Transition 1: Brief authentication success cue before entering destination
  const completeAuthTransition = useCallback(
    (
      sessionToken: string,
      authedUser: AuthenticatedUser,
      destination: AppRoute
    ) => {
      try {
        sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
      } catch {
        // Ignore
      }
      setToken(sessionToken);
      setUser(authedUser);
      if (authedUser.role !== 'admin') {
        setRoleState(authedUser.role as UserRole);
      }
      setAuthSuccessTransition(true);
      setTimeout(() => {
        setAuthStatus('AUTHENTICATED');
        setAuthSuccessTransition(false);
        syncHistory(destination);
      }, 280);
    },
    [syncHistory]
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
          data.user.role === 'admin' ? '/admin' : intendedRoute || '/dashboard';
        completeAuthTransition(data.token, data.user, target);
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'Network error communicating with authentication server.',
        };
      }
    },
    [intendedRoute, completeAuthTransition]
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
          intendedRoute || '/dashboard'
        );
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'Network error during account registration.',
        };
      }
    },
    [intendedRoute, completeAuthTransition]
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
        completeAuthTransition(data.token, data.user, '/admin');
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

  const logout = useCallback(async () => {
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
    setContractLocked(false);
    setProcessorPivotApproved(false);
    setAuthStatus('UNAUTHENTICATED');
    syncHistory('/login');
    showToast('Signed out securely. Protected session cleared.', 'blue');
  }, [token, syncHistory, showToast]);

  const setRole = useCallback(
    (nextRole: UserRole) => {
      setRoleState(nextRole);
      const roleLabels: Record<UserRole, string> = {
        farmer: 'Farmer / Family Proxy (किसान / पारिवारिक प्रतिनिधि)',
        agent: 'Village Agent / Arhtiya Partner (ग्रामीण एजेंट / आढ़तिया साथी)',
        buyer: 'Institutional Buyer (संस्थागत खरीदार)',
      };
      showToast(`Active view switched to: ${roleLabels[nextRole]}`, 'blue');
    },
    [showToast]
  );

  const setLanguage = useCallback(
    (nextLang: Language) => {
      setLanguageState(nextLang);
      try {
        localStorage.setItem('kisan_spo_lang', nextLang);
      } catch {
        // Ignore
      }
      showToast(
        nextLang === 'hi'
          ? 'भाषा बदली गई: हिंदी (Hindi Active)'
          : 'Language switched to English',
        'blue'
      );
    },
    [showToast]
  );

  const t = useCallback(
    (en: string, hi: string) => (language === 'hi' ? hi : en),
    [language]
  );

  const allLots = useMemo(() => {
    return CROP_LOTS.map((l) => {
      const override = statusOverrides[l.id];
      return override ? { ...l, verificationStatus: override } : l;
    });
  }, [statusOverrides]);

  const currentLot = useMemo(() => {
    return allLots.find((l) => l.id === selectedLotId) || allLots[0];
  }, [allLots, selectedLotId]);

  const currentPlot = useMemo(() => {
    return FARM_PLOTS[currentLot.id] || FARM_PLOTS['KS-MP-2025-089'];
  }, [currentLot.id]);

  const updateLotVerificationStatus = useCallback(
    (lotId: string, status: VerificationStatus) => {
      setStatusOverrides((prev) => ({ ...prev, [lotId]: status }));
      showToast(
        `Lot ${lotId} credential state updated to ${status.replace(/_/g, ' ')}`,
        status === 'INDEPENDENTLY_VERIFIED' || status === 'LABORATORY_TESTED'
          ? 'green'
          : 'saffron'
      );
    },
    [showToast]
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
        loginWithServer,
        registerWithServer,
        adminLoginWithServer,
        verifyEmailWithServer,
        logout,
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
