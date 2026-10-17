import React, { useEffect, useState } from 'react';
import { useKisan } from '../context/KisanContext';

export const AdminLoginDialog: React.FC = () => {
  const {
    adminDialogOpen,
    setAdminDialogOpen,
    user,
    loginWithGoogle,
    adminLoginWithServer,
    navigate,
    devDemoMode,
  } = useKisan();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Close on Escape key (Transition 6)
  useEffect(() => {
    if (!adminDialogOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        setAdminDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [adminDialogOpen, submitting, setAdminDialogOpen]);

  if (!adminDialogOpen) return null;

  const isRegularUserSignedIn = Boolean(user && user.role !== 'admin');
  const isAlreadyAdmin = Boolean(user && user.role === 'admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Please enter administrator email and password.');
      return;
    }
    setSubmitting(true);
    const res = await adminLoginWithServer(email.trim(), password);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(
        res.error || 'Administrator authentication failed. Access denied.'
      );
    }
  };

  const handleQuickFillDevAdmin = () => {
    setErrorMsg('');
    setEmail('registrar.admin@kisan-spo.org.in');
    setPassword('Kisan@Admin#2026');
  };

  const handleGoogleAdminSignIn = async () => {
    setErrorMsg('');
    setSubmitting(true);
    const res = await loginWithGoogle('agent', 'APMC Khandwa Central Hub', true);
    setSubmitting(false);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-auth-dialog-title"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="bg-white border-4 border-[#000080] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 anim-dialog-enter max-h-[92dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b-2 border-[#000080]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#000080] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                admin_panel_settings
              </span>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#138808] block">
                KEYBOARD SHORTCUT: CTRL + SHIFT + A
              </span>
              <h2
                id="admin-auth-dialog-title"
                className="text-lg font-extrabold text-[#000080]"
              >
                Administrator Access
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdminDialogOpen(false)}
            aria-label="Close Administrator Access dialog"
            className="w-9 h-9 rounded-lg border border-[#000080]/30 font-extrabold text-black hover:bg-[#E8EAF6]"
          >
            ✕
          </button>
        </div>

        {isAlreadyAdmin ? (
          <div className="flex flex-col gap-3">
            <div className="p-3.5 rounded-xl bg-[#E8F5E9] border-2 border-[#138808] text-xs text-black font-semibold">
              <strong className="font-extrabold text-[#138808] block text-sm mb-1">
                ✓ Active Administrator Session Verified
              </strong>
              Signed in as <strong>{user?.name}</strong> ({user?.email}). Your
              session is authorized for the Kisan-SPO Administrative Console.
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdminDialogOpen(false)}
                className="px-4 py-2.5 rounded-lg border-2 border-[#000080] text-[#000080] text-xs font-extrabold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminDialogOpen(false);
                  navigate('/admin');
                }}
                className="px-4 py-2.5 rounded-lg bg-[#138808] text-white text-xs font-extrabold"
              >
                Open /admin Console
              </button>
            </div>
          </div>
        ) : (
          <>
            {isRegularUserSignedIn && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#FFDCC2] border-2 border-[#FF9933] text-xs text-black font-semibold"
              >
                <strong className="font-extrabold text-[#371A00] block uppercase">
                  Unauthorized Current Role ({user?.role.toUpperCase()})
                </strong>
                You are currently signed in as <strong>{user?.email}</strong> (
                {user?.role}). Ordinary operational accounts cannot access the{' '}
                <code>/admin</code> console. Authenticate with an authorized
                Mandi Registrar / Administrator account below.
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#FF9933] text-black border-2 border-black text-xs font-extrabold anim-validation-error"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleAdminSignIn}
              className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-[#000080] hover:bg-[#00003C] disabled:opacity-60 text-white font-extrabold text-xs flex items-center justify-center gap-2 anim-btn-press"
            >
              <span className="w-5 h-5 rounded-full bg-white text-[#000080] flex items-center justify-center font-black text-[11px] shrink-0">
                G
              </span>
              <span>Verify Admin via Google Sign-In (Firebase Auth)</span>
            </button>

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <label
                  htmlFor="admin-auth-email"
                  className="block text-xs font-extrabold text-[#000080] mb-1"
                >
                  Administrator Email
                </label>
                <input
                  id="admin-auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="registrar.admin@kisan-spo.org.in"
                  className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080] text-sm font-semibold"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-auth-password"
                  className="block text-xs font-extrabold text-[#000080] mb-1"
                >
                  Administrator Password
                </label>
                <div className="relative">
                  <input
                    id="admin-auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="w-full h-11 pl-3 pr-16 rounded-lg bg-white text-black border-2 border-[#000080] text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2 top-1.5 h-8 px-2 rounded bg-[#E8EAF6] text-[#000080] text-xs font-extrabold"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminDialogOpen(false)}
                  className="px-4 py-2.5 rounded-lg border-2 border-[#000080] text-[#000080] text-xs font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-lg bg-[#000080] hover:bg-[#00003C] text-white text-xs font-extrabold anim-btn-press"
                >
                  {submitting
                    ? 'Verifying RBAC Claims...'
                    : 'Verify & Enter /admin'}
                </button>
              </div>
            </form>

            {devDemoMode && (
              <div className="p-3 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 flex items-center justify-between gap-2">
                <div className="text-[11px] text-black font-semibold">
                  <strong className="text-[#000080] font-extrabold block">
                    Local Dev Mode Admin Seed
                  </strong>
                  Populate server-seeded Registrar credentials for testing.
                </div>
                <button
                  type="button"
                  onClick={handleQuickFillDevAdmin}
                  className="px-2.5 py-1.5 rounded bg-white text-[#000080] border border-[#000080] text-xs font-extrabold shrink-0 hover:bg-[#138808] hover:text-white"
                >
                  Fill Dev Admin
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
