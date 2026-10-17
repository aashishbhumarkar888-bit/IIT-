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
import { ShowcasePage } from './pages/ShowcasePage';

const RouteViewport: React.FC = () => {
  const { route, authStatus } = useKisan();

  if (authStatus === 'LOADING') {
    return (
      <div className="min-h-screen w-full bg-white text-black flex items-center justify-center p-4">
        <div className="p-6 rounded-2xl border-2 border-[#000080] bg-white shadow-lg text-center max-w-sm w-full">
          <div className="w-10 h-10 rounded-lg bg-[#138808] text-white font-black text-lg flex items-center justify-center mx-auto">
            K
          </div>
          <h1 className="text-base font-extrabold text-[#000080] mt-3">
            Verifying Kisan-SPO Session...
          </h1>
          <p className="text-xs text-black font-semibold mt-1">
            Checking server-side session credentials
          </p>
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

  if (route === '/onboarding') {
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
      case '/showcase':
        return <ShowcasePage />;
      case '/admin':
        return <AdminDashboardPage />;
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
