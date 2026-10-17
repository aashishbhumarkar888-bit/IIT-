import React, { useState } from 'react';
import { useKisan } from '../context/KisanContext';
import { KISAN_LOGO_URL } from '../data/kisanData';
import { AdvisoryPage } from './AdvisoryPage';
import { CropPassportPage } from './CropPassportPage';
import { DashboardPage } from './DashboardPage';
import { HarvestPaymentsPage } from './HarvestPaymentsPage';
import { MarketComparisonPage } from './MarketComparisonPage';

export const ShowcasePage: React.FC = () => {
  const { navigate } = useKisan();
  const [logoError, setLogoError] = useState<boolean>(false);

  return (
    <div className="w-full bg-white text-black flex flex-col">
      {/* TOP STATUTORY TICKER: MANDI SPOT & APMC ARBITRAGE */}
      <div className="w-full bg-[#00003C] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-white/20">
        <div className="flex items-center gap-3 overflow-x-auto py-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-block w-2 h-2 rounded-full bg-[#9DF6B9]" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
              MANDI SAMPLE TICKER
            </span>
          </div>
          <span className="text-white/40">|</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-[#9DF6B9]">
              SOYBEAN (INDORE):
            </span>
            <span className="font-tabular font-extrabold text-white">
              ₹4,850/qtl
            </span>
            <span className="text-[#9DF6B9] text-[11px] font-extrabold">
              ▲ +2.1%
            </span>
          </div>
          <span className="text-white/40">|</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-white">
              SHARBATI WHEAT:
            </span>
            <span className="font-tabular font-extrabold text-white">
              ₹2,420/qtl
            </span>
            <span className="text-[#9DF6B9] text-[11px] font-extrabold">
              ▲ +0.8%
            </span>
          </div>
          <span className="text-white/40">|</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-white">
              MAIZE (KHANDWA):
            </span>
            <span className="font-tabular font-extrabold text-white">
              ₹2,150/qtl
            </span>
            <span className="text-white text-[11px] font-bold">0.0%</span>
          </div>
          <span className="text-white/40">|</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-white">
              COTTON (BHOPAL):
            </span>
            <span className="font-tabular font-extrabold text-white">
              ₹7,200/qtl
            </span>
            <span className="text-[#9DF6B9] text-[11px] font-extrabold">
              ▲ +1.4%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white hidden lg:inline font-tabular">
            e-NAM Node ID: MP-KHD-0402
          </span>
          <span className="px-2 py-0.5 rounded bg-white text-[#00003C] text-[10px] font-extrabold font-tabular">
            DEMO BLUEPRINT
          </span>
        </div>
      </div>

      {/* TOP BRAND HERO PRESENTATION LOCKUP */}
      <section className="w-full bg-white px-4 sm:px-8 py-6 border-b-2 border-[#000080]/15">
        <div className="w-full max-w-[1536px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border-2 border-[#000080] p-1.5 flex items-center justify-center shrink-0 shadow-sm">
              {!logoError ? (
                <img
                  alt="Kisan-SPO Logo"
                  className="w-full h-full object-contain"
                  src={KISAN_LOGO_URL}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-2xl font-black text-[#138808]">K</span>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-4xl text-[#000080] tracking-tight font-extrabold m-0">
                  Kisan-SPO
                </h1>
                <span className="px-2.5 py-0.5 bg-[#138808] text-white text-[11px] uppercase rounded font-extrabold tracking-widest">
                  AgriStack V2.4
                </span>
                <span className="px-2.5 py-0.5 bg-[#371A00] text-[#FF9933] text-[11px] font-extrabold rounded font-tabular">
                  1536 × 1024 Blueprint
                </span>
              </div>
              <p className="text-base sm:text-lg text-black mt-1 font-extrabold">
                Smart Procurement &amp; Lifecycle Orchestration{' '}
                <span className="text-[#138808]">•</span> Smarter Farming.
                Fairer Markets.
              </p>
              <p className="text-sm sm:text-base text-[#371A00] font-extrabold font-hindi mt-0.5">
                सही सलाह • बेहतर दाम • सुरक्षित भुगतान
              </p>
              <p className="text-xs sm:text-sm text-black font-medium mt-1">
                End-to-end digital infrastructure harmonizing village cluster
                logistics, digital residue passports, APMC-mandi net pocket
                arbitrage, and split-escrow 50/50 settlement.
              </p>
            </div>
          </div>

          {/* Right Compliance Badges */}
          <div className="flex flex-col items-start lg:items-end gap-2 w-full lg:w-auto">
            <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E8F5E9] border border-[#138808] text-xs font-extrabold text-[#000080]">
                <span className="material-symbols-outlined material-symbols-filled text-[#138808] text-[16px]">
                  check_circle
                </span>
                WCAG 2.2 AA Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E8EAF6] border border-[#000080] text-xs font-extrabold text-[#000080]">
                <span className="w-2 h-2 rounded-full bg-[#138808]" />
                Four-Color Verified System
              </span>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#138808] hover:bg-[#006B3C] text-white text-xs font-extrabold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  open_in_full
                </span>
                Exit Showcase to Full App
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-black font-bold mt-1">
              <span>
                Deployment:{' '}
                <strong className="text-[#000080] font-tabular">
                  Madhya Pradesh Hub
                </strong>
              </span>
              <span>•</span>
              <span>
                Interoperability:{' '}
                <strong className="text-[#138808] font-tabular">
                  APMC + e-NAM
                </strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* MASTER WORKBENCH CANVAS: WIDE TABLET DASHBOARD + 4 FOREGROUND SMARTPHONES */}
      <div className="w-full bg-[#E8EAF6]/60 py-8 px-3 sm:px-8">
        <div className="w-full max-w-[1536px] mx-auto flex flex-col gap-10">
          {/* 1. WIDE LANDSCAPE TABLET DASHBOARD IN BACKGROUND */}
          <div className="w-full bg-white rounded-2xl shadow-xl border-4 border-[#000080] overflow-hidden">
            <div className="bg-[#00003C] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF9933] inline-block" />
                  <span className="w-3 h-3 rounded-full bg-white inline-block" />
                  <span className="w-3 h-3 rounded-full bg-[#138808] inline-block" />
                </div>
                <span className="text-xs sm:text-sm font-extrabold">
                  Landscape Tablet Frame — Kisan-SPO Three-Role Operations
                  Dashboard (Interactive Component)
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1 rounded bg-[#138808] text-white text-xs font-extrabold flex items-center gap-1 hover:bg-[#006B3C]"
              >
                <span>Open Full-Screen Dashboard</span>
                <span className="material-symbols-outlined text-[15px]">
                  open_in_new
                </span>
              </button>
            </div>

            {/* Embedded Actual DashboardPage Component */}
            <DashboardPage compactMode />
          </div>

          {/* SECTION TITLE DIVIDER FOR FOREGROUND DEVICES */}
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <span className="px-4 py-1 bg-[#000080] text-white text-xs uppercase font-extrabold tracking-widest rounded-full shadow">
              Field-Level Digital Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl text-[#000080] font-extrabold tracking-tight mt-2">
              Four Pillars of Sovereign Agricultural Integrity
            </h2>
            <p className="text-xs sm:text-base text-black font-semibold mt-1">
              Engineered for low-bandwidth rural connectivity, direct sunlight
              readability, and strict statutory non-repudiation. All 4 smartphone
              frames below run the live interactive React screen components.
            </p>
          </div>

          {/* 2. FOUR PORTRAIT SMARTPHONE PRESENTATIONS IN FRONT */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
            {/* PHONE 1: Monitor & Safe Advisory */}
            <div className="w-full bg-white rounded-3xl border-4 border-[#000080] p-1.5 shadow-2xl flex flex-col">
              <div className="w-full flex items-center justify-between px-3 py-1.5 bg-[#00003C] text-white rounded-t-2xl">
                <span className="text-[11px] font-extrabold">
                  Phone 1: Crop Advisory
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/advisory')}
                  className="text-[11px] font-extrabold text-[#9DF6B9] underline flex items-center gap-0.5"
                >
                  <span>Full View</span>
                  <span className="material-symbols-outlined text-[14px]">
                    open_in_new
                  </span>
                </button>
              </div>
              <div className="max-h-[780px] overflow-y-auto rounded-b-2xl">
                <AdvisoryPage compactMode />
              </div>
            </div>

            {/* PHONE 2: Digital Crop Passport */}
            <div className="w-full bg-white rounded-3xl border-4 border-[#000080] p-1.5 shadow-2xl flex flex-col">
              <div className="w-full flex items-center justify-between px-3 py-1.5 bg-[#00003C] text-white rounded-t-2xl">
                <span className="text-[11px] font-extrabold">
                  Phone 2: Crop Passport
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/crop-passport')}
                  className="text-[11px] font-extrabold text-[#9DF6B9] underline flex items-center gap-0.5"
                >
                  <span>Full View</span>
                  <span className="material-symbols-outlined text-[14px]">
                    open_in_new
                  </span>
                </button>
              </div>
              <div className="max-h-[780px] overflow-y-auto rounded-b-2xl">
                <CropPassportPage compactMode />
              </div>
            </div>

            {/* PHONE 3: Match Buyer & Net-Pocket Arbitrage */}
            <div className="w-full bg-white rounded-3xl border-4 border-[#000080] p-1.5 shadow-2xl flex flex-col">
              <div className="w-full flex items-center justify-between px-3 py-1.5 bg-[#00003C] text-white rounded-t-2xl">
                <span className="text-[11px] font-extrabold">
                  Phone 3: Buyer Comparison
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/market-comparison')}
                  className="text-[11px] font-extrabold text-[#9DF6B9] underline flex items-center gap-0.5"
                >
                  <span>Full View</span>
                  <span className="material-symbols-outlined text-[14px]">
                    open_in_new
                  </span>
                </button>
              </div>
              <div className="max-h-[780px] overflow-y-auto rounded-b-2xl">
                <MarketComparisonPage compactMode />
              </div>
            </div>

            {/* PHONE 4: Harvest Weighbridge & 50-50 Instant UPI Escrow */}
            <div className="w-full bg-white rounded-3xl border-4 border-[#000080] p-1.5 shadow-2xl flex flex-col">
              <div className="w-full flex items-center justify-between px-3 py-1.5 bg-[#00003C] text-white rounded-t-2xl">
                <span className="text-[11px] font-extrabold">
                  Phone 4: Harvest Payments
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/harvest-payments')}
                  className="text-[11px] font-extrabold text-[#9DF6B9] underline flex items-center gap-0.5"
                >
                  <span>Full View</span>
                  <span className="material-symbols-outlined text-[14px]">
                    open_in_new
                  </span>
                </button>
              </div>
              <div className="max-h-[780px] overflow-y-auto rounded-b-2xl">
                <HarvestPaymentsPage compactMode />
              </div>
            </div>
          </div>

          {/* 3. DESIGN SPECIFICATION & ENGINEERING SPECS DRAWER */}
          <section className="w-full bg-white rounded-xl border-2 border-[#000080] p-6 shadow-lg">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4 pb-4 border-b border-[#000080]/20">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-[#000080] text-white text-xs font-extrabold">
                    SYSTEM TOKENS
                  </span>
                  <h3 className="text-xl sm:text-2xl text-[#000080] font-extrabold">
                    Production Hand-Off &amp; Architectural Matrix
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-black font-medium mt-1 max-w-2xl">
                  Strict mathematical alignment with statutory Indian APMC
                  protocols, e-NAM transaction brokers, and high-readability
                  daylight four-color contrast standards.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-tabular font-bold text-black">
                  CANVAS RESOLUTION:
                </span>
                <span className="px-3 py-1 bg-[#E8EAF6] text-[#000080] font-tabular font-extrabold rounded border border-[#000080] text-xs">
                  1536 × 1024 DP
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5">
              {/* Column 1: Color Tokens */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-sm font-extrabold text-[#000080] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#138808]" />
                  Sovereign Four-Color Hierarchy
                </h4>
                <div className="flex flex-col gap-1.5 text-xs font-tabular">
                  <div className="flex items-center justify-between p-2 bg-[#E8EAF6] rounded border border-[#000080]/20">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-[#000080] inline-block" />
                      <span className="font-extrabold text-black">
                        Chakra / Navy Blue
                      </span>
                    </div>
                    <span className="text-[#000080] font-extrabold">
                      #000080 / #00003C
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#E8F5E9] rounded border border-[#138808]/30">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-[#138808] inline-block" />
                      <span className="font-extrabold text-black">
                        Agricultural Green
                      </span>
                    </div>
                    <span className="text-[#006B3C] font-extrabold">
                      #138808 / #006B3C
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#FFDCC2] rounded border border-[#FF9933]">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-[#FF9933] border border-black inline-block" />
                      <span className="font-extrabold text-black">
                        Indian Saffron
                      </span>
                    </div>
                    <span className="text-[#371A00] font-extrabold">
                      #FF9933 / #371A00
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-[#000080]/30">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-white border border-black inline-block" />
                      <span className="font-extrabold text-black">
                        Pure White Canvas
                      </span>
                    </div>
                    <span className="text-black font-extrabold">#FFFFFF</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Typography */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-sm font-extrabold text-[#000080] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#000080]" />
                  Dual-Script Typography
                </h4>
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="p-2.5 bg-[#E8EAF6] rounded border border-[#000080]/20">
                    <span className="text-[10px] uppercase font-extrabold text-[#000080] block">
                      Primary Typeface (Latin)
                    </span>
                    <span className="font-extrabold text-black text-sm">
                      Inter Standard
                    </span>
                    <p className="text-[11px] text-black font-medium mt-0.5">
                      High legibility at micro scales on rural Android screens.
                    </p>
                  </div>
                  <div className="p-2.5 bg-[#E8EAF6] rounded border border-[#000080]/20">
                    <span className="text-[10px] uppercase font-extrabold text-[#000080] block">
                      Indic Typeface (Devanagari)
                    </span>
                    <span className="font-extrabold text-black text-sm font-hindi">
                      Noto Sans Devanagari
                    </span>
                    <p className="text-[11px] text-black font-medium mt-0.5">
                      Standardized for statutory Hindi APMC auction forms.
                    </p>
                  </div>
                  <div className="p-2.5 bg-[#E8EAF6] rounded border border-[#000080]/20">
                    <span className="text-[10px] uppercase font-extrabold text-[#000080] block">
                      Numerals (Financial)
                    </span>
                    <span className="font-extrabold text-[#000080] font-tabular">
                      Tabular Monospace Lining
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 3: Architecture Protocols */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-sm font-extrabold text-[#000080] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF9933]" />
                  Statutory Interoperability (Demo)
                </h4>
                <div className="flex flex-col gap-1.5 text-xs font-tabular">
                  <div className="p-2.5 bg-[#E8F5E9] rounded border border-[#138808]/30 flex items-center justify-between">
                    <span className="text-black font-bold">
                      AgriStack Registry
                    </span>
                    <span className="text-[#138808] font-extrabold">
                      Blueprint (v2.4)
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#E8F5E9] rounded border border-[#138808]/30 flex items-center justify-between">
                    <span className="text-black font-bold">
                      Weighbridge API
                    </span>
                    <span className="text-[#138808] font-extrabold">
                      Standard Tare (RS232)
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#E8F5E9] rounded border border-[#138808]/30 flex items-center justify-between">
                    <span className="text-black font-bold">
                      Payment Settlement
                    </span>
                    <span className="text-[#138808] font-extrabold">
                      50-50 UPI Escrow Demo
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#E8EAF6] rounded border border-[#000080]/30 flex items-center justify-between">
                    <span className="text-black font-bold">
                      Cryptographic Proof
                    </span>
                    <span className="text-[#000080] font-extrabold">
                      SHA-256 Payload
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* SHOWCASE FOOTER */}
      <footer className="w-full bg-white border-t-2 border-[#000080]/20 py-6 px-4 sm:px-8">
        <div className="max-w-[1536px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-black font-semibold">
          <div className="flex items-center gap-3">
            <span className="text-base text-[#000080] font-extrabold">
              Kisan-SPO
            </span>
            <span>
              Smart Procurement &amp; Lifecycle Orchestration for
              Farmer-Producer Organizations &amp; Mandi Operations
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-[#006B3C]">
              Statutory Standard: APMC • e-NAM Interoperable Blueprint
            </span>
            <span>© 2026 Kisan-SPO Operations.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
