import React, { useEffect, useMemo, useState } from 'react';
import { AppRoute, useKisan } from '../context/KisanContext';
import { CROP_LOTS } from '../data/kisanData';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/kisan';
import { AnimatedNumber } from './AnimatedNumber';
import { QRCodeComponent } from './QRCodeComponent';

export const DemoAccountBadge: React.FC = () => (
  <span
    aria-label="Demo Account"
    className="px-2.5 py-0.5 rounded-md bg-[#FF9933] text-black text-[10px] font-extrabold uppercase tracking-wider border border-black inline-flex items-center gap-1"
  >
    <span className="material-symbols-outlined text-[13px]">science</span>
    <span>Demo Account</span>
  </span>
);

export const DemoDataBanner: React.FC = () => {
  const { user, resetDemoDataset, navigate } = useKisan();

  if (!user?.isDemoAccount) return null;

  return (
    <div
      role="region"
      aria-label="Demo Workspace Mode Notice"
      className="bg-[#FFDCC2] border-2 border-[#FF9933] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <span className="material-symbols-outlined text-[#371A00] text-[22px] shrink-0">
          science
        </span>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-[#371A00] uppercase tracking-wider">
              Sample Agricultural Dataset Active
            </span>
            <DemoAccountBadge />
          </div>
          <p className="text-xs text-[#371A00] font-semibold mt-0.5">
            You are exploring Kisan-SPO with preloaded sample crop lots (Sharbati
            Wheat, JS-2034 Soybean, Cotton). Personal accounts start with a clean
            workspace.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={resetDemoDataset}
          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white hover:bg-[#E8EAF6] text-[#000080] border border-[#000080] text-xs font-extrabold flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">
            restart_alt
          </span>
          <span>Reset Demo Dataset</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#000080] hover:bg-[#00003C] text-white text-xs font-extrabold flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">person</span>
          <span>Switch Role / Profile</span>
        </button>
      </div>
    </div>
  );
};

export const WelcomeHeader: React.FC = () => {
  const {
    user,
    role,
    language,
    navigate,
    setAddCropModalOpen,
    personalLots,
  } = useKisan();

  if (!user) return null;

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

  const activeRoleBadge =
    user.role === 'admin'
      ? language === 'hi'
        ? 'प्रशासक (Admin)'
        : 'Admin'
      : language === 'hi'
        ? roleLabels[role].hi
        : roleLabels[role].en;

  const locationParts = [user.village, user.district, user.state].filter(
    Boolean
  );
  const locationSummary =
    locationParts.length > 0 ? locationParts.join(', ') : null;

  const completionPct = user.profileCompletion ?? 85;
  const greetingName = user.name?.trim();

  const quickActions: {
    label: string;
    icon: string;
    onClick: () => void;
    primary?: boolean;
  }[] =
    role === 'farmer'
      ? [
          {
            label:
              personalLots.length === 0 && !user.isDemoAccount
                ? 'Add My First Crop'
                : 'Add Crop Lot',
            icon: 'add_circle',
            onClick: () => setAddCropModalOpen(true),
            primary: true,
          },
          {
            label: 'Check Crop Advisory',
            icon: 'Sprinkler',
            onClick: () => navigate('/advisory'),
          },
          {
            label: 'View Crop Passport',
            icon: 'qr_code_2',
            onClick: () => navigate('/crop-passport'),
          },
          {
            label: 'Compare Buyer Offers',
            icon: 'currency_rupee',
            onClick: () => navigate('/market-comparison'),
          },
        ]
      : role === 'agent'
        ? [
            {
              label: 'Explore Pickup Scheduling',
              icon: 'local_shipping',
              onClick: () => navigate('/harvest-payments'),
              primary: true,
            },
            {
              label: 'Add Farmer Crop Lot',
              icon: 'person_add',
              onClick: () => setAddCropModalOpen(true),
            },
            {
              label: 'Verify Crop Passports',
              icon: 'verified',
              onClick: () => navigate('/crop-passport'),
            },
            {
              label: 'Compare Mandi Spreads',
              icon: 'trending_up',
              onClick: () => navigate('/market-comparison'),
            },
          ]
        : [
            {
              label: 'Browse Available Crop Lots',
              icon: 'inventory_2',
              onClick: () => navigate('/crop-passport'),
              primary: true,
            },
            {
              label: 'Evaluate Price Arbitrage',
              icon: 'analytics',
              onClick: () => navigate('/market-comparison'),
            },
            {
              label: 'Inspect Escrow & Logistics',
              icon: 'fact_check',
              onClick: () => navigate('/harvest-payments'),
            },
            {
              label: 'Regional Crop Health',
              icon: 'eco',
              onClick: () => navigate('/advisory'),
            },
          ];

  return (
    <section
      aria-label="Personal Welcome Header"
      className="bg-white rounded-2xl border-2 border-[#000080] p-5 sm:p-6 shadow-sm space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-[#E8EAF6] text-[#000080] text-xs font-extrabold uppercase tracking-wider border border-[#000080]/30">
              {activeRoleBadge}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#E8F5E9] text-[#006B3C] text-xs font-extrabold border border-[#138808]/30">
              {language === 'hi' ? 'हिंदी (HI)' : 'English (EN)'}
            </span>
            {user.isDemoAccount && <DemoAccountBadge />}
            {user.emailVerified && (
              <span className="px-2 py-0.5 rounded bg-[#E8F5E9] text-[#138808] text-[11px] font-extrabold inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">
                  verified
                </span>
                <span>Verified</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#000080] tracking-tight">
            {greetingName
              ? language === 'hi'
                ? `नमस्ते, ${greetingName}`
                : `Welcome, ${greetingName}`
              : language === 'hi'
                ? 'किसान-एसपीओ में आपका स्वागत है'
                : 'Welcome to Kisan-SPO'}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-black font-semibold">
            {locationSummary ? (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#138808]">
                  location_on
                </span>
                <span>{locationSummary}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="inline-flex items-center gap-1 text-[#000080] underline font-extrabold hover:text-[#138808]"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add_location_alt
                </span>
                <span>Add your village &amp; district in Profile</span>
              </button>
            )}

            <span className="inline-flex items-center gap-1 text-[#006B3C]">
              <span className="material-symbols-outlined text-[16px]">
                mail
              </span>
              <span>{user.email}</span>
            </span>
          </div>
        </div>

        {/* Profile Completion Status Indicator */}
        <div className="bg-[#FAF9F6] rounded-xl border border-[#000080]/20 p-3.5 sm:min-w-[230px] flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#000080] uppercase tracking-wider">
              Profile Completion
            </span>
            <span className="text-xs font-extrabold font-tabular text-[#138808]">
              {completionPct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E8EAF6] overflow-hidden">
            <div
              className="h-full bg-[#138808] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(20, completionPct))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-black font-medium">
              {completionPct >= 100
                ? 'Workspace fully configured'
                : 'Add location for local Mandi rates'}
            </span>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="font-extrabold text-[#000080] hover:underline"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Concise 4 Primary Workflow Actions */}
      <div className="pt-2 border-t border-[#000080]/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {quickActions.map((act) => (
          <button
            key={act.label}
            type="button"
            onClick={act.onClick}
            className={`min-h-[46px] px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between gap-2 transition-all anim-btn-press ${
              act.primary
                ? 'bg-[#138808] hover:bg-[#006B3C] text-white shadow-sm'
                : 'bg-[#E8EAF6]/75 hover:bg-[#000080] text-[#000080] hover:text-white border border-[#000080]/25'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <span className="material-symbols-outlined text-[18px]">
                {act.icon}
              </span>
              <span className="truncate">{act.label}</span>
            </span>
            <span className="material-symbols-outlined text-[16px] shrink-0">
              arrow_forward
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export const FirstCropCard: React.FC = () => {
  const { role, setAddCropModalOpen, navigate, personalLots, user } =
    useKisan();

  const hasPersonalCrops = personalLots.length > 0 || Boolean(user?.isDemoAccount);

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
              : 'Add My First Crop'}
          </h2>
          <p className="text-xs text-white/90 font-medium max-w-xl leading-relaxed">
            {hasPersonalCrops
              ? 'Generate a scannable Digital Crop Passport QR code or compare local Mandi deductions against direct institutional buyer offers.'
              : 'Start by adding a crop lot (such as Wheat, Soybean, Cotton, or Chana) to create your Digital Crop Passport and compare net take-home payouts.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/crop-to-cash')}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white text-[#000080] border-2 border-[#9DF6B9] text-sm font-extrabold flex items-center gap-2 shadow-md anim-btn-press"
          >
            <span className="material-symbols-outlined text-[20px]">
              account_tree
            </span>
            <span>Crop-to-Cash Ledger</span>
          </button>
          <button
            type="button"
            onClick={() => setAddCropModalOpen(true)}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-sm font-extrabold flex items-center gap-2 shadow-md anim-btn-press"
          >
            <span className="material-symbols-outlined text-[20px]">
              add_circle
            </span>
            <span>
              {hasPersonalCrops ? 'Add Another Crop Lot' : 'Add My First Crop'}
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
          <h2 className="text-xl font-extrabold">Explore Pickup Scheduling</h2>
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
            <span>Explore Pickup Scheduling</span>
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
        <h2 className="text-xl font-extrabold">Browse Available Crop Lots</h2>
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
          <span>Browse Available Crop Lots</span>
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
                if (val === 'Chana (Gram)') setVariety('JG-11 Desi Chana');
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
    currentLot,
    selectedLotId,
    setSelectedLotId,
    setAddCropModalOpen,
    arbitrageResult,
    navigate,
  } = useKisan();

  const isDemo = Boolean(user?.isDemoAccount);
  const displayedLots = useMemo(() => {
    if (isDemo && personalLots.length === 0) {
      return CROP_LOTS;
    }
    return personalLots;
  }, [isDemo, personalLots]);

  const hasActiveCrops = displayedLots.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <DemoDataBanner />
      <WelcomeHeader />
      <FirstCropCard />

      {/* =====================================================================
          ROLE 1: FARMER / FAMILY PROXY WORKSPACE
      ===================================================================== */}
      {role === 'farmer' && (
        <>
          {/* 2. My Crops */}
          <section
            aria-label="My Crops"
            className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 sm:p-6 space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#000080]/15 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#138808] block">
                  SECTION 1 • MY CROPS
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#000080]">
                  My Crops (मेरी फसलें)
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setAddCropModalOpen(true)}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold inline-flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
                <span>Add Crop</span>
              </button>
            </div>

            {!hasActiveCrops ? (
              <div className="rounded-xl bg-[#FAF9F6] border-2 border-dashed border-[#000080]/30 p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] text-[#138808] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[26px]">
                    grass
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#000080]">
                  No Crops Added Yet
                </h3>
                <p className="text-xs sm:text-sm text-black font-medium max-w-lg mx-auto">
                  You have not added any crops yet. Start by adding a crop such
                  as Wheat, Soybean, Cotton, or Chana.
                </p>
                <button
                  type="button"
                  onClick={() => setAddCropModalOpen(true)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold inline-flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    add_circle
                  </span>
                  <span>Add Crop</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {displayedLots.map((lot) => {
                  const isSelected = lot.id === selectedLotId;
                  return (
                    <div
                      key={lot.id}
                      onClick={() => setSelectedLotId(lot.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedLotId(lot.id);
                        }
                      }}
                      className={`rounded-xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#E8F5E9]/60 border-[#138808] shadow-sm'
                          : 'bg-[#FAF9F6] border-[#000080]/20 hover:border-[#000080]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#000080] text-white text-[10px] font-extrabold font-tabular">
                            {lot.id}
                          </span>
                          <span className="text-xs font-extrabold text-[#138808] font-tabular">
                            {lot.quantityQuintals} Quintals
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-[#000080]">
                          {lot.cropName}
                        </h3>
                        <p className="text-xs text-black font-semibold">
                          Variety: {lot.variety} • {lot.surveyNumber}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#000080]/15 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#006B3C]">
                          Offer: ₹
                          {lot.directBuyerPricePerQuintal.toLocaleString(
                            'en-IN'
                          )}
                          /q
                        </span>
                        <span className="font-extrabold text-[#000080]">
                          {isSelected ? '✓ Active Lot' : 'Select Lot →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. Crop Advisory, 4. Crop Passport, 5. Buyer Offers, 6. Payments and Delivery */}
          {!hasActiveCrops ? (
            <section
              aria-label="Personal Workspace Modules"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <PersonalizedEmptyState
                title="Crop Advisory"
                headline="Stage-Specific Crop Guidance"
                description="Select or add a crop to receive stage-specific advisory, pest guidance, and field alerts."
                actionLabel="Open Crop Advisory"
                icon="Sprinkler"
                onAction={() => navigate('/advisory')}
              />
              <PersonalizedEmptyState
                title="Crop Passport"
                headline="Digital QR Traceability"
                description="Create a crop lot to generate your Digital Crop Passport and QR traceability view."
                actionLabel="Add Crop for Passport"
                icon="qr_code_2"
                onAction={() => setAddCropModalOpen(true)}
              />
              <PersonalizedEmptyState
                title="Buyer Offers"
                headline="Mandi vs Direct Buyer Comparison"
                description="Add a crop lot to compare local Mandi price and institutional buyer offers."
                actionLabel="Compare Prices"
                icon="currency_rupee"
                onAction={() => navigate('/market-comparison')}
              />
              <PersonalizedEmptyState
                title="Payments and Delivery"
                headline="Pickup & Escrow Settlement"
                description="Your pickup schedule, gate pass, and payment status will appear here after a crop lot is active."
                actionLabel="View Logistics & Escrow"
                icon="local_shipping"
                onAction={() => navigate('/harvest-payments')}
              />
            </section>
          ) : (
            <section
              aria-label="Active Crop Modules"
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              {/* 3. Crop Advisory Summary */}
              <div className="bg-white rounded-2xl border-2 border-[#000080]/20 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                      CROP ADVISORY • {currentLot.cropName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-[#E8F5E9] text-[#006B3C] text-[11px] font-extrabold">
                      {currentLot.grade}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-[#000080]">
                    Stage-Specific Field &amp; Pest Guidance
                  </h3>
                  <p className="text-xs text-black font-medium">
                    Grain Moisture:{' '}
                    <strong>{currentLot.evidence.moisturePercent}%</strong> •
                    MRL Status:{' '}
                    <strong>{currentLot.evidence.mrlStatus}</strong> • Plot:{' '}
                    <strong>{currentLot.surveyNumber}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/advisory')}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#000080] hover:bg-[#00003C] text-white text-xs font-extrabold flex items-center justify-between"
                >
                  <span>Open Full Crop Advisory &amp; Pest Check</span>
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </button>
              </div>

              {/* 4. Crop Passport Summary */}
              <div className="bg-white rounded-2xl border-2 border-[#000080]/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                    CROP PASSPORT • QR VERIFIED
                  </span>
                  <h3 className="text-lg font-extrabold text-[#000080]">
                    Lot {currentLot.id} ({currentLot.variety})
                  </h3>
                  <p className="text-xs text-black font-medium">
                    Grade: <strong>{currentLot.grade}</strong> • Lab Cert:{' '}
                    <strong className="font-tabular">
                      {currentLot.evidence.certificateNumber}
                    </strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/crop-passport')}
                    className="min-h-[40px] px-4 py-2 rounded-lg bg-[#E8F5E9] hover:bg-[#138808] text-[#006B3C] hover:text-white border border-[#138808] text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open Digital Crop Passport</span>
                    <span className="material-symbols-outlined text-[16px]">
                      qr_code_2
                    </span>
                  </button>
                </div>
                <div className="shrink-0 self-center">
                  <QRCodeComponent
                    lotId={currentLot.id}
                    cropName={currentLot.cropName}
                    size={96}
                    showControls={false}
                  />
                </div>
              </div>

              {/* 5. Buyer Offers Summary */}
              <div className="bg-white rounded-2xl border-2 border-[#000080]/20 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                    BUYER OFFERS &amp; MANDI COMPARISON
                  </span>
                  <h3 className="text-lg font-extrabold text-[#000080]">
                    Net Gain: +₹
                    <AnimatedNumber value={arbitrageResult.netDifference} />{' '}
                    across {currentLot.quantityQuintals} Quintals
                  </h3>
                  <p className="text-xs text-black font-medium">
                    Local Mandi: ₹
                    {currentLot.mandiPricePerQuintal.toLocaleString('en-IN')}/q
                    vs Kisan-SPO Direct Buyer: ₹
                    {currentLot.directBuyerPricePerQuintal.toLocaleString(
                      'en-IN'
                    )}
                    /q
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/market-comparison')}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold flex items-center justify-between"
                >
                  <span>Compare Buyer Offers &amp; Lock Price</span>
                  <span className="material-symbols-outlined text-[16px]">
                    currency_rupee
                  </span>
                </button>
              </div>

              {/* 6. Payments and Delivery Summary */}
              <div className="bg-white rounded-2xl border-2 border-[#000080]/20 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                    PAYMENTS &amp; DELIVERY
                  </span>
                  <h3 className="text-lg font-extrabold text-[#000080]">
                    Farm-Gate Pickup &amp; T+0 Escrow
                  </h3>
                  <p className="text-xs text-black font-medium">
                    Expected Harvest Window:{' '}
                    <strong>{currentLot.harvestDate}</strong> • Direct bank
                    settlement upon digital weighbridge verification.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/harvest-payments')}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#000080] hover:bg-[#00003C] text-white text-xs font-extrabold flex items-center justify-between"
                >
                  <span>View Pickup Schedule &amp; Escrow Status</span>
                  <span className="material-symbols-outlined text-[16px]">
                    local_shipping
                  </span>
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* =====================================================================
          ROLE 2: VILLAGE AGENT / ARHTIYA PARTNER WORKSPACE
      ===================================================================== */}
      {role === 'agent' && (
        <section
          aria-label="Village Agent Operations"
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {/* 2. Farmer Onboarding Queue */}
          <div className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                  1 • FARMER ONBOARDING QUEUE
                </span>
                <span className="px-2.5 py-0.5 rounded bg-[#E8EAF6] text-[#000080] text-xs font-extrabold font-tabular">
                  {displayedLots.length} Active Lot{displayedLots.length === 1 ? '' : 's'}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-[#000080]">
                Village Farmer Lot Registration
              </h3>
              <p className="text-xs text-black font-medium">
                Register farmer harvest lots, verify survey plots, and issue
                Digital Crop Passports for your village cluster.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddCropModalOpen(true)}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold flex items-center justify-between"
            >
              <span>Add Farmer Crop Lot to Queue</span>
              <span className="material-symbols-outlined text-[16px]">
                person_add
              </span>
            </button>
          </div>

          {/* 3. Pickup Scheduling */}
          <div className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                2 • PICKUP SCHEDULING
              </span>
              <h3 className="text-lg font-extrabold text-[#000080]">
                Multi-Farm Cluster Dispatch
              </h3>
              <p className="text-xs text-black font-medium">
                Pool village harvest volumes to unlock zero-cost farm-gate truck
                dispatch and coordinate arrival slots.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/harvest-payments')}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#000080] hover:bg-[#00003C] text-white text-xs font-extrabold flex items-center justify-between"
            >
              <span>Open Pickup Scheduling Desk</span>
              <span className="material-symbols-outlined text-[16px]">
                local_shipping
              </span>
            </button>
          </div>

          {/* 4. Gate-Pass and Verification Queue */}
          <div className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                3 • GATE-PASS &amp; VERIFICATION QUEUE
              </span>
              <h3 className="text-lg font-extrabold text-[#000080]">
                Weighbridge &amp; Moisture Assay Verification
              </h3>
              <p className="text-xs text-black font-medium">
                Inspect NABL residue-free certificates, verify QR gate passes,
                and confirm net quintal weights at dispatch.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/crop-passport')}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#E8EAF6] hover:bg-[#000080] text-[#000080] hover:text-white text-xs font-extrabold flex items-center justify-between transition-colors"
            >
              <span>Inspect Crop Passports &amp; QR Codes</span>
              <span className="material-symbols-outlined text-[16px]">
                qr_code_scanner
              </span>
            </button>
          </div>

          {/* 5. Commission and Settlement Summary */}
          <div className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                4 • COMMISSION &amp; SETTLEMENT SUMMARY
              </span>
              <h3 className="text-lg font-extrabold text-[#000080]">
                Transparent Agent Facilitation Ledger
              </h3>
              <p className="text-xs text-black font-medium">
                Track verified quality-grading facilitation incentives and T+0
                farmer bank settlement status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/market-comparison')}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#E8F5E9] hover:bg-[#138808] text-[#006B3C] hover:text-white border border-[#138808] text-xs font-extrabold flex items-center justify-between transition-colors"
            >
              <span>Review Price Spreads &amp; Margins</span>
              <span className="material-symbols-outlined text-[16px]">
                payments
              </span>
            </button>
          </div>
        </section>
      )}

      {/* =====================================================================
          ROLE 3: INSTITUTIONAL BUYER WORKSPACE
      ===================================================================== */}
      {role === 'buyer' && (
        <section
          aria-label="Institutional Buyer Operations"
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {/* 2. Available Crop Lots */}
          <div className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                  1 • AVAILABLE CROP LOTS
                </span>
                <span className="px-2.5 py-0.5 rounded bg-[#E8F5E9] text-[#006B3C] text-xs font-extrabold font-tabular">
                  {displayedLots.length} Verified Lot{displayedLots.length === 1 ? '' : 's'}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-[#000080]">
                Traceable Farm-Gate Inventory
              </h3>
              <p className="text-xs text-black font-medium">
                Browse identity-preserved Sharbati Wheat, High-Oil Soybean, and
                Cotton lots with full plot-level provenance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/crop-passport')}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold flex items-center justify-between"
            >
              <span>Browse Available Crop Lots</span>
              <span className="material-symbols-outlined text-[16px]">
                inventory_2
              </span>
            </button>
          </div>

          {/* 3. Quality and Passport Verification */}
          <div className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                2 • QUALITY &amp; PASSPORT VERIFICATION
              </span>
              <h3 className="text-lg font-extrabold text-[#000080]">
                NABL Lab Assay &amp; Residue-Free Audit
              </h3>
              <p className="text-xs text-black font-medium">
                Verify moisture content, foreign matter thresholds, and zero
                synthetic pesticide logs before locking procurement bids.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/crop-passport')}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#000080] hover:bg-[#00003C] text-white text-xs font-extrabold flex items-center justify-between"
            >
              <span>Verify Digital Crop Passports</span>
              <span className="material-symbols-outlined text-[16px]">
                verified
              </span>
            </button>
          </div>

          {/* 4. Offer Comparison and Procurement Desk */}
          <div className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                3 • OFFER COMPARISON &amp; PROCUREMENT DESK
              </span>
              <h3 className="text-lg font-extrabold text-[#000080]">
                Direct-to-Farmer Arbitrage Calculator
              </h3>
              <p className="text-xs text-black font-medium">
                Structure competitive farm-gate bids that reward quality while
                eliminating intermediary Mandi friction.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/market-comparison')}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#E8EAF6] hover:bg-[#000080] text-[#000080] hover:text-white text-xs font-extrabold flex items-center justify-between transition-colors"
            >
              <span>Open Offer Comparison Desk</span>
              <span className="material-symbols-outlined text-[16px]">
                calculate
              </span>
            </button>
          </div>

          {/* 5. Settlement and Delivery Tracking */}
          <div className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#138808]">
                4 • SETTLEMENT &amp; DELIVERY TRACKING
              </span>
              <h3 className="text-lg font-extrabold text-[#000080]">
                Escrow Release &amp; Weighbridge Telemetry
              </h3>
              <p className="text-xs text-black font-medium">
                Monitor live dispatch transit, digital gate-pass check-ins, and
                automated T+0 escrow settlement milestones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/harvest-payments')}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#E8F5E9] hover:bg-[#138808] text-[#006B3C] hover:text-white border border-[#138808] text-xs font-extrabold flex items-center justify-between transition-colors"
            >
              <span>Track Settlement &amp; Delivery</span>
              <span className="material-symbols-outlined text-[16px]">
                fact_check
              </span>
            </button>
          </div>
        </section>
      )}

      <ProfileSummaryCard />
      <AddCropModal />
    </div>
  );
};

export const ProfileSummaryCard: React.FC = () => {
  const { user, role, language, navigate, personalLots } = useKisan();

  if (!user) return null;

  const initials = (user.name || 'KS')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabels: Record<UserRole, string> = {
    farmer: 'Farmer / Family Proxy',
    agent: 'Village Agent / Arhtiya Partner',
    buyer: 'Institutional Buyer',
  };

  const locationDisplay =
    [user.village, user.district, user.state].filter(Boolean).join(', ') ||
    'Not specified yet';

  return (
    <section
      aria-label="Your Profile Summary"
      className="bg-white rounded-xl border-2 border-[#000080]/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-[#000080] text-white font-extrabold text-base flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-extrabold text-[#000080] truncate">
              {user.name}
            </h3>
            {user.isDemoAccount && <DemoAccountBadge />}
          </div>
          <p className="text-xs text-black font-semibold truncate">
            {user.email} • {roleLabels[role]}
          </p>
          <p className="text-[11px] text-[#006B3C] font-bold mt-0.5">
            Region: {locationDisplay} • Language:{' '}
            {language === 'hi' ? 'हिंदी (Hindi)' : 'English'} • Saved Crops:{' '}
            {personalLots.length}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#E8EAF6] hover:bg-[#000080] hover:text-white text-[#000080] text-xs font-extrabold transition-colors"
        >
          Edit Profile &amp; Preferences
        </button>
      </div>
    </section>
  );
};

export const ProfileSettings: React.FC = () => {
  const {
    role,
    setRole,
    language,
    setLanguage,
    resetDemoDataset,
    navigate,
    personalLots,
    setAddCropModalOpen,
    showToast,
  } = useKisan();
  const { user, updateUserProfile, logout } = useAuth();

  const [displayName, setDisplayName] = useState<string>(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(
    user?.phoneNumber || ''
  );
  const [village, setVillage] = useState<string>(user?.village || '');
  const [district, setDistrict] = useState<string>(user?.district || '');
  const [stateName, setStateName] = useState<string>(user?.state || '');
  const [selectedRole, setSelectedRole] = useState<UserRole>(role);
  const [preferredLang, setPreferredLang] = useState<'en' | 'hi'>(language);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.name || '');
    setPhoneNumber(user.phoneNumber || '');
    setVillage(user.village || '');
    setDistrict(user.district || '');
    setStateName(user.state || '');
    const safeRole: UserRole =
      user.role === 'agent' || user.role === 'buyer' ? user.role : 'farmer';
    setSelectedRole(safeRole);
    setPreferredLang(user.preferredLanguage || language);
  }, [user?.id]);

  if (!user) return null;

  const initials = (user.name || 'KS')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaveMessage('');

    const cleanName = displayName.trim();
    if (!cleanName) {
      setErrorMsg('Display name cannot be empty.');
      return;
    }

    setSaving(true);
    const hasLocation = Boolean(
      village.trim() || district.trim() || stateName.trim()
    );
    const res = await updateUserProfile({
      name: cleanName,
      phoneNumber: phoneNumber.trim(),
      village: village.trim(),
      district: district.trim(),
      state: stateName.trim(),
      role: selectedRole,
      preferredLanguage: preferredLang,
      onboardingStatus: 'COMPLETED',
      onboardingStep: 4,
      profileCompletion: hasLocation ? 100 : 85,
    });
    setSaving(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Could not save profile updates.');
      return;
    }

    setRole(selectedRole);
    setLanguage(preferredLang);
    setSaveMessage(
      'Your personal profile and workspace preferences have been saved.'
    );
    showToast('Profile settings updated and persisted.', 'green');
  };

  const handleResetOnboarding = async () => {
    setSaving(true);
    setErrorMsg('');
    const res = await updateUserProfile({
      onboardingStatus: 'IN_PROGRESS',
      onboardingStep: 1,
    });
    setSaving(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not reset onboarding wizard.');
      return;
    }
    navigate('/onboarding');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {user.isDemoAccount && <DemoDataBanner />}

      {/* Top Profile Identity Header */}
      <div className="bg-white rounded-2xl border-2 border-[#000080] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#000080] text-white font-black text-2xl flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#000080]">
                {user.name}
              </h1>
              {user.isDemoAccount ? (
                <DemoAccountBadge />
              ) : (
                <span className="px-2.5 py-0.5 rounded bg-[#E8F5E9] text-[#006B3C] border border-[#138808]/40 text-[10px] font-extrabold uppercase">
                  Personal Account
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-black font-semibold">
              {user.email} • ID:{' '}
              <span className="font-tabular">{user.uidLabel}</span>
            </p>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span
                className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${
                  user.emailVerified
                    ? 'bg-[#E8F5E9] text-[#138808] border border-[#138808]/30'
                    : 'bg-[#FFDCC2] text-[#371A00] border border-[#FF9933]'
                }`}
              >
                {user.emailVerified
                  ? '✓ Provider Verified Email'
                  : 'Unverified Email'}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#E8EAF6] text-[#000080] font-extrabold text-[11px] font-tabular">
                Onboarding: {user.onboardingStatus || 'COMPLETED'} (
                {user.profileCompletion ?? 100}%)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleResetOnboarding}
            className="min-h-[42px] px-3.5 py-2 rounded-lg bg-[#E8EAF6] hover:bg-[#000080] hover:text-white text-[#000080] text-xs font-extrabold transition-colors"
          >
            Re-run Onboarding Wizard
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="min-h-[42px] px-3.5 py-2 rounded-lg bg-white border-2 border-[#000080] text-[#000080] text-xs font-extrabold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[#FF9933] text-black border-2 border-black text-xs font-extrabold"
        >
          {errorMsg}
        </div>
      )}

      {saveMessage && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-[#E8F5E9] text-[#006B3C] border-2 border-[#138808] text-xs font-extrabold"
        >
          ✓ {saveMessage}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6" noValidate>
        {/* Section 1: Personal Information */}
        <section className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 sm:p-6 space-y-4">
          <div className="border-b border-[#000080]/15 pb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#138808] block">
              SECTION 1 • PERSONAL IDENTITY
            </span>
            <h2 className="text-lg font-extrabold text-[#000080]">
              Personal Information (व्यक्तिगत जानकारी)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Display Name (पूरा नाम)
              </label>
              <input
                id="profile-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-sm font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email-readonly"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Authenticated Email (पंजीकृत ईमेल)
              </label>
              <input
                id="profile-email-readonly"
                type="email"
                readOnly
                value={user.email}
                className="w-full h-11 px-3 rounded-lg bg-[#E8EAF6]/60 text-black border border-[#000080]/30 text-sm font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Phone Number (Optional • मोबाइल नंबर)
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., +91 98260-XXXXX"
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-sm font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor="profile-village"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Village / Mandi Hub (गाँव / मंडी केंद्र)
              </label>
              <input
                id="profile-village"
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g., Chhaigaon Makhan"
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-sm font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor="profile-district"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                District (जिला)
              </label>
              <input
                id="profile-district"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g., Khandwa"
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-sm font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor="profile-state"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                State (राज्य)
              </label>
              <input
                id="profile-state"
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="e.g., Madhya Pradesh"
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-sm font-semibold"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Workspace Preferences */}
        <section className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 sm:p-6 space-y-4">
          <div className="border-b border-[#000080]/15 pb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#138808] block">
              SECTION 2 • WORKSPACE &amp; LANGUAGE
            </span>
            <h2 className="text-lg font-extrabold text-[#000080]">
              Workspace Preferences (कार्यक्षेत्र और भाषा प्राथमिकताएं)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="profile-role-select"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Selected Workspace Role (सक्रिय कार्यक्षेत्र)
              </label>
              <select
                id="profile-role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080] text-sm font-extrabold"
              >
                <option value="farmer">
                  Farmer / Family Proxy (किसान / पारिवारिक प्रतिनिधि)
                </option>
                <option value="agent">
                  Village Agent / Arhtiya Partner (ग्रामीण एजेंट / आढ़तिया साथी)
                </option>
                <option value="buyer">
                  Institutional Buyer (संस्थागत खरीदार)
                </option>
              </select>
              <span className="text-[11px] text-black font-medium block mt-1">
                Adjusts your dashboard layout and workflow shortcuts. Server-side
                authorization governs restricted records.
              </span>
            </div>

            <div>
              <span className="block text-xs font-extrabold text-[#000080] mb-1">
                Preferred Interface Language (पसंदीदा भाषा)
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreferredLang('en')}
                  className={`h-11 px-3 rounded-lg border-2 text-xs font-extrabold flex items-center justify-between ${
                    preferredLang === 'en'
                      ? 'bg-[#000080] text-white border-[#000080]'
                      : 'bg-white text-black border-[#000080]/30 hover:bg-[#E8EAF6]'
                  }`}
                >
                  <span>English (EN)</span>
                  <span className="material-symbols-outlined text-[16px]">
                    {preferredLang === 'en'
                      ? 'check_circle'
                      : 'radio_button_unchecked'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredLang('hi')}
                  className={`h-11 px-3 rounded-lg border-2 text-xs font-extrabold font-hindi flex items-center justify-between ${
                    preferredLang === 'hi'
                      ? 'bg-[#000080] text-white border-[#000080]'
                      : 'bg-white text-black border-[#000080]/30 hover:bg-[#E8EAF6]'
                  }`}
                >
                  <span>हिंदी (Hindi)</span>
                  <span className="material-symbols-outlined text-[16px]">
                    {preferredLang === 'hi'
                      ? 'check_circle'
                      : 'radio_button_unchecked'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#138808] hover:bg-[#006B3C] text-white text-sm font-extrabold flex items-center gap-2 shadow-md anim-btn-press"
            >
              <span className="material-symbols-outlined text-[18px]">
                save
              </span>
              <span>
                {saving ? 'Saving Preferences...' : 'Save Profile Changes'}
              </span>
            </button>
          </div>
        </section>
      </form>

      {/* Section 3: Personal Crop Lots & Account Security */}
      <section className="bg-white rounded-2xl border-2 border-[#000080]/25 p-5 sm:p-6 space-y-4">
        <div className="border-b border-[#000080]/15 pb-3 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#138808] block">
              SECTION 3 • ACCOUNT &amp; SECURITY
            </span>
            <h2 className="text-lg font-extrabold text-[#000080]">
              Account Status, Data Isolation &amp; Sign-Out
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAddCropModalOpen(true)}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#E8F5E9] hover:bg-[#138808] text-[#006B3C] hover:text-white border border-[#138808] text-xs font-extrabold transition-colors"
          >
            + Add Personal Crop Lot
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#E8EAF6]/60 border border-[#000080]/20">
            <span className="font-bold text-[#000080] uppercase block text-[10px]">
              Personal Crop Lots
            </span>
            <strong className="text-base font-extrabold text-black font-tabular block mt-0.5">
              {personalLots.length} Saved Lot
              {personalLots.length === 1 ? '' : 's'}
            </strong>
            <span className="text-[11px] text-black font-medium">
              Scoped exclusively to {user.email}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E8EAF6]/60 border border-[#000080]/20">
            <span className="font-bold text-[#000080] uppercase block text-[10px]">
              Profile Created
            </span>
            <strong className="text-sm font-extrabold text-black font-tabular block mt-0.5">
              {user.createdAt || 'Active Session'}
            </strong>
            <span className="text-[11px] text-black font-medium">
              Last updated: {user.updatedAt || 'Just now'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E8EAF6]/60 border border-[#000080]/20">
            <span className="font-bold text-[#000080] uppercase block text-[10px]">
              Data Scope &amp; Security
            </span>
            <strong className="text-sm font-extrabold text-[#138808] block mt-0.5">
              {user.isDemoAccount
                ? 'Isolated Demo Dataset'
                : 'Private User Workspace'}
            </strong>
            <span className="text-[11px] text-black font-medium">
              Passwords &amp; tokens are never displayed
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#000080]/15">
          {user.isDemoAccount ? (
            <button
              type="button"
              onClick={resetDemoDataset}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-white hover:bg-[#E8EAF6] text-[#000080] border-2 border-[#000080] text-xs font-extrabold"
            >
              Reset Demo Dataset
            </button>
          ) : (
            <span className="text-xs text-black font-semibold">
              Signed in securely as <strong>{user.email}</strong>
            </span>
          )}

          <button
            type="button"
            onClick={logout}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FF9933] hover:bg-[#e6821f] text-black border-2 border-black text-xs font-extrabold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            <span>Sign Out of Kisan-SPO</span>
          </button>
        </div>
      </section>

      <AddCropModal />
    </div>
  );
};
