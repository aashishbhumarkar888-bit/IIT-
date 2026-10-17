import React, { useMemo, useState } from 'react';
import { AppRoute, useKisan } from '../context/KisanContext';
import { CROP_LOTS } from '../data/kisanData';
import { formatINR } from '../services/kisanService';
import { CropLot, UserRole } from '../types/kisan';
import { QRCodeComponent } from './QRCodeComponent';

export const DemoAccountBadge: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#FFDCC2] text-[#371A00] border border-[#FF9933] text-[10px] font-extrabold uppercase tracking-wider ${className}`}
  >
    <span className="material-symbols-outlined text-[13px]">science</span>
    <span>Demo Account • Sample Data</span>
  </span>
);

export const DemoDataBanner: React.FC = () => {
  const { user, resetDemoDataset, setWorkspaceViewMode, workspaceViewMode } =
    useKisan();

  if (!user?.isDemoAccount) return null;

  return (
    <div className="p-3.5 rounded-xl bg-[#FFDCC2] border-2 border-[#FF9933] text-black flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[#371A00] text-[20px] shrink-0 mt-0.5">
          info
        </span>
        <div className="text-xs">
          <strong className="font-extrabold text-[#371A00] block">
            Demo Profile Active ({user.name} • {user.demoDatasetVersion || 'v2.4-demo'})
          </strong>
          <span className="font-medium">
            All crop lots, plot boundaries, buyer bids, weighbridge slips, and
            50-50 escrow states in this account are isolated demonstration
            sample data — not live market or banking transactions.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() =>
            setWorkspaceViewMode(
              workspaceViewMode === 'PERSONAL' ? 'OPERATIONS_DESK' : 'PERSONAL'
            )
          }
          className="px-3 py-1.5 rounded-lg bg-[#000080] hover:bg-[#00003C] text-white text-xs font-extrabold min-h-[36px]"
        >
          {workspaceViewMode === 'PERSONAL'
            ? 'Open Full Operations Desk'
            : 'Back to Personal Summary'}
        </button>
        <button
          type="button"
          onClick={resetDemoDataset}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#E8EAF6] text-[#000080] border border-[#000080] text-xs font-extrabold min-h-[36px]"
        >
          Reset Demo Data
        </button>
      </div>
    </div>
  );
};

