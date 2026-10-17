import React, { useEffect, useState } from 'react';
import { useKisan } from '../context/KisanContext';
import { KISAN_LOGO_URL } from '../data/kisanData';
import { useAuth } from '../hooks/useAuth';
import { Language, UserRole } from '../types/kisan';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps?: number;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps = 4,
}) => {
  const pct = Math.round((currentStep / totalSteps) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-extrabold text-[#000080] mb-1.5">
        <span>
          Step {currentStep} of {totalSteps}
        </span>
        <span className="font-tabular">{pct}% Complete</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Onboarding step ${currentStep} of ${totalSteps}`}
        className="w-full h-2.5 rounded-full bg-[#E8EAF6] overflow-hidden border border-[#000080]/20"
      >
        <div
          className="h-full bg-[#138808] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

interface RoleSelectionCardProps {
  roleValue: UserRole;
  selected: boolean;
  titleEn: string;
  titleHi: string;
  description: string;
  icon: string;
  onSelect: (roleValue: UserRole) => void;
}

export const RoleSelectionCard: React.FC<RoleSelectionCardProps> = ({
  roleValue,
  selected,
  titleEn,
  titleHi,
  description,
  icon,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(roleValue)}
      aria-pressed={selected}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 anim-btn-press ${
        selected
          ? 'bg-[#E8F5E9] border-[#138808] shadow-md'
          : 'bg-white border-[#000080]/30 hover:bg-[#E8EAF6]/60'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          selected
            ? 'bg-[#138808] text-white'
            : 'bg-[#E8EAF6] text-[#000080]'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm sm:text-base font-extrabold text-[#000080]">
            {titleEn}
          </span>
          <span
            className={`material-symbols-outlined text-[20px] shrink-0 ${
              selected ? 'text-[#138808]' : 'text-[#000080]/40'
            }`}
          >
            {selected ? 'check_circle' : 'radio_button_unchecked'}
          </span>
        </div>
        <span className="text-xs font-bold text-[#006B3C] font-hindi block mt-0.5">
          {titleHi}
        </span>
        <p className="text-xs text-black font-medium mt-1.5 leading-relaxed">
          {description}
        </p>
      </div>
    </button>
  );
};

export const OnboardingWizard: React.FC = () => {
  const {
    language,
    setLanguage,
    navigate,
    setAddCropModalOpen,
    showToast,
  } = useKisan();
  const { user, updateUserProfile } = useAuth();

  const [step, setStep] = useState<number>(() =>
    user?.onboardingStep && user.onboardingStep >= 1 && user.onboardingStep <= 4
      ? user.onboardingStep
      : 1
  );

  const [fullName, setFullName] = useState<string>(user?.name || '');
  const [preferredLang, setPreferredLang] = useState<Language>(
    user?.preferredLanguage || language || 'en'
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(
    user?.phoneNumber || ''
  );
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    user?.role === 'agent' || user?.role === 'buyer' ? user.role : 'farmer'
  );
  const [stateName, setStateName] = useState<string>(user?.state || '');
  const [districtName, setDistrictName] = useState<string>(
    user?.district || ''
  );
  const [villageName, setVillageName] = useState<string>(user?.village || '');

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lastRetryAction, setLastRetryAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [logoError, setLogoError] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    if (user.name && !fullName) setFullName(user.name);
    if (user.phoneNumber && !phoneNumber) setPhoneNumber(user.phoneNumber);
    if (user.village && !villageName) setVillageName(user.village);
    if (user.district && !districtName) setDistrictName(user.district);
    if (user.state && !stateName) setStateName(user.state);
  }, [user, fullName, phoneNumber, villageName, districtName, stateName]);

  const handleSaveStep1 = async (skipOptional: boolean) => {
    setErrorMsg('');
    setLastRetryAction(() => () => handleSaveStep1(skipOptional));
    const cleanName = fullName.trim() || user?.name || 'Kisan-SPO Member';
    setSaving(true);
    setLanguage(preferredLang);
    const res = await updateUserProfile({
      name: cleanName,
      preferredLanguage: preferredLang,
      phoneNumber: skipOptional ? '' : phoneNumber.trim(),
      onboardingStatus: 'INCOMPLETE',
      onboardingStep: 2,
    });
    setSaving(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not save Step 1. Please retry.');
      return;
    }
    setLastRetryAction(null);
    setStep(2);
  };

  const handleSaveStep2 = async () => {
    setErrorMsg('');
    setLastRetryAction(() => () => handleSaveStep2());
    setSaving(true);
    const res = await updateUserProfile({
      role: selectedRole,
      onboardingStatus: 'INCOMPLETE',
      onboardingStep: 3,
    });
    setSaving(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not save workspace preference.');
      return;
    }
    setLastRetryAction(null);
    setStep(3);
  };

  const handleSaveStep3 = async (skipLocation: boolean) => {
    setErrorMsg('');
    setLastRetryAction(() => () => handleSaveStep3(skipLocation));
    setSaving(true);
    const res = await updateUserProfile({
      state: skipLocation ? '' : stateName.trim(),
      district: skipLocation ? '' : districtName.trim(),
      village: skipLocation ? '' : villageName.trim(),
      onboardingStatus: 'INCOMPLETE',
      onboardingStep: 4,
    });
    setSaving(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not save location details.');
      return;
    }
    setLastRetryAction(null);
    setStep(4);
  };

  const handleCompleteOnboarding = async (
    targetRoute:
      | '/dashboard'
      | '/advisory'
      | '/crop-passport'
      | '/market-comparison'
      | '/harvest-payments' = '/dashboard',
    openAddCropAfter: boolean = false
  ) => {
    setErrorMsg('');
    setLastRetryAction(
      () => () => handleCompleteOnboarding(targetRoute, openAddCropAfter)
    );
    setSaving(true);
    const res = await updateUserProfile({
      name: fullName.trim() || user?.name || 'Kisan-SPO Member',
      preferredLanguage: preferredLang,
      role: selectedRole,
      state: stateName.trim(),
      district: districtName.trim(),
      village: villageName.trim(),
      onboardingStatus: 'COMPLETED',
      onboardingStep: 4,
    });
    setSaving(false);
    if (!res.ok) {
      setErrorMsg(
        res.error || 'Could not finalize onboarding. Please try again.'
      );
      return;
    }
    setLastRetryAction(null);
    showToast(
      `Welcome, ${fullName.trim() || user?.name || 'Friend'}! Your personal workspace is ready.`,
      'green'
    );
    navigate(targetRoute);
    if (openAddCropAfter) {
      setTimeout(() => setAddCropModalOpen(true), 120);
    }
  };

  const handleSkipOnboardingToDashboard = async () => {
    setSaving(true);
    await updateUserProfile({
      onboardingStatus: 'SKIPPED',
      onboardingStep: step,
    });
    setSaving(false);
    navigate('/dashboard');
  };

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

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col justify-between">
      {/* Compact Header */}
      <header className="w-full border-b border-[#000080]/15 bg-white px-4 sm:px-8 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {!logoError ? (
              <img
                src={KISAN_LOGO_URL}
                alt="Kisan-SPO Logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-8 h-8 object-contain shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#138808] text-white flex items-center justify-center font-black text-base">
                K
              </div>
            )}
            <div>
              <span className="text-base font-extrabold text-[#000080] leading-none block">
                Kisan-SPO
              </span>
              <span className="text-[11px] font-bold text-[#138808] font-hindi block">
                व्यक्तिगत कृषि कार्यक्षेत्र सेटअप
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleSkipOnboardingToDashboard}
            className="px-3 py-1.5 rounded-lg bg-[#E8EAF6] hover:bg-[#000080] hover:text-white text-[#000080] text-xs font-extrabold transition-colors min-h-[36px]"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Main Centered Onboarding Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-xl w-full bg-white rounded-2xl border-2 border-[#000080] p-5 sm:p-7 shadow-xl anim-route-enter">
          <OnboardingProgress currentStep={step} totalSteps={4} />

          {errorMsg && (
            <div
              role="alert"
              className="mt-4 p-3 rounded-lg bg-[#FF9933] text-black border-2 border-black text-xs font-extrabold flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">
                  warning
                </span>
                <span>{errorMsg}</span>
              </div>
              {lastRetryAction && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => lastRetryAction()}
                  className="px-3 py-1 rounded bg-white text-[#000080] border border-black text-[11px] font-extrabold"
                >
                  Retry Save
                </button>
              )}
            </div>
          )}

          {/* STEP 1: PERSONALIZE YOUR PROFILE */}
          {step === 1 && (
            <div key="step-1" className="mt-5 space-y-4 anim-route-enter">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#138808] block">
                  STEP 1 • PERSONALIZE YOUR PROFILE
                </span>
                <h1 className="text-2xl font-extrabold text-[#000080] mt-1">
                  Let&apos;s get to know you
                </h1>
                <p className="text-xs sm:text-sm text-black font-semibold mt-1">
                  Set up your Kisan-SPO workspace in a few simple steps.
                </p>
              </div>

              <div>
                <label
                  htmlFor="onboard-name"
                  className="block text-xs font-extrabold text-[#000080] mb-1"
                >
                  Full Name (पूरा नाम)
                </label>
                <input
                  id="onboard-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] focus:outline-none text-sm font-semibold"
                />
                {user?.email && (
                  <span className="text-[11px] text-[#006B3C] font-bold block mt-1">
                    Signed in as {user.email} (Pre-filled from your account)
                  </span>
                )}
              </div>

              <div>
                <span className="block text-xs font-extrabold text-[#000080] mb-1.5">
                  Preferred Language (पसंदीदा भाषा)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreferredLang('en')}
                    className={`min-h-[48px] px-4 py-2.5 rounded-xl border-2 text-left font-extrabold text-xs flex items-center justify-between ${
                      preferredLang === 'en'
                        ? 'bg-[#000080] text-white border-[#000080]'
                        : 'bg-white text-black border-[#000080]/30 hover:bg-[#E8EAF6]'
                    }`}
                  >
                    <span>English (EN)</span>
                    <span className="material-symbols-outlined text-[18px]">
                      {preferredLang === 'en'
                        ? 'check_circle'
                        : 'radio_button_unchecked'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredLang('hi')}
                    className={`min-h-[48px] px-4 py-2.5 rounded-xl border-2 text-left font-extrabold text-xs font-hindi flex items-center justify-between ${
                      preferredLang === 'hi'
                        ? 'bg-[#000080] text-white border-[#000080]'
                        : 'bg-white text-black border-[#000080]/30 hover:bg-[#E8EAF6]'
                    }`}
                  >
                    <span>हिंदी (Hindi)</span>
                    <span className="material-symbols-outlined text-[18px]">
                      {preferredLang === 'hi'
                        ? 'check_circle'
                        : 'radio_button_unchecked'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="onboard-phone"
                  className="block text-xs font-extrabold text-[#000080] mb-1"
                >
                  Phone Number (Optional • वैकल्पिक मोबाइल नंबर)
                </label>
                <input
                  id="onboard-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g., +91 98260-XXXXX (Optional)"
                  className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/40 focus:border-[#000080] focus:outline-none text-sm font-semibold"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveStep1(true)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg bg-[#E8EAF6] hover:bg-[#000080] hover:text-white text-[#000080] text-xs font-extrabold transition-colors"
                >
                  Skip optional details
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveStep1(false)}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-lg bg-[#138808] hover:bg-[#006B3C] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md anim-btn-press"
                >
                  <span>{saving ? 'Saving...' : 'Continue'}</span>
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE YOUR WORKSPACE */}
          {step === 2 && (
            <div key="step-2" className="mt-5 space-y-4 anim-route-enter">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#138808] block">
                  STEP 2 • CHOOSE YOUR WORKSPACE
                </span>
                <h1 className="text-2xl font-extrabold text-[#000080] mt-1">
                  How will you use Kisan-SPO?
                </h1>
                <p className="text-xs sm:text-sm text-black font-semibold mt-1">
                  Select the workspace that best matches your daily agricultural
                  activities.
                </p>
              </div>

              <div className="space-y-3">
                <RoleSelectionCard
                  roleValue="farmer"
                  selected={selectedRole === 'farmer'}
                  titleEn="Farmer / Family Proxy"
                  titleHi="किसान / पारिवारिक प्रतिनिधि"
                  description="Manage crops, compare buyer offers, and track procurement."
                  icon="eco"
                  onSelect={setSelectedRole}
                />
                <RoleSelectionCard
                  roleValue="agent"
                  selected={selectedRole === 'agent'}
                  titleEn="Village Agent / Arhtiya Partner"
                  titleHi="ग्रामीण एजेंट / आढ़तिया साथी"
                  description="Coordinate farmer onboarding, village pooling, and pickups."
                  icon="local_shipping"
                  onSelect={setSelectedRole}
                />
                <RoleSelectionCard
                  roleValue="buyer"
                  selected={selectedRole === 'buyer'}
                  titleEn="Institutional Buyer"
                  titleHi="संस्थागत खरीदार"
                  description="Review crop lots, quality evidence, and procurement offers."
                  icon="warehouse"
                  onSelect={setSelectedRole}
                />
              </div>

              <div className="p-3 rounded-lg bg-[#E8EAF6] border border-[#000080]/25 text-[11px] text-black font-semibold">
                <strong className="text-[#000080] font-extrabold">
                  Workspace Preference Note:
                </strong>{' '}
                Selecting a workspace personalizes your dashboard layout and
                recommended actions. Restricted organizational records remain
                governed by server-side authorization.
              </div>

              <div className="pt-2 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setStep(1)}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-white border-2 border-[#000080] text-[#000080] text-xs font-extrabold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_back
                  </span>
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveStep2}
                  className="min-h-[48px] px-6 py-2.5 rounded-lg bg-[#138808] hover:bg-[#006B3C] text-white text-sm font-extrabold flex items-center gap-2 shadow-md anim-btn-press"
                >
                  <span>{saving ? 'Saving...' : 'Continue'}</span>
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ADD BASIC LOCATION */}
          {step === 3 && (
            <div key="step-3" className="mt-5 space-y-4 anim-route-enter">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#138808] block">
                  STEP 3 • ADD BASIC LOCATION
                </span>
                <h1 className="text-2xl font-extrabold text-[#000080] mt-1">
                  Where do you operate?
                </h1>
                <p className="text-xs sm:text-sm text-black font-semibold mt-1">
                  Add your region to personalize local Mandi comparisons. You
                  can also skip this step and add it later.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="onboard-state"
                    className="block text-xs font-extrabold text-[#000080] mb-1"
                  >
                    State (राज्य)
                  </label>
                  <input
                    id="onboard-state"
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g., Madhya Pradesh"
                    className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-sm font-semibold"
                  />
                </div>

                <div>
                  <label
                    htmlFor="onboard-district"
                    className="block text-xs font-extrabold text-[#000080] mb-1"
                  >
                    District (जिला)
                  </label>
                  <input
                    id="onboard-district"
                    type="text"
                    value={districtName}
                    onChange={(e) => setDistrictName(e.target.value)}
                    placeholder="e.g., Khandwa"
                    className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="onboard-village"
                  className="block text-xs font-extrabold text-[#000080] mb-1"
                >
                  Village / Mandi Hub (गाँव या मंडी केंद्र • Optional)
                </label>
                <input
                  id="onboard-village"
                  type="text"
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  placeholder="e.g., Chhaigaon Makhan"
                  className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-sm font-semibold"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#E8F5E9] border border-[#138808]/40 text-[11px] text-black font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#138808] text-[18px] shrink-0">
                  privacy_tip
                </span>
                <span>
                  We never request device GPS permissions automatically during
                  signup. Location is optional.
                </span>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setStep(2)}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-white border-2 border-[#000080] text-[#000080] text-xs font-extrabold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_back
                  </span>
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveStep3(true)}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#E8EAF6] hover:bg-[#000080] hover:text-white text-[#000080] text-xs font-extrabold transition-colors"
                  >
                    Skip Location
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveStep3(false)}
                    className="min-h-[48px] px-6 py-2.5 rounded-lg bg-[#138808] hover:bg-[#006B3C] text-white text-sm font-extrabold flex items-center gap-2 shadow-md anim-btn-press"
                  >
                    <span>{saving ? 'Saving...' : 'Continue'}</span>
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CHOOSE YOUR FIRST ACTION */}
          {step === 4 && (
            <div key="step-4" className="mt-5 space-y-4 anim-route-enter">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#138808] block">
                  STEP 4 • READY TO BEGIN
                </span>
                <h1 className="text-2xl font-extrabold text-[#000080] mt-1">
                  Your workspace is almost ready
                </h1>
                <p className="text-xs sm:text-sm text-black font-semibold mt-1">
                  Review your preferences below or choose where you would like
                  to start.
                </p>
              </div>

              {/* Confirmation Summary Card */}
              <div className="p-4 rounded-xl bg-[#E8EAF6] border-2 border-[#000080]/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#000080] uppercase">
                    Name:
                  </span>
                  <span className="font-extrabold text-black">
                    {fullName.trim() || user?.name || 'Kisan-SPO Member'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#000080] uppercase">
                    Selected Workspace:
                  </span>
                  <span className="font-extrabold text-[#138808]">
                    {roleLabels[selectedRole].en}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#000080] uppercase">
                    Preferred Language:
                  </span>
                  <span className="font-extrabold text-black">
                    {preferredLang === 'hi' ? 'हिंदी (Hindi)' : 'English (EN)'}
                  </span>
                </div>
                {(villageName.trim() ||
                  districtName.trim() ||
                  stateName.trim()) && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#000080] uppercase">
                      Location:
                    </span>
                    <span className="font-extrabold text-black">
                      {[
                        villageName.trim(),
                        districtName.trim(),
                        stateName.trim(),
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Role-Specific Suggested Next Steps */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase text-[#000080] block">
                  Recommended Starting Options:
                </span>

                {selectedRole === 'farmer' && (
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleCompleteOnboarding('/dashboard', true)
                      }
                      className="p-3 rounded-xl bg-white hover:bg-[#E8F5E9] border-2 border-[#138808] text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#138808] text-[20px]">
                          add_circle
                        </span>
                        <span className="text-xs font-extrabold text-[#000080]">
                          Add My First Crop
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#138808] text-[18px]">
                        chevron_right
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleCompleteOnboarding('/advisory', false)
                      }
                      className="p-3 rounded-xl bg-white hover:bg-[#E8EAF6] border border-[#000080]/30 text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#000080] text-[20px]">
                          potted_plant
                        </span>
                        <span className="text-xs font-extrabold text-[#000080]">
                          Explore Crop Advisory
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#000080] text-[18px]">
                        chevron_right
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleCompleteOnboarding('/market-comparison', false)
                      }
                      className="p-3 rounded-xl bg-white hover:bg-[#E8EAF6] border border-[#000080]/30 text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#000080] text-[20px]">
                          calculate
                        </span>
                        <span className="text-xs font-extrabold text-[#000080]">
                          Learn About Buyer Offers
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#000080] text-[18px]">
                        chevron_right
                      </span>
                    </button>
                  </div>
                )}

                {selectedRole === 'agent' && (
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleCompleteOnboarding('/dashboard', false)
                      }
                      className="p-3 rounded-xl bg-white hover:bg-[#E8F5E9] border-2 border-[#138808] text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#138808] text-[20px]">
                          hub
                        </span>
                        <span className="text-xs font-extrabold text-[#000080]">
                          Explore Village Pooling
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#138808] text-[18px]">
                        chevron_right
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleCompleteOnboarding('/harvest-payments', false)
                      }
                      className="p-3 rounded-xl bg-white hover:bg-[#E8EAF6] border border-[#000080]/30 text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#000080] text-[20px]">
                          local_shipping
                        </span>
                        <span className="text-xs font-extrabold text-[#000080]">
                          Open Pickup Scheduling
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#000080] text-[18px]">
                        chevron_right
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleCompleteOnboarding('/harvest-payments', false)
                      }
                      className="p-3 rounded-xl bg-white hover:bg-[#E8EAF6] border border-[#000080]/30 text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#000080] text-[20px]">
                          scale
                        </span>
                        <span className="text-xs font-extrabold text-[#000080]">
                          Learn About Gate-Pass Operations
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#000080] text-[18px]">
                        chevron_right
                      </span>
                    </button>
                  </div>
                )}

                {selectedRole === 'buyer' && (
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleCompleteOnboarding('/crop-passport', false)
                      }
                      className="p-3 rounded-xl bg-white hover:bg-[#E8F5E9] border-2 border-[#138808] text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#138808] text-[20px]">
                          inventory_2
                        </span>
                        <span className="text-xs font-extrabold text-[#000080]">
                          Explore Available Lots
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#138808] text-[18px]">
                        chevron_right
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleCompleteOnboarding('/crop-passport', false)
                      }
                      className="p-3 rounded-xl bg-white hover:bg-[#E8EAF6] border border-[#000080]/30 text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#000080] text-[20px]">
                          verified
                        </span>
                        <span className="text-xs font-extrabold text-[#000080]">
                          Review Verification Workflows
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#000080] text-[18px]">
                        chevron_right
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleCompleteOnboarding('/market-comparison', false)
                      }
                      className="p-3 rounded-xl bg-white hover:bg-[#E8EAF6] border border-[#000080]/30 text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#000080] text-[20px]">
                          gavel
                        </span>
                        <span className="text-xs font-extrabold text-[#000080]">
                          Learn About Procurement
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#000080] text-[18px]">
                        chevron_right
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dominant Primary Action */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setStep(3)}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-white border-2 border-[#000080] text-[#000080] text-xs font-extrabold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_back
                  </span>
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleCompleteOnboarding('/dashboard', false)}
                  className="flex-1 min-h-[48px] px-6 py-2.5 rounded-lg bg-[#138808] hover:bg-[#006B3C] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md anim-btn-press"
                >
                  <span>{saving ? 'Opening...' : 'Open My Dashboard'}</span>
                  <span className="material-symbols-outlined text-[18px]">
                    check_circle
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#000080]/15 py-3 px-4 sm:px-8 text-center text-xs text-black font-semibold">
        Kisan-SPO Personal Workspace Setup • Progress is saved automatically to
        your profile
      </footer>
    </div>
  );
};
