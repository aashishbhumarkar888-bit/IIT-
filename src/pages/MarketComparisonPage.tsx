import React, { useState } from 'react';
import { useKisan } from '../context/KisanContext';
import { BUYER_OFFERS } from '../data/kisanData';
import { formatINR } from '../services/kisanService';

interface MarketComparisonPageProps {
  compactMode?: boolean;
}

export const MarketComparisonPage: React.FC<MarketComparisonPageProps> = ({
  compactMode = false,
}) => {
  const {
    arbitrageInput,
    updateArbitrageInput,
    resetArbitrageInput,
    arbitrageResult,
    processorPivotApproved,
    approveProcessorPivot,
    selectedSaleOption,
    setSelectedSaleOption,
    contractLocked,
    setContractLocked,
    navigate,
    showToast,
  } = useKisan();

  // Raw string state for quantity input so empty/negative typing is handled smoothly
  const [qtyText, setQtyText] = useState<string>(
    String(arbitrageInput.quantityQuintals)
  );
  const [pivotDialogOpen, setPivotDialogOpen] = useState<boolean>(false);
  const [selectedFallbackBuyer, setSelectedFallbackBuyer] = useState<string>(
    'Adani Wilmar Crushing Mill (Indore Dock 4)'
  );
  const [allBidsModalOpen, setAllBidsModalOpen] = useState<boolean>(false);
  const [lockContractModalOpen, setLockContractModalOpen] =
    useState<boolean>(false);

  const handleQtyChange = (val: string) => {
    setQtyText(val);
    const parsed = parseFloat(val);
    updateArbitrageInput({
      quantityQuintals: Number.isNaN(parsed) ? 0 : parsed,
    });
  };

  const handleNumberFieldChange = (
    field: keyof typeof arbitrageInput,
    val: string
  ) => {
    const parsed = parseFloat(val);
    updateArbitrageInput({
      [field]: Number.isNaN(parsed) ? 0 : parsed,
    });
  };

  const maxPayout = Math.max(
    arbitrageResult.mandiNetPayout,
    arbitrageResult.directNetPayout,
    1
  );
  const mandiBarPercent = arbitrageResult.isValid
    ? Math.max(
        10,
        Math.min(
          100,
          Math.round((arbitrageResult.mandiNetPayout / maxPayout) * 100)
        )
      )
    : 0;
  const directBarPercent = arbitrageResult.isValid
    ? Math.max(
        10,
        Math.min(
          100,
          Math.round((arbitrageResult.directNetPayout / maxPayout) * 100)
        )
      )
    : 0;

  const isDirectAdvantage = arbitrageResult.netDifference >= 0;

  return (
    <div className="w-full bg-white text-black">
      <div
        className={`mx-auto w-full ${
          compactMode ? 'p-3' : 'max-w-6xl px-4 sm:px-6 py-4'
        }`}
      >
        {/* Top Context Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#000080]/15">
          <div className="flex items-center gap-2.5">
            {!compactMode && (
              <button
                type="button"
                onClick={() => navigate('/crop-passport')}
                aria-label="Go Back to Crop Passport"
                className="w-10 h-10 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 flex items-center justify-center text-[#000080] hover:bg-[#000080] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  arrow_back
                </span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#138808] uppercase font-extrabold tracking-wider font-tabular">
                  LOT #MP-4802 / #KS-0124
                </span>
                <span aria-hidden="true">•</span>
                <span className="text-[11px] text-black font-extrabold font-hindi">
                  Soybean / सोयाबीन
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl text-[#000080] font-extrabold leading-tight">
                Match Buyer &amp; Arbitrage
              </h1>
              <span className="text-xs text-black block font-bold font-hindi">
                बाजार भाव और वास्तविक शुद्ध आय
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetArbitrageInput();
                setQtyText('25');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 text-xs font-extrabold text-[#000080] hover:bg-[#000080] hover:text-white min-h-[38px]"
            >
              Reset 25 Qtl Sample
            </button>
            <div className="flex items-center bg-[#000080] text-white rounded-lg px-2.5 py-1.5 gap-1 shadow-sm font-tabular text-xs font-extrabold">
              <span>₹ INR</span>
            </div>
          </div>
        </div>

        {/* Main Farmer Headline Banner + Net In-Pocket Gain Spotlight */}
        <div
          className={`mt-4 grid grid-cols-1 ${
            compactMode ? 'gap-3' : 'lg:grid-cols-12 gap-4 items-stretch'
          }`}
        >
          {/* Left Banner (7 cols) */}
          <div
            className={`bg-white rounded-xl p-4 shadow-sm border-2 border-[#000080]/25 flex flex-col justify-between ${
              compactMode ? '' : 'lg:col-span-7'
            }`}
          >
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#E8F5E9] border border-[#138808] text-[#006B3C] px-2.5 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px]">
                  verified
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Verified Yard Arbitrage Calculator
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl text-[#000080] font-extrabold tracking-tight mt-2">
                Jeb Mein Kitna Aayega?
              </h2>
              <p className="text-base text-[#138808] font-extrabold font-hindi mt-0.5">
                जेब में कितना आएगा?
              </p>
              <p className="text-xs sm:text-sm text-black font-medium mt-1 leading-relaxed">
                Compare transparent net realization after transport, palledari
                loading, APMC mandi cess, and dock fees before making your
                dispatch choice.
              </p>
            </div>

            {/* Active Selection Status Pill */}
            <div className="mt-3 pt-2.5 border-t border-[#000080]/15 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-black">
                Selected Dispatch Channel:{' '}
                <strong className="text-[#000080]">
                  {selectedSaleOption === 'DIRECT_BUYER'
                    ? 'Option B: ITC Agri Direct Farmgate'
                    : selectedSaleOption === 'SALVAGE_PIVOT'
                    ? `Fallback Pivot: ${selectedFallbackBuyer}`
                    : 'Option A: Local APMC Mandi Yard'}
                </strong>
              </span>
              {contractLocked && (
                <span className="px-2 py-0.5 rounded bg-[#138808] text-white font-extrabold text-[10px] uppercase">
                  CONTRACT LOCKED
                </span>
              )}
            </div>
          </div>

          {/* Right Net Extra Pocket Money Spotlight Card (5 cols) */}
          <div
            className={`rounded-xl p-4 shadow-md flex items-center justify-between gap-3 border-2 ${
              !arbitrageResult.isValid
                ? 'bg-[#FF9933] text-black border-black'
                : isDirectAdvantage
                ? 'bg-[#00003C] text-white border-[#000080]'
                : 'bg-[#000080] text-white border-[#00003C]'
            } ${compactMode ? '' : 'lg:col-span-5'}`}
          >
            {arbitrageResult.isValid ? (
              <>
                <div className="space-y-1">
                  <span className="text-[10px] text-[#9DF6B9] uppercase tracking-wider block font-extrabold">
                    {isDirectAdvantage
                      ? 'NET EXTRA POCKET MONEY (DIRECT BUYER)'
                      : 'NET COMPARISON DIFFERENCE (MANDI VS DIRECT)'}
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-[#9DF6B9] font-tabular tracking-tight">
                      {arbitrageResult.netDifference >= 0 ? '+' : ''}
                      {formatINR(arbitrageResult.netDifference)}
                    </span>
                    <span className="text-xs text-white font-extrabold bg-[#138808] px-2 py-0.5 rounded font-tabular">
                      {arbitrageResult.percentageGain >= 0 ? '+' : ''}
                      {arbitrageResult.percentageGain}%{' '}
                      {isDirectAdvantage ? 'Gain' : 'Delta'}
                    </span>
                  </div>
                  <span className="text-xs text-white font-medium block">
                    Selling {arbitrageResult.quantityQuintals} Qtls directly to
                    ITC Farmgate vs Local APMC Mandi
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#138808] text-white flex items-center justify-center shrink-0 border-2 border-white">
                  <span className="material-symbols-outlined text-[26px]">
                    trending_up
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[28px] text-black">
                  warning
                </span>
                <div>
                  <span className="text-xs font-extrabold uppercase block">
                    Calculator Input Required
                  </span>
                  <p className="text-xs font-semibold mt-0.5">
                    {arbitrageResult.validationMessage}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LIVE INTERACTIVE NET REALIZATION CALCULATOR INPUTS */}
        <div className="mt-4 bg-[#E8EAF6] rounded-xl p-4 border-2 border-[#000080]/30">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#000080]">
                Interactive Net Realization Calculator (वास्तविक शुद्ध आय कैलकुलेटर)
              </h3>
              <p className="text-xs text-black font-medium">
                Edit lot quantity, prices, or deductions below—all totals, per-quintal realizations, and 50-50 escrow splits recalculate immediately.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-[#000080] text-white text-[10px] font-extrabold uppercase">
              LIVE FORMULAS
            </span>
          </div>

          <div
            className={`grid grid-cols-2 ${
              compactMode ? ' gap-2' : 'sm:grid-cols-3 lg:grid-cols-6 gap-3'
            }`}
          >
            <div>
              <label
                htmlFor="calc-qty"
                className="text-[11px] font-extrabold text-[#000080] block mb-1"
              >
                Lot Quantity (Qtls)
              </label>
              <input
                id="calc-qty"
                type="number"
                min="0"
                step="1"
                value={qtyText}
                onChange={(e) => handleQtyChange(e.target.value)}
                className="w-full h-10 px-2.5 rounded bg-white text-black border-2 border-[#000080] font-tabular font-extrabold text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="calc-mandi-price"
                className="text-[11px] font-extrabold text-[#000080] block mb-1"
              >
                Mandi Rate (₹/Qtl)
              </label>
              <input
                id="calc-mandi-price"
                type="number"
                min="0"
                step="10"
                value={arbitrageInput.mandiPricePerQuintal}
                onChange={(e) =>
                  handleNumberFieldChange(
                    'mandiPricePerQuintal',
                    e.target.value
                  )
                }
                className="w-full h-10 px-2.5 rounded bg-white text-black border-2 border-[#000080] font-tabular font-extrabold text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="calc-direct-price"
                className="text-[11px] font-extrabold text-[#138808] block mb-1"
              >
                Direct Bid (₹/Qtl)
              </label>
              <input
                id="calc-direct-price"
                type="number"
                min="0"
                step="10"
                value={arbitrageInput.directPricePerQuintal}
                onChange={(e) =>
                  handleNumberFieldChange(
                    'directPricePerQuintal',
                    e.target.value
                  )
                }
                className="w-full h-10 px-2.5 rounded bg-white text-black border-2 border-[#138808] font-tabular font-extrabold text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="calc-mandi-transport"
                className="text-[11px] font-extrabold text-black block mb-1"
              >
                Mandi Transport (₹)
              </label>
              <input
                id="calc-mandi-transport"
                type="number"
                min="0"
                step="50"
                value={arbitrageInput.mandiTransportCost}
                onChange={(e) =>
                  handleNumberFieldChange('mandiTransportCost', e.target.value)
                }
                className="w-full h-10 px-2.5 rounded bg-white text-black border border-[#000080]/50 font-tabular font-bold text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="calc-mandi-loading"
                className="text-[11px] font-extrabold text-black block mb-1"
              >
                Mandi Loading (₹)
              </label>
              <input
                id="calc-mandi-loading"
                type="number"
                min="0"
                step="50"
                value={arbitrageInput.mandiLoadingCost}
                onChange={(e) =>
                  handleNumberFieldChange('mandiLoadingCost', e.target.value)
                }
                className="w-full h-10 px-2.5 rounded bg-white text-black border border-[#000080]/50 font-tabular font-bold text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="calc-direct-fee"
                className="text-[11px] font-extrabold text-black block mb-1"
              >
                Direct Assay Fee (₹)
              </label>
              <input
                id="calc-direct-fee"
                type="number"
                min="0"
                step="50"
                value={arbitrageInput.directPlatformFee}
                onChange={(e) =>
                  handleNumberFieldChange('directPlatformFee', e.target.value)
                }
                className="w-full h-10 px-2.5 rounded bg-white text-black border border-[#000080]/50 font-tabular font-bold text-sm"
              />
            </div>
          </div>
        </div>

        {/* Visual Comparative Bar Chart */}
        <div className="mt-4 bg-white rounded-xl p-4 shadow-sm border-2 border-[#000080]/25">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <span className="text-sm sm:text-base text-[#000080] font-extrabold">
              Realization Gap ({arbitrageResult.quantityQuintals} Qtls) •
              In-Pocket Take-Home Comparison
            </span>
            <span className="text-xs text-black font-bold">
              Clean In-Pocket Cash After Deductions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Horizontal Progress Bars (8 cols on md) */}
            <div className="md:col-span-8 space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[#000080] font-extrabold flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#000080]" />
                    APMC Mandi Yard (मंडी)
                  </span>
                  <span className="font-extrabold text-black font-tabular text-sm">
                    {formatINR(arbitrageResult.mandiNetPayout)}
                  </span>
                </div>
                <div className="w-full bg-[#E8EAF6] h-4 rounded-full overflow-hidden border border-[#000080]/30">
                  <div
                    className="bg-[#000080] h-full rounded-full transition-all duration-300"
                    style={{ width: `${mandiBarPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[#138808] font-extrabold flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#138808]" />
                    Direct Buyer Offer (सीधा खरीदार)
                  </span>
                  <span className="font-extrabold text-[#138808] font-tabular text-sm">
                    {formatINR(arbitrageResult.directNetPayout)}
                  </span>
                </div>
                <div className="w-full bg-[#E8F5E9] h-4 rounded-full overflow-hidden border border-[#138808]/40">
                  <div
                    className="bg-[#138808] h-full rounded-full transition-all duration-300"
                    style={{ width: `${directBarPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2-Column Vertical Bar Comparison (matching Phone 3 in Showcase) */}
            <div className="md:col-span-4 bg-[#E8EAF6] p-3 rounded-lg border border-[#000080]/20 flex items-end justify-around h-32 pt-4">
              <div className="flex flex-col items-center gap-1 w-24">
                <span className="font-tabular text-xs font-extrabold text-black">
                  {formatINR(arbitrageResult.mandiNetPayout)}
                </span>
                <div
                  className="w-full bg-[#000080] rounded-t relative transition-all duration-300"
                  style={{
                    height: `${Math.max(20, Math.round(mandiBarPercent * 0.65))}px`,
                  }}
                >
                  {/* Saffron Deduction Strip Marker */}
                  <div
                    className="w-full h-2.5 bg-[#FF9933] absolute top-0 border-b border-black"
                    title={`Deductions: ${formatINR(
                      arbitrageResult.mandiTotalDeductions
                    )}`}
                  />
                </div>
                <span className="text-[11px] font-bold text-black">
                  Mandi Yard
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 w-24">
                <span className="font-tabular text-xs font-extrabold text-[#138808]">
                  {formatINR(arbitrageResult.directNetPayout)}
                </span>
                <div
                  className="w-full bg-[#138808] rounded-t shadow transition-all duration-300"
                  style={{
                    height: `${Math.max(20, Math.round(directBarPercent * 0.65))}px`,
                  }}
                />
                <span className="text-[11px] font-extrabold text-[#138808]">
                  Direct Buyer
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Cards: Option A Local Mandi vs Option B Direct Buyer */}
        <div
          className={`mt-4 grid grid-cols-1 ${
            compactMode ? 'gap-3.5' : 'md:grid-cols-2 gap-5 items-stretch'
          }`}
        >
          {/* Card A: Local Mandi Yard */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-[#000080] overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-[#000080] text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">
                    gavel
                  </span>
                  <span className="text-sm font-extrabold">
                    Option A: Local Mandi Yard
                  </span>
                </div>
                <span className="text-[10px] bg-[#00003C] text-white px-2 py-0.5 rounded uppercase font-extrabold border border-white/30">
                  STANDARD APMC
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-[11px] text-black font-bold block">
                      Auction Gross Rate
                    </span>
                    <span className="text-xl sm:text-2xl text-[#000080] font-black font-tabular">
                      {formatINR(arbitrageInput.mandiPricePerQuintal)}{' '}
                      <span className="text-xs font-bold text-black">/ qtl</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-black font-bold block">
                      Total Gross ({arbitrageResult.quantityQuintals} Qtls)
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-black font-tabular">
                      {formatINR(arbitrageResult.mandiGross)}
                    </span>
                  </div>
                </div>

                {/* Deductions Ledger */}
                <div className="bg-[#FFDCC2] rounded-lg p-3 border border-[#FF9933] space-y-1.5">
                  <span className="text-[11px] font-extrabold text-[#371A00] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">
                      receipt_long
                    </span>
                    Field &amp; Mandi Deductions (कटौतियां)
                  </span>
                  <div className="space-y-1 text-xs pt-0.5 text-black">
                    <div className="flex justify-between font-semibold">
                      <span>Tractor / Truck Transit (परिवहन)</span>
                      <span className="font-extrabold font-tabular text-[#371A00]">
                        -{formatINR(arbitrageInput.mandiTransportCost)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Palledari / Unloading (पल्लेदारी)</span>
                      <span className="font-extrabold font-tabular text-[#371A00]">
                        -{formatINR(arbitrageInput.mandiLoadingCost)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>
                        Mandi Cess &amp; Commission (
                        {arbitrageInput.mandiCessPercent}%)
                      </span>
                      <span className="font-extrabold font-tabular text-[#371A00]">
                        -{formatINR(arbitrageResult.mandiCessAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between font-extrabold pt-1 border-t border-[#371A00]/20">
                      <span>Total Deductions</span>
                      <span className="font-tabular">
                        -{formatINR(arbitrageResult.mandiTotalDeductions)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Mandi Realization */}
            <div className="px-4 pb-4">
              <div className="flex justify-between items-center bg-[#E8EAF6] border border-[#000080]/30 px-3.5 py-2.5 rounded-lg">
                <div>
                  <span className="text-[11px] text-black font-bold block">
                    Actual Pocket Cash (Net Realization)
                  </span>
                  <span className="text-xs text-[#000080] font-extrabold font-tabular">
                    {formatINR(arbitrageResult.mandiNetPerQuintal, true)} / qtl
                    net
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-[#000080] font-tabular">
                    {formatINR(arbitrageResult.mandiNetPayout)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Direct Institutional Buyer Bid */}
          <div className="bg-white rounded-xl shadow-md border-2 border-[#138808] overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-[#138808] text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">
                    verified
                  </span>
                  <span className="text-sm font-extrabold">
                    Option B: ITC Agri Procure
                  </span>
                </div>
                <span className="text-[10px] bg-white text-[#006B3C] px-2 py-0.5 rounded font-black uppercase">
                  {isDirectAdvantage ? 'BEST NET OFFER' : 'DIRECT FARMGATE'}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-[11px] text-[#138808] font-extrabold block">
                      Direct Buyer Bid (Valid: 4 Hours)
                    </span>
                    <span className="text-xl sm:text-2xl text-[#138808] font-black font-tabular">
                      {formatINR(arbitrageInput.directPricePerQuintal)}{' '}
                      <span className="text-xs font-bold text-black">/ qtl</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-black font-bold block">
                      Gross Value ({arbitrageResult.quantityQuintals} Qtls)
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-black font-tabular">
                      {formatINR(arbitrageResult.directGross)}
                    </span>
                  </div>
                </div>

                {/* Direct Procurement Perks Ledger */}
                <div className="bg-[#E8F5E9] rounded-lg p-3 border border-[#138808]/40 space-y-1.5">
                  <span className="text-[11px] font-extrabold text-[#006B3C] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">
                      local_shipping
                    </span>
                    Direct Procurement Perks (खेत से खरीद)
                  </span>
                  <div className="space-y-1 text-xs pt-0.5 text-black">
                    <div className="flex justify-between font-semibold">
                      <span>Farmgate Gate-In Loading</span>
                      <span className="font-extrabold text-[#138808] font-tabular">
                        ₹0 (Free)
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Transit &amp; Bagging Insurance</span>
                      <span className="font-extrabold text-[#138808] font-tabular">
                        ₹0 (Waived)
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>FPO Quality Assay Platform Fee</span>
                      <span className="font-extrabold text-[#371A00] font-tabular">
                        -{formatINR(arbitrageInput.directPlatformFee)}
                      </span>
                    </div>
                    <div className="flex justify-between font-extrabold pt-1 border-t border-[#138808]/20">
                      <span>Total Deductions</span>
                      <span className="font-tabular">
                        -{formatINR(arbitrageResult.directTotalDeductions)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-2">
              <div className="flex justify-between items-center bg-[#E8F5E9] border-2 border-[#138808] px-3.5 py-2.5 rounded-lg">
                <div>
                  <span className="text-[11px] text-[#006B3C] font-extrabold block">
                    Final In-Pocket Net
                  </span>
                  <span className="text-xs text-black font-extrabold font-tabular">
                    {formatINR(arbitrageResult.directNetPerQuintal, true)} / qtl
                    net
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-[#138808] font-tabular">
                    {formatINR(arbitrageResult.directNetPayout)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-black text-[11px] font-semibold">
                <span className="material-symbols-outlined text-[#138808] text-[16px]">
                  bolt
                </span>
                <span>
                  50% Instant UPI Escrow ({formatINR(arbitrageResult.firstInstallment50)}) on weighment + 50% on mill delivery.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Calculation Basis + Emergency Processor Pivot Panel */}
        <div
          className={`mt-4 grid grid-cols-1 ${
            compactMode ? 'gap-3.5' : 'lg:grid-cols-12 gap-5 items-stretch'
          }`}
        >
          {/* Payout Calculation Basis (6 cols) */}
          <div
            className={`bg-[#E8EAF6] rounded-xl p-4 border-2 border-[#000080]/25 flex flex-col justify-between ${
              compactMode ? '' : 'lg:col-span-6'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base text-[#000080] font-extrabold">
                  Payout Calculation Basis
                </span>
                <span className="text-[10px] bg-white border border-[#000080]/30 px-2 py-0.5 rounded text-[#000080] font-extrabold uppercase">
                  Live Arbitrage
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-black font-bold block uppercase">
                    Contract Quantity
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#000080] font-tabular">
                    {arbitrageResult.quantityQuintals.toFixed(1)} QTL
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-black font-bold block uppercase">
                    Assayed Moisture
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#138808] font-tabular">
                    10.8% (Grade A)
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-black font-bold block uppercase">
                    Agreed Mill Rate
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#000080] font-tabular">
                    {formatINR(arbitrageInput.directPricePerQuintal)} / qtl
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-black font-bold block uppercase">
                    Platform Deductions
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#371A00] font-tabular">
                    -{formatINR(arbitrageResult.directTotalDeductions)} Flat
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[#000080]/20 flex justify-between items-center text-[#000080] font-extrabold text-sm sm:text-base">
              <span>Guaranteed Net Settlement:</span>
              <span className="text-xl font-black text-[#138808] font-tabular">
                {formatINR(arbitrageResult.directNetPayout)}
              </span>
            </div>
          </div>

          {/* Emergency Processor Pivot Panel (Saffron Safeguard) (6 cols) */}
          <div
            className={`bg-[#FFDCC2] rounded-xl p-4 border-2 border-[#FF9933] text-black shadow-sm flex flex-col justify-between gap-3 ${
              compactMode ? '' : 'lg:col-span-6'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#371A00] text-[#FF9933] flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[20px]">
                  swap_horizontal_circle
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm sm:text-base font-extrabold text-[#371A00] leading-snug">
                    1-Click Salvage / Processor Pivot
                  </h4>
                  <span className="text-[10px] bg-[#371A00] text-[#FF9933] px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
                    4H GUARANTEE
                  </span>
                </div>
                <span className="text-xs text-[#371A00] font-extrabold font-hindi block mt-0.5">
                  वैकल्पिक खरीदार बैकअप प्रणाली
                </span>
                <p className="text-xs text-black font-semibold mt-1 leading-relaxed">
                  Guaranteed secondary off-take to Adani Wilmar &amp; local
                  crushing mills within 4 hours if primary buyer gate quality
                  inspection stalls. Requires explicit grower/agent confirmation
                  before pivoting the active sale option.
                </p>
                {processorPivotApproved && (
                  <div className="mt-2 px-2.5 py-1 rounded bg-[#138808] text-white text-xs font-extrabold inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">
                      check_circle
                    </span>
                    <span>
                      Fallback Pivot Active: {selectedFallbackBuyer}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPivotDialogOpen(true)}
              className="w-full min-h-[44px] bg-[#371A00] hover:bg-black text-[#FF9933] transition-colors py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">
                security_update_good
              </span>
              <span>
                {processorPivotApproved
                  ? 'Change / Review Processor Pivot Approval'
                  : 'Enable Dual-Buyer Fallback Protection (Requires Approval)'}
              </span>
            </button>
          </div>
        </div>

        {/* Primary Contract Action Buttons */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!arbitrageResult.isValid}
            onClick={() => setLockContractModalOpen(true)}
            className="w-full min-h-[48px] bg-[#138808] hover:bg-[#006B3C] disabled:opacity-50 text-white rounded-lg font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">lock</span>
            <span>
              Lock {formatINR(arbitrageResult.directNetPayout)} Contract
              (अनुबंध पक्का करें)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAllBidsModalOpen(true)}
            className="w-full min-h-[48px] bg-[#000080] hover:bg-[#00003C] text-white rounded-lg font-extrabold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              format_list_bulleted
            </span>
            <span>Compare All 12 Verified Buyer Bids</span>
          </button>
        </div>
      </div>

      {/* CONFIRMATION DIALOG 1: PROCESSOR PIVOT APPROVAL */}
      {pivotDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pivot-dialog-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#371A00] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#371A00] text-[22px]">
                  swap_calls
                </span>
                <h2
                  id="pivot-dialog-title"
                  className="text-base font-extrabold text-[#000080]"
                >
                  Confirm Processor Pivot &amp; Secondary Off-Take
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPivotDialogOpen(false)}
                aria-label="Close processor pivot dialog"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#FFDCC2] border border-[#FF9933] text-xs text-black font-semibold leading-relaxed">
              <strong>Approval Required Before Switching Sale Option:</strong>{' '}
              Activating the 1-Click Salvage Pivot registers a secondary binding
              off-take option so that if the primary processor gate inspection
              stalls for more than 4 hours, your lot is automatically routed to
              the approved backup mill without distress discounting.
            </div>

            <div>
              <label
                htmlFor="fallback-buyer-select"
                className="text-xs font-extrabold text-[#000080] block mb-1"
              >
                Select Secondary Fallback Processor:
              </label>
              <select
                id="fallback-buyer-select"
                value={selectedFallbackBuyer}
                onChange={(e) => setSelectedFallbackBuyer(e.target.value)}
                className="w-full p-2.5 rounded border-2 border-[#000080] text-xs font-extrabold text-black bg-white"
              >
                <option value="Adani Wilmar Crushing Mill (Indore Dock 4)">
                  Adani Wilmar Crushing Mill (Indore Dock 4) — ₹2,135/qtl
                </option>
                <option value="Vippy Industries Solvent Plant (Dewas)">
                  Vippy Industries Solvent Plant (Dewas) — ₹2,125/qtl
                </option>
                <option value="Khandwa FPO Cooperative Buffer Silo">
                  Khandwa FPO Cooperative Buffer Silo — ₹2,110/qtl
                </option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#000080]/20">
              <button
                type="button"
                onClick={() => setPivotDialogOpen(false)}
                className="px-4 py-2 rounded border-2 border-[#000080] text-[#000080] text-xs font-extrabold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  approveProcessorPivot(selectedFallbackBuyer);
                  setPivotDialogOpen(false);
                }}
                className="px-4 py-2 rounded bg-[#138808] text-white text-xs font-extrabold"
              >
                Approve &amp; Activate Pivot Option
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG 2: LOCK CONTRACT */}
      {lockContractModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lock-contract-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#138808] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="lock-contract-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Lock Direct Procurement Contract (Demo)
              </h2>
              <button
                type="button"
                onClick={() => setLockContractModalOpen(false)}
                aria-label="Close lock contract dialog"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#E8F5E9] border border-[#138808] p-3.5 rounded-lg text-xs text-black space-y-1.5 font-tabular">
              <div className="flex justify-between">
                <span className="font-semibold">Selected Channel:</span>
                <span className="font-extrabold text-[#000080]">
                  ITC Agri Direct Farmgate
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Quantity × Rate:</span>
                <span className="font-extrabold">
                  {arbitrageResult.quantityQuintals} Qtl ×{' '}
                  {formatINR(arbitrageInput.directPricePerQuintal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Gross Contract Value:</span>
                <span className="font-extrabold">
                  {formatINR(arbitrageResult.directGross)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Net In-Pocket Payout:</span>
                <span className="font-extrabold text-[#138808] text-sm">
                  {formatINR(arbitrageResult.directNetPayout)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#138808]/30">
                <span className="font-semibold">50% Weighbridge UPI:</span>
                <span className="font-extrabold text-[#006B3C]">
                  {formatINR(arbitrageResult.firstInstallment50)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLockContractModalOpen(false)}
                className="px-4 py-2 rounded border border-[#000080] text-[#000080] text-xs font-extrabold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setContractLocked(true);
                  setSelectedSaleOption('DIRECT_BUYER');
                  setLockContractModalOpen(false);
                  showToast(
                    `Locked ${formatINR(
                      arbitrageResult.directNetPayout
                    )} contract (Simulated). Proceeding to Weighbridge & Escrow.`,
                    'green'
                  );
                  navigate('/harvest-payments');
                }}
                className="px-4 py-2 rounded bg-[#138808] text-white text-xs font-extrabold"
              >
                Confirm &amp; Proceed to Weighbridge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: COMPARE ALL VERIFIED BUYER BIDS */}
      {allBidsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="all-bids-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-3 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="all-bids-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Verified Institutional Buyer Bids (Illustrative Market Feed)
              </h2>
              <button
                type="button"
                onClick={() => setAllBidsModalOpen(false)}
                aria-label="Close all bids modal"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {BUYER_OFFERS.map((offer) => (
                <div
                  key={offer.id}
                  className="p-3 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-[#000080]">
                        {offer.buyerName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#138808] text-white font-extrabold">
                        {offer.termsStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-black font-semibold block">
                      {offer.commodityName} • {offer.deliveryLocation}
                    </span>
                    <span className="text-[11px] text-black font-tabular block">
                      Expiry: {offer.bidExpiry} • Fee:{' '}
                      {formatINR(offer.disclosedDeductions.platformFee)} •
                      Transport:{' '}
                      {formatINR(offer.disclosedDeductions.transport)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right font-tabular">
                      <span className="text-lg font-black text-[#138808] block">
                        {formatINR(offer.pricePerQuintal)}/qtl
                      </span>
                      <span className="text-[10px] font-bold text-black">
                        {offer.demandMetricTons} MT Demand
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateArbitrageInput({
                          directPricePerQuintal: offer.pricePerQuintal,
                          directPlatformFee:
                            offer.disclosedDeductions.platformFee,
                          directTransportCost:
                            offer.disclosedDeductions.transport,
                        });
                        setAllBidsModalOpen(false);
                        showToast(
                          `Loaded ${offer.buyerName} bid (${formatINR(
                            offer.pricePerQuintal
                          )}/qtl) into calculator.`,
                          'green'
                        );
                      }}
                      className="px-3 py-2 rounded bg-[#000080] text-white text-xs font-extrabold whitespace-nowrap"
                    >
                      Use Bid
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAllBidsModalOpen(false)}
              className="w-full py-2.5 rounded bg-[#000080] text-white text-xs font-extrabold mt-1"
            >
              Close Bid Comparison
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
