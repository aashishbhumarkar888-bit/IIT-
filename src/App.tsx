/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AdminLoginDialog } from './components/AdminLoginDialog';
import { AppShell } from './components/AppShell';
import { OnboardingWizard } from './components/OnboardingWizard';
import {
  KisanProvider,
  PUBLIC_ROUTES,
  useKisan,
} from './context/KisanContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdvisoryPage } from './pages/AdvisoryPage';
import { AuthPage } from './pages/AuthPage';
import { CropPassportPage } from './pages/CropPassportPage';
import { CropToCashPage } from './pages/CropToCashPage';
import { DashboardPage } from './pages/DashboardPage';
import { HarvestPaymentsPage } from './pages/HarvestPaymentsPage';
import { MarketComparisonPage } from './pages/MarketComparisonPage';
import { ProfilePage } from './pages/ProfilePage';
import { ShowcasePage } from './pages/ShowcasePage';

const RouteViewport: React.FC = () => {
  const {
    route,
    authStatus,
    profileStatus,
    profileError,
    user,
    retryProfileInit,
    logout,
  } = useKisan();

  if (
    authStatus === 'LOADING' ||
    profileStatus === 'LOADING' ||
    profileStatus === 'INITIALIZING'
  ) {
    return (
      <div className="min-h-screen w-full bg-white text-black flex items-center justify-center p-4">
        <div className="p-6 rounded-2xl border-2 border-[#000080] bg-white shadow-lg text-center max-w-sm w-full">
          <div className="w-10 h-10 rounded-lg bg-[#138808] text-white font-black text-lg flex items-center justify-center mx-auto">
            K
          </div>
          <h1 className="text-base font-extrabold text-[#000080] mt-3">
            {profileStatus === 'INITIALIZING'
              ? 'Initializing Kisan-SPO Profile...'
              : 'Verifying Kisan-SPO Session...'}
          </h1>
          <p className="text-xs text-black font-semibold mt-1">
            {profileStatus === 'INITIALIZING'
              ? 'Synchronizing your personal workspace and crop records'
              : 'Checking server-side session credentials'}
          </p>
        </div>
      </div>
    );
  }

  if (profileStatus === 'ERROR') {
    return (
      <div className="min-h-screen w-full bg-white text-black flex items-center justify-center p-4">
        <div className="p-6 rounded-2xl border-2 border-[#FF9933] bg-white shadow-lg max-w-md w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF3E0] border border-[#FF9933] text-[#000080] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                warning
              </span>
            </div>
            <div>
              <h1 className="text-base font-black text-[#000080]">
                Profile Initialization Failed
              </h1>
              <p className="text-xs font-bold text-black/70">
                प्रोफ़ाइल लोड करने में समस्या आई है
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold text-black mt-3 bg-[#FFF3E0]/60 border border-[#FF9933]/40 rounded-lg p-3">
            {profileError ||
              'Unable to load or synchronize your profile. Please retry or sign out.'}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            <button
              type="button"
              onClick={() => void retryProfileInit()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#138808] text-white text-xs font-black hover:bg-[#0f6d06] transition-all cursor-pointer"
            >
              Retry Profile Load
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="px-4 py-2.5 rounded-xl border-2 border-[#000080] bg-white text-[#000080] text-xs font-black hover:bg-[#E8EAF6] transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === 'UNAUTHENTICATED' || PUBLIC_ROUTES.includes(route)) {
    return (
      <>
        <AuthPage />
        <AdminLoginDialog />
      </>
    );
  }

  const requiresOnboarding =
    user !== null &&
    user.role !== 'admin' &&
    (user.onboardingStatus === 'INCOMPLETE' ||
      user.onboardingStatus === 'NOT_STARTED' ||
      user.onboardingStatus === 'IN_PROGRESS');

  if (route === '/onboarding' || requiresOnboarding) {
    return (
      <>
        <OnboardingWizard />
        <AdminLoginDialog />
      </>
    );
  }

  const renderPage = () => {
    switch (route) {
      case '/advisory':
        return <AdvisoryPage />;
      case '/crop-to-cash':
        return <CropToCashPage />;
      case '/crop-passport':
        return <CropPassportPage />;
      case '/market-comparison':
        return <MarketComparisonPage />;
      case '/harvest-payments':
        return <HarvestPaymentsPage />;
      case '/profile':
        return <ProfilePage />;
      case '/showcase':
        return <ShowcasePage />;
      case '/admin':
        return user?.role === 'admin' ? (
          <AdminDashboardPage />
        ) : (
          <DashboardPage />
        );
      case '/dashboard':
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <AppShell>
        <div key={route} className="anim-route-enter">
          {renderPage()}
        </div>
      </AppShell>
      <AdminLoginDialog />
    </>
  );
};

export default function App() {
  return (
    <KisanProvider>
      <RouteViewport />
    </KisanProvider>
  );
}