export const WelcomeHeader: React.FC = () => {
  const {
    user,
    role,
    navigate,
    personalLots,
    workspaceViewMode,
    setWorkspaceViewMode,
  } = useKisan();

  const isBrandNewUser =
    !user?.isDemoAccount &&
    (user?.onboardingStatus !== 'COMPLETED' || personalLots.length === 0);

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const roleLabels: Record<UserRole, { en: string; hi: string }> = {
    farmer: {
      en: 'Farmer / Family Proxy',
      hi: 'किसान / पारिवारिक प्रतिनिधि',
    },
    agent: {
      en: 'Village Agent / Arhtiya Partner',
      hi: 'ग्रामीण एजेंट / आढ़तिया साथी',
    },
    buyer: {
      en: 'Institutional Buyer',
      hi: 'संस्थागत खरीदार',
    },
  };

  const displayName = user?.name?.trim();
  const hasLocation = Boolean(
    user?.village || user?.district || user?.state
  );
  const locationText = hasLocation
    ? [user?.village, user?.district, user?.state].filter(Boolean).join(', ')
    : '';

  return (
    <div className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded bg-[#E8F5E9] text-[#006B3C] border border-[#138808]/40 text-[11px] font-extrabold">
            {roleLabels[role].en}
          </span>
          <span className="text-xs font-bold text-[#006B3C] font-hindi">
            {roleLabels[role].hi}
          </span>
          {user?.isDemoAccount && <DemoAccountBadge />}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#000080] tracking-tight">
          {isBrandNewUser
            ? displayName
              ? `Welcome to Kisan-SPO, ${displayName}`
              : 'Welcome to Kisan-SPO'
            : displayName
            ? `${timeGreeting}, ${displayName}`
            : 'Welcome back to Kisan-SPO'}
        </h1>

        <p className="text-xs sm:text-sm text-black font-semibold max-w-2xl leading-relaxed">
          {isBrandNewUser
            ? 'Your crops, market opportunities, procurement activity, and payments will appear here as you begin using Kisan-SPO.'
            : 'Your personal agricultural workspace is ready. Review your saved crops, compare net payouts, or continue your active workflows below.'}
        </p>

        {locationText && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#000080] pt-0.5">
            <span className="material-symbols-outlined text-[16px] text-[#138808]">
              location_on
            </span>
            <span>Operating Region: {locationText}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {user?.onboardingStatus !== 'COMPLETED' ? (
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm anim-btn-press"
          >
            <span className="material-symbols-outlined text-[18px]">
              person_check
            </span>
            <span>Set Up My Profile</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#E8EAF6] hover:bg-[#000080] hover:text-white text-[#000080] border border-[#000080]/30 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              manage_accounts
            </span>
            <span>My Profile</span>
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            setWorkspaceViewMode(
              workspaceViewMode === 'PERSONAL' ? 'OPERATIONS_DESK' : 'PERSONAL'
            )
          }
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-[#E8EAF6] text-[#000080] border-2 border-[#000080] text-xs font-extrabold flex items-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            dashboard_customize
          </span>
          <span>
            {workspaceViewMode === 'PERSONAL'
              ? 'Explore Platform Desk'
              : 'Personal Workspace'}
          </span>
        </button>
      </div>
    </div>
  );
};

export const ContinueSetupCard: React.FC = () => {
  const { user, navigate } = useKisan();

  if (!user) return null;
  const isComplete =
    user.onboardingStatus === 'COMPLETED' &&
    (user.profileCompletion ?? 100) >= 90;

  if (isComplete) return null;

  const completedSteps = Math.max(
    1,
    Math.min(4, user.onboardingStep || 2)
  );
  const pct = user.profileCompletion || Math.round((completedSteps / 4) * 100);

  return (
    <div className="bg-[#E8EAF6] rounded-xl border-2 border-[#000080]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#000080]">
            Your Workspace Setup
          </span>
          <span className="px-2 py-0.5 rounded bg-white text-[#000080] text-[11px] font-extrabold font-tabular border border-[#000080]/20">
            {completedSteps} of 4 steps completed ({pct}%)
          </span>
        </div>
        <p className="text-xs text-black font-semibold">
          Complete your profile and location details to tailor local Mandi
          comparisons and crop recommendations.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate('/onboarding')}
        className="min-h-[40px] px-4 py-2 rounded-lg bg-[#000080] hover:bg-[#00003C] text-white text-xs font-extrabold shrink-0 flex items-center gap-1.5 anim-btn-press"
      >
        <span>Continue setup</span>
        <span className="material-symbols-outlined text-[16px]">
          arrow_forward
        </span>
      </button>
    </div>
  );
};

export const FirstCropCard: React.FC = () => {
  const { role, navigate, setAddCropModalOpen, personalLots, user } =
    useKisan();

  const hasPersonalCrops =
    personalLots.length > 0 || Boolean(user?.isDemoAccount);

  if (role === 'farmer') {
    return (
      <div className="bg-[#00003C] text-white rounded-2xl border-2 border-[#000080] p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <span className="px-2.5 py-0.5 rounded bg-[#138808] text-white text-[10px] font-extrabold uppercase tracking-wider inline-block">
            {hasPersonalCrops ? 'PRIMARY FARMER ACTION' : 'GET STARTED'}
          </span>
          <h2 className="text-xl font-extrabold">
            {hasPersonalCrops
              ? 'Register another crop lot or check net realization'
              : 'Add your first crop'}
          </h2>
          <p className="text-xs text-white/90 font-medium max-w-xl leading-relaxed">
            {hasPersonalCrops
              ? 'Generate a scannable Digital Crop Passport QR code or compare local Mandi deductions against direct institutional buyer offers.'
              : 'Start by adding a crop lot (such as Wheat, Soybean, or Cotton) to create your Digital Crop Passport and compare net take-home payouts.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setAddCropModalOpen(true)}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-sm font-extrabold flex items-center gap-2 shadow-md anim-btn-press"
          >
            <span className="material-symbols-outlined text-[20px]">
              add_circle
            </span>
            <span>
              {hasPersonalCrops ? 'Add Another Crop Lot' : 'Add your first crop'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'agent') {
    return (
      <div className="bg-[#00003C] text-white rounded-2xl border-2 border-[#000080] p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <span className="px-2.5 py-0.5 rounded bg-[#138808] text-white text-[10px] font-extrabold uppercase tracking-wider inline-block">
            VILLAGE AGENT PRIORITY
          </span>
          <h2 className="text-xl font-extrabold">Set up your first pickup</h2>
          <p className="text-xs text-white/90 font-medium max-w-xl leading-relaxed">
            Coordinate farmer onboarding, village cluster pooling, and digital
            weighbridge gate-pass verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/harvest-payments')}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-sm font-extrabold flex items-center gap-2 shadow-md anim-btn-press"
          >
            <span className="material-symbols-outlined text-[20px]">
              local_shipping
            </span>
            <span>Set up your first pickup</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#00003C] text-white rounded-2xl border-2 border-[#000080] p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <span className="px-2.5 py-0.5 rounded bg-[#138808] text-white text-[10px] font-extrabold uppercase tracking-wider inline-block">
          INSTITUTIONAL BUYER PRIORITY
        </span>
        <h2 className="text-xl font-extrabold">Explore available crop lots</h2>
        <p className="text-xs text-white/90 font-medium max-w-xl leading-relaxed">
          Inspect Digital Crop Passports, review NABL residue-free evidence, and
          compare net-pocket procurement offers.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/crop-passport')}
          className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-sm font-extrabold flex items-center gap-2 shadow-md anim-btn-press"
        >
          <span className="material-symbols-outlined text-[20px]">
            inventory_2
          </span>
          <span>Explore available crop lots</span>
        </button>
      </div>
    </div>
  );
};

interface PersonalizedEmptyStateProps {
  title: string;
  headline: string;
  description: string;
  actionLabel: string;
  icon: string;
  onAction: () => void;
}

export const PersonalizedEmptyState: React.FC<PersonalizedEmptyStateProps> = ({
  title,
  headline,
  description,
  actionLabel,
  icon,
  onAction,
}) => (
  <div className="bg-white rounded-xl border-2 border-[#000080]/20 p-5 flex flex-col justify-between gap-4">
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[#000080]">
          {title}
        </span>
        <div className="w-9 h-9 rounded-lg bg-[#E8EAF6] text-[#000080] flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      <h3 className="text-base font-extrabold text-[#000080]">{headline}</h3>
      <p className="text-xs text-black font-medium leading-relaxed">
        {description}
      </p>
    </div>

    <button
      type="button"
      onClick={onAction}
      className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-[#E8F5E9] hover:bg-[#138808] text-[#006B3C] hover:text-white border border-[#138808] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
    >
      <span>{actionLabel}</span>
      <span className="material-symbols-outlined text-[16px]">
        arrow_forward
      </span>
    </button>
  </div>
);

export const AddCropModal: React.FC = () => {
  const {
    addCropModalOpen,
    setAddCropModalOpen,
    addPersonalCropLot,
    user,
  } = useKisan();

  const [cropName, setCropName] = useState<string>('Soybean');
  const [variety, setVariety] = useState<string>('JS-2034 High Oil');
  const [quantityQuintals, setQuantityQuintals] = useState<string>('25');
  const [surveyNumber, setSurveyNumber] = useState<string>(
    user?.village ? `${user.village} Plot` : 'Plot #101'
  );
  const [harvestDate, setHarvestDate] = useState<string>('Oct 2026');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!addCropModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const qty = Number(quantityQuintals);
    if (!cropName.trim()) {
      setErrorMsg('Please enter a crop name.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setErrorMsg('Please enter a valid quantity in quintals (> 0).');
      return;
    }

    setSaving(true);
    const res = await addPersonalCropLot({
      cropName: cropName.trim(),
      variety: variety.trim() || 'Standard Grade',
      quantityQuintals: qty,
      surveyNumber: surveyNumber.trim() || 'Personal Plot',
      harvestDate: harvestDate.trim() || 'Oct 2026',
    });
    setSaving(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Could not add crop lot.');
      return;
    }
    setAddCropModalOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-crop-modal-title"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="bg-white border-4 border-[#000080] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 anim-dialog-enter max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#000080]/20 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#138808] block">
              PERSONAL CROP WORKSPACE
            </span>
            <h2
              id="add-crop-modal-title"
              className="text-lg font-extrabold text-[#000080]"
            >
              Add Crop to My Workspace
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAddCropModalOpen(false)}
            aria-label="Close Add Crop modal"
            className="w-9 h-9 rounded-lg border border-[#000080]/30 font-extrabold text-black hover:bg-[#E8EAF6]"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-[#FF9933] text-black border border-black text-xs font-extrabold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label
              htmlFor="crop-name-input"
              className="block text-xs font-extrabold text-[#000080] mb-1"
            >
              Crop Name (फसल का नाम)
            </label>
            <select
              id="crop-name-input"
              value={cropName}
              onChange={(e) => {
                const val = e.target.value;
                setCropName(val);
                if (val === 'Soybean') setVariety('JS-2034 High Oil');
                if (val === 'Sharbati Wheat') setVariety('HI-1544 Sharbati');
                if (val === 'Medium Staple Cotton') setVariety('Bt-Hybrid H4');
              }}
              className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080] text-sm font-extrabold"
            >
              <option value="Soybean">Soybean (सोयाबीन)</option>
              <option value="Sharbati Wheat">
                Sharbati Wheat (शरबती गेहूँ)
              </option>
              <option value="Medium Staple Cotton">
                Medium Staple Cotton (कपास)
              </option>
              <option value="Chana (Gram)">Chana / Gram (चना)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="crop-variety-input"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Variety (किस्म)
              </label>
              <input
                id="crop-variety-input"
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 text-sm font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor="crop-qty-input"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Quantity (Quintals • क्विंटल)
              </label>
              <input
                id="crop-qty-input"
                type="number"
                min={1}
                max={10000}
                value={quantityQuintals}
                onChange={(e) => setQuantityQuintals(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 text-sm font-tabular font-extrabold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="crop-survey-input"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Plot / Survey Label (Optional)
              </label>
              <input
                id="crop-survey-input"
                type="text"
                value={surveyNumber}
                onChange={(e) => setSurveyNumber(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 text-sm font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor="crop-harvest-input"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Expected Harvest Window
              </label>
              <input
                id="crop-harvest-input"
                type="text"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddCropModalOpen(false)}
              className="px-4 py-2.5 rounded-lg border-2 border-[#000080] text-[#000080] text-xs font-extrabold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold shadow-md"
            >
              {saving ? 'Saving Crop...' : 'Save Crop & Generate Passport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PersonalizedDashboard: React.FC = () => {
  const {
    user,
    role,
    personalLots,
    setSelectedLotId,
    navigate,
    setAddCropModalOpen,
    arbitrageResult,
    updateArbitrageInput,
  } = useKisan();

  // Determine the user's own crops:
  // - Real users see ONLY their own `personalLots` (0 for brand-new users!).
  // - The dedicated Demo User (`isDemoAccount: true`) sees the isolated Demo Dataset (`CROP_LOTS`) clearly labeled as Demo.
  const activeUserLots: CropLot[] = useMemo(() => {
    if (user?.isDemoAccount) {
      return [...personalLots, ...CROP_LOTS];
    }
    return personalLots;
  }, [user, personalLots]);

  const roleShortcuts: Record<
    UserRole,
    { route: AppRoute; titleEn: string; titleHi: string; desc: string; icon: string }[]
  > = {
    farmer: [
      {
        route: '/advisory',
        titleEn: 'Crop Advisory',
        titleHi: 'फसल सलाह और सुरक्षा',
        desc: 'Check Pre-Harvest Interval (PHI) safety and biological remedies.',
        icon: 'potted_plant',
      },
      {
        route: '/crop-passport',
        titleEn: 'Digital Crop Passport',
        titleHi: 'डिजिटल फसल पासपोर्ट',
        desc: 'View your scannable QR credential and verification status.',
        icon: 'badge',
      },
      {
        route: '/market-comparison',
        titleEn: 'Compare Buyer Offers',
        titleHi: 'बाजार और शुद्ध आय तुलना',
        desc: 'Calculate actual net take-home payout after deductions.',
        icon: 'storefront',
      },
      {
        route: '/harvest-payments',
        titleEn: 'Payments & Delivery',
        titleHi: 'तौल एवं 50-50 भुगतान',
        desc: 'Track zero-Karda weighbridge verification and escrow stages.',
        icon: 'account_balance_wallet',
      },
    ],
    agent: [
      {
        route: '/harvest-payments',
        titleEn: 'Pickup & Gate-Pass Queue',
        titleHi: 'पिकअप और गेट-पास टोकन',
        desc: 'Coordinate village pooling dispatch and weighbridge tokens.',
        icon: 'local_shipping',
      },
      {
        route: '/crop-passport',
        titleEn: 'Farmer Lot Verification',
        titleHi: 'किसान लॉट सत्यापन',
        desc: 'Inspect Digital Crop Passports and QR credentials.',
        icon: 'qr_code_scanner',
      },
      {
        route: '/advisory',
        titleEn: 'Pre-Harvest PHI Guidance',
        titleHi: 'कटाई-पूर्व सुरक्षा सलाह',
        desc: 'Help farmers avoid chemical residue rejections.',
        icon: 'health_and_safety',
      },
      {
        route: '/market-comparison',
        titleEn: 'Net Realization Calculator',
        titleHi: 'शुद्ध भाव कैलकुलेटर',
        desc: 'Compare APMC Mandi vs direct processor bids with farmers.',
        icon: 'calculate',
      },
    ],
    buyer: [
      {
        route: '/crop-passport',
        titleEn: 'Review Quality Evidence',
        titleHi: 'गुणवत्ता और पासपोर्ट जांच',
        desc: 'Inspect NABL MRL status, moisture, and QR credentials.',
        icon: 'verified',
      },
      {
        route: '/market-comparison',
        titleEn: 'Compare Procurement Bids',
        titleHi: 'खरीद बोली और अनुबंध',
        desc: 'Review farmgate pricing, deductions, and net settlement.',
        icon: 'gavel',
      },
      {
        route: '/harvest-payments',
        titleEn: 'Weighbridge & Escrow',
        titleHi: 'तौल पर्ची और एस्क्रो',
        desc: 'Monitor verified net weight and 50-50 settlement stages.',
        icon: 'scale',
      },
      {
        route: '/advisory',
        titleEn: 'Pre-Harvest Compliance',
        titleHi: 'अवशेष-मुक्त मानक',
        desc: 'Review biological remedy standards and PHI safeguards.',
        icon: 'eco',
      },
    ],
  };

  const shortcuts = roleShortcuts[role];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Demo Account Banner (Only visible for Demo Account) */}
      <DemoDataBanner />

      {/* Concise Setup Progress Indicator (Only visible if onboarding/profile is incomplete) */}
      <ContinueSetupCard />

      {/* Personalized Welcome Header */}
      <WelcomeHeader />

      {/* Dominant Personalized Next Action */}
      <FirstCropCard />

      {/* 4 Concise Role-Tailored Quick Actions */}
      <section aria-label="Primary Workspace Shortcuts">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#000080]">
            Core Workflows ({shortcuts.length} Shortcuts)
          </h2>
          <span className="text-xs font-bold text-[#006B3C] font-hindi">
            मुख्य सुविधाएँ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {shortcuts.map((item) => (
            <button
              key={item.route + item.titleEn}
              type="button"
              onClick={() => navigate(item.route)}
              className="p-4 rounded-xl bg-white hover:bg-[#E8EAF6]/60 border-2 border-[#000080]/20 text-left flex flex-col justify-between gap-3 transition-all anim-kpi-card"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#138808] border border-[#138808]/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">
                    {item.icon}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#000080]">
                    {item.titleEn}
                  </h3>
                  <span className="text-[11px] font-bold text-[#006B3C] font-hindi block">
                    {item.titleHi}
                  </span>
                </div>
                <p className="text-xs text-black font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-extrabold text-[#000080]">
                <span>Open</span>
                <span className="material-symbols-outlined text-[15px]">
                  arrow_forward
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Personal Operational Overview: State-Driven Empty States vs Populated Personal Summary */}
      <section aria-label="Your Personal Operational Summary">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#000080]">
            {user?.isDemoAccount
              ? 'Demo Operational Summary (Sample Records)'
              : 'Your Personal Activity'}
          </h2>
          {activeUserLots.length > 0 && (
            <button
              type="button"
              onClick={() => setAddCropModalOpen(true)}
              className="text-xs font-extrabold text-[#138808] hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Crop Lot</span>
            </button>
          )}
        </div>

        {activeUserLots.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PersonalizedEmptyState
              title="My Crops"
              headline="No crops added yet."
              description="Add your first crop to begin exploring eligibility, QR Crop Passports, and procurement."
              actionLabel="Add Crop"
              icon="grass"
              onAction={() => setAddCropModalOpen(true)}
            />
            <PersonalizedEmptyState
              title="Buyer Offers"
              headline="Your buyer comparisons will appear here."
              description="Compare local Mandi deductions against direct farmgate buyer bids using the net realization calculator."
              actionLabel="Explore Buyer Matching"
              icon="storefront"
              onAction={() => navigate('/market-comparison')}
            />
            <PersonalizedEmptyState
              title="Payments"
              headline="No payment activity yet."
              description="Track delivery and 50-50 split escrow milestones once your first procurement transaction is created."
              actionLabel="Learn How Payments Work"
              icon="account_balance_wallet"
              onAction={() => navigate('/harvest-payments')}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. User's Saved Crop Lots */}
            <div className="bg-white rounded-xl border-2 border-[#000080]/25 p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-[#000080]">
                    My Crop Lots ({activeUserLots.length})
                  </span>
                  {user?.isDemoAccount && (
                    <span className="px-2 py-0.5 rounded bg-[#FFDCC2] text-[#371A00] text-[10px] font-extrabold">
                      DEMO DATA
                    </span>
                  )}
                </div>

                {activeUserLots.slice(0, 2).map((lot) => (
                  <div
                    key={lot.id}
                    className="p-3 rounded-lg bg-[#E8EAF6]/60 border border-[#000080]/20 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-[#000080] font-tabular">
                          {lot.shortCode}
                        </span>
                        <span className="text-xs font-extrabold text-black truncate">
                          {lot.cropName}
                        </span>
                      </div>
                      <span className="text-[11px] text-black font-semibold block">
                        {lot.variety} • {lot.quantityQuintals} Quintals
                      </span>
                      <span className="text-[10px] font-extrabold text-[#138808] uppercase block mt-0.5">
                        {lot.verificationStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <QRCodeComponent
                      lotId={lot.id}
                      verificationStatus={lot.verificationStatus}
                      size={56}
                      onInspect={() => {
                        setSelectedLotId(lot.id);
                        navigate('/crop-passport');
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedLotId(activeUserLots[0].id);
                  navigate('/crop-passport');
                }}
                className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[#000080] hover:bg-[#00003C] text-white text-xs font-extrabold"
              >
                Open Digital Crop Passport
              </button>
            </div>

            {/* 2. Personalized Net Realization Estimate for User's Primary Crop */}
            <div className="bg-white rounded-xl border-2 border-[#000080]/25 p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-[#000080]">
                    Net Realization Estimate
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#E8F5E9] text-[#138808] text-[10px] font-extrabold font-tabular">
                    {activeUserLots[0].quantityQuintals} Quintals
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#000080]">
                  {activeUserLots[0].cropName} ({activeUserLots[0].shortCode})
                </h3>
                <div className="p-3 rounded-lg bg-[#E8F5E9] border border-[#138808] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-black">
                      Direct Buyer Net:
                    </span>
                    <span className="font-extrabold text-[#138808] font-tabular">
                      {formatINR(arbitrageResult.directNetPayout)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-black">
                      Local Mandi Net:
                    </span>
                    <span className="font-extrabold text-[#000080] font-tabular">
                      {formatINR(arbitrageResult.mandiNetPayout)}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-[#138808]/30 flex items-center justify-between text-xs font-extrabold text-[#006B3C]">
                    <span>Estimated Net Gain:</span>
                    <span className="font-tabular">
                      +{formatINR(arbitrageResult.netDifference)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  updateArbitrageInput({
                    quantityQuintals: activeUserLots[0].quantityQuintals,
                  });
                  navigate('/market-comparison');
                }}
                className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold"
              >
                Compare Buyer Offers
              </button>
            </div>

            {/* 3. Weighing & Payment Milestone Summary */}
            <div className="bg-white rounded-xl border-2 border-[#000080]/25 p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-[#000080]">
                    Weighbridge &amp; 50-50 Escrow
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#E8EAF6] text-[#000080] text-[10px] font-extrabold">
                    {user?.isDemoAccount ? 'DEMO ESCROW' : 'READY WHEN LOCKED'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#000080]">
                  {user?.isDemoAccount
                    ? '50% Instant UPI + 50% Mill Lock'
                    : 'Staged Payment Protection'}
                </h3>
                <p className="text-xs text-black font-medium leading-relaxed">
                  {user?.isDemoAccount
                    ? `Sample Lot ${activeUserLots[0].shortCode}: ${formatINR(
                        arbitrageResult.firstInstallment50
                      )} released at weighbridge + ${formatINR(
                        arbitrageResult.remainingInstallment50
                      )} on mill delivery.`
                    : `When you lock a buyer offer for ${activeUserLots[0].shortCode}, 50% (${formatINR(
                        arbitrageResult.firstInstallment50
                      )}) is released at weighbridge sign-off and 50% on delivery.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/harvest-payments')}
                className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-white hover:bg-[#E8EAF6] text-[#000080] border-2 border-[#000080] text-xs font-extrabold"
              >
                Open Weighbridge &amp; Escrow Tracker
              </button>
            </div>
          </div>
        )}
      </section>

      <AddCropModal />
    </div>
  );
};
