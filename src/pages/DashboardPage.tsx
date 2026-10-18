import React, { useMemo, useState } from 'react';
import { PersonalizedDashboard } from '../components/PersonalizedDashboard';
import { AppRoute, useKisan } from '../context/KisanContext';
import {
  BUYER_OFFERS,
  COMMODITY_MARKET_RATES,
  CROP_LOTS,
  FARMERS,
} from '../data/kisanData';
import { formatINR } from '../services/kisanService';
import { UserRole } from '../types/kisan';

interface DashboardPageProps {
  compactMode?: boolean;
}

interface RoleModuleCard {
  id: string;
  titleEn: string;
  titleHi: string;
  metric: string;
  statusLabel: string;
  description: string;
  icon: string;
  targetRoute?: AppRoute;
}

const ROLE_MODULES: Record<UserRole, RoleModuleCard[]> = {
  farmer: [
    {
      id: 'crop-to-cash',
      titleEn: 'Crop-to-Cash Ledger',
      titleHi: 'फसल से भुगतान लेज़र',
      metric: 'One lot across the journey',
      statusLabel: 'DEMO DATA',
      description: 'Preview screening, net-return options, and sale tracking.',
      icon: 'account_tree',
      targetRoute: '/crop-to-cash',
    },
    {
      id: 'my-crops',
      titleEn: 'My Crops',
      titleHi: 'मेरी फसलें',
      metric: '2 Active Lots (50 Qtl)',
      statusLabel: 'PHI: 8 Days Left',
      description: 'Sharbati Wheat (2.4 Ha) & Yellow Soybean (2.5 Ha) monitored.',
      icon: 'potted_plant',
      targetRoute: '/advisory',
    },
    {
      id: 'crop-passport',
      titleEn: 'Crop Passport',
      titleHi: 'डिजिटल फसल पासपोर्ट',
      metric: 'Lot #KS-089 Verified',
      statusLabel: 'NABL Zero-MRL',
      description: 'Cryptographic QR credential & 4-pin GPS cadastre ready.',
      icon: 'badge',
      targetRoute: '/crop-passport',
    },
    {
      id: 'market-bids',
      titleEn: 'Market & Bids',
      titleHi: 'बाजार और बोलियां',
      metric: '+₹10,988 Net Gain',
      statusLabel: '₹2,150/qtl Direct',
      description: 'Compare Local Mandi (₹1,820/qtl) vs ITC Direct Farmgate.',
      icon: 'storefront',
      targetRoute: '/market-comparison',
    },
    {
      id: 'harvest-schedule',
      titleEn: 'Harvest Schedule',
      titleHi: 'कटाई और पिकअप समय',
      metric: '18 Oct 2026 • 06:00 AM',
      statusLabel: 'Truck #MP-12-GA-4482',
      description: 'Pooled farmgate pickup confirmed with 34% freight saving.',
      icon: 'calendar_month',
      targetRoute: '/harvest-payments',
    },
    {
      id: 'payments',
      titleEn: 'Payments',
      titleHi: 'भुगतान और एस्क्रो',
      metric: '₹26,875 (50% Paid)',
      statusLabel: '₹26,875 Locked',
      description: '50-50 UPI Escrow split active for 25 Quintal lot.',
      icon: 'account_balance_wallet',
      targetRoute: '/harvest-payments',
    },
    {
      id: 'family-proxy',
      titleEn: 'Family Proxy Permissions',
      titleHi: 'पारिवारिक प्रतिनिधि अधिकार',
      metric: '1 Authorized Proxy',
      statusLabel: 'Anil Patel (Son)',
      description: 'Authorized to sign weigh-slips and gate tokens at Khandwa.',
      icon: 'family_restroom',
    },
    {
      id: 'documents',
      titleEn: 'Documents',
      titleHi: 'दस्तावेज़ और खसरा',
      metric: 'Survey #142/2 & NABL',
      statusLabel: '3 Records Synced',
      description: 'Bhu-Abhilekh land record, NABL MRL assay & weigh-slip.',
      icon: 'description',
      targetRoute: '/crop-passport',
    },
    {
      id: 'support',
      titleEn: 'Support',
      titleHi: 'किसान सहायता केंद्र',
      metric: 'KVK Agronomist Desk',
      statusLabel: 'Hindi Voice & Call',
      description: 'Direct extension officer consultation & dispute helpdesk.',
      icon: 'support_agent',
      targetRoute: '/advisory',
    },
  ],
  agent: [
    {
      id: 'village-inventory',
      titleEn: 'Village Inventory',
      titleHi: 'ग्राम फसल स्टॉक',
      metric: '48 MT Across 3 Villages',
      statusLabel: '84 Quintals Graded A',
      description: 'Aggregated Sharbati Wheat & Soybean in Khandwa cluster.',
      icon: 'inventory_2',
      targetRoute: '/crop-passport',
    },
    {
      id: 'farmer-onboarding',
      titleEn: 'Farmer Onboarding',
      titleHi: 'किसान पंजीकरण',
      metric: '8 Farmers Enrolled',
      statusLabel: 'KYC & Cadastre Mapped',
      description: 'Ramesh Patel, Suresh Kumar & 6 FPO members verified.',
      icon: 'person_add',
      targetRoute: '/crop-passport',
    },
    {
      id: 'truck-pooling',
      titleEn: 'Truck Pooling',
      titleHi: 'ट्रक समूहीकरण',
      metric: '12.4 / 16.0 MT (75%)',
      statusLabel: '-34% Freight Cost',
      description: 'Eicher 16T route pooling across Chhaigaon & Deshgaon.',
      icon: 'local_shipping',
    },
    {
      id: 'pickup-scheduling',
      titleEn: 'Pickup Scheduling',
      titleHi: 'पिकअप समय-सारणी',
      metric: 'Tomorrow 06:00 AM',
      statusLabel: '3 Stops Sequenced',
      description: 'NH-34 arterial dispatch to Indore Mega Silo.',
      icon: 'schedule_send',
    },
    {
      id: 'gate-pass-queue',
      titleEn: 'Gate-Pass Queue',
      titleHi: 'गेट-पास टोकन कतार',
      metric: 'Token #A-14 Active',
      statusLabel: '12 Min Est. Wait',
      description: 'Zero-congestion digital token queue at Bay #4.',
      icon: 'confirmation_number',
      targetRoute: '/harvest-payments',
    },
    {
      id: 'weighbridge-coord',
      titleEn: 'Weighbridge Coordination',
      titleHi: 'धर्मकांटा समन्वय',
      metric: '2,500.0 Kg Net Verified',
      statusLabel: 'Terminal #104 RS232',
      description: 'Zero Karda deduction enforced with automated tare capture.',
      icon: 'scale',
      targetRoute: '/harvest-payments',
    },
    {
      id: 'procurement-status',
      titleEn: 'Procurement Status',
      titleHi: 'खरीद अनुबंध स्थिति',
      metric: '12 Corporate Buyers',
      statusLabel: '+₹230/qtl Spread',
      description: 'Real-time arbitrage tracking between Mandi & Direct Mills.',
      icon: 'gavel',
      targetRoute: '/market-comparison',
    },
    {
      id: 'escrow-monitoring',
      titleEn: 'Escrow Monitoring',
      titleHi: 'एस्क्रो भुगतान निगरानी',
      metric: '₹2,68,750 Locked',
      statusLabel: 'T+0 UPI Reconciled',
      description: 'Monitoring 50% instant weighment releases & 24h locks.',
      icon: 'assured_workload',
      targetRoute: '/harvest-payments',
    },
  ],
  buyer: [
    {
      id: 'available-lots',
      titleEn: 'Available Lots',
      titleHi: 'उपलब्ध फसल लॉट',
      metric: '18 Cluster Lots (210 MT)',
      statusLabel: 'Khandwa & Sehore',
      description: 'Pre-assayed Soybean & Sharbati Wheat ready for dispatch.',
      icon: 'warehouse',
      targetRoute: '/crop-passport',
    },
    {
      id: 'verified-lots',
      titleEn: 'Verified Lots',
      titleHi: 'प्रमाणित अवशेष-मुक्त लॉट',
      metric: 'Tier-1 NABL Certified',
      statusLabel: 'Zero MRL Exceedance',
      description: 'Cryptographically sealed passports with 8-day PHI audit.',
      icon: 'verified',
      targetRoute: '/crop-passport',
    },
    {
      id: 'active-bids',
      titleEn: 'Active Bids',
      titleHi: 'सक्रिय खरीद बोलियां',
      metric: '₹2,150 – ₹4,850/qtl',
      statusLabel: '3 Binding Contracts',
      description: 'Manage direct farmgate purchase bids &processor pivots.',
      icon: 'price_check',
      targetRoute: '/market-comparison',
    },
    {
      id: 'quality-evidence',
      titleEn: 'Quality Evidence',
      titleHi: 'गुणवत्ता और नमी प्रमाण',
      metric: '10.4% Moisture • 0.8% FM',
      statusLabel: 'All Pass Threshold',
      description: 'FQI spectrometry & NABL lab certificates per lot.',
      icon: 'science',
      targetRoute: '/advisory',
    },
    {
      id: 'procurement-schedule',
      titleEn: 'Procurement Schedule',
      titleHi: 'आवक समय-सारणी',
      metric: 'ETA 11:30 AM Tomorrow',
      statusLabel: 'Indore Dock 12',
      description: 'Inbound slot allocation for pooled village trucks.',
      icon: 'event_available',
    },
    {
      id: 'logistics-tracking',
      titleEn: 'Logistics Tracking',
      titleHi: 'लॉजिस्टिक्स ट्रैकिंग',
      metric: 'Truck #MP-12-GA-4482',
      statusLabel: '48 km/h on NH-34',
      description: 'Illustrative route telemetry from Khandwa hub to mill.',
      icon: 'alt_route',
    },
    {
      id: 'payment-reconciliation',
      titleEn: 'Payment Reconciliation',
      titleHi: 'भुगतान समाधान',
      metric: '₹53,750 Split Escrow',
      statusLabel: 'ICICI/SBI Node #44',
      description: '50% weighbridge release + 50% silo unload reconciliation.',
      icon: 'account_balance',
      targetRoute: '/harvest-payments',
    },
    {
      id: 'disputes',
      titleEn: 'Disputes',
      titleHi: 'विवाद निवारण',
      metric: '0 Open Weight Holds',
      statusLabel: 'SLA < 4 Hours',
      description: 'Audit trail for tare variance, moisture refraction & SLA.',
      icon: 'gavel',
      targetRoute: '/harvest-payments',
    },
  ],
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  compactMode = false,
}) => {
  const {
    role,
    setRole,
    navigate,
    setSelectedLotId,
    updateArbitrageInput,
    payment,
    showToast,
    workspaceViewMode,
    setWorkspaceViewMode,
    user,
  } = useKisan();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<RoleModuleCard | null>(
    null
  );
  const [gateInModalOpen, setGateInModalOpen] = useState<boolean>(false);
  const [manifestModalOpen, setManifestModalOpen] = useState<boolean>(false);
  const [acceptedBidIds, setAcceptedBidIds] = useState<Record<string, boolean>>(
    {}
  );

  // Default to the calm, personalized dashboard unless inside the compact Showcase or explicitly toggled to Operations Desk
  if (!compactMode && workspaceViewMode === 'PERSONAL') {
    return <PersonalizedDashboard />;
  }

  const activeModules = ROLE_MODULES[role];

  const filteredBids = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return BUYER_OFFERS;
    return BUYER_OFFERS.filter(
      (b) =>
        b.buyerName.toLowerCase().includes(q) ||
        b.commodityName.toLowerCase().includes(q) ||
        b.cropLotId.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredLots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CROP_LOTS;
    return CROP_LOTS.filter(
      (l) =>
        l.id.toLowerCase().includes(q) ||
        l.farmerName.toLowerCase().includes(q) ||
        l.cropName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleAcceptBid = (
    offerId: string,
    buyerName: string,
    price: number
  ) => {
    setAcceptedBidIds((prev) => ({ ...prev, [offerId]: true }));
    updateArbitrageInput({ directPricePerQuintal: price });
    showToast(
      `Accepted ${buyerName} bid at ${formatINR(
        price
      )}/qtl (Simulated). Updated Arbitrage Calculator.`,
      'green'
    );
  };

  return (
    <div className="w-full bg-white text-black">
      {/* Dynamic Mandi Live Ribbon & Alert Broadcast */}
      <div className="w-full bg-[#000080] px-4 sm:px-6 py-2 text-white flex flex-wrap items-center justify-between gap-2 text-xs border-b border-white/20">
        <div className="flex items-center gap-3 overflow-x-auto py-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#9DF6B9]" />
            <span className="font-extrabold uppercase tracking-wider text-[#9DF6B9]">
              SAMPLE APMC FEED
            </span>
          </div>
          <div className="flex items-center gap-3 font-tabular border-l border-white/30 pl-3 shrink-0">
            <span>
              SOYBEAN (INDORE):{' '}
              <strong className="text-[#9DF6B9]">₹4,850/QTL</strong>{' '}
              <span className="text-[#9DF6B9] font-extrabold">▲ +2.1%</span>
            </span>
            <span>•</span>
            <span>
              SHARBATI WHEAT:{' '}
              <strong className="text-[#9DF6B9]">₹2,420/QTL</strong>{' '}
              <span className="text-[#9DF6B9] font-extrabold">▲ +0.8%</span>
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">
              MAIZE (KHANDWA): <strong>₹2,150/QTL</strong>{' '}
              <span className="text-white font-bold">0.0%</span>
            </span>
            <span className="hidden xl:inline">•</span>
            <span className="hidden xl:inline">
              COTTON (BHOPAL):{' '}
              <strong className="text-[#9DF6B9]">₹7,200/QTL</strong>{' '}
              <span className="text-[#9DF6B9] font-extrabold">▲ +1.4%</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#00003C] px-2.5 py-0.5 rounded border border-white/30">
            <span className="material-symbols-outlined text-[14px] text-[#FF9933]">
              verified_user
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-white">
              ESCROW NODES: SAMPLE DEMO DATA
            </span>
          </div>
        </div>
      </div>

      <div
        className={`mx-auto w-full ${
          compactMode ? 'p-3' : 'max-w-[1536px] px-4 sm:px-6 py-4'
        }`}
      >
        {!compactMode && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#E8EAF6] border-2 border-[#000080] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-black">
              <strong className="font-extrabold text-[#000080] block">
                Organizational Operations Desk Mode (Sample Cluster Data)
              </strong>
              <span className="font-medium">
                {user?.isDemoAccount
                  ? `Exploring full Khandwa cluster demonstration telemetry as ${user.name} (Demo Farmer).`
                  : 'Viewing illustrative cluster-wide procurement, pooling, and escrow workflows. Switch back anytime to view only your private personal workspace.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setWorkspaceViewMode('PERSONAL')}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">
                person
              </span>
              <span>← Return to Personal Workspace</span>
            </button>
          </div>
        )}

        {/* Operational Context Bar & Three-Role Switcher */}
        <div className="flex flex-col gap-4 bg-white pb-4 border-b border-[#000080]/15">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl text-[#000080] tracking-tight font-extrabold">
                  Operations Desk • संचालन डैशबोर्ड
                </h1>
                <span className="px-2 py-0.5 rounded bg-[#E8F5E9] border border-[#138808] text-[#006B3C] text-[10px] font-extrabold uppercase tracking-wider">
                  APMC KHANDWA CLUSTER (SAMPLE DATA)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-black font-medium mt-0.5">
                Procurement lot manifests, rural pool logistics, binding bids
                &amp; split-escrow tracking.
              </p>
            </div>

            {/* Quick Search & Gate In Action */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#000080]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Lot ID, Farmer, Commodity..."
                  aria-label="Search lots, farmers, or commodities"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#E8EAF6] text-black text-xs font-bold placeholder:text-black/70 border-2 border-[#000080]/40 focus:bg-white focus:border-[#000080] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setGateInModalOpen(true)}
                className="h-10 px-4 bg-[#000080] hover:bg-[#00003C] text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">
                  qr_code_scanner
                </span>
                <span>Gate In Lot</span>
              </button>
            </div>
          </div>

          {/* Three-Role Segmented Switcher */}
          <div
            role="tablist"
            aria-label="Three-Role Operations Switcher"
            className="w-full bg-[#E8EAF6] p-1.5 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-1.5 border-2 border-[#000080]/25"
          >
            <button
              type="button"
              role="tab"
              aria-selected={role === 'farmer'}
              onClick={() => setRole('farmer')}
              className={`py-2.5 px-4 rounded-lg text-left transition-all flex items-center justify-center gap-2.5 min-h-[52px] ${
                role === 'farmer'
                  ? 'bg-[#138808] text-white shadow-md border-2 border-[#006B3C]'
                  : 'bg-white text-black hover:bg-[#E8F5E9] border border-[#000080]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                person
              </span>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-extrabold leading-tight">
                  Farmer / Family Proxy {role === 'farmer' ? '(Active)' : ''}
                </span>
                <span
                  className={`text-[11px] font-hindi font-bold ${
                    role === 'farmer' ? 'text-[#9DF6B9]' : 'text-[#006B3C]'
                  }`}
                >
                  किसान / पारिवारिक प्रतिनिधि
                </span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={role === 'agent'}
              onClick={() => setRole('agent')}
              className={`py-2.5 px-4 rounded-lg text-left transition-all flex items-center justify-center gap-2.5 min-h-[52px] ${
                role === 'agent'
                  ? 'bg-[#138808] text-white shadow-md border-2 border-[#006B3C]'
                  : 'bg-white text-black hover:bg-[#E8F5E9] border border-[#000080]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                storefront
              </span>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-extrabold leading-tight">
                  Village Agent / Arhtiya Partner{' '}
                  {role === 'agent' ? '(Active)' : ''}
                </span>
                <span
                  className={`text-[11px] font-hindi font-bold ${
                    role === 'agent' ? 'text-[#9DF6B9]' : 'text-[#006B3C]'
                  }`}
                >
                  ग्रामीण एजेंट / आढ़तिया साथी • लाइव प्रभार
                </span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={role === 'buyer'}
              onClick={() => setRole('buyer')}
              className={`py-2.5 px-4 rounded-lg text-left transition-all flex items-center justify-center gap-2.5 min-h-[52px] ${
                role === 'buyer'
                  ? 'bg-[#138808] text-white shadow-md border-2 border-[#006B3C]'
                  : 'bg-white text-black hover:bg-[#E8F5E9] border border-[#000080]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                apartment
              </span>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-extrabold leading-tight">
                  Institutional Buyer {role === 'buyer' ? '(Active)' : ''}
                </span>
                <span
                  className={`text-[11px] font-hindi font-bold ${
                    role === 'buyer' ? 'text-[#9DF6B9]' : 'text-[#006B3C]'
                  }`}
                >
                  संस्थागत खरीदार • ITC/Adani/Cargill Desk
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* ROLE-SPECIFIC 8 WORKFLOW MODULES GRID (Dynamically changes when role switches!) */}
        <div className="mt-4 bg-[#E8F5E9] rounded-xl p-4 border-2 border-[#138808]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[#138808] text-white text-[10px] font-extrabold uppercase">
                ACTIVE ROLE WORKSPACE
              </span>
              <h2 className="text-sm sm:text-base font-extrabold text-[#000080]">
                {role === 'farmer'
                  ? 'Role A: Farmer & Authorized Family Proxy Operations (8 Modules)'
                  : role === 'agent'
                  ? 'Role B: Village Agent & Arhtiya Partner Operations (8 Modules)'
                  : 'Role C: Institutional Buyer Procurement Desk (8 Modules)'}
              </h2>
            </div>
            <span className="text-[11px] text-black font-bold">
              Click any operational card to inspect or open workflow
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {activeModules.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedModule(mod)}
                className="bg-white hover:bg-[#E8EAF6] p-3 rounded-lg border-2 border-[#000080]/25 text-left flex flex-col justify-between gap-1.5 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div>
                    <span className="text-xs font-extrabold text-[#000080] block">
                      {mod.titleEn}
                    </span>
                    <span className="text-[11px] font-bold text-[#138808] font-hindi block">
                      {mod.titleHi}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[#000080] text-[20px] shrink-0">
                    {mod.icon}
                  </span>
                </div>
                <p className="text-[11px] text-black font-medium leading-snug">
                  {mod.description}
                </p>
                <div className="w-full pt-1.5 border-t border-[#000080]/15 flex items-center justify-between text-[10px] font-tabular">
                  <span className="font-extrabold text-black">
                    {mod.metric}
                  </span>
                  <span className="font-extrabold text-[#006B3C]">
                    {mod.statusLabel}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4 Core Operational KPI Cards */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Live Escrow Status */}
          <div className="bg-white rounded-xl p-4 border-2 border-[#138808] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-black uppercase tracking-wider font-extrabold block">
                  LIVE ESCROW STATUS (SAMPLE)
                </span>
                <span className="text-xs text-[#138808] font-bold font-hindi">
                  सत्यापित एस्क्रो शेष
                </span>
              </div>
              <span className="material-symbols-outlined text-[24px] text-[#138808] bg-[#E8F5E9] p-1.5 rounded-lg border border-[#138808]/30">
                account_balance_wallet
              </span>
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl text-[#000080] tracking-tight font-black font-tabular">
                ₹2,68,750
              </div>
            </div>
            <div className="bg-[#E8F5E9] px-2.5 py-1.5 rounded flex items-center justify-between text-[11px] border border-[#138808]/30">
              <span className="text-black font-extrabold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#138808]">
                  lock
                </span>
                ICICI/SBI Escrow
              </span>
              <span className="text-[#006B3C] font-extrabold font-tabular">
                T+0 UPI (100%)
              </span>
            </div>
          </div>

          {/* Card 2: Active Buyers */}
          <div className="bg-white rounded-xl p-4 border-2 border-[#000080] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-black uppercase tracking-wider font-extrabold block">
                  ACTIVE BUYERS (SAMPLE)
                </span>
                <span className="text-xs text-[#000080] font-bold font-hindi">
                  सक्रिय सत्यापित खरीदार
                </span>
              </div>
              <span className="material-symbols-outlined text-[24px] text-[#000080] bg-[#E8EAF6] p-1.5 rounded-lg border border-[#000080]/30">
                business_center
              </span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl text-[#000080] tracking-tight font-black font-tabular">
                12
              </span>
              <span className="text-sm text-[#138808] font-extrabold">
                Verified Corporate
              </span>
            </div>
            <div className="bg-[#E8EAF6] px-2.5 py-1.5 rounded flex items-center justify-between text-[11px] border border-[#000080]/20">
              <span className="text-black font-bold truncate">
                Indore, Bhopal, Ujjain
              </span>
              <span className="text-[#138808] font-extrabold font-tabular">
                +₹230/qtl spread
              </span>
            </div>
          </div>

          {/* Card 3: Available Logistics */}
          <div className="bg-white rounded-xl p-4 border-2 border-[#FF9933] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-black uppercase tracking-wider font-extrabold block">
                  AVAILABLE LOGISTICS
                </span>
                <span className="text-xs text-[#371A00] font-bold font-hindi">
                  सक्रिय लॉजिस्टिक्स फ्लीट
                </span>
              </div>
              <span className="material-symbols-outlined text-[24px] text-[#371A00] bg-[#FFDCC2] p-1.5 rounded-lg border border-[#FF9933]">
                local_shipping
              </span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl text-[#000080] tracking-tight font-black font-tabular">
                4
              </span>
              <span className="text-sm text-black font-extrabold">
                Trucks Available
              </span>
            </div>
            <div className="bg-[#FFDCC2] px-2.5 py-1.5 rounded flex items-center justify-between text-[11px] border border-[#FF9933]">
              <span className="text-black font-bold truncate">
                16T Eicher Fleet
              </span>
              <span className="text-[#371A00] font-extrabold font-tabular">
                Turnaround: 2.4 hrs
              </span>
            </div>
          </div>

          {/* Card 4: Village Pooling Queue */}
          <div className="bg-white rounded-xl p-4 border-2 border-[#138808] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-black uppercase tracking-wider font-extrabold block">
                  VILLAGE POOLING QUEUE
                </span>
                <span className="text-xs text-[#138808] font-bold font-hindi">
                  ग्राम समूहीकरण कतार
                </span>
              </div>
              <span className="material-symbols-outlined text-[24px] text-[#138808] bg-[#E8F5E9] p-1.5 rounded-lg border border-[#138808]/30">
                groups
              </span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl text-[#000080] tracking-tight font-black font-tabular">
                8
              </span>
              <span className="text-sm text-[#138808] font-extrabold">
                Farmers (Next Load: 25 Qtl)
              </span>
            </div>
            <div className="bg-[#E8F5E9] px-2.5 py-1.5 rounded flex items-center justify-between text-[11px] border border-[#138808]/30">
              <span className="text-black font-extrabold">
                Pickup: 06:00 AM
              </span>
              <span className="text-[#000080] font-extrabold">
                3 Batches Formed
              </span>
            </div>
          </div>
        </div>

        {/* Main Bento Grid Section: Map Telemetry (Left 7 cols) & Bids + Commodities + Escrow (Right 5 cols) */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT PANEL (7 cols): Cluster Pooling Telemetry + Moisture & Refraction */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-white rounded-xl border-2 border-[#000080] shadow-sm overflow-hidden flex flex-col">
              {/* Header Strip */}
              <div className="p-4 bg-[#E8EAF6] border-b border-[#000080]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#000080] flex items-center justify-center text-white shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      alt_route
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base text-[#000080] font-extrabold">
                        Cluster Pooling Telemetry (Illustrative Route Diagram)
                      </h3>
                      <span className="text-[11px] font-extrabold bg-white text-[#000080] px-2 py-0.5 rounded border border-[#000080] font-tabular">
                        MP-12-GA-4482
                      </span>
                    </div>
                    <span className="text-xs text-black font-semibold">
                      Khandwa Central Collection Point ➔ Village Pickups ➔
                      Indore Processing Hub (NH 34)
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded bg-[#138808] text-white font-extrabold uppercase tracking-wider self-start sm:self-center shrink-0">
                  POOLED DISPATCH
                </span>
              </div>

              {/* 4-Column Metric Sub-bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-white border-b border-[#000080]/15 text-xs">
                <div className="bg-[#E8EAF6] p-2.5 rounded border border-[#000080]/20 flex flex-col">
                  <span className="text-black text-[10px] font-bold uppercase">
                    Pickup Window
                  </span>
                  <span className="font-extrabold text-[#000080] font-tabular mt-0.5">
                    Tomorrow 06:00 AM
                  </span>
                </div>
                <div className="bg-[#E8F5E9] p-2.5 rounded border border-[#138808]/30 flex flex-col">
                  <span className="text-black text-[10px] font-bold uppercase">
                    Aggregated Load
                  </span>
                  <span className="font-extrabold text-[#138808] font-tabular mt-0.5">
                    12.4 MT (3 Farmers)
                  </span>
                </div>
                <div className="bg-[#E8F5E9] p-2.5 rounded border border-[#138808]/30 flex flex-col">
                  <span className="text-black text-[10px] font-bold uppercase">
                    Freight Savings
                  </span>
                  <span className="font-extrabold text-[#138808] font-tabular mt-0.5">
                    -34% Consolidated
                  </span>
                </div>
                <div className="bg-[#E8EAF6] p-2.5 rounded border border-[#000080]/20 flex flex-col">
                  <span className="text-black text-[10px] font-bold uppercase">
                    ETA at Indore Hub
                  </span>
                  <span className="font-extrabold text-[#000080] font-tabular mt-0.5">
                    11:30 AM Tomorrow
                  </span>
                </div>
              </div>

              {/* Illustrative Vector Route Diagram (matching Showcase & Dashboard) */}
              <div className="p-4 bg-[#E8EAF6]/50">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-tabular font-extrabold text-[#000080] mb-2">
                  <span>SCHEMATIC CORRIDOR: NH-34 ARTERIAL (ILLUSTRATIVE)</span>
                  <span>
                    SAMPLE SPEED: 48 KM/H • FASTAG PRE-FUNDED: ₹840
                  </span>
                </div>

                <div className="w-full bg-white rounded-lg p-3 border-2 border-[#000080]/30">
                  <svg
                    className="w-full h-auto"
                    viewBox="0 0 760 175"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-label="Illustrative logistics diagram connecting Khandwa Collection Point, Chhaigaon and Deshgaon village pickup points, and Indore Processing Hub"
                  >
                    {/* Road Backdrop */}
                    <path
                      d="M 50 110 Q 210 45 380 95 T 700 70"
                      stroke="#E8EAF6"
                      strokeLinecap="round"
                      strokeWidth="16"
                    />
                    <path
                      d="M 50 110 Q 210 45 380 95 T 700 70"
                      stroke="#000080"
                      strokeDasharray="8 8"
                      strokeLinecap="round"
                      strokeWidth="6"
                    />

                    {/* Point 1: Khandwa Collection Point */}
                    <circle cx="65" cy="108" r="14" fill="#138808" />
                    <circle cx="65" cy="108" r="6" fill="#FFFFFF" />
                    <text
                      x="65"
                      y="142"
                      textAnchor="middle"
                      fill="#000080"
                      fontSize="11"
                      fontWeight="800"
                    >
                      Khandwa Collection Point
                    </text>
                    <text
                      x="65"
                      y="156"
                      textAnchor="middle"
                      fill="#000000"
                      fontSize="10"
                      fontWeight="600"
                    >
                      Lot #KS-089 (25 Qtl)
                    </text>

                    {/* Point 2: Chhaigaon Village Stop */}
                    <circle cx="255" cy="68" r="11" fill="#138808" />
                    <circle cx="255" cy="68" r="4.5" fill="#FFFFFF" />
                    <text
                      x="255"
                      y="44"
                      textAnchor="middle"
                      fill="#000080"
                      fontSize="11"
                      fontWeight="800"
                    >
                      Stop 1: Chhaigaon Village
                    </text>
                    <text
                      x="255"
                      y="29"
                      textAnchor="middle"
                      fill="#138808"
                      fontSize="10"
                      fontWeight="700"
                    >
                      Gopal Mukati (+3.4 MT)
                    </text>

                    {/* Point 3: Deshgaon Village Stop */}
                    <circle cx="435" cy="98" r="11" fill="#138808" />
                    <circle cx="435" cy="98" r="4.5" fill="#FFFFFF" />
                    <text
                      x="435"
                      y="130"
                      textAnchor="middle"
                      fill="#000080"
                      fontSize="11"
                      fontWeight="800"
                    >
                      Stop 2: Deshgaon Village
                    </text>
                    <text
                      x="435"
                      y="145"
                      textAnchor="middle"
                      fill="#138808"
                      fontSize="10"
                      fontWeight="700"
                    >
                      Suresh Kumar (+2.5 MT)
                    </text>

                    {/* Point 4: Indore Processing Hub (Saffron Destination Marker) */}
                    <circle
                      cx="690"
                      cy="70"
                      r="16"
                      fill="#FF9933"
                      stroke="#000000"
                      strokeWidth="2"
                    />
                    <circle cx="690" cy="70" r="6" fill="#000000" />
                    <text
                      x="685"
                      y="108"
                      textAnchor="middle"
                      fill="#000080"
                      fontSize="11"
                      fontWeight="800"
                    >
                      Indore Processing Hub
                    </text>
                    <text
                      x="685"
                      y="122"
                      textAnchor="middle"
                      fill="#000000"
                      fontSize="10"
                      fontWeight="600"
                    >
                      ITC / Adani Mega Silo
                    </text>

                    {/* Truck Indicator */}
                    <g transform="translate(335, 76)">
                      <rect
                        x="-20"
                        y="-13"
                        width="40"
                        height="26"
                        rx="4"
                        fill="#000080"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="10"
                        fontWeight="800"
                      >
                        16T
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Pooled Consignments Manifest List */}
              <div className="p-4 bg-white border-t border-[#000080]/15">
                <span className="text-[11px] text-[#000080] uppercase tracking-wider font-extrabold block mb-2">
                  Active Manifest Pool Breakdown (संबद्ध किसान लॉट — Click to Open Passport)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {filteredLots.map((lot) => (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() => {
                        setSelectedLotId(lot.id);
                        navigate('/crop-passport');
                      }}
                      className="p-3 rounded-lg bg-[#E8EAF6] hover:bg-[#E8F5E9] border border-[#000080]/30 text-left flex flex-col justify-between transition-colors"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-extrabold text-[#000080] font-tabular">
                          Lot {lot.shortCode}
                        </span>
                        <span className="text-[10px] bg-[#138808] px-1.5 py-0.5 rounded text-white font-extrabold">
                          {lot.grade}
                        </span>
                      </div>
                      <span className="text-xs text-black font-extrabold mt-1">
                        {lot.farmerName}
                      </span>
                      <span className="text-[11px] text-black font-semibold font-tabular">
                        {lot.quantityQuintals} Qtl • {lot.cropName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Moisture & Refraction Telemetry Card */}
            <div className="bg-white rounded-xl p-4 border-2 border-[#000080]/25 shadow-sm flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#138808] text-[22px]">
                    science
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#000080]">
                      Moisture &amp; Refraction Telemetry (Sample Assay)
                    </h3>
                    <span className="text-[11px] text-black font-semibold block">
                      FQI Spectrometry Index (e-NAM Quality Benchmark)
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded bg-[#E8F5E9] border border-[#138808] text-[#006B3C] font-extrabold uppercase">
                  ALL PASS THRESHOLD
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-black font-bold">
                      Average Lot Moisture:{' '}
                      <strong className="text-[#138808] font-extrabold font-tabular">
                        10.4%
                      </strong>
                    </span>
                    <span className="text-black font-bold font-tabular">
                      Max Allowed: 12.0%
                    </span>
                  </div>
                  <div className="w-full bg-[#E8EAF6] h-3 rounded-full overflow-hidden flex border border-[#000080]/30">
                    <div
                      className="bg-[#138808] h-full"
                      style={{ width: '65%' }}
                    />
                    <div
                      className="bg-[#FF9933] h-full"
                      style={{ width: '35%' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-black font-bold">
                    <span>Safe (8–11%)</span>
                    <span>Tolerance / Reject (&gt;12%)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-black font-bold">
                      Foreign Matter / Refraction:{' '}
                      <strong className="text-[#138808] font-extrabold font-tabular">
                        0.8%
                      </strong>
                    </span>
                    <span className="text-black font-bold font-tabular">
                      Standard: &lt; 2.0%
                    </span>
                  </div>
                  <div className="w-full bg-[#E8EAF6] h-3 rounded-full overflow-hidden flex border border-[#000080]/30">
                    <div
                      className="bg-[#138808] h-full"
                      style={{ width: '45%' }}
                    />
                    <div
                      className="bg-[#FF9933] h-full"
                      style={{ width: '55%' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-black font-bold">
                    <span>Certified Grade-A Cleanliness</span>
                    <span>Tolerance Margin</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL (5 cols): Live Bids & Commodity Panel + Dual Escrow Settlement Feed */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Commodity Market Panel (Soybean, Wheat, Maize, Cotton with update time & source label) */}
            <div className="bg-white rounded-xl border-2 border-[#000080] shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#000080]/15 pb-2">
                <div>
                  <h3 className="text-base font-extrabold text-[#000080]">
                    Commodity Reference Panel (4 Core Crops)
                  </h3>
                  <span className="text-[11px] text-black font-semibold block">
                    Static Example Figures • Source: APMC / e-NAM Sample Node
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#E8EAF6] text-[#000080] text-[10px] font-extrabold uppercase">
                  EXAMPLE DATA
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMODITY_MARKET_RATES.map((com) => (
                  <div
                    key={com.id}
                    className="p-2.5 rounded-lg bg-[#E8EAF6] border border-[#000080]/25 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#000080]">
                        {com.name}
                      </span>
                      <span className="text-[11px] font-extrabold text-[#138808] font-tabular">
                        {com.change}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-black text-black font-tabular">
                        {formatINR(com.pricePerQuintal)}
                        <span className="text-[10px] font-bold">/qtl</span>
                      </span>
                      <span className="text-[10px] text-black font-bold">
                        {com.updatedAt}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#006B3C] font-bold mt-0.5 truncate">
                      {com.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Institutional Bids & Contracts Card */}
            <div className="bg-white rounded-xl border-2 border-[#000080]/30 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#138808]" />
                  <h3 className="text-base font-extrabold text-[#000080]">
                    Live Bids &amp; Contracts (Sample)
                  </h3>
                </div>
                <span className="text-[10px] text-[#000080] bg-[#E8EAF6] border border-[#000080]/30 px-2 py-0.5 rounded font-tabular font-extrabold">
                  ESCROW-BACKED
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {filteredBids.slice(0, 3).map((bid) => {
                  const isAccepted = Boolean(acceptedBidIds[bid.id]);
                  return (
                    <div
                      key={bid.id}
                      className="p-3 rounded-lg bg-[#E8EAF6] border border-[#000080]/25 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-extrabold text-[#000080]">
                            {bid.commodityName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#000080] border border-[#000080]/30 font-tabular font-extrabold">
                            Lot {bid.cropLotId}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1 shrink-0 font-tabular">
                          <span className="text-lg text-[#138808] font-black">
                            {formatINR(bid.pricePerQuintal)}
                          </span>
                          <span className="text-[11px] text-black font-bold">
                            /qtl ({bid.changePercent})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-black">
                        <span className="flex items-center gap-1 font-extrabold">
                          <span className="material-symbols-outlined text-[15px] text-[#138808]">
                            verified
                          </span>
                          {bid.buyerName}
                        </span>
                        <span className="font-tabular text-[#000080] font-extrabold">
                          {bid.demandMetricTons} MT Demand
                        </span>
                      </div>

                      <div className="mt-1 pt-1.5 border-t border-[#000080]/15 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-black font-semibold">
                          {bid.deliveryLocation} • {bid.bidExpiry}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleAcceptBid(
                              bid.id,
                              bid.buyerName,
                              bid.pricePerQuintal
                            )
                          }
                          className={`px-3 py-1.5 rounded text-xs font-extrabold transition-colors shrink-0 ${
                            isAccepted
                              ? 'bg-[#000080] text-white'
                              : 'bg-[#138808] hover:bg-[#006B3C] text-white'
                          }`}
                        >
                          {isAccepted
                            ? '✓ Bid Loaded'
                            : 'Accept Bid / स्वीकार करें'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dual Escrow Settlement Feed */}
            <div className="bg-white rounded-xl border-2 border-[#138808] shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#138808] text-[20px]">
                    assured_workload
                  </span>
                  <h3 className="text-base font-extrabold text-[#000080]">
                    Dual Escrow Settlement Feed
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#E8F5E9] border border-[#138808] text-[#006B3C] font-extrabold">
                  T+0 DEMO LEDGER
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="p-3 rounded-lg bg-[#E8F5E9] border border-[#138808]/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#138808] flex items-center justify-center text-white shrink-0">
                      <span className="material-symbols-outlined text-[18px]">
                        done_all
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-black">
                        Txn #99482 • Ramesh Patel
                      </span>
                      <span className="text-[11px] text-black font-semibold font-tabular">
                        UPI Ref: UPI/3948201/ICICI • Instant Gate Pay
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col text-right font-tabular shrink-0">
                    <span className="text-base text-[#138808] font-black">
                      {formatINR(payment.firstInstallment)}
                    </span>
                    <span className="text-[10px] text-[#006B3C] font-extrabold">
                      50% INSTANT CREDITED
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#000080] flex items-center justify-center text-white shrink-0">
                      <span className="material-symbols-outlined text-[18px]">
                        lock
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-black">
                        Txn #99483 • Quality Audit Escrow
                      </span>
                      <span className="text-[11px] text-black font-semibold">
                        Locked in RBI-regulated escrow node (Sample)
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col text-right font-tabular shrink-0">
                    <span className="text-base text-[#000080] font-black">
                      {formatINR(payment.remainingAmount)}
                    </span>
                    <span className="text-[10px] text-[#000080] font-extrabold">
                      RELEASE ON SILO UNLOAD (24H)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-[#E8EAF6] flex items-center justify-between text-black text-[11px] font-bold">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#138808]">
                    verified
                  </span>
                  <span>Statutory Protocol: Digital India AgriStack v2.4</span>
                </div>
                <span className="font-tabular text-[#000080] font-extrabold">
                  NODE #IN-MP-44
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Footer Bar with Mandi Dispatch Stats */}
        <div className="mt-5 p-4 rounded-xl bg-[#E8EAF6] border-2 border-[#000080]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#000080] flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                balance
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold text-[#000080]">
                Khandwa APMC Yard Gateway Operations Control
              </span>
              <span className="text-xs text-black font-semibold">
                Weighbridge Terminal 104 • Zero Weight Discrepancy Protocol
                Enforced (Sample Operational Data)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex flex-col text-left md:text-right font-tabular">
              <span className="text-[10px] text-black font-extrabold uppercase">
                SAMPLE AGGREGATED VALUE
              </span>
              <span className="text-base sm:text-lg font-black text-[#000080]">
                ₹14,92,300
              </span>
            </div>
            <div className="flex flex-col text-left md:text-right font-tabular">
              <span className="text-[10px] text-black font-extrabold uppercase">
                WEIGHBRIDGE CLEARANCE
              </span>
              <span className="text-base sm:text-lg font-black text-[#138808]">
                98.4% On Schedule
              </span>
            </div>
            <button
              type="button"
              onClick={() => setManifestModalOpen(true)}
              className="px-4 py-2.5 bg-[#000080] hover:bg-[#00003C] text-white rounded-lg text-xs font-extrabold transition-colors shadow-sm flex items-center gap-1.5 min-h-[42px]"
            >
              <span className="material-symbols-outlined text-[18px]">
                print
              </span>
              <span>Download Audit Manifest</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: ROLE MODULE DETAIL DIALOG */}
      {selectedModule && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-mod-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#138808] text-[22px]">
                  {selectedModule.icon}
                </span>
                <h2
                  id="role-mod-title"
                  className="text-base font-extrabold text-[#000080]"
                >
                  {selectedModule.titleEn} ({selectedModule.titleHi})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModule(null)}
                aria-label="Close module detail"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#E8F5E9] border border-[#138808] text-xs text-black space-y-1">
              <div className="font-extrabold text-[#006B3C]">
                Metric: {selectedModule.metric} • {selectedModule.statusLabel}
              </div>
              <p className="font-medium">{selectedModule.description}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedModule(null)}
                className="px-4 py-2 rounded border border-[#000080] text-[#000080] text-xs font-extrabold"
              >
                Close
              </button>
              {selectedModule.targetRoute && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedModule.targetRoute!;
                    setSelectedModule(null);
                    navigate(target);
                  }}
                  className="px-4 py-2 rounded bg-[#138808] text-white text-xs font-extrabold"
                >
                  Open Dedicated Screen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GATE IN LOT */}
      {gateInModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-in-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="gate-in-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Gate-In Crop Lot at Khandwa Hub
              </h2>
              <button
                type="button"
                onClick={() => setGateInModalOpen(false)}
                aria-label="Close Gate-In dialog"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-black font-semibold">
              Select a registered farmer lot to verify its digital crop passport
              or assign a weighbridge queue token:
            </p>

            <div className="flex flex-col gap-2">
              {CROP_LOTS.map((lot) => (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => {
                    setSelectedLotId(lot.id);
                    setGateInModalOpen(false);
                    showToast(
                      `Checked in Lot ${lot.shortCode} (${lot.farmerName}) at Gate #A-14.`,
                      'green'
                    );
                    navigate('/harvest-payments');
                  }}
                  className="p-3 rounded-lg bg-[#E8EAF6] hover:bg-[#E8F5E9] border border-[#000080]/30 text-left text-xs"
                >
                  <div className="font-extrabold text-[#000080]">
                    {lot.shortCode} — {lot.farmerName} ({lot.cropName})
                  </div>
                  <div className="text-black font-tabular font-semibold">
                    {lot.quantityQuintals} Quintals • {lot.surveyNumber}
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setGateInModalOpen(false)}
              className="w-full py-2 rounded bg-[#000080] text-white text-xs font-extrabold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT MANIFEST */}
      {manifestModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manifest-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="manifest-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Khandwa Cluster Daily Audit Manifest (Illustrative)
              </h2>
              <button
                type="button"
                onClick={() => setManifestModalOpen(false)}
                aria-label="Close audit manifest"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs font-tabular bg-[#E8EAF6] p-3 rounded-lg border border-[#000080]/30 space-y-1.5 text-black">
              <div>
                <strong>Cluster Node:</strong> MP-KHD-0402 (Terminal 104)
              </div>
              <div>
                <strong>Enrolled Farmers:</strong>{' '}
                {FARMERS.map((f) => f.name).join(', ')} (+5 Pooled)
              </div>
              <div>
                <strong>Total Escrow Locked:</strong> ₹2,68,750 (Sample Data)
              </div>
              <div>
                <strong>ActivePooled Truck:</strong> MP-12-GA-4482 (12.4 MT /
                16.0 MT)
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setManifestModalOpen(false);
                showToast('Audit manifest summary exported (Demo).', 'green');
              }}
              className="w-full py-2.5 rounded bg-[#138808] text-white text-xs font-extrabold"
            >
              Acknowledge &amp; Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
