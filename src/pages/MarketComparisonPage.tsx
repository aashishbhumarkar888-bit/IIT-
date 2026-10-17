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
    currentLot,
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
    t,
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
    <div
      className="w-full bg-white text-black"
      role="region"
      aria-label={t(
        'Market Price Comparison and Net Realization Arbitrage Calculator',
        'बाजार भाव तुलना और वास्तविक शुद्ध आय कैलकुलेटर'
      )}
    >
      <div
        className={`mx-auto w-full ${
          compactMode ? 'p-3' : 'max-w-6xl px-4 sm:px-6 py-5 space-y-5'
        }`}
      >
        {/* Top Context Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#000080]/15">
          <div className="flex items-center gap-3">
            {!compactMode && (
              <button
                type="button"
                onClick={() => navigate('/crop-passport')}
                aria-label={t(
                  'Go back to Digital Crop Passport',
                  'डिजिटल फसल पासपोर्ट पर वापस जाएँ'
                )}
                className="w-10 h-10 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 flex items-center justify-center text-[#000080] hover:bg-[#000080] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  arrow_back
                </span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-extrabold">
                <span className="text-[#138808] uppercase tracking-wider font-tabular">
                  {currentLot.id} ({currentLot.shortCode})
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-black font-hindi">
                  {currentLot.cropName} / {currentLot.cropNameHi}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl text-[#000080] font-extrabold leading-tight">
                {t(
                  'Match Buyer & Net Realization Arbitrage',
                  'खरीदार मिलान और शुद्ध आय तुलना'
                )}
              </h1>
              <span className="text-xs text-[#006B3C] block font-bold font-hindi">
                {t(
                  'बाजार भाव और वास्तविक शुद्ध आय (Take-Home Cash Comparison)',
                  'मंडी कटौती के बाद वास्तविक हाथ में आने वाली राशि की तुलना'
                )}
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
              aria-label={t(
                'Reset calculator to 25 quintal sample values',
                'कैलकुलेटर को 25 क्विंटल नमूना मानों पर रीसेट करें'
              )}
              className="px-3 py-1.5 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 text-xs font-extrabold text-[#000080] hover:bg-[#000080] hover:text-white min-h-[38px]"
            >
              {t('Reset 25 Qtl Sample', '25 क्विंटल नमूना रीसेट करें')}
            </button>
            <div
              aria-label={t('Currency Indian Rupees', 'भारतीय रुपया मुद्रा')}
              className="flex items-center bg-[#000080] text-white rounded-lg px-2.5 py-1.5 gap-1 shadow-sm font-tabular text-xs font-extrabold"
            >
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
            className={`bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-[#000080]/25 flex flex-col justify-between ${
              compactMode ? '' : 'lg:col-span-7'
            }`}
          >
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#006B3C] block">
                {t(
                  'VERIFIED YARD ARBITRAGE CALCULATOR · प्रमाणित शुद्ध आय गणना',
                  'प्रमाणित शुद्ध आय कैलकुलेटर · VERIFIED YARD ARBITRAGE'
                )}
              </span>
              <h2 className="text-2xl sm:text-3xl text-[#000080] font-extrabold tracking-tight mt-1">
                {t(
                  'Jeb Mein Kitna Aayega? (What reaches your pocket?)',
                  'जेब में कितना आएगा? (Jeb Mein Kitna Aayega?)'
                )}
              </h2>
              <p className="text-sm text-[#138808] font-extrabold font-hindi mt-0.5">
                {t(
                  'जेब में कितना आएगा? — परिवहन, पल्लेदारी और मंडी शुल्क घटाकर वास्तविक तुलना',
                  'परिवहन, पल्लेदारी और मंडी शुल्क घटाने के बाद आपकी वास्तविक शुद्ध कमाई'
                )}
              </p>
              <p className="text-xs sm:text-sm text-black/80 font-medium mt-1.5 leading-relaxed">
                {t(
                  'Compare transparent net realization after transport, palledari loading, APMC mandi cess, and dock fees before making your dispatch choice.',
                  'फसल भेजने का निर्णय लेने से पहले परिवहन, पल्लेदारी, मंडी टैक्स और तुलाई शुल्क घटाकर हाथ में आने वाली शुद्ध राशि की तुलना करें।'
                )}
              </p>
            </div>

            {/* Active Selection Status Line */}
            <div className="mt-4 pt-3 border-t border-[#000080]/15 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-black">
                {t('Selected Dispatch Channel:', 'चुना गया बिक्री माध्यम:')}{' '}
                <strong className="text-[#000080]">
                  {selectedSaleOption === 'DIRECT_BUYER'
                    ? t(
                        'Option B: ITC Agri Direct Farmgate',
                        'विकल्प B: ITC एग्री डायरेक्ट (खेत से खरीद)'
                      )
                    : selectedSaleOption === 'SALVAGE_PIVOT'
                      ? `${t('Fallback Pivot:', 'वैकल्पिक खरीदार:')} ${selectedFallbackBuyer}`
                      : t(
                          'Option A: Local APMC Mandi Yard',
                          'विकल्प A: स्थानीय APMC मंडी यार्ड'
                        )}
                </strong>
              </span>
              {contractLocked && (
                <span className="px-2 py-0.5 rounded bg-[#138808] text-white font-extrabold text-[10px] uppercase">
                  {t('CONTRACT LOCKED · अनुबंध पक्का', 'अनुबंध पक्का · CONTRACT LOCKED')}
                </span>
              )}
            </div>
          </div>

          {/* Right Net Extra Pocket Money Spotlight Card (5 cols) */}
          <div
            role="status"
            aria-live="polite"
            aria-label={t(
              'Net extra pocket money comparison result',
              'अतिरिक्त शुद्ध आय तुलना परिणाम'
            )}
            className={`rounded-xl p-4 sm:p-5 shadow-md flex items-center justify-between gap-3 border-2 ${
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
                      ? t(
                          'NET EXTRA POCKET MONEY (DIRECT BUYER · अतिरिक्त शुद्ध लाभ)',
                          'सीधे खरीदार से अतिरिक्त शुद्ध लाभ (NET EXTRA POCKET MONEY)'
                        )
                      : t(
                          'NET COMPARISON DIFFERENCE (MANDI VS DIRECT)',
                          'मंडी बनाम सीधे खरीदार का शुद्ध अंतर'
                        )}
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-[#9DF6B9] font-tabular tracking-tight">
                      {arbitrageResult.netDifference >= 0 ? '+' : ''}
                      {formatINR(arbitrageResult.netDifference)}
                    </span>
                    <span className="text-xs text-white font-extrabold bg-[#138808] px-2 py-0.5 rounded font-tabular">
                      {arbitrageResult.percentageGain >= 0 ? '+' : ''}
                      {arbitrageResult.percentageGain}%{' '}
                      {isDirectAdvantage
                        ? t('Gain (लाभ)', 'अधिक लाभ')
                        : t('Delta (अंतर)', 'अंतर')}
                    </span>
                  </div>
                  <span className="text-xs text-white/90 font-medium block">
                    {t(
                      `Selling ${arbitrageResult.quantityQuintals} Qtls directly to ITC Farmgate vs Local APMC Mandi`,
                      `${arbitrageResult.quantityQuintals} क्विंटल की स्थानीय मंडी बनाम ITC डायरेक्ट खरीद तुलना`
                    )}
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
                    {t('Calculator Input Required', 'कैलकुलेटर इनपुट आवश्यक है')}
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
        <section
          aria-label={t(
            'Interactive Net Realization Calculator Controls',
            'वास्तविक शुद्ध आय कैलकुलेटर नियंत्रण'
          )}
          className="mt-4 bg-[#E8EAF6]/70 rounded-xl p-4 sm:p-5 border border-[#000080]/25"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#000080]">
                {t(
                  'Interactive Net Realization Calculator (वास्तविक शुद्ध आय कैलकुलेटर)',
                  'वास्तविक शुद्ध आय कैलकुलेटर (Interactive Net Realization Calculator)'
                )}
              </h3>
              <p className="text-xs text-black/80 font-medium">
                {t(
                  'Edit lot quantity, prices, or deductions below—all totals, per-quintal realizations, and 50-50 escrow splits recalculate immediately.',
                  'नीचे मात्रा, भाव या खर्च बदलें — कुल राशि, प्रति क्विंटल शुद्ध आय और 50-50 एस्क्रो भुगतान तुरंत अपडेट हो जाएंगे।'
                )}
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-[#000080] text-white text-[10px] font-extrabold uppercase">
              {t('LIVE FORMULAS · लाइव गणना', 'लाइव गणना · LIVE FORMULAS')}
            </span>
          </div>

          <div
            className={`grid grid-cols-2 ${
              compactMode ? 'gap-2' : 'sm:grid-cols-3 lg:grid-cols-6 gap-3'
            }`}
          >
            <div>
              <label
                htmlFor="calc-qty"
                className="text-[11px] font-extrabold text-[#000080] block mb-1"
              >
                {t('Lot Quantity (Qtls)', 'मात्रा (क्विंटल)')}
              </label>
              <input
                id="calc-qty"
                type="number"
                min="0"
                step="1"
                aria-label={t(
                  'Lot Quantity in Quintals',
                  'क्विंटल में फसल की मात्रा'
                )}
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
                {t('Mandi Rate (₹/Qtl)', 'मंडी भाव (₹/क्विंटल)')}
              </label>
              <input
                id="calc-mandi-price"
                type="number"
                min="0"
                step="10"
                aria-label={t(
                  'Local Mandi Rate per Quintal in Rupees',
                  'स्थानीय मंडी भाव प्रति क्विंटल'
                )}
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
                {t('Direct Bid (₹/Qtl)', 'सीधी बोली (₹/क्विंटल)')}
              </label>
              <input
                id="calc-direct-price"
                type="number"
                min="0"
                step="10"
                aria-label={t(
                  'Direct Buyer Bid per Quintal in Rupees',
                  'सीधे खरीदार की बोली प्रति क्विंटल'
                )}
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
                {t('Mandi Transport (₹)', 'मंडी परिवहन खर्च (₹)')}
              </label>
              <input
                id="calc-mandi-transport"
                type="number"
                min="0"
                step="50"
                aria-label={t(
                  'Mandi Transport Cost in Rupees',
                  'मंडी परिवहन खर्च रुपयों में'
                )}
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
                {t('Mandi Loading (₹)', 'मंडी पल्लेदारी (₹)')}
              </label>
              <input
                id="calc-mandi-loading"
                type="number"
                min="0"
                step="50"
                aria-label={t(
                  'Mandi Loading Palledari Cost in Rupees',
                  'मंडी पल्लेदारी खर्च रुपयों में'
                )}
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
                {t('Direct Assay Fee (₹)', 'गुणवत्ता जाँच शुल्क (₹)')}
              </label>
              <input
                id="calc-direct-fee"
                type="number"
                min="0"
                step="50"
                aria-label={t(
                  'Direct Quality Assay Fee in Rupees',
                  'सीधी खरीद गुणवत्ता जाँच शुल्क रुपयों में'
                )}
                value={arbitrageInput.directPlatformFee}
                onChange={(e) =>
                  handleNumberFieldChange('directPlatformFee', e.target.value)
                }
                className="w-full h-10 px-2.5 rounded bg-white text-black border border-[#000080]/50 font-tabular font-bold text-sm"
              />
            </div>
          </div>
        </section>

        {/* Visual Comparative Bar Chart */}
        <section
          aria-label={t(
            'Visual Take-Home Cash Comparison Chart',
            'हाथ में आने वाली नकद राशि की तुलनात्मक चार्ट'
          )}
          className="mt-4 bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-[#000080]/25"
        >
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <span className="text-sm sm:text-base text-[#000080] font-extrabold">
              {t(
                `Realization Gap (${arbitrageResult.quantityQuintals} Qtls) • In-Pocket Take-Home Comparison`,
                `शुद्ध आय अंतर (${arbitrageResult.quantityQuintals} क्विंटल) • हाथ में आने वाली राशि की तुलना`
              )}
            </span>
            <span className="text-xs text-[#006B3C] font-bold">
              {t(
                'Clean In-Pocket Cash After Deductions (कटौती के बाद शुद्ध राशि)',
                'सभी कटौतियों के बाद हाथ में आने वाली शुद्ध नकद राशि'
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Horizontal Progress Bars (8 cols on md) */}
            <div className="md:col-span-8 space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[#000080] font-extrabold flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#000080]" />
                    {t('APMC Mandi Yard (मंडी)', 'APMC मंडी यार्ड (Mandi)')}
                  </span>
                  <span className="font-extrabold text-black font-tabular text-sm">
                    {formatINR(arbitrageResult.mandiNetPayout)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={mandiBarPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t(
                    `APMC Mandi Net Payout ${formatINR(arbitrageResult.mandiNetPayout)}`,
                    `APMC मंडी शुद्ध भुगतान ${formatINR(arbitrageResult.mandiNetPayout)}`
                  )}
                  className="w-full bg-[#E8EAF6] h-4 rounded-full overflow-hidden border border-[#000080]/30"
                >
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
                    {t(
                      'Direct Buyer Offer (सीधा खरीदार)',
                      'सीधा संस्थागत खरीदार (Direct Buyer)'
                    )}
                  </span>
                  <span className="font-extrabold text-[#138808] font-tabular text-sm">
                    {formatINR(arbitrageResult.directNetPayout)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={directBarPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t(
                    `Direct Buyer Net Payout ${formatINR(arbitrageResult.directNetPayout)}`,
                    `सीधे खरीदार का शुद्ध भुगतान ${formatINR(arbitrageResult.directNetPayout)}`
                  )}
                  className="w-full bg-[#E8F5E9] h-4 rounded-full overflow-hidden border border-[#138808]/40"
                >
                  <div
                    className="bg-[#138808] h-full rounded-full transition-all duration-300"
                    style={{ width: `${directBarPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2-Column Vertical Bar Comparison */}
            <div className="md:col-span-4 bg-[#E8EAF6]/70 p-3 rounded-lg border border-[#000080]/20 flex items-end justify-around h-32 pt-4">
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
                  <div
                    className="w-full h-2.5 bg-[#FF9933] absolute top-0 border-b border-black"
                    title={t(
                      `Deductions: ${formatINR(arbitrageResult.mandiTotalDeductions)}`,
                      `कुल कटौती: ${formatINR(arbitrageResult.mandiTotalDeductions)}`
                    )}
                  />
                </div>
                <span className="text-[11px] font-bold text-black">
                  {t('Mandi Yard', 'मंडी यार्ड')}
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
                  {t('Direct Buyer', 'सीधा खरीदार')}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Side-by-Side Comparison Cards: Option A Local Mandi vs Option B Direct Buyer */}
        <div
          className={`mt-4 grid grid-cols-1 ${
            compactMode ? 'gap-3.5' : 'md:grid-cols-2 gap-5 items-stretch'
          }`}
        >
          {/* Card A: Local Mandi Yard */}
          <article
            aria-label={t(
              'Option A: Local Mandi Yard Breakdown',
              'विकल्प A: स्थानीय मंडी यार्ड विवरण'
            )}
            className="bg-white rounded-xl shadow-sm border-2 border-[#000080] overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="bg-[#000080] text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">
                    gavel
                  </span>
                  <span className="text-sm font-extrabold">
                    {t(
                      'Option A: Local Mandi Yard (स्थानीय मंडी)',
                      'विकल्प A: स्थानीय मंडी यार्ड (Local Mandi)'
                    )}
                  </span>
                </div>
                <span className="text-[10px] bg-[#00003C] text-white px-2 py-0.5 rounded uppercase font-extrabold border border-white/30">
                  {t('STANDARD APMC', 'मानक मंडी')}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-[11px] text-black font-bold block">
                      {t('Auction Gross Rate', 'नीलामी सकल भाव')}
                    </span>
                    <span className="text-xl sm:text-2xl text-[#000080] font-black font-tabular">
                      {formatINR(arbitrageInput.mandiPricePerQuintal)}{' '}
                      <span className="text-xs font-bold text-black">
                        / {t('qtl', 'क्विंटल')}
                      </span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-black font-bold block">
                      {t(
                        `Total Gross (${arbitrageResult.quantityQuintals} Qtls)`,
                        `कुल सकल मूल्य (${arbitrageResult.quantityQuintals} क्विंटल)`
                      )}
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-black font-tabular">
                      {formatINR(arbitrageResult.mandiGross)}
                    </span>
                  </div>
                </div>

                {/* Deductions Ledger */}
                <div className="bg-[#FFDCC2]/75 rounded-lg p-3 border border-[#FF9933] space-y-1.5">
                  <span className="text-[11px] font-extrabold text-[#371A00] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">
                      receipt_long
                    </span>
                    {t(
                      'Field & Mandi Deductions (कटौतियां)',
                      'मंडी और परिवहन कटौतियां (Deductions)'
                    )}
                  </span>
                  <div className="space-y-1 text-xs pt-0.5 text-black">
                    <div className="flex justify-between font-semibold">
                      <span>
                        {t(
                          'Tractor / Truck Transit (परिवहन)',
                          'ट्रैक्टर / ट्रक परिवहन (Transit)'
                        )}
                      </span>
                      <span className="font-extrabold font-tabular text-[#371A00]">
                        -{formatINR(arbitrageInput.mandiTransportCost)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>
                        {t(
                          'Palledari / Unloading (पल्लेदारी)',
                          'पल्लेदारी / उतराई (Unloading)'
                        )}
                      </span>
                      <span className="font-extrabold font-tabular text-[#371A00]">
                        -{formatINR(arbitrageInput.mandiLoadingCost)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>
                        {t(
                          `Mandi Cess & Commission (${arbitrageInput.mandiCessPercent}%)`,
                          `मंडी शुल्क और आढ़त (${arbitrageInput.mandiCessPercent}%)`
                        )}
                      </span>
                      <span className="font-extrabold font-tabular text-[#371A00]">
                        -{formatINR(arbitrageResult.mandiCessAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between font-extrabold pt-1 border-t border-[#371A00]/20">
                      <span>{t('Total Deductions', 'कुल कटौती')}</span>
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
                    {t(
                      'Actual Pocket Cash (Net Realization)',
                      'हाथ में आने वाली शुद्ध राशि (Net Cash)'
                    )}
                  </span>
                  <span className="text-xs text-[#000080] font-extrabold font-tabular">
                    {formatINR(arbitrageResult.mandiNetPerQuintal, true)} /{' '}
                    {t('qtl net', 'क्विंटल शुद्ध')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-[#000080] font-tabular">
                    {formatINR(arbitrageResult.mandiNetPayout)}
                  </span>
                </div>
              </div>
            </div>
          </article>

          {/* Card B: Direct Institutional Buyer Bid */}
          <article
            aria-label={t(
              'Option B: Direct Institutional Buyer Breakdown',
              'विकल्प B: सीधा संस्थागत खरीदार विवरण'
            )}
            className="bg-white rounded-xl shadow-md border-2 border-[#138808] overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="bg-[#138808] text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">
                    verified
                  </span>
                  <span className="text-sm font-extrabold">
                    {t(
                      'Option B: ITC Agri Procure (सीधी खरीद)',
                      'विकल्प B: ITC एग्री सीधी खरीद (Direct)'
                    )}
                  </span>
                </div>
                <span className="text-[10px] bg-white text-[#006B3C] px-2 py-0.5 rounded font-black uppercase">
                  {isDirectAdvantage
                    ? t('BEST NET OFFER · सर्वोत्तम प्रस्ताव', 'सर्वोत्तम शुद्ध प्रस्ताव')
                    : t('DIRECT FARMGATE', 'खेत से खरीद')}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-[11px] text-[#138808] font-extrabold block">
                      {t(
                        'Direct Buyer Bid (Valid: 4 Hours)',
                        'सीधे खरीदार की बोली (4 घंटे मान्य)'
                      )}
                    </span>
                    <span className="text-xl sm:text-2xl text-[#138808] font-black font-tabular">
                      {formatINR(arbitrageInput.directPricePerQuintal)}{' '}
                      <span className="text-xs font-bold text-black">
                        / {t('qtl', 'क्विंटल')}
                      </span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-black font-bold block">
                      {t(
                        `Gross Value (${arbitrageResult.quantityQuintals} Qtls)`,
                        `कुल सकल मूल्य (${arbitrageResult.quantityQuintals} क्विंटल)`
                      )}
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
                    {t(
                      'Direct Procurement Perks (खेत से खरीद लाभ)',
                      'खेत से सीधी खरीद के लाभ (Direct Perks)'
                    )}
                  </span>
                  <div className="space-y-1 text-xs pt-0.5 text-black">
                    <div className="flex justify-between font-semibold">
                      <span>
                        {t(
                          'Farmgate Gate-In Loading',
                          'खेत से लोडिंग और परिवहन'
                        )}
                      </span>
                      <span className="font-extrabold text-[#138808] font-tabular">
                        {t('₹0 (Free)', '₹0 (निःशुल्क)')}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>
                        {t(
                          'Transit & Bagging Insurance',
                          'परिवहन एवं बारदाना बीमा'
                        )}
                      </span>
                      <span className="font-extrabold text-[#138808] font-tabular">
                        {t('₹0 (Waived)', '₹0 (माफ़)')}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>
                        {t(
                          'FPO Quality Assay Platform Fee',
                          'FPO गुणवत्ता जाँच शुल्क'
                        )}
                      </span>
                      <span className="font-extrabold text-[#371A00] font-tabular">
                        -{formatINR(arbitrageInput.directPlatformFee)}
                      </span>
                    </div>
                    <div className="flex justify-between font-extrabold pt-1 border-t border-[#138808]/20">
                      <span>{t('Total Deductions', 'कुल कटौती')}</span>
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
                    {t('Final In-Pocket Net', 'अंतिम शुद्ध भुगतान (In-Pocket)')}
                  </span>
                  <span className="text-xs text-black font-extrabold font-tabular">
                    {formatINR(arbitrageResult.directNetPerQuintal, true)} /{' '}
                    {t('qtl net', 'क्विंटल शुद्ध')}
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
                  {t(
                    `50% Instant UPI Escrow (${formatINR(arbitrageResult.firstInstallment50)}) on weighment + 50% on mill delivery.`,
                    `तौल पर तुरंत 50% UPI एस्क्रो (${formatINR(arbitrageResult.firstInstallment50)}) + मिल डिलीवरी पर शेष 50% भुगतान।`
                  )}
                </span>
              </div>
            </div>
          </article>
        </div>

        {/* Payout Calculation Basis + Emergency Processor Pivot Panel */}
        <div
          className={`mt-4 grid grid-cols-1 ${
            compactMode ? 'gap-3.5' : 'lg:grid-cols-12 gap-5 items-stretch'
          }`}
        >
          {/* Payout Calculation Basis (6 cols) */}
          <div
            className={`bg-[#E8EAF6]/70 rounded-xl p-4 border border-[#000080]/25 flex flex-col justify-between ${
              compactMode ? '' : 'lg:col-span-6'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base text-[#000080] font-extrabold">
                  {t(
                    'Payout Calculation Basis (भुगतान गणना आधार)',
                    'भुगतान गणना का आधार (Payout Calculation Basis)'
                  )}
                </span>
                <span className="text-[10px] bg-white border border-[#000080]/30 px-2 py-0.5 rounded text-[#000080] font-extrabold uppercase">
                  {t('Live Arbitrage', 'लाइव तुलना')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-black font-bold block uppercase">
                    {t('Contract Quantity', 'अनुबंध मात्रा')}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#000080] font-tabular">
                    {arbitrageResult.quantityQuintals.toFixed(1)}{' '}
                    {t('QTL', 'क्विंटल')}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-black font-bold block uppercase">
                    {t('Assayed Moisture', 'प्रमाणित नमी')}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#138808] font-tabular">
                    {currentLot.evidence.moisturePercent}% ({currentLot.grade})
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-black font-bold block uppercase">
                    {t('Agreed Mill Rate', 'तय मिल भाव')}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#000080] font-tabular">
                    {formatINR(arbitrageInput.directPricePerQuintal)} /{' '}
                    {t('qtl', 'क्विंटल')}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-black font-bold block uppercase">
                    {t('Platform Deductions', 'प्लेटफ़ॉर्म शुल्क')}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#371A00] font-tabular">
                    -{formatINR(arbitrageResult.directTotalDeductions)}{' '}
                    {t('Flat', 'निश्चित')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[#000080]/20 flex justify-between items-center text-[#000080] font-extrabold text-sm sm:text-base">
              <span>
                {t('Guaranteed Net Settlement:', 'गारंटीशुदा शुद्ध भुगतान:')}
              </span>
              <span className="text-xl font-black text-[#138808] font-tabular">
                {formatINR(arbitrageResult.directNetPayout)}
              </span>
            </div>
          </div>

          {/* Emergency Processor Pivot Panel (Saffron Safeguard) (6 cols) */}
          <div
            className={`bg-[#FFDCC2]/70 rounded-xl p-4 border-2 border-[#FF9933] text-black shadow-sm flex flex-col justify-between gap-3 ${
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
                    {t(
                      '1-Click Salvage / Processor Pivot',
                      '1-क्लिक वैकल्पिक खरीदार सुरक्षा (Processor Pivot)'
                    )}
                  </h4>
                  <span className="text-[10px] bg-[#371A00] text-[#FF9933] px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
                    {t('4H GUARANTEE', '4 घंटे गारंटी')}
                  </span>
                </div>
                <span className="text-xs text-[#371A00] font-extrabold font-hindi block mt-0.5">
                  {t(
                    'वैकल्पिक खरीदार बैकअप प्रणाली',
                    'प्राथमिक खरीदार गेट पर देरी होने पर वैकल्पिक मिल सुरक्षा'
                  )}
                </span>
                <p className="text-xs text-black font-semibold mt-1 leading-relaxed">
                  {t(
                    'Guaranteed secondary off-take to Adani Wilmar & local crushing mills within 4 hours if primary buyer gate quality inspection stalls. Requires explicit grower/agent confirmation before pivoting the active sale option.',
                    'यदि प्राथमिक खरीदार के गेट पर गुणवत्ता जाँच में 4 घंटे से अधिक देरी होती है, तो अडानी विल्मर और स्थानीय मिलों को बिना किसी औने-पौने दाम के बिक्री। किसान/एजेंट की अनुमति के बाद ही लागू।'
                  )}
                </p>
                {processorPivotApproved && (
                  <div className="mt-2 px-2.5 py-1 rounded bg-[#138808] text-white text-xs font-extrabold inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">
                      check_circle
                    </span>
                    <span>
                      {t('Fallback Pivot Active:', 'सक्रिय वैकल्पिक खरीदार:')}{' '}
                      {selectedFallbackBuyer}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPivotDialogOpen(true)}
              aria-label={t(
                'Configure dual-buyer fallback processor protection',
                'वैकल्पिक खरीदार सुरक्षा विकल्प सेट करें'
              )}
              className="w-full min-h-[44px] bg-[#371A00] hover:bg-black text-[#FF9933] transition-colors py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">
                security_update_good
              </span>
              <span>
                {processorPivotApproved
                  ? t(
                      'Change / Review Processor Pivot Approval',
                      'वैकल्पिक खरीदार अनुमति बदलें / देखें'
                    )
                  : t(
                      'Enable Dual-Buyer Fallback Protection (Requires Approval)',
                      'द्वि-खरीदार सुरक्षा सक्रिय करें (अनुमति आवश्यक)'
                    )}
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
            aria-label={t(
              `Lock ${formatINR(arbitrageResult.directNetPayout)} Direct Procurement Contract`,
              `${formatINR(arbitrageResult.directNetPayout)} का सीधा खरीद अनुबंध पक्का करें`
            )}
            className="w-full min-h-[48px] bg-[#138808] hover:bg-[#006B3C] disabled:opacity-50 text-white rounded-lg font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">lock</span>
            <span>
              {t(
                `Lock ${formatINR(arbitrageResult.directNetPayout)} Contract (अनुबंध पक्का करें)`,
                `${formatINR(arbitrageResult.directNetPayout)} अनुबंध पक्का करें (Lock Contract)`
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAllBidsModalOpen(true)}
            aria-label={t(
              'Compare all verified institutional buyer bids',
              'सभी सत्यापित संस्थागत खरीदारों की बोलियों की तुलना करें'
            )}
            className="w-full min-h-[48px] bg-[#000080] hover:bg-[#00003C] text-white rounded-lg font-extrabold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              format_list_bulleted
            </span>
            <span>
              {t(
                'Compare All Verified Buyer Bids (सभी बोलियां देखें)',
                'सभी सत्यापित खरीदार बोलियों की तुलना करें'
              )}
            </span>
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
                  {t(
                    'Confirm Processor Pivot & Secondary Off-Take',
                    'वैकल्पिक खरीदार (Processor Pivot) की पुष्टि करें'
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPivotDialogOpen(false)}
                aria-label={t(
                  'Close processor pivot dialog',
                  'वैकल्पिक खरीदार संवाद बंद करें'
                )}
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#FFDCC2] border border-[#FF9933] text-xs text-black font-semibold leading-relaxed">
              <strong>
                {t(
                  'Approval Required Before Switching Sale Option:',
                  'बिक्री विकल्प बदलने से पहले अनुमति आवश्यक:'
                )}
              </strong>{' '}
              {t(
                'Activating the 1-Click Salvage Pivot registers a secondary binding off-take option so that if the primary processor gate inspection stalls for more than 4 hours, your lot is automatically routed to the approved backup mill without distress discounting.',
                'इसे सक्रिय करने से एक द्वितीयक बाध्यकारी खरीद विकल्प जुड़ जाता है, ताकि प्राथमिक खरीदार के गेट पर 4 घंटे से अधिक देरी होने पर आपकी फसल बिना किसी नुकसान के स्वीकृत बैकअप मिल को भेजी जा सके।'
              )}
            </div>

            <div>
              <label
                htmlFor="fallback-buyer-select"
                className="text-xs font-extrabold text-[#000080] block mb-1"
              >
                {t(
                  'Select Secondary Fallback Processor:',
                  'द्वितीयक वैकल्पिक खरीदार चुनें:'
                )}
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
                {t('Cancel', 'रद्द करें')}
              </button>
              <button
                type="button"
                onClick={() => {
                  approveProcessorPivot(selectedFallbackBuyer);
                  setPivotDialogOpen(false);
                }}
                className="px-4 py-2 rounded bg-[#138808] text-white text-xs font-extrabold"
              >
                {t(
                  'Approve & Activate Pivot Option',
                  'स्वीकृत करें और विकल्प सक्रिय करें'
                )}
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
                {t(
                  'Lock Direct Procurement Contract (Demo)',
                  'सीधा खरीद अनुबंध पक्का करें (डेमो)'
                )}
              </h2>
              <button
                type="button"
                onClick={() => setLockContractModalOpen(false)}
                aria-label={t(
                  'Close lock contract dialog',
                  'अनुबंध संवाद बंद करें'
                )}
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#E8F5E9] border border-[#138808] p-3.5 rounded-lg text-xs text-black space-y-1.5 font-tabular">
              <div className="flex justify-between">
                <span className="font-semibold">
                  {t('Selected Channel:', 'चुना गया माध्यम:')}
                </span>
                <span className="font-extrabold text-[#000080]">
                  ITC Agri Direct Farmgate
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">
                  {t('Quantity × Rate:', 'मात्रा × भाव:')}
                </span>
                <span className="font-extrabold">
                  {arbitrageResult.quantityQuintals} Qtl ×{' '}
                  {formatINR(arbitrageInput.directPricePerQuintal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">
                  {t('Gross Contract Value:', 'कुल सकल मूल्य:')}
                </span>
                <span className="font-extrabold">
                  {formatINR(arbitrageResult.directGross)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">
                  {t('Net In-Pocket Payout:', 'शुद्ध भुगतान राशि:')}
                </span>
                <span className="font-extrabold text-[#138808] text-sm">
                  {formatINR(arbitrageResult.directNetPayout)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#138808]/30">
                <span className="font-semibold">
                  {t('50% Weighbridge UPI:', '50% धर्मकांटा तौल पर UPI:')}
                </span>
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
                {t('Back', 'पीछे')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setContractLocked(true);
                  setSelectedSaleOption('DIRECT_BUYER');
                  setLockContractModalOpen(false);
                  showToast(
                    t(
                      `Locked ${formatINR(
                        arbitrageResult.directNetPayout
                      )} contract (Simulated). Proceeding to Weighbridge & Escrow.`,
                      `${formatINR(
                        arbitrageResult.directNetPayout
                      )} का अनुबंध पक्का किया गया (डेमो)। तौल और एस्क्रो स्क्रीन पर जा रहे हैं।`
                    ),
                    'green'
                  );
                  navigate('/harvest-payments');
                }}
                className="px-4 py-2 rounded bg-[#138808] text-white text-xs font-extrabold"
              >
                {t(
                  'Confirm & Proceed to Weighbridge',
                  'पुष्टि करें और तौल/भुगतान पर जाएँ'
                )}
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
                {t(
                  'Verified Institutional Buyer Bids (Illustrative Market Feed)',
                  'सत्यापित संस्थागत खरीदार बोलियां (उदाहरण बाजार फ़ीड)'
                )}
              </h2>
              <button
                type="button"
                onClick={() => setAllBidsModalOpen(false)}
                aria-label={t(
                  'Close all bids modal',
                  'सभी बोलियों की सूची बंद करें'
                )}
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
                      {t('Expiry:', 'समाप्ति:')} {offer.bidExpiry} •{' '}
                      {t('Fee:', 'शुल्क:')}{' '}
                      {formatINR(offer.disclosedDeductions.platformFee)} •{' '}
                      {t('Transport:', 'परिवहन:')}{' '}
                      {formatINR(offer.disclosedDeductions.transport)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right font-tabular">
                      <span className="text-lg font-black text-[#138808] block">
                        {formatINR(offer.pricePerQuintal)}/
                        {t('qtl', 'क्विंटल')}
                      </span>
                      <span className="text-[10px] font-bold text-black">
                        {offer.demandMetricTons} MT {t('Demand', 'मांग')}
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
                          t(
                            `Loaded ${offer.buyerName} bid (${formatINR(
                              offer.pricePerQuintal
                            )}/qtl) into calculator.`,
                            `${offer.buyerName} की बोली (${formatINR(
                              offer.pricePerQuintal
                            )}/क्विंटल) कैलकुलेटर में लोड की गई।`
                          ),
                          'green'
                        );
                      }}
                      className="px-3 py-2 rounded bg-[#000080] text-white text-xs font-extrabold whitespace-nowrap"
                    >
                      {t('Use Bid', 'बोली चुनें')}
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
              {t('Close Bid Comparison', 'बोली तुलना बंद करें')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
