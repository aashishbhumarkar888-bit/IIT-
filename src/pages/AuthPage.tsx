import React, { useState } from 'react';
import { useKisan } from '../context/KisanContext';
import { KISAN_LOGO_URL } from '../data/kisanData';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/kisan';

export const AuthPage: React.FC = () => {
  const {
    route,
    navigate,
    language,
    setLanguage,
    setAdminDialogOpen,
  } = useKisan();

  const {
    loginWithGoogle,
    loginWithServer,
    registerWithServer,
    requestPasswordReset,
    devDemoMode,
    authSuccessTransition,
  } = useAuth();

  const mode: 'login' | 'signup' | 'forgot' =
    route === '/signup'
      ? 'signup'
      : route === '/forgot-password'
      ? 'forgot'
      : 'login';

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [villageOrOrg, setVillageOrOrg] = useState<string>('');
  const [signupRole, setSignupRole] = useState<UserRole>('farmer');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [resetConfirmation, setResetConfirmation] = useState<string>('');
  const [logoError, setLogoError] = useState<boolean>(false);

  const switchMode = (target: '/login' | '/signup' | '/forgot-password') => {
    setErrorMsg('');
    setResetConfirmation('');
    navigate(target);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResetConfirmation('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setSubmitting(true);
      const res = await requestPasswordReset(trimmedEmail);
      setSubmitting(false);
      if (!res.ok) {
        setErrorMsg(res.error || 'Could not process recovery request.');
      } else {
        setResetConfirmation(
          res.message ||
            'Password recovery instructions have been sent to your email address.'
        );
      }
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Please enter a password with at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name or FPO representative name.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please confirm your password.');
        return;
      }
      setSubmitting(true);
      const res = await registerWithServer({
        name: fullName.trim(),
        email: trimmedEmail,
        password,
        role: signupRole,
        villageOrOrg: villageOrOrg.trim() || 'Khandwa Cluster',
      });
      setSubmitting(false);
      if (!res.ok) {
        setErrorMsg(res.error || 'Registration failed.');
      }
      return;
    }

    // Login mode
    setSubmitting(true);
    const res = await loginWithServer(trimmedEmail, password);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Invalid email or password.');
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setErrorMsg('');
    setResetConfirmation('');
    if (mode !== 'login') navigate('/login');
    setEmail(demoEmail);
    setPassword('Kisan@2026');
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setResetConfirmation('');
    setSubmitting(true);
    const res = await loginWithGoogle(
      signupRole,
      villageOrOrg.trim() || 'Khandwa Cluster',
      false
    );
    setSubmitting(false);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col justify-between">
      {/* Top Minimal Utility Strip */}
      <header className="w-full border-b border-[#000080]/15 bg-white px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 anim-brand-entrance">
            {!logoError ? (
              <img
                src={KISAN_LOGO_URL}
                alt="Kisan-SPO Logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-9 h-9 object-contain shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#138808] text-white flex items-center justify-center font-black text-lg">
                K
              </div>
            )}
            <div>
              <span className="text-lg font-extrabold text-[#000080] tracking-tight block leading-none">
                Kisan-SPO
              </span>
              <span className="text-[11px] font-bold text-[#138808] font-hindi block mt-0.5">
                सही सलाह • बेहतर दाम • सुरक्षित भुगतान
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Language switcher"
              className="flex items-center bg-[#E8EAF6] p-0.5 rounded-lg border border-[#000080]/20"
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded text-xs font-extrabold min-h-[34px] transition-colors ${
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
                className={`px-2.5 py-1 rounded text-xs font-extrabold font-hindi min-h-[34px] transition-colors ${
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
              onClick={() => setAdminDialogOpen(true)}
              title="Administrator Access (Ctrl + Shift + A)"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#E8EAF6] text-[#000080] border border-[#000080]/30 text-xs font-extrabold flex items-center gap-1 min-h-[36px]"
            >
              <span className="material-symbols-outlined text-[16px]">
                admin_panel_settings
              </span>
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Animation 3: Brief Brand Success Cue Overlay on Confirmed Auth */}
      {authSuccessTransition && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-50 bg-[#00003C]/90 flex items-center justify-center p-4"
        >
          <div className="bg-white border-4 border-[#138808] rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl anim-success-cue">
            <div className="w-14 h-14 rounded-full bg-[#138808] text-white flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[32px]">
                verified
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-[#000080] mt-3">
              Authentication Verified
            </h2>
            <p className="text-xs text-black font-semibold mt-1">
              Opening your authorized Kisan-SPO workspace...
            </p>
          </div>
        </div>
      )}

      {/* Main Two-Column Desktop / Single-Column Mobile Viewport */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 sm:py-12">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT REGION (7 cols on Desktop): Brand Narrative, Connected Route SVG, 3 Benefits, Restrained Preview */}
          <div className="lg:col-span-7 flex flex-col gap-6 anim-brand-entrance">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F5E9] border border-[#138808]">
                <span className="material-symbols-outlined text-[#138808] text-[16px]">
                  eco
                </span>
                <span className="text-xs font-extrabold text-[#006B3C] uppercase tracking-wider">
                  Smart Procurement &amp; Lifecycle Orchestration
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#000080] tracking-tight mt-3 leading-tight">
                From Farm to Fair Price.
              </h1>
              <p className="text-base sm:text-lg text-black font-semibold mt-2 max-w-xl leading-relaxed">
                One connected journey for crop safety, trusted procurement, and
                transparent payments.
              </p>
            </div>

            {/* Subtle Animated Connected-Farm Illustration */}
            <div className="w-full bg-[#E8EAF6]/60 rounded-2xl p-4 border-2 border-[#000080]/20">
              <svg
                className="w-full h-auto"
                viewBox="0 0 600 110"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Connected agricultural lifecycle from Crop Safety to Digital Crop Passport to 50-50 Instant UPI Escrow"
              >
                {/* Connecting Route Line */}
                <path
                  d="M 85 52 L 300 52 L 515 52"
                  stroke="#000080"
                  strokeOpacity="0.25"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 85 52 L 300 52 L 515 52"
                  stroke="#138808"
                  strokeWidth="4"
                  strokeDasharray="8 8"
                  strokeLinecap="round"
                  className="anim-route-line"
                />

                {/* Node 1: Pre-Harvest Safety */}
                <g transform="translate(85, 52)">
                  <circle r="24" fill="#138808" />
                  <circle r="18" fill="#FFFFFF" />
                  <circle r="8" fill="#138808" />
                  <text
                    x="0"
                    y="42"
                    textAnchor="middle"
                    fill="#000080"
                    fontSize="12"
                    fontWeight="800"
                  >
                    1. Safe Harvest (PHI)
                  </text>
                </g>

                {/* Node 2: Digital Crop Passport & Arbitrage */}
                <g transform="translate(300, 52)">
                  <circle r="24" fill="#000080" />
                  <circle r="18" fill="#FFFFFF" />
                  <rect x="-7" y="-7" width="14" height="14" fill="#000080" />
                  <text
                    x="0"
                    y="42"
                    textAnchor="middle"
                    fill="#000080"
                    fontSize="12"
                    fontWeight="800"
                  >
                    2. Passport &amp; Net Price
                  </text>
                </g>

                {/* Node 3: Weighbridge & 50-50 UPI Escrow */}
                <g transform="translate(515, 52)">
                  <circle r="24" fill="#FF9933" stroke="#000000" strokeWidth="2" />
                  <circle r="16" fill="#FFFFFF" />
                  <circle r="7" fill="#138808" />
                  <text
                    x="0"
                    y="42"
                    textAnchor="middle"
                    fill="#000080"
                    fontSize="12"
                    fontWeight="800"
                  >
                    3. 50-50 UPI Escrow
                  </text>
                </g>
              </svg>
            </div>

            {/* Three Concise Benefit Statements */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white border-2 border-[#000080]/20">
                <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#138808] flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[20px]">
                    verified_user
                  </span>
                </div>
                <h2 className="text-sm font-extrabold text-[#000080]">
                  Know what is safe before harvest.
                </h2>
                <p className="text-xs text-black font-medium mt-1">
                  PHI waiting-period safeguards and zero-residue biological
                  guidance.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border-2 border-[#000080]/20">
                <div className="w-8 h-8 rounded-lg bg-[#E8EAF6] text-[#000080] flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[20px]">
                    calculate
                  </span>
                </div>
                <h2 className="text-sm font-extrabold text-[#000080]">
                  Compare offers by actual net realization.
                </h2>
                <p className="text-xs text-black font-medium mt-1">
                  Transparent take-home comparison after transport, loading, and
                  cess.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border-2 border-[#000080]/20">
                <div className="w-8 h-8 rounded-lg bg-[#FFDCC2] text-[#371A00] flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[20px]">
                    scale
                  </span>
                </div>
                <h2 className="text-sm font-extrabold text-[#000080]">
                  Track weighing, delivery, and payments.
                </h2>
                <p className="text-xs text-black font-medium mt-1">
                  Zero-Karda weighbridge verification and 50-50 split escrow
                  milestones.
                </p>
              </div>
            </div>

            {/* Restrained Product Preview Strip */}
            <div className="hidden sm:flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#00003C] text-white border-2 border-[#000080]">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-[#138808] text-white text-xs font-extrabold font-tabular">
                  Lot #KS-089
                </span>
                <span className="text-xs font-semibold">
                  25 Quintals Sharbati Wheat • Verified NABL Zero-MRL
                </span>
              </div>
              <span className="text-xs font-extrabold text-[#9DF6B9] font-tabular shrink-0">
                Direct Net: ₹53,250 (+26% vs Mandi)
              </span>
            </div>
          </div>

          {/* RIGHT REGION (5 cols on Desktop): Focused White Authentication Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white rounded-2xl border-2 border-[#000080] p-6 sm:p-7 shadow-xl anim-auth-card">
              {/* Card Mode Header */}
              <div className="mb-5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#138808] block">
                  {mode === 'login'
                    ? 'PROTECTED WORKSPACE SIGN IN'
                    : mode === 'signup'
                    ? 'NEW KISAN-SPO ACCOUNT'
                    : 'ACCOUNT PASSWORD RECOVERY'}
                </span>
                <h2 className="text-2xl font-extrabold text-[#000080] mt-1">
                  {mode === 'login'
                    ? 'Sign in to Kisan-SPO'
                    : mode === 'signup'
                    ? 'Create Your Account'
                    : 'Reset Your Password'}
                </h2>
                <p className="text-xs text-black font-semibold font-hindi mt-0.5">
                  {mode === 'login'
                    ? 'किसान, आढ़तिया साथी या संस्थागत खरीदार के रूप में लॉग इन करें'
                    : mode === 'signup'
                    ? 'नया खाता पंजीकृत करें'
                    : 'पंजीकृत ईमेल पर पासवर्ड रीसेट लिंक प्राप्त करें'}
                </p>
              </div>

              {/* Error Banner (Animation 24) */}
              {errorMsg && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-lg bg-[#FF9933] text-black border-2 border-black text-xs font-extrabold flex items-start gap-2 anim-validation-error"
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0">
                    warning
                  </span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Password Reset Confirmation Banner */}
              {resetConfirmation && (
                <div
                  role="status"
                  className="mb-4 p-3 rounded-lg bg-[#E8F5E9] text-black border-2 border-[#138808] text-xs font-extrabold flex items-start gap-2 anim-success-cue"
                >
                  <span className="material-symbols-outlined text-[#138808] text-[18px] shrink-0">
                    check_circle
                  </span>
                  <span>{resetConfirmation}</span>
                </div>
              )}

              {/* Google Sign-In with Firebase Auth & Cloud Firestore Persistence */}
              {mode !== 'forgot' && (
                <div className="mb-4">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleGoogleSignIn}
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-lg bg-[#000080] hover:bg-[#00003C] disabled:opacity-60 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2.5 anim-btn-press"
                  >
                    <span className="w-6 h-6 rounded-full bg-white text-[#000080] flex items-center justify-center font-black text-xs shrink-0">
                      G
                    </span>
                    <span>
                      Continue with Google (Firebase Auth &amp; Firestore)
                    </span>
                  </button>
                  <div className="my-3 flex items-center gap-2">
                    <div className="h-px bg-[#000080]/20 flex-1" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#000080]">
                      or sign in with Kisan-SPO credentials
                    </span>
                    <div className="h-px bg-[#000080]/20 flex-1" />
                  </div>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {mode === 'signup' && (
                  <>
                    <div>
                      <label
                        htmlFor="auth-fullname"
                        className="block text-xs font-extrabold text-[#000080] mb-1"
                      >
                        Full Name / FPO Representative Name
                      </label>
                      <input
                        id="auth-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g., Ramesh Patel"
                        className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] focus:outline-none text-sm font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="auth-role"
                          className="block text-xs font-extrabold text-[#000080] mb-1"
                        >
                          Operational Role
                        </label>
                        <select
                          id="auth-role"
                          value={signupRole}
                          onChange={(e) =>
                            setSignupRole(e.target.value as UserRole)
                          }
                          className="w-full h-11 px-2.5 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-xs font-extrabold"
                        >
                          <option value="farmer">Farmer / Family Proxy</option>
                          <option value="agent">
                            Village Agent / Arhtiya
                          </option>
                          <option value="buyer">Institutional Buyer</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="auth-village"
                          className="block text-xs font-extrabold text-[#000080] mb-1"
                        >
                          Village / Organization
                        </label>
                        <input
                          id="auth-village"
                          type="text"
                          value={villageOrOrg}
                          onChange={(e) => setVillageOrOrg(e.target.value)}
                          placeholder="e.g., Khandwa"
                          className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] text-sm font-semibold"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-extrabold text-[#000080] mb-1"
                  >
                    Email Address (ईमेल पता)
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@kisan-spo.in"
                    className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] focus:outline-none text-sm font-semibold"
                  />
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="auth-password"
                        className="text-xs font-extrabold text-[#000080]"
                      >
                        Password (पासवर्ड)
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('/forgot-password')}
                          className="text-xs font-extrabold text-[#000080] underline hover:text-[#138808]"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={
                          mode === 'login' ? 'current-password' : 'new-password'
                        }
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full h-11 pl-3 pr-16 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] focus:outline-none text-sm font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        className="absolute right-2 top-1.5 h-8 px-2 rounded bg-[#E8EAF6] text-[#000080] text-xs font-extrabold"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-confirm-password"
                      className="block text-xs font-extrabold text-[#000080] mb-1"
                    >
                      Confirm Password (पासवर्ड की पुष्टि करें)
                    </label>
                    <input
                      id="auth-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080]/50 focus:border-[#000080] focus:outline-none text-sm font-semibold"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] bg-[#138808] hover:bg-[#006B3C] disabled:opacity-60 text-white rounded-lg font-extrabold text-sm shadow-md flex items-center justify-center gap-2 anim-btn-press"
                >
                  {submitting ? (
                    <span>Verifying with Kisan-SPO Server...</span>
                  ) : mode === 'login' ? (
                    <>
                      <span>Sign In to Workspace</span>
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    </>
                  ) : mode === 'signup' ? (
                    <span>Create Account &amp; Continue</span>
                  ) : (
                    <span>Send Recovery Instructions</span>
                  )}
                </button>
              </form>

              {/* Mode Switch Links */}
              <div className="mt-4 pt-4 border-t border-[#000080]/15 flex items-center justify-between text-xs font-bold">
                {mode === 'login' ? (
                  <>
                    <span className="text-black">New to Kisan-SPO?</span>
                    <button
                      type="button"
                      onClick={() => switchMode('/signup')}
                      className="text-[#000080] font-extrabold underline hover:text-[#138808]"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-black">Already have an account?</span>
                    <button
                      type="button"
                      onClick={() => switchMode('/login')}
                      className="text-[#000080] font-extrabold underline hover:text-[#138808]"
                    >
                      Back to Sign In
                    </button>
                  </>
                )}
              </div>

              {/* Clearly Labeled Development Mode Demo & Isolation Test Accounts */}
              {devDemoMode && (
                <div className="mt-4 p-3 rounded-xl bg-[#E8EAF6] border border-[#000080]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#000080]">
                      Dev Mode Test Accounts (3 Experiences)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-[#000080] text-[9px] font-extrabold border border-[#000080]/20">
                      DEV / DEMO ONLY
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount('anita.verma@kisan-spo.in')
                      }
                      className="p-2 rounded bg-white hover:bg-[#138808] hover:text-white text-black border border-[#000080]/30 text-[11px] font-extrabold text-left transition-colors"
                    >
                      <span className="block text-[#138808] group-hover:text-white uppercase text-[9px]">
                        Exp A • New User
                      </span>
                      <span>Anita Verma (Fresh)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount('ramesh.patel@kisan-spo.in')
                      }
                      className="p-2 rounded bg-[#FFDCC2]/70 hover:bg-[#138808] hover:text-white text-black border border-[#FF9933] text-[11px] font-extrabold text-left transition-colors"
                    >
                      <span className="block text-[#371A00] uppercase text-[9px]">
                        Exp B • Demo Farmer
                      </span>
                      <span>Ramesh Patel (Sample)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount('suresh.kumar@kisan-spo.in')
                      }
                      className="p-2 rounded bg-white hover:bg-[#138808] hover:text-white text-black border border-[#000080]/30 text-[11px] font-extrabold text-left transition-colors"
                    >
                      <span className="block text-[#000080] uppercase text-[9px]">
                        Exp C • Returning
                      </span>
                      <span>Suresh Kumar (1 Lot)</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount('agent.khandwa@kisan-spo.in')
                      }
                      className="p-1.5 rounded bg-white hover:bg-[#000080] hover:text-white text-black border border-[#000080]/30 text-[11px] font-extrabold text-center transition-colors"
                    >
                      Village Agent (Dr. Raman)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount('procurement@itc-agri.in')
                      }
                      className="p-1.5 rounded bg-white hover:bg-[#000080] hover:text-white text-black border border-[#000080]/30 text-[11px] font-extrabold text-center transition-colors"
                    >
                      Institutional Buyer (ITC)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-[#000080]/15 py-3 px-4 sm:px-8 text-center sm:text-left">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-black font-semibold">
          <span>
            © 2026 Kisan-SPO • Smart Procurement &amp; Lifecycle Orchestration
          </span>
          <span className="font-tabular text-[11px] text-[#000080] font-bold">
            Admin Shortcut: Ctrl + Shift + A (Cmd + Shift + A on macOS)
          </span>
        </div>
      </footer>
    </div>
  );
};
