import React, { useState } from 'react';
import { AppRoute, useKisan } from '../context/KisanContext';
import { KISAN_LOGO_URL } from '../data/kisanData';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/kisan';

interface NavItem {
  route: AppRoute;
  labelEn: string;
  labelHi: string;
  mobileLabelEn: string;
  mobileLabelHi: string;
  icon: string;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    route: '/dashboard',
    labelEn: 'Operations Dashboard',
    labelHi: 'संचालन डैशबोर्ड',
    mobileLabelEn: 'Home',
    mobileLabelHi: 'होम',
    icon: 'grid_view',
  },
  {
    route: '/advisory',
    labelEn: 'Monitor & Advisory',
    labelHi: 'निगरानी और सलाह',
    mobileLabelEn: 'My Crops',
    mobileLabelHi: 'मेरी फसल',
    icon: 'potted_plant',
  },
  {
    route: '/crop-to-cash',
    labelEn: 'Crop-to-Cash Ledger',
    labelHi: 'फसल से भुगतान लेज़र',
    mobileLabelEn: 'Ledger',
    mobileLabelHi: 'लेज़र',
    icon: 'account_tree',
  },
  {
    route: '/crop-passport',
    labelEn: 'Crop Passport',
    labelHi: 'फसल पासपोर्ट',
    mobileLabelEn: 'Passport',
    mobileLabelHi: 'पासपोर्ट',
    icon: 'badge',
  },
  {
    route: '/market-comparison',
    labelEn: 'Market & Arbitrage',
    labelHi: 'बाजार और भाव तुलना',
    mobileLabelEn: 'Market',
    mobileLabelHi: 'बाजार',
    icon: 'storefront',
  },
  {
    route: '/harvest-payments',
    labelEn: 'Weighbridge & Escrow',
    labelHi: 'तौल एवं भुगतान',
    mobileLabelEn: 'Payments',
    mobileLabelHi: 'भुगतान',
    icon: 'account_balance_wallet',
  },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    route,
    navigate,
    role,
    setRole,
    language,
    setLanguage,
    t,
    toast,
    clearToast,
    personalLots,
  } = useKisan();
  const { user, logout, verifyEmailWithServer, updateUserProfile } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<boolean>(false);

  const currentNav =
    PRIMARY_NAV_ITEMS.find((item) => item.route === route) ||
    PRIMARY_NAV_ITEMS[0];

  const isDemoUser = Boolean(user?.isDemoAccount);
  const personalLocation =
    [user?.village, user?.district, user?.state].filter(Boolean).join(', ') ||
    'Personal Workspace';

  const roleMetadata: Record<
    UserRole,
    { titleEn: string; titleHi: string; personName: string; subtitle: string }
  > = {
    farmer: {
      titleEn: 'Farmer / Family Proxy',
      titleHi: 'किसान / पारिवारिक प्रतिनिधि',
      personName: isDemoUser
        ? 'Rameshwar Patidar (Demo Farmer)'
        : user?.name || 'Farmer Workspace',
      subtitle: isDemoUser
        ? 'Grower & Authorized Proxy (Khandwa)'
        : `Track crops, advisories & buyer offers • ${personalLocation}`,
    },
    agent: {
      titleEn: 'Village Agent / Arhtiya Partner',
      titleHi: 'ग्रामीण एजेंट / आढ़तिया साथी',
      personName: isDemoUser
        ? 'Vikram Singh Chouhan (Demo Agent)'
        : user?.name || 'Village Agent Workspace',
      subtitle: isDemoUser
        ? 'Senior Mandi Registrar • Khandwa Hub'
        : `Coordinate farmer onboarding & pickups • ${personalLocation}`,
    },
    buyer: {
      titleEn: 'Institutional Buyer',
      titleHi: 'संस्थागत खरीदार',
      personName: isDemoUser
        ? 'AgriCorp Procurement Desk (Demo Buyer)'
        : user?.name || 'Buyer Workspace',
      subtitle: isDemoUser
        ? 'Corporate Off-Take & Quality Audit'
        : `Inspect crop lots, quality & offers • ${personalLocation}`,
    },
  };

  const activeRoleMeta = roleMetadata[role];

  // If on /showcase, render the Showcase Top Header from Stitch Image 1
  if (route === '/showcase') {
    return (
      <div className="min-h-screen w-full bg-white text-black flex flex-col">
        <header className="sticky top-0 w-full z-50 bg-white border-b-2 border-[#000080]/20">
          <div className="max-w-[1536px] mx-auto min-h-[72px] px-4 md:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {!logoError ? (
                <img
                  alt="Kisan-SPO Logo"
                  className="h-9 w-9 object-contain shrink-0"
                  src={KISAN_LOGO_URL}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-9 h-9 rounded bg-[#138808] text-white flex items-center justify-center font-bold">
                  K
                </div>
              )}
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-lg md:text-xl font-extrabold text-[#000080] tracking-tight">
                    Kisan-SPO
                  </span>
                  <span className="text-[10px] uppercase text-[#138808] font-extrabold tracking-wider">
                    AGRISTACK READY
                  </span>
                </div>
                <span className="text-[11px] text-black font-semibold hidden sm:inline">
                  Smart Procurement &amp; Lifecycle Orchestration • Smarter Farming. Fairer Markets.
                </span>
                <span className="text-[11px] text-[#006B3C] font-bold font-hindi">
                  सही सलाह • बेहतर दाम • सुरक्षित भुगतान
                </span>
              </div>
            </div>

            <nav
              aria-label="Showcase and Application Navigation"
              className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1"
            >
              <button
                type="button"
                onClick={() => navigate('/showcase')}
                className="px-3 py-2 rounded bg-[#000080] text-white text-xs font-bold whitespace-nowrap shrink-0 min-h-[40px]"
              >
                {t('Product Presentation Showcase', 'प्रोडक्ट प्रस्तुति शोकेस')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-3 py-2 rounded bg-white text-[#000080] border border-[#000080]/30 hover:bg-[#E8EAF6] text-xs font-bold whitespace-nowrap shrink-0 min-h-[40px]"
              >
                {t('Operations Dashboard', 'संचालन डैशबोर्ड')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/advisory')}
                className="px-3 py-2 rounded bg-white text-black border border-[#000080]/20 hover:bg-[#E8F5E9] text-xs font-semibold whitespace-nowrap shrink-0 min-h-[40px]"
              >
                {t('1. Advisory', '1. फसल सलाह')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/crop-passport')}
                className="px-3 py-2 rounded bg-white text-black border border-[#000080]/20 hover:bg-[#E8F5E9] text-xs font-semibold whitespace-nowrap shrink-0 min-h-[40px]"
              >
                {t('2. Passport', '2. पासपोर्ट')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/market-comparison')}
                className="px-3 py-2 rounded bg-white text-black border border-[#000080]/20 hover:bg-[#E8F5E9] text-xs font-semibold whitespace-nowrap shrink-0 min-h-[40px]"
              >
                {t('3. Arbitrage', '3. बाजार तुलना')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/harvest-payments')}
                className="px-3 py-2 rounded bg-white text-black border border-[#000080]/20 hover:bg-[#E8F5E9] text-xs font-semibold whitespace-nowrap shrink-0 min-h-[40px]"
              >
                {t('4. Escrow', '4. भुगतान')}
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#E8F5E9] border border-[#138808]/30 rounded">
                <span className="material-symbols-outlined text-[#138808] text-[16px]">
                  verified_user
                </span>
                <span className="text-[11px] text-black font-bold">
                  256-Bit SSL • AgriStack Verified
                </span>
              </div>

              <div
                role="group"
                aria-label={t('Language switcher', 'भाषा चयनकर्ता')}
                className="flex items-center bg-[#E8EAF6] rounded p-0.5 border border-[#000080]/20"
              >
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  aria-pressed={language === 'en'}
                  aria-label={t('Switch language to English', 'अंग्रेज़ी भाषा चुनें')}
                  className={`px-2.5 py-1 text-xs rounded font-bold min-h-[32px] transition-colors ${
                    language === 'en'
                      ? 'bg-[#000080] text-white'
                      : 'text-black hover:bg-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  aria-pressed={language === 'hi'}
                  aria-label={t('Switch language to Hindi', 'हिंदी भाषा चुनें')}
                  className={`px-2.5 py-1 text-xs rounded font-bold font-hindi min-h-[32px] transition-colors ${
                    language === 'hi'
                      ? 'bg-[#000080] text-white'
                      : 'text-black hover:bg-white'
                  }`}
                >
                  हिंदी
                </button>
              </div>

              <button
                type="button"
                aria-label={t(
                  'User Profile and Role Settings',
                  'उपयोगकर्ता प्रोफ़ाइल और भूमिका सेटिंग्स'
                )}
                onClick={() => setProfileModalOpen(true)}
                className="w-10 h-10 rounded-full bg-[#000080] text-white flex items-center justify-center shrink-0 hover:bg-[#00003C]"
              >
                <span className="material-symbols-outlined text-[20px]">
                  person
                </span>
              </button>
            </div>
          </div>
        </header>

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-lg shadow-lg border-2 flex items-center justify-between gap-3 ${
              toast.type === 'saffron'
                ? 'bg-[#FF9933] text-black border-black'
                : toast.type === 'blue'
                ? 'bg-[#000080] text-white border-white'
                : 'bg-[#138808] text-white border-white'
            }`}
          >
            <span className="text-xs font-bold">{toast.message}</span>
            <button
              type="button"
              onClick={clearToast}
              aria-label="Dismiss notification"
              className="p-1 rounded hover:opacity-80 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <main className="flex-1 w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col lg:flex-row">
      {/* DESKTOP / TABLET PERSISTENT & COLLAPSIBLE SIDEBAR */}
      <aside
        aria-label="Primary Sidebar Navigation"
        className={`hidden lg:flex flex-col justify-between shrink-0 bg-white border-r border-[#000080]/20 transition-all duration-200 z-40 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col gap-4 py-4">
          {/* Brand Header inside Sidebar */}
          <div className="px-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded bg-[#000080] text-white flex items-center justify-center font-extrabold text-lg shrink-0">
                K
              </div>
              {sidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-extrabold text-[#000080] leading-tight truncate">
                    KISAN-SPO
                  </span>
                  <span className="text-[10px] font-bold text-[#006B3C] uppercase tracking-wider truncate">
                    Mandi Operations Desk
                  </span>
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className="w-9 h-9 rounded border border-[#000080]/20 flex items-center justify-center text-[#000080] hover:bg-[#E8EAF6] shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                {sidebarOpen ? 'left_panel_close' : 'left_panel_open'}
              </span>
            </button>
          </div>

          {/* Primary 5 Screens + Showcase Navigation */}
          <nav className="flex flex-col gap-1 px-2.5" aria-label="Main Workflows">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive = route === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => navigate(item.route)}
                  aria-current={isActive ? 'page' : undefined}
                  title={`${item.labelEn} (${item.labelHi})`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-[#000080] text-white font-bold shadow-sm'
                      : 'text-black hover:bg-[#E8EAF6] font-semibold'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] shrink-0 ${
                      isActive ? 'text-white' : 'text-[#000080]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm leading-tight truncate">
                        {language === 'hi' ? item.labelHi : item.labelEn}
                      </span>
                      <span
                        className={`text-[10px] font-hindi truncate ${
                          isActive ? 'text-[#9DF6B9]' : 'text-[#006B3C]'
                        }`}
                      >
                        {language === 'hi' ? item.labelEn : item.labelHi}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}

            <div className="my-2 border-t border-[#000080]/15" />

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors min-h-[44px] font-bold border ${
                route === '/profile'
                  ? 'bg-[#000080] text-white border-[#000080]'
                  : 'bg-white text-[#000080] hover:bg-[#E8EAF6] border-[#000080]/25'
              }`}
              title="Personal Profile & Workspace Preferences"
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">
                manage_accounts
              </span>
              {sidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-extrabold uppercase tracking-wider truncate">
                    My Profile
                  </span>
                  <span className="text-[10px] font-semibold truncate">
                    Preferences &amp; Security
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/showcase')}
              className="mt-1 flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors min-h-[44px] bg-[#E8F5E9] text-[#006B3C] hover:bg-[#138808] hover:text-white font-bold border border-[#138808]/30"
              title="Multi-Device Presentation Showcase"
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">
                devices
              </span>
              {sidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-extrabold uppercase tracking-wider truncate">
                    5-Screen Showcase
                  </span>
                  <span className="text-[10px] font-semibold truncate">
                    Tablet + 4 Phones View
                  </span>
                </div>
              )}
            </button>

            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className={`mt-1 flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors min-h-[44px] font-bold border ${
                  route === '/admin'
                    ? 'bg-[#000080] text-white border-[#000080]'
                    : 'bg-[#E8EAF6] text-[#000080] hover:bg-[#000080] hover:text-white border-[#000080]/30'
                }`}
                title={t('Administrator Console', 'प्रशासक कंसोल')}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">
                  admin_panel_settings
                </span>
                {sidebarOpen && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-extrabold uppercase tracking-wider truncate">
                      {t('Admin Console', 'प्रशासक कंसोल')}
                    </span>
                    <span className="text-[10px] font-semibold truncate">
                      {t('Authorized Session', 'अधिकृत सत्र')}
                    </span>
                  </div>
                )}
              </button>
            )}
          </nav>

          {/* Role-Specific Context Menu in Sidebar */}
          {sidebarOpen && (
            <div className="px-4 pt-2">
              <div className="p-3 rounded-lg bg-[#E8EAF6] border border-[#000080]/20">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#000080] block">
                  {t('ACTIVE WORKSPACE', 'सक्रिय कार्यक्षेत्र')}
                </span>
                <span className="text-xs font-bold text-black block mt-0.5">
                  {language === 'hi'
                    ? activeRoleMeta.titleHi
                    : activeRoleMeta.titleEn}
                </span>
                <span className="text-[11px] font-extrabold text-[#000080] block mt-0.5 truncate">
                  {user ? user.name : activeRoleMeta.personName}
                </span>
                <p className="text-[10px] text-[#006B3C] font-bold mt-1">
                  {user?.isDemoAccount
                    ? 'Demo Account • Sample Data'
                    : 'Personal Authenticated Workspace'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sync Protocol Footer in Sidebar */}
        <div className="px-3 py-4 border-t border-[#000080]/15 flex flex-col gap-2">
          {sidebarOpen ? (
            <>
              <div className="p-2.5 rounded bg-[#E8F5E9] border border-[#138808]/30 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-black uppercase">
                    SYNC PROTOCOL
                  </span>
                  <span className="text-xs text-[#138808] font-bold">
                    NAFED / e-NAM Demo
                  </span>
                </div>
                <span className="material-symbols-outlined text-[#138808] text-[18px]">
                  verified
                </span>
              </div>
              <div className="flex items-center justify-between text-black text-[10px] font-bold font-tabular px-1">
                <span>APMC TERMINAL 104</span>
                <span>v2.4.1</span>
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <span
                className="material-symbols-outlined text-[#138808] text-[20px]"
                title="NAFED / e-NAM Demo Sync"
              >
                verified
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT COLUMN */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* MOBILE & TABLET COMPACT HEADER (< lg) */}
        <header className="lg:hidden sticky top-0 inset-x-0 z-40 bg-white border-b border-[#000080]/20 pt-safe">
          <div className="h-16 px-3 sm:px-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                aria-label="Kisan-SPO Home"
                className="w-10 h-10 rounded-lg bg-[#138808] text-white flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[22px]">
                  eco
                </span>
              </button>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-[#138808] font-extrabold leading-none">
                  KISAN-SPO
                </span>
                <h1 className="text-base font-extrabold text-[#000080] leading-tight truncate">
                  {language === 'hi'
                    ? currentNav.labelHi
                    : currentNav.labelEn}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/showcase')}
                className="min-h-[40px] px-2.5 rounded bg-[#E8EAF6] text-[#000080] border border-[#000080]/30 text-[11px] font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">
                  devices
                </span>
                <span className="hidden sm:inline">Showcase</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                aria-label="Toggle English or Hindi language"
                className="min-h-[44px] min-w-[44px] px-1.5 flex items-center justify-center"
              >
                <div className="flex items-center bg-[#E8EAF6] border border-[#000080]/30 px-2 py-1 rounded-full">
                  <span
                    className={`text-[11px] font-extrabold px-1 rounded ${
                      language === 'en'
                        ? 'bg-[#000080] text-white'
                        : 'text-black'
                    }`}
                  >
                    EN
                  </span>
                  <span
                    className={`text-[11px] font-extrabold font-hindi px-1 rounded ${
                      language === 'hi'
                        ? 'bg-[#000080] text-white'
                        : 'text-black'
                    }`}
                  >
                    हि
                  </span>
                </div>
              </button>

              <button
                type="button"
                aria-label="Role and User Profile"
                onClick={() => setProfileModalOpen(true)}
                className="w-10 h-10 rounded-full bg-[#000080] text-white flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">
                  person
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* DESKTOP TOP HEADER BAR (lg+) */}
        <header className="hidden lg:flex sticky top-0 z-30 h-16 bg-white border-b border-[#000080]/20 px-6 items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-extrabold text-[#000080]">
              {user?.name ? `Hello, ${user.name}` : 'Welcome to Kisan-SPO'}
            </span>
            <span className="px-2.5 py-0.5 bg-[#E8F5E9] border border-[#138808]/30 rounded text-[11px] text-[#006B3C] font-extrabold">
              {activeRoleMeta.titleEn}
            </span>
            {user?.isDemoAccount && (
              <span className="px-2.5 py-0.5 bg-[#FFDCC2] border border-[#FF9933] rounded text-[10px] text-[#371A00] font-extrabold uppercase tracking-wider">
                Demo Account • Sample Data
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div
              role="group"
              aria-label="Language Selector"
              className="flex items-center bg-[#E8EAF6] p-0.5 rounded border border-[#000080]/20"
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                  language === 'en'
                    ? 'bg-[#000080] text-white'
                    : 'text-black hover:bg-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2 py-1 rounded text-[11px] font-bold font-hindi transition-colors ${
                  language === 'hi'
                    ? 'bg-[#000080] text-white'
                    : 'text-black hover:bg-white'
                }`}
              >
                हिन्दी
              </button>
            </div>

            <button
              type="button"
              aria-label="Open Workspace Notifications"
              onClick={() => setNotificationsOpen(true)}
              className="w-10 h-10 rounded border border-[#000080]/20 flex items-center justify-center text-[#000080] hover:bg-[#E8EAF6] relative"
            >
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
              {(user?.isDemoAccount || personalLots.length > 0) && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#FF9933] border border-black" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded border border-[#000080]/20 hover:bg-[#E8EAF6] text-left"
            >
              <div className="flex flex-col text-right">
                <span className="text-xs text-black font-extrabold leading-tight">
                  {user ? user.name : activeRoleMeta.personName}
                </span>
                <span className="text-[10px] text-[#000080] font-bold">
                  {user?.role === 'admin'
                    ? 'Verified Administrator'
                    : activeRoleMeta.titleEn}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#000080] text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">
                  person
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* TOAST FEEDBACK BANNER */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-md px-4 py-3 rounded-lg shadow-xl border-2 flex items-center justify-between gap-3 ${
              toast.type === 'saffron'
                ? 'bg-[#FF9933] text-black border-black'
                : toast.type === 'blue'
                ? 'bg-[#000080] text-white border-white'
                : 'bg-[#138808] text-white border-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {toast.type === 'saffron' ? 'warning' : 'check_circle'}
              </span>
              <span className="text-xs font-bold leading-snug">
                {toast.message}
              </span>
            </div>
            <button
              type="button"
              onClick={clearToast}
              aria-label="Close message"
              className="px-2 py-0.5 rounded font-bold text-xs border border-current"
            >
              OK
            </button>
          </div>
        )}

        {/* PAGE CONTENT VIEWPORT */}
        <main className="flex-1 w-full pb-24 lg:pb-8">{children}</main>

        {/* MOBILE BOTTOM NAVIGATION BAR (< lg) */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-safe bg-white border-t-2 border-[#000080]/20 shadow-lg"
        >
          <div className="grid grid-cols-6 items-center h-16 px-1">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive = route === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => navigate(item.route)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 rounded transition-colors ${
                    isActive
                      ? 'text-[#138808] font-extrabold bg-[#E8F5E9]'
                      : 'text-black font-semibold hover:bg-[#E8EAF6]'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] ${
                      isActive ? 'text-[#138808]' : 'text-[#000080]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[10px] mt-0.5 truncate max-w-full px-1">
                    {language === 'hi'
                      ? item.mobileLabelHi
                      : item.mobileLabelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* PROFILE & ROLE SWITCHER MODAL */}
      {profileModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#138808] block">
                  KISAN-SPO ROLE &amp; SESSION CONTROL
                </span>
                <h2
                  id="role-modal-title"
                  className="text-lg font-extrabold text-[#000080]"
                >
                  {t(
                    'Select Active Prototype Role & Preferences',
                    'सक्रिय भूमिका और भाषा चुनें'
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                aria-label="Close modal"
                className="w-10 h-10 rounded-lg border border-[#000080]/30 flex items-center justify-center text-black font-bold hover:bg-[#E8EAF6]"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-extrabold uppercase text-[#000080]">
                {t('Three Primary Role Modes', 'तीन प्रमुख उपयोगकर्ता भूमिकाएं')}
              </span>
              {(['farmer', 'agent', 'buyer'] as UserRole[]).map((r) => {
                const isSelected = role === r;
                const meta = roleMetadata[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      if (user) {
                        void updateUserProfile({ role: r });
                      }
                      setProfileModalOpen(false);
                    }}
                    className={`p-3 rounded-lg border-2 text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#138808] text-white border-[#006B3C]'
                        : 'bg-white text-black border-[#000080]/30 hover:bg-[#E8EAF6]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-extrabold">
                        {meta.titleEn}
                      </div>
                      <div
                        className={`text-xs font-hindi font-bold ${
                          isSelected ? 'text-[#9DF6B9]' : 'text-[#006B3C]'
                        }`}
                      >
                        {meta.titleHi}
                      </div>
                      <div
                        className={`text-[11px] mt-0.5 ${
                          isSelected ? 'text-white' : 'text-black'
                        }`}
                      >
                        {meta.personName} • {meta.subtitle}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[22px]">
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </button>
                );
              })}
            </div>

            {user && (
              <div className="p-3 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 text-xs text-black flex items-center justify-between gap-2">
                <div>
                  <strong className="font-extrabold text-[#000080] block">
                    Signed in: {user.name} ({user.email})
                  </strong>
                  <span className="text-[11px] font-semibold">
                    Account Status:{' '}
                    {user.emailVerified
                      ? 'Email Verified'
                      : 'Pending Email Verification'}
                  </span>
                </div>
                {!user.emailVerified && (
                  <button
                    type="button"
                    onClick={verifyEmailWithServer}
                    className="px-2.5 py-1.5 rounded bg-[#138808] text-white text-[11px] font-extrabold shrink-0"
                  >
                    Verify Email
                  </button>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg bg-[#FFDCC2] border-2 border-[#FF9933] text-black text-xs">
              <strong className="font-extrabold block uppercase text-[#371A00]">
                Security &amp; Authorization Notice
              </strong>
              Role switching in this prototype updates local application state
              and sample role-specific operational views. All administrative
              routes (<code>/admin</code>) are enforced via server-side RBAC.
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#000080]/20">
              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  logout();
                }}
                className="px-3.5 py-2.5 rounded bg-[#FF9933] text-black border border-black text-xs font-extrabold"
              >
                Sign Out
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalOpen(false);
                    navigate('/profile');
                  }}
                  className="px-3.5 py-2.5 rounded bg-[#E8EAF6] text-[#000080] border border-[#000080] text-xs font-extrabold"
                >
                  {t('My Profile', 'मेरी प्रोफ़ाइल')}
                </button>
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileModalOpen(false);
                      navigate('/admin');
                    }}
                    className="px-3.5 py-2.5 rounded bg-white text-[#000080] border-2 border-[#000080] text-xs font-extrabold"
                  >
                    {t('Admin Console', 'प्रशासक कंसोल')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalOpen(false);
                    navigate('/showcase');
                  }}
                  className="px-3.5 py-2.5 rounded bg-[#000080] text-white text-xs font-bold"
                >
                  {t('5-Device Showcase', '5-स्क्रीन शोकेस')}
                </button>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded bg-[#138808] text-white text-xs font-bold"
                >
                  {t('Done', 'पूर्ण')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS MODAL (State-Driven: No fake alerts on brand-new accounts) */}
      {notificationsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notif-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="notif-modal-title"
                className="text-base font-extrabold text-[#000080]"
              >
                {user?.isDemoAccount
                  ? 'Demo Operational Alerts (Sample Data)'
                  : 'Your Workspace Notifications'}
              </h2>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close notifications"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            {user?.isDemoAccount ? (
              <div className="flex flex-col gap-2 text-xs">
                <div className="p-3 rounded bg-[#FF9933] text-black border border-black">
                  <span className="font-extrabold block uppercase">
                    [SAMPLE] PHI Waiting Period Active (8 Days Left)
                  </span>
                  <p className="mt-0.5 font-semibold">
                    Demo Specimen #0942: Chemical fungicide application blocked
                    prior to 18 Oct 2026 harvest.
                  </p>
                </div>
                <div className="p-3 rounded bg-[#E8F5E9] text-black border border-[#138808]">
                  <span className="font-extrabold text-[#138808] block uppercase">
                    [SAMPLE] 50% Instant UPI Escrow Credited
                  </span>
                  <p className="mt-0.5 font-semibold">
                    Demo TXN #99482: ₹26,875 released on Weigh-Slip #A-14
                    sign-off.
                  </p>
                </div>
              </div>
            ) : personalLots.length > 0 ? (
              <div className="flex flex-col gap-2 text-xs">
                {personalLots.map((lot) => (
                  <div
                    key={lot.id}
                    className="p-3 rounded bg-[#E8F5E9] text-black border border-[#138808]"
                  >
                    <span className="font-extrabold text-[#138808] block uppercase">
                      Crop Lot {lot.shortCode} Registered
                    </span>
                    <p className="mt-0.5 font-semibold">
                      {lot.quantityQuintals} Quintals of {lot.cropName} (
                      {lot.variety}) • Status:{' '}
                      {lot.verificationStatus.replace(/_/g, ' ')}.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#E8EAF6]/60 border border-[#000080]/20 text-center space-y-1.5 text-xs">
                <span className="material-symbols-outlined text-[#000080] text-[24px]">
                  notifications_none
                </span>
                <p className="font-extrabold text-[#000080]">
                  No notifications yet
                </p>
                <p className="text-black font-medium">
                  Alerts for your crop lots, buyer bids, pickup schedules, and
                  payment milestones will appear here once you add your first
                  crop.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              className="w-full py-2.5 rounded bg-[#000080] text-white text-xs font-bold mt-1"
            >
              Close Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
