import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { QRCodeComponent } from '../components/QRCodeComponent';
import { AuthenticatedUser, useKisan } from '../context/KisanContext';
import {
  ACTIVE_PICKUP,
  ACTIVE_WEIGHMENT,
  BUYER_OFFERS,
  FARM_PLOTS,
} from '../data/kisanData';
import { useAuth } from '../hooks/useAuth';
import { formatINR, getVerificationBadgeMeta } from '../services/kisanService';
import { VerificationStatus } from '../types/kisan';

type AdminTab =
  | 'overview'
  | 'users'
  | 'lots'
  | 'verification'
  | 'buyers'
  | 'logistics'
  | 'payments-audit';

interface ServerAuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  target: string;
  reason: string;
  status: 'SUCCESS' | 'DENIED' | 'WARNING';
}

export const AdminDashboardPage: React.FC = () => {
  const {
    navigate,
    allLots,
    updateLotVerificationStatus,
    payment,
    showToast,
  } = useKisan();
  const { user, token, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [usersList, setUsersList] = useState<AuthenticatedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<ServerAuditLog[]>([]);
  const [systemStatus, setSystemStatus] = useState<Record<string, string>>({});
  const [loadingAdminData, setLoadingAdminData] = useState<boolean>(true);
  const [adminError, setAdminError] = useState<string>('');

  // Search & filter states
  const [userSearch, setUserSearch] = useState<string>('');
  const [lotSearch, setLotSearch] = useState<string>('');
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Role & status update modal state
  const [editingUser, setEditingUser] = useState<AuthenticatedUser | null>(null);
  const [newUserRole, setNewUserRole] = useState<
    'farmer' | 'agent' | 'buyer' | 'admin'
  >('farmer');
  const [roleReason, setRoleReason] = useState<string>('');

  // Verification review state
  const [reviewLotId, setReviewLotId] = useState<string>('KS-MP-2025-089');
  const [reviewStatus, setReviewStatus] = useState<VerificationStatus>(
    'INDEPENDENTLY_VERIFIED'
  );
  const [reviewReason, setReviewReason] = useState<string>('');

  const fetchAdminData = useCallback(async () => {
    if (!token) return;
    setLoadingAdminData(true);
    setAdminError('');
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(
          data.error || 'Unauthorized access to administrative endpoint.'
        );
      } else {
        setUsersList(data.users || []);
        setAuditLogs(data.auditLogs || []);
        setSystemStatus(data.systemStatus || {});
      }
    } catch {
      setAdminError('Network error loading administrative records.');
    } finally {
      setLoadingAdminData(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchAdminData();
  }, [user, navigate, fetchAdminData]);

  // Derived administrative summary metrics from actual records
  const summaryStats = useMemo(() => {
    const verificationRequests = allLots.filter(
      (l) =>
        l.verificationStatus === 'DOCUMENT_VERIFIED' ||
        l.verificationStatus === 'FARMER_DECLARED' ||
        l.verificationStatus === 'VERIFICATION_PENDING'
    ).length;

    const paymentExceptions =
      payment.status === 'PAYMENT_FAILED' || payment.status === 'DISPUTE_OPENED'
        ? 1
        : 0;

    const openDisputes = payment.status === 'DISPUTE_OPENED' ? 1 : 0;

    return {
      registeredUsers: usersList.length,
      activeCropLots: allLots.length,
      verificationRequests,
      activeBids: BUYER_OFFERS.length,
      scheduledPickups: ACTIVE_PICKUP.stops.length,
      paymentExceptions,
      openDisputes,
      auditEventCount: auditLogs.length,
    };
  }, [usersList.length, allLots, payment.status, auditLogs.length]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.villageOrOrg.toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

  const filteredLots = useMemo(() => {
    const q = lotSearch.trim().toLowerCase();
    if (!q) return allLots;
    return allLots.filter(
      (l) =>
        l.id.toLowerCase().includes(q) ||
        l.farmerName.toLowerCase().includes(q) ||
        l.cropName.toLowerCase().includes(q) ||
        l.surveyNumber.toLowerCase().includes(q)
    );
  }, [allLots, lotSearch]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.actorEmail.toLowerCase().includes(q) ||
        a.target.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  const handleSaveRoleChange = async () => {
    if (!editingUser || !token) return;
    if (roleReason.trim().length < 5) {
      showToast(
        'Please provide a documented audit reason (min 5 characters).',
        'saffron'
      );
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: newUserRole,
          reason: roleReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Role update rejected by server.', 'saffron');
        return;
      }
      setUsersList((prev) =>
        prev.map((u) => (u.id === editingUser.id ? data.user : u))
      );
      setAuditLogs(data.auditLogs || auditLogs);
      setEditingUser(null);
      setRoleReason('');
      showToast(
        `Updated ${data.user.email} role to ${data.user.role.toUpperCase()} with audit trail.`,
        'green'
      );
    } catch {
      showToast('Network error updating user role.', 'saffron');
    }
  };

  const handleToggleUserStatus = async (targetUser: AuthenticatedUser) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          active: !targetUser.active,
          reason: `Administrative status toggle by ${user?.email}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not update account status.', 'saffron');
        return;
      }
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? data.user : u))
      );
      setAuditLogs(data.auditLogs || auditLogs);
      showToast(
        `Account ${data.user.email} ${
          data.user.active ? 'activated' : 'deactivated'
        }.`,
        data.user.active ? 'green' : 'saffron'
      );
    } catch {
      showToast('Server error updating account status.', 'saffron');
    }
  };

  const handleSubmitLotVerificationReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (reviewReason.trim().length < 5) {
      showToast(
        'Mandatory Audit Requirement: Enter a verification reason (min 5 characters).',
        'saffron'
      );
      return;
    }

    try {
      const res = await fetch(`/api/admin/lots/${reviewLotId}/verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: reviewStatus,
          reason: reviewReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Verification update failed.', 'saffron');
        return;
      }
      updateLotVerificationStatus(reviewLotId, reviewStatus);
      setAuditLogs(data.auditLogs || auditLogs);
      setReviewReason('');
    } catch {
      showToast('Server error recording verification review.', 'saffron');
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const navItems: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Admin Overview', icon: 'dashboard' },
    { id: 'users', label: 'User Management', icon: 'manage_accounts' },
    { id: 'lots', label: 'Crop Lot Registry', icon: 'inventory_2' },
    { id: 'verification', label: 'Verification Review', icon: 'verified' },
    { id: 'buyers', label: 'Buyer & Bid Desk', icon: 'gavel' },
    { id: 'logistics', label: 'Logistics & Queue', icon: 'local_shipping' },
    { id: 'payments-audit', label: 'Payments & Audit', icon: 'policy' },
  ];

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col lg:flex-row">
      {/* Dedicated Administrative Navigation Rail */}
      <aside className="w-full lg:w-64 bg-[#00003C] text-white shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r-2 border-[#000080]">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#FF9933] text-black flex items-center justify-center font-black">
                <span className="material-symbols-outlined text-[20px]">
                  admin_panel_settings
                </span>
              </div>
              <div>
                <span className="text-sm font-extrabold text-white block leading-none">
                  KISAN-SPO ADMIN
                </span>
                <span className="text-[10px] font-bold text-[#9DF6B9] uppercase tracking-wider">
                  Mandi Registrar Console
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="lg:hidden px-2.5 py-1 rounded bg-[#138808] text-white text-xs font-extrabold"
            >
              Exit Admin
            </button>
          </div>

          <nav
            aria-label="Administrative Modules"
            className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2.5 rounded-lg text-left flex items-center gap-2.5 text-xs font-extrabold whitespace-nowrap transition-colors min-h-[42px] ${
                    active
                      ? 'bg-[#138808] text-white shadow'
                      : 'text-white hover:bg-[#000080]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:flex flex-col gap-2 p-4 border-t border-white/20 text-xs">
          <div className="p-2.5 rounded-lg bg-[#000080] border border-white/20">
            <span className="text-[10px] font-extrabold text-[#9DF6B9] block uppercase">
              AUTHENTICATED REGISTRAR
            </span>
            <span className="font-extrabold text-white block truncate mt-0.5">
              {user.name}
            </span>
            <span className="text-[11px] text-white/90 block truncate">
              {user.email}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full py-2 rounded-lg bg-white text-[#000080] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-[#E8EAF6]"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            <span>Return to Operations App</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2 rounded-lg bg-[#FF9933] text-black font-extrabold text-xs flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">
              logout
            </span>
            <span>Sign Out Admin Session</span>
          </button>
        </div>
      </aside>

      {/* Main Administrative Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b-2 border-[#000080]/15 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-[#000080]">
                {navItems.find((i) => i.id === activeTab)?.label}
              </h1>
              <span className="px-2 py-0.5 rounded bg-[#E8F5E9] border border-[#138808] text-[#006B3C] text-[10px] font-extrabold uppercase">
                SERVER RBAC VERIFIED
              </span>
            </div>
            <p className="text-xs text-black font-medium">
              All administrative actions require server-side role verification
              and record an immutable audit trail entry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAdminData}
              className="px-3 py-1.5 rounded-lg bg-[#E8EAF6] text-[#000080] border border-[#000080]/30 text-xs font-extrabold flex items-center gap-1 min-h-[38px]"
            >
              <span className="material-symbols-outlined text-[16px]">
                refresh
              </span>
              <span>Sync Records</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 anim-route-enter">
          {adminError && (
            <div className="p-4 rounded-xl bg-[#FF9933] text-black border-2 border-black text-xs font-extrabold">
              {adminError}
            </div>
          )}

          {loadingAdminData ? (
            <div className="p-8 text-center text-sm font-extrabold text-[#000080]">
              Loading server-verified administrative records...
            </div>
          ) : (
            <>
              {/* TAB 1: MAIN ADMIN OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-xl bg-white border-2 border-[#000080] anim-kpi-card">
                      <span className="text-[11px] font-extrabold uppercase text-[#000080] block">
                        Registered Users
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-[#000080] mt-1">
                        <AnimatedNumber value={summaryStats.registeredUsers} />
                      </div>
                      <span className="text-[11px] text-black font-semibold">
                        Farmers, Agents, Buyers &amp; Admins
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border-2 border-[#138808] anim-kpi-card">
                      <span className="text-[11px] font-extrabold uppercase text-[#138808] block">
                        Active Crop Lots
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-[#138808] mt-1">
                        <AnimatedNumber value={summaryStats.activeCropLots} />
                      </div>
                      <span className="text-[11px] text-black font-semibold">
                        84 Quintals Total Declared
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border-2 border-[#FF9933] anim-kpi-card">
                      <span className="text-[11px] font-extrabold uppercase text-[#371A00] block">
                        Verification Queue
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-[#371A00] mt-1">
                        <AnimatedNumber
                          value={summaryStats.verificationRequests}
                        />
                      </div>
                      <span className="text-[11px] text-black font-semibold">
                        Awaiting Lab / Independent Audit
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border-2 border-[#000080] anim-kpi-card">
                      <span className="text-[11px] font-extrabold uppercase text-[#000080] block">
                        Active Procurement Bids
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-[#000080] mt-1">
                        <AnimatedNumber value={summaryStats.activeBids} />
                      </div>
                      <span className="text-[11px] text-black font-semibold">
                        ITC, Adani Wilmar, Cargill
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#E8F5E9] border border-[#138808]">
                      <span className="text-[10px] font-extrabold uppercase text-[#006B3C] block">
                        Scheduled Pickups
                      </span>
                      <div className="text-xl font-black text-[#000080] font-tabular mt-0.5">
                        {summaryStats.scheduledPickups} Stops (Truck #4482)
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#E8EAF6] border border-[#000080]/30">
                      <span className="text-[10px] font-extrabold uppercase text-[#000080] block">
                        Payment Exceptions
                      </span>
                      <div className="text-xl font-black text-[#000080] font-tabular mt-0.5">
                        {summaryStats.paymentExceptions} Active
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#FFDCC2] border border-[#FF9933]">
                      <span className="text-[10px] font-extrabold uppercase text-[#371A00] block">
                        Open Disputes
                      </span>
                      <div className="text-xl font-black text-[#371A00] font-tabular mt-0.5">
                        {summaryStats.openDisputes} Open Hold
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#E8EAF6] border border-[#000080]/30">
                      <span className="text-[10px] font-extrabold uppercase text-[#000080] block">
                        Audit Log Events
                      </span>
                      <div className="text-xl font-black text-[#000080] font-tabular mt-0.5">
                        {summaryStats.auditEventCount} Recorded
                      </div>
                    </div>
                  </div>

                  {/* Recent Administrative Activity */}
                  <div className="bg-white rounded-xl border-2 border-[#000080] p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#000080]/15">
                      <h2 className="text-base font-extrabold text-[#000080]">
                        Recent Administrative &amp; Security Audit Activity
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('payments-audit')}
                        className="text-xs font-extrabold text-[#000080] underline"
                      >
                        View Full Audit Log
                      </button>
                    </div>
                    <div className="divide-y divide-[#000080]/15 mt-2">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  log.status === 'DENIED' ||
                                  log.status === 'WARNING'
                                    ? 'bg-[#FF9933] text-black'
                                    : 'bg-[#138808] text-white'
                                }`}
                              >
                                {log.action}
                              </span>
                              <span className="font-extrabold text-[#000080]">
                                {log.target}
                              </span>
                            </div>
                            <p className="text-black font-medium mt-0.5">
                              {log.reason}
                            </p>
                          </div>
                          <div className="text-right font-tabular text-[11px] text-black font-bold shrink-0">
                            <div>{log.actorEmail}</div>
                            <div>{log.timestamp}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USER MANAGEMENT */}
              {activeTab === 'users' && (
                <div className="bg-white rounded-xl border-2 border-[#000080] p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-extrabold text-[#000080]">
                        Registered Platform Accounts ({filteredUsers.length})
                      </h2>
                      <p className="text-xs text-black font-medium">
                        Manage role assignments, inspect verification states,
                        and activate/deactivate accounts.
                      </p>
                    </div>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Filter by name, email, role, village..."
                      className="h-10 px-3 rounded-lg bg-[#E8EAF6] text-black border-2 border-[#000080] text-xs font-bold sm:w-72"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#000080] text-white">
                          <th className="p-2.5 font-extrabold">User / UID</th>
                          <th className="p-2.5 font-extrabold">Email</th>
                          <th className="p-2.5 font-extrabold">Role</th>
                          <th className="p-2.5 font-extrabold">
                            Village / Org
                          </th>
                          <th className="p-2.5 font-extrabold">Status</th>
                          <th className="p-2.5 font-extrabold text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#000080]/20">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-[#E8EAF6]/50">
                            <td className="p-2.5">
                              <div className="font-extrabold text-[#000080]">
                                {u.name}
                              </div>
                              <div className="font-tabular text-[11px] font-bold">
                                {u.uidLabel}
                              </div>
                            </td>
                            <td className="p-2.5 font-tabular font-semibold">
                              {u.email}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-[#FF9933] text-black border border-black'
                                    : 'bg-[#E8F5E9] text-[#006B3C] border border-[#138808]'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="p-2.5 font-semibold">
                              {u.villageOrOrg}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  u.active
                                    ? 'bg-[#138808] text-white'
                                    : 'bg-[#FF9933] text-black'
                                }`}
                              >
                                {u.active ? 'ACTIVE' : 'DEACTIVATED'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUser(u);
                                  setNewUserRole(u.role);
                                  setRoleReason('');
                                }}
                                className="px-2.5 py-1 rounded bg-[#000080] text-white font-extrabold text-[11px]"
                              >
                                Change Role
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u)}
                                className="px-2.5 py-1 rounded bg-[#E8EAF6] text-[#000080] border border-[#000080] font-extrabold text-[11px]"
                              >
                                {u.active ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CROP LOT REGISTRY */}
              {activeTab === 'lots' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border-2 border-[#000080] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-extrabold text-[#000080]">
                        Crop Lot Registry &amp; Scannable Passports
                      </h2>
                      <p className="text-xs text-black font-medium">
                        Inspect farmer lots, farm plot boundaries, and dynamic
                        scannable QR codes.
                      </p>
                    </div>
                    <input
                      type="text"
                      value={lotSearch}
                      onChange={(e) => setLotSearch(e.target.value)}
                      placeholder="Search Lot ID, farmer, crop..."
                      className="h-10 px-3 rounded-lg bg-[#E8EAF6] text-black border-2 border-[#000080] text-xs font-bold sm:w-64"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredLots.map((lot) => {
                      const plot = FARM_PLOTS[lot.id];
                      const meta = getVerificationBadgeMeta(
                        lot.verificationStatus
                      );
                      return (
                        <div
                          key={lot.id}
                          className="bg-white rounded-xl border-2 border-[#000080] p-4 flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-extrabold text-[#000080] font-tabular">
                                {lot.id}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  meta.isResidueFreeVerified
                                    ? 'bg-[#138808] text-white'
                                    : 'bg-[#FF9933] text-black'
                                }`}
                              >
                                {lot.verificationStatus.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <h3 className="text-base font-extrabold text-black mt-1">
                              {lot.farmerName} • {lot.cropName}
                            </h3>
                            <p className="text-xs text-black font-semibold font-tabular">
                              Quantity: {lot.quantityQuintals} Qtls • Plot:{' '}
                              {lot.surveyNumber} ({lot.plotAreaHectares} Ha)
                            </p>
                            {plot && (
                              <p className="text-[11px] text-[#006B3C] font-bold font-tabular mt-1">
                                Centroid: {plot.centroidLat}, {plot.centroidLng}{' '}
                                • Moisture: {plot.soilMoisturePercent}%
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-center py-2 bg-[#E8EAF6]/50 rounded-lg">
                            <QRCodeComponent
                              lotId={lot.id}
                              farmerName={lot.farmerName}
                              cropName={lot.cropName}
                              quantityQuintals={lot.quantityQuintals}
                              verificationStatus={lot.verificationStatus}
                              sha256Hash={lot.evidence.sha256Hash}
                              size={104}
                              showControls
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: VERIFICATION REVIEW */}
              {activeTab === 'verification' && (
                <div className="bg-white rounded-xl border-2 border-[#000080] p-5 max-w-2xl space-y-4">
                  <div>
                    <h2 className="text-base font-extrabold text-[#000080]">
                      Statutory Verification &amp; Evidence Review
                    </h2>
                    <p className="text-xs text-black font-medium mt-0.5">
                      Distinguish Farmer-Declared, Document-Verified,
                      Laboratory-Tested, and Independently-Verified states. A
                      documented reason is mandatory and logged in the audit
                      trail.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmitLotVerificationReview}
                    className="space-y-3"
                  >
                    <div>
                      <label
                        htmlFor="admin-lot-select"
                        className="block text-xs font-extrabold text-[#000080] mb-1"
                      >
                        Select Crop Lot Record
                      </label>
                      <select
                        id="admin-lot-select"
                        value={reviewLotId}
                        onChange={(e) => setReviewLotId(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080] text-xs font-extrabold"
                      >
                        {allLots.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.id} — {l.farmerName} ({l.cropName},{' '}
                            {l.quantityQuintals} Qtl) [Current:{' '}
                            {l.verificationStatus}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="admin-status-select"
                        className="block text-xs font-extrabold text-[#000080] mb-1"
                      >
                        Assign Verification Determination
                      </label>
                      <select
                        id="admin-status-select"
                        value={reviewStatus}
                        onChange={(e) =>
                          setReviewStatus(e.target.value as VerificationStatus)
                        }
                        className="w-full h-11 px-3 rounded-lg bg-white text-black border-2 border-[#000080] text-xs font-extrabold"
                      >
                        <option value="INDEPENDENTLY_VERIFIED">
                          INDEPENDENTLY_VERIFIED (NABL Lab + Geo-Fence Audited)
                        </option>
                        <option value="LABORATORY_TESTED">
                          LABORATORY_TESTED (Zero MRL Exceedance Confirmed)
                        </option>
                        <option value="DOCUMENT_VERIFIED">
                          DOCUMENT_VERIFIED (Khasra &amp; Receipt Checked; Lab
                          Pending)
                        </option>
                        <option value="FARMER_DECLARED">
                          FARMER_DECLARED (Self-Declared Only)
                        </option>
                        <option value="VERIFICATION_PENDING">
                          VERIFICATION_PENDING (Hold for Re-Sampling)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="admin-verify-reason"
                        className="block text-xs font-extrabold text-[#000080] mb-1"
                      >
                        Mandatory Audit Reason / Certificate Reference
                      </label>
                      <textarea
                        id="admin-verify-reason"
                        rows={3}
                        required
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        placeholder="e.g., Verified NABL Lab Report #NABL-Q-99-2026 showing 0.00 mg/kg fungicide residue..."
                        className="w-full p-3 rounded-lg bg-white text-black border-2 border-[#000080] text-xs font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold anim-btn-press"
                    >
                      Record Verification Decision &amp; Audit Event
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 5: BUYER & BID MANAGEMENT */}
              {activeTab === 'buyers' && (
                <div className="bg-white rounded-xl border-2 border-[#000080] p-4 space-y-3">
                  <h2 className="text-base font-extrabold text-[#000080]">
                    Institutional Buyers &amp; Disclosed Deduction Audit
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {BUYER_OFFERS.map((offer) => (
                      <div
                        key={offer.id}
                        className="p-3.5 rounded-xl bg-[#E8EAF6] border border-[#000080]/30 flex flex-col justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold text-[#000080]">
                            {offer.buyerName}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#138808] text-white text-[10px] font-extrabold">
                            {offer.termsStatus}
                          </span>
                        </div>
                        <div className="font-bold text-black">
                          Commodity: {offer.commodityName} (Lot{' '}
                          {offer.cropLotId})
                        </div>
                        <div className="font-tabular font-extrabold text-[#138808] text-base">
                          Bid Price: {formatINR(offer.pricePerQuintal)}/qtl •
                          Demand: {offer.demandMetricTons} MT
                        </div>
                        <div className="font-tabular text-[11px] text-black font-semibold">
                          Disclosed Deductions: Transport{' '}
                          {formatINR(offer.disclosedDeductions.transport)} |
                          Loading {formatINR(offer.disclosedDeductions.loading)}{' '}
                          | Assay Fee{' '}
                          {formatINR(offer.disclosedDeductions.platformFee)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: LOGISTICS & WEIGHBRIDGE MANAGEMENT */}
              {activeTab === 'logistics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border-2 border-[#000080] p-4 space-y-2.5 text-xs">
                    <h2 className="text-base font-extrabold text-[#000080]">
                      Active Village Pooling Dispatch
                    </h2>
                    <div className="font-tabular font-extrabold text-sm text-[#138808]">
                      Vehicle: {ACTIVE_PICKUP.vehicleId} ({ACTIVE_PICKUP.truckType})
                    </div>
                    <div className="font-semibold">
                      Route: {ACTIVE_PICKUP.originHub} ➔{' '}
                      {ACTIVE_PICKUP.destinationHub}
                    </div>
                    <div className="space-y-1.5 pt-2">
                      {ACTIVE_PICKUP.stops.map((s, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded bg-[#E8EAF6] border border-[#000080]/20 flex justify-between"
                        >
                          <div>
                            <div className="font-extrabold text-[#000080]">
                              {s.name}
                            </div>
                            <div className="font-semibold">{s.farmerName}</div>
                          </div>
                          <div className="text-right font-tabular font-extrabold">
                            <div>{s.quantityQuintals} Qtl</div>
                            <div className="text-[#138808]">{s.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border-2 border-[#000080] p-4 space-y-2.5 text-xs">
                    <h2 className="text-base font-extrabold text-[#000080]">
                      Weighbridge Terminal #104 Record
                    </h2>
                    <div className="p-3 rounded-lg bg-[#00003C] text-white font-tabular space-y-1">
                      <div className="text-[#9DF6B9] font-extrabold">
                        Evidence Ref: {ACTIVE_WEIGHMENT.evidenceReference}
                      </div>
                      <div>
                        Gross: {ACTIVE_WEIGHMENT.grossWeightKg} Kg | Tare:{' '}
                        {ACTIVE_WEIGHMENT.tareWeightKg} Kg
                      </div>
                      <div className="text-base font-black text-[#9DF6B9]">
                        Net Payable: {ACTIVE_WEIGHMENT.netPayableWeightKg} Kg
                        (Zero Karda)
                      </div>
                      <div className="text-[11px]">
                        Status: {ACTIVE_WEIGHMENT.verificationStatus}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: PAYMENT OPERATIONS & SYSTEM AUDIT */}
              {activeTab === 'payments-audit' && (
                <div className="space-y-5">
                  <div className="bg-white rounded-xl border-2 border-[#000080] p-4 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-base font-extrabold text-[#000080]">
                        Payment Operations &amp; Escrow Reconciliation (Review-Only)
                      </h2>
                      <span className="px-2.5 py-0.5 rounded bg-[#FFDCC2] border border-[#FF9933] text-[#371A00] font-extrabold text-[10px]">
                        PROVIDER-CONTROLLED ESCROW
                      </span>
                    </div>
                    <p className="text-black font-semibold">
                      Administrative safety control: The admin console inspects
                      settlement references and dispute holds but cannot bypass
                      banking escrow controls to arbitrarily release funds.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-tabular">
                      <div className="p-3 rounded bg-[#E8EAF6]">
                        <span className="text-[10px] font-bold text-[#000080] block uppercase">
                          Payment Reference
                        </span>
                        <span className="font-extrabold">
                          {payment.paymentReference}
                        </span>
                      </div>
                      <div className="p-3 rounded bg-[#E8F5E9]">
                        <span className="text-[10px] font-bold text-[#006B3C] block uppercase">
                          50-50 Split Amounts
                        </span>
                        <span className="font-extrabold text-[#138808]">
                          {formatINR(payment.firstInstallment)} +{' '}
                          {formatINR(payment.remainingAmount)}
                        </span>
                      </div>
                      <div className="p-3 rounded bg-[#E8EAF6]">
                        <span className="text-[10px] font-bold text-[#000080] block uppercase">
                          Current Lifecycle State
                        </span>
                        <span className="font-extrabold text-[#000080]">
                          {payment.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {Object.entries(systemStatus).map(([k, v]) => (
                        <div
                          key={k}
                          className="p-2 rounded bg-[#E8EAF6]/60 flex justify-between font-tabular text-[11px]"
                        >
                          <span className="font-bold text-[#000080] uppercase">
                            {k}:
                          </span>
                          <span className="font-extrabold text-black">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Searchable Audit Log */}
                  <div className="bg-white rounded-xl border-2 border-[#000080] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h2 className="text-base font-extrabold text-[#000080]">
                        System Security &amp; Operational Audit Trail
                      </h2>
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search audit action, actor, reason..."
                        className="h-9 px-3 rounded-lg bg-[#E8EAF6] text-black border border-[#000080] text-xs font-bold sm:w-64"
                      />
                    </div>
                    <div className="divide-y divide-[#000080]/15">
                      {filteredAuditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold mr-2 ${
                                log.status === 'DENIED' ||
                                log.status === 'WARNING'
                                  ? 'bg-[#FF9933] text-black'
                                  : 'bg-[#138808] text-white'
                              }`}
                            >
                              {log.action}
                            </span>
                            <strong className="text-[#000080]">
                              {log.target}
                            </strong>
                            <p className="text-black font-medium mt-0.5">
                              {log.reason}
                            </p>
                          </div>
                          <div className="text-right font-tabular text-[11px] font-bold shrink-0">
                            <div>
                              {log.actorEmail} ({log.actorRole})
                            </div>
                            <div>{log.timestamp}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Role Change Modal */}
      {editingUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-md w-full p-5 shadow-2xl space-y-3 anim-dialog-enter">
            <h3 className="text-base font-extrabold text-[#000080]">
              Modify Role for {editingUser.name} ({editingUser.email})
            </h3>
            <div>
              <label
                htmlFor="modal-role-select"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                New Assigned Role
              </label>
              <select
                id="modal-role-select"
                value={newUserRole}
                onChange={(e) =>
                  setNewUserRole(
                    e.target.value as 'farmer' | 'agent' | 'buyer' | 'admin'
                  )
                }
                className="w-full h-10 px-2.5 rounded border-2 border-[#000080] text-xs font-extrabold"
              >
                <option value="farmer">Farmer / Family Proxy</option>
                <option value="agent">Village Agent / Arhtiya Partner</option>
                <option value="buyer">Institutional Buyer</option>
                <option value="admin">Administrator (Mandi Registrar)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="modal-role-reason"
                className="block text-xs font-extrabold text-[#000080] mb-1"
              >
                Mandatory Audit Reason
              </label>
              <textarea
                id="modal-role-reason"
                rows={2}
                value={roleReason}
                onChange={(e) => setRoleReason(e.target.value)}
                placeholder="Document authorization basis..."
                className="w-full p-2.5 rounded border-2 border-[#000080] text-xs font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3 py-2 rounded border border-[#000080] text-[#000080] text-xs font-extrabold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoleChange}
                className="px-4 py-2 rounded bg-[#138808] text-white text-xs font-extrabold"
              >
                Approve Role Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
