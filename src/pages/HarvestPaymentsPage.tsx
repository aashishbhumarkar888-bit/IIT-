import React, { useState } from 'react';
import { useKisan } from '../context/KisanContext';
import { ACTIVE_PICKUP, ACTIVE_WEIGHMENT } from '../data/kisanData';
import { formatINR } from '../services/kisanService';
import { PaymentStatus } from '../types/kisan';

interface HarvestPaymentsPageProps {
  compactMode?: boolean;
}

const PAYMENT_STATUS_LIST: {
  status: PaymentStatus;
  labelEn: string;
  labelHi: string;
  tone: 'green' | 'blue' | 'saffron';
  description: string;
}[] = [
  {
    status: 'AWAITING_PAYMENT',
    labelEn: 'Awaiting Payment',
    labelHi: 'भुगतान की प्रतीक्षा',
    tone: 'blue',
    description:
      'Simulated State: Weighment queued at Gate #A-14; escrow release awaiting signed weigh-slip.',
  },
  {
    status: 'PROCESSING',
    labelEn: 'Processing UPI Tranche',
    labelHi: 'भुगतान प्रक्रियाधीन',
    tone: 'blue',
    description:
      'Simulated State: Weigh-slip signed; NPCI UPI AutoPay instruction queued at bank node.',
  },
  {
    status: 'FIRST_INSTALLMENT_PAID',
    labelEn: 'First Installment Paid (50%)',
    labelHi: 'प्रथम 50% किस्त भुगतान संपन्न',
    tone: 'green',
    description:
      'Simulated State: 50% (₹26,875) credited on weigh-slip sign-off; remaining 50% locked for mill reception.',
  },
  {
    status: 'DELIVERY_CONFIRMATION_PENDING',
    labelEn: 'Delivery Confirmation Pending',
    labelHi: 'मिल डिलीवरी पुष्टि लंबित',
    tone: 'blue',
    description:
      'Simulated State: Truck MP-12-GA-4482 arrived at Indore processing hub; awaiting silo gate unload receipt.',
  },
  {
    status: 'REMAINING_PAYMENT_LOCKED',
    labelEn: 'Remaining 50% Payment Locked',
    labelHi: 'शेष 50% एस्क्रो में सुरक्षित',
    tone: 'blue',
    description:
      'Simulated State: Second 50% tranche (₹26,875) held in escrow lock pending 24h quality & moisture audit.',
  },
  {
    status: 'FULLY_SETTLED',
    labelEn: 'Fully Settled (100% Released)',
    labelHi: 'पूर्ण भुगतान संपन्न (100%)',
    tone: 'green',
    description:
      'Simulated State: Both 50% installments (₹53,750 total) settled after mill delivery confirmation.',
  },
  {
    status: 'PAYMENT_FAILED',
    labelEn: 'Payment Failed (Retry Queued)',
    labelHi: 'भुगतान विफल (पुनः प्रयास)',
    tone: 'saffron',
    description:
      'Simulated State: Bank switch timeout on UPI settlement; escrow funds remain locked for automatic retry.',
  },
  {
    status: 'DISPUTE_OPENED',
    labelEn: 'Dispute Opened (Weight/Quality Hold)',
    labelHi: 'विवाद दर्ज (जांच अधीन)',
    tone: 'saffron',
    description:
      'Simulated State: Grower or buyer raised a weighment/refraction dispute; FPO Registrar arbitration active.',
  },
];

export const HarvestPaymentsPage: React.FC<HarvestPaymentsPageProps> = ({
  compactMode = false,
}) => {
  const {
    payment,
    setPaymentStatus,
    arbitrageInput,
    arbitrageResult,
    navigate,
    showToast,
  } = useKisan();

  const [slipModalOpen, setSlipModalOpen] = useState<boolean>(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState<boolean>(false);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [evidenceModalOpen, setEvidenceModalOpen] = useState<boolean>(false);

  const currentStatusMeta =
    PAYMENT_STATUS_LIST.find((s) => s.status === payment.status) ||
    PAYMENT_STATUS_LIST[2];

  // Keep weight consistent with 2,500.0 Kg sample (25 quintals = 2,500 kg)
  const netKg =
    arbitrageResult.isValid && arbitrageResult.quantityQuintals > 0
      ? arbitrageResult.quantityQuintals * 100
      : ACTIVE_WEIGHMENT.netPayableWeightKg;
  const tareKg = ACTIVE_WEIGHMENT.tareWeightKg;
  const grossKg = netKg + tareKg;

  return (
    <div className="w-full bg-white text-black">
      <div
        className={`mx-auto w-full ${
          compactMode ? 'p-3' : 'max-w-6xl px-4 sm:px-6 py-4'
        }`}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#000080]/15">
          <div className="flex items-center gap-2.5">
            {!compactMode && (
              <button
                type="button"
                onClick={() => navigate('/market-comparison')}
                aria-label="Back to Market Comparison"
                className="w-10 h-10 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 flex items-center justify-center text-[#000080] hover:bg-[#000080] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  arrow_back
                </span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-extrabold text-[#000080] tracking-tight">
                  Weighbridge &amp; 50-50 Instant UPI Escrow
                </h1>
                <span className="px-2 py-0.5 rounded bg-[#E8EAF6] text-[#000080] border border-[#000080]/30 text-[10px] font-extrabold uppercase">
                  Illustrative Transaction Record
                </span>
              </div>
              <span className="text-xs text-black font-bold font-hindi block">
                डिजिटल तौल एवं 50-50 सुरक्षित एस्क्रो भुगतान
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEvidenceModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-[#E8EAF6] text-[#000080] border border-[#000080]/30 text-xs font-extrabold flex items-center gap-1 min-h-[38px] hover:bg-[#000080] hover:text-white"
            >
              <span className="material-symbols-outlined text-[16px]">
                photo_library
              </span>
              <span>Weighbridge Evidence</span>
            </button>
          </div>
        </div>

        {/* Main Responsive Grid */}
        <div
          className={`mt-4 grid grid-cols-1 ${
            compactMode ? 'gap-3.5' : 'lg:grid-cols-12 gap-5 items-start'
          }`}
        >
          {/* LEFT COLUMN (6 cols on desktop): Gate-Pass Queue + Digital Sensor Scale + Weighbridge Evidence */}
          <div
            className={`flex flex-col gap-4 ${
              compactMode ? '' : 'lg:col-span-6'
            }`}
          >
            {/* 1. Digital Gate-Pass Queue Card */}
            <div className="bg-[#E8EAF6] p-4 rounded-xl border-2 border-[#000080]/30 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-extrabold text-[#000080]">
                  Gate Token (प्रवेश टोकन)
                </span>
                <span className="text-3xl sm:text-4xl font-black font-tabular text-[#138808] leading-tight mt-0.5">
                  {ACTIVE_PICKUP.queueToken}
                </span>
                <span className="text-xs text-black font-extrabold font-tabular mt-0.5">
                  Est. Waiting: {ACTIVE_PICKUP.estimatedWaitMinutes} Minutes
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="px-2.5 py-1 rounded bg-white text-[#000080] border border-[#000080] font-tabular font-extrabold text-xs">
                  {ACTIVE_PICKUP.vehicleId}
                </span>
                <span className="text-sm font-extrabold text-[#000080] mt-1.5">
                  ITC Agri Indore
                </span>
                <span className="text-xs text-[#138808] font-extrabold">
                  Khandwa Central Hub
                </span>
              </div>
            </div>

            {/* 2. Weighbridge Documentary Scale Display */}
            <div className="bg-[#00003C] text-white p-4 sm:p-5 rounded-xl border-2 border-[#000080] shadow-md flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider text-white font-tabular font-extrabold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#9DF6B9] text-[18px]">
                    scale
                  </span>
                  DIGITAL SENSOR SCALE ({ACTIVE_WEIGHMENT.terminalId})
                </span>
                <span className="px-2.5 py-0.5 rounded bg-[#138808] text-white text-[11px] font-extrabold border border-white/30">
                  Zero Karda Deduction
                </span>
              </div>

              {/* Big Weight Readout */}
              <div className="text-center py-3 bg-[#000080] rounded-lg border border-white/20">
                <span className="text-3xl sm:text-5xl font-tabular font-black text-[#9DF6B9] tracking-tight block">
                  {netKg.toLocaleString('en-IN', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  Kg
                </span>
                <span className="text-xs text-white font-extrabold font-hindi block mt-1">
                  Verified Net Weight / प्रमाणित शुद्ध तौल (Sample Record)
                </span>
              </div>

              {/* Gross / Tare / Net Breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 text-center font-tabular text-xs">
                <div className="bg-[#000080]/60 p-2 rounded">
                  <span className="text-white/90 text-[10px] uppercase font-bold block">
                    Gross Weight
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    {grossKg.toLocaleString('en-IN')} Kg
                  </span>
                </div>
                <div className="bg-[#000080]/60 p-2 rounded">
                  <span className="text-white/90 text-[10px] uppercase font-bold block">
                    Tare Weight
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    {tareKg.toLocaleString('en-IN')} Kg
                  </span>
                </div>
                <div className="bg-[#138808] p-2 rounded border border-[#9DF6B9]">
                  <span className="text-[#9DF6B9] text-[10px] uppercase font-extrabold block">
                    Net ({arbitrageResult.quantityQuintals || 25} Qtl)
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    {netKg.toLocaleString('en-IN')} Kg
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Weighbridge Documentary Evidence Summary Card */}
            {!compactMode && (
              <div className="bg-white rounded-xl p-4 border-2 border-[#000080]/25 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#000080] text-[20px]">
                      fact_check
                    </span>
                    <h3 className="text-sm font-extrabold text-[#000080]">
                      Weighbridge Evidence &amp; Karda Status
                    </h3>
                  </div>
                  <span className="text-[11px] font-tabular font-bold text-[#138808]">
                    Ref: {ACTIVE_WEIGHMENT.evidenceReference}
                  </span>
                </div>

                {/* Schematic Weighbridge Evidence Diagram */}
                <div className="w-full bg-[#E8EAF6] rounded-lg p-3 border border-[#000080]/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#000080] text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[26px]">
                        local_shipping
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="font-extrabold text-[#000080] block">
                        Vehicle {ACTIVE_PICKUP.vehicleId} on Platform #104
                      </span>
                      <span className="text-black font-semibold block">
                        Karda / Moisture Cut: 0.0 Kg (Waived under Grade-A
                        Direct Contract)
                      </span>
                      <span className="text-[11px] text-[#006B3C] font-bold font-tabular block">
                        Timestamp: {ACTIVE_WEIGHMENT.timestamp}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEvidenceModalOpen(true)}
                    className="px-3 py-1.5 rounded bg-[#000080] text-white text-xs font-extrabold shrink-0"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (6 cols on desktop): 3-Stage 50-50 Escrow Visualization + Payment State Simulator + Actions */}
          <div
            className={`flex flex-col gap-4 ${
              compactMode ? '' : 'lg:col-span-6'
            }`}
          >
            {/* 4. 3-STAGE ESCROW PAYMENT VISUALIZATION (50-50 Split) */}
            <div className="bg-white p-4 rounded-xl border-2 border-[#000080] shadow-sm flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#000080]/15">
                <div>
                  <span className="text-xs uppercase font-extrabold text-[#000080] block">
                    50-50 Escrow Settlement (Illustrative Record)
                  </span>
                  <span className="text-[11px] font-bold text-black font-hindi">
                    50% तौल पर तुरंत • 50% मिल पहुंचने पर
                  </span>
                </div>
                <span className="font-tabular text-base sm:text-lg font-black text-[#000080] bg-[#E8EAF6] px-2.5 py-1 rounded border border-[#000080]/30">
                  Total: {formatINR(payment.totalPayableAmount)}
                </span>
              </div>

              {/* Active Payment Status Banner */}
              <div
                className={`p-3 rounded-lg border-2 flex items-start justify-between gap-2 ${
                  currentStatusMeta.tone === 'saffron'
                    ? 'bg-[#FF9933] text-black border-black'
                    : currentStatusMeta.tone === 'green'
                    ? 'bg-[#E8F5E9] text-black border-[#138808]'
                    : 'bg-[#E8EAF6] text-black border-[#000080]'
                }`}
              >
                <div>
                  <span className="text-xs font-extrabold uppercase block">
                    Current Status: {currentStatusMeta.labelEn} (
                    {currentStatusMeta.labelHi})
                  </span>
                  <p className="text-xs font-semibold mt-0.5 leading-snug">
                    {currentStatusMeta.description}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded bg-black text-white text-[10px] font-extrabold uppercase shrink-0">
                  SIMULATED
                </span>
              </div>

              {/* Stage 1: Contract Escrow Release */}
              <div className="flex items-center gap-2.5 p-3 bg-[#E8F5E9] border border-[#138808] rounded-lg">
                <span className="material-symbols-outlined text-[#138808] text-[20px]">
                  check_circle
                </span>
                <div className="flex-1">
                  <span className="text-xs font-extrabold text-black block">
                    Stage 1: Buyer Funds Locked in Escrow
                  </span>
                  <span className="text-[11px] text-black font-semibold block">
                    {payment.bankNode} • Ref: {payment.escrowLockReference}
                  </span>
                </div>
                <span className="font-tabular text-xs font-extrabold text-[#138808] bg-white px-2 py-0.5 rounded border border-[#138808]">
                  Verified
                </span>
              </div>

              {/* Stage 2: 50% Instant UPI Paid */}
              <div
                className={`flex items-center gap-2.5 p-3 rounded-lg border-2 ${
                  payment.status === 'AWAITING_PAYMENT' ||
                  payment.status === 'PAYMENT_FAILED'
                    ? 'bg-[#FFDCC2] text-black border-[#FF9933]'
                    : 'bg-[#138808] text-white border-[#006B3C]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  bolt
                </span>
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-extrabold block">
                    Stage 2: 50% Instant UPI Released
                  </span>
                  <span
                    className={`text-[11px] font-semibold block ${
                      payment.status === 'AWAITING_PAYMENT' ||
                      payment.status === 'PAYMENT_FAILED'
                        ? 'text-black'
                        : 'text-[#9DF6B9]'
                    }`}
                  >
                    Paid on Weigh-Slip Sign-Off ({payment.paymentReference})
                  </span>
                </div>
                <span className="font-tabular text-base sm:text-lg font-black">
                  {formatINR(payment.firstInstallment)}
                </span>
              </div>

              {/* Stage 3: 50% Locked for 24h Mill Delivery */}
              <div
                className={`flex items-center gap-2.5 p-3 rounded-lg border-2 ${
                  payment.status === 'FULLY_SETTLED'
                    ? 'bg-[#138808] text-white border-[#006B3C]'
                    : 'bg-[#000080] text-white border-[#00003C]'
                }`}
              >
                <span className="material-symbols-outlined text-[#9DF6B9] text-[20px]">
                  {payment.status === 'FULLY_SETTLED'
                    ? 'done_all'
                    : 'lock_clock'}
                </span>
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-extrabold block">
                    Stage 3: 50% Mill Reception Lock
                  </span>
                  <span className="text-[11px] text-[#9DF6B9] font-semibold block">
                    {payment.status === 'FULLY_SETTLED'
                      ? 'Released after Mill Unload Confirmation'
                      : 'Auto-unlock in < 24h upon Mill Gate Delivery'}
                  </span>
                </div>
                <span className="font-tabular text-base sm:text-lg font-black text-[#9DF6B9]">
                  {formatINR(payment.remainingAmount)}
                </span>
              </div>

              {/* Math Consistency Note */}
              <p className="text-[11px] text-black font-tabular font-bold text-center bg-[#E8EAF6] py-1.5 px-2 rounded">
                {arbitrageResult.quantityQuintals || 25} Quintals ×{' '}
                {formatINR(arbitrageInput.directPricePerQuintal)}/qtl ={' '}
                {formatINR(payment.totalPayableAmount)} Gross • 50% ={' '}
                {formatINR(payment.firstInstallment)}
              </p>
            </div>

            {/* 5. Interactive Payment & Delivery State Simulator (Local Prototype Demonstration) */}
            {!compactMode && (
              <div className="bg-[#E8EAF6] p-4 rounded-xl border-2 border-[#000080]/30 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-[#000080]">
                    Prototype Lifecycle Simulator (All 8 Payment States)
                  </span>
                  <span className="text-[10px] font-extrabold bg-white text-[#000080] px-2 py-0.5 rounded border border-[#000080]/30">
                    Simulated Events Only
                  </span>
                </div>
                <p className="text-[11px] text-black font-medium">
                  Note: Frontend demonstration controls simulate local state
                  transitions and do not execute external banking or hold live
                  escrow funds.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PAYMENT_STATUS_LIST.map((item) => {
                    const active = payment.status === item.status;
                    return (
                      <button
                        key={item.status}
                        type="button"
                        onClick={() => setPaymentStatus(item.status)}
                        className={`p-2 rounded text-[11px] font-extrabold text-left border transition-colors min-h-[40px] ${
                          active
                            ? item.tone === 'saffron'
                              ? 'bg-[#FF9933] text-black border-black shadow-sm'
                              : 'bg-[#000080] text-white border-black shadow-sm'
                            : 'bg-white text-black border-[#000080]/30 hover:bg-[#E8F5E9]'
                        }`}
                      >
                        {item.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trust & Security Strip + Primary Actions */}
            <div className="bg-white p-2.5 rounded-lg border border-[#000080]/30 text-center">
              <span className="text-xs font-extrabold text-[#000080] block">
                Secure • Transparent • Farmer First
              </span>
              <span className="text-xs font-bold text-[#138808] font-hindi block">
                सुरक्षित • पारदर्शी • किसान प्रथम
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSlipModalOpen(true)}
                className="w-full min-h-[48px] bg-[#000080] hover:bg-[#00003C] text-white py-2.5 px-4 rounded-lg text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  receipt_long
                </span>
                <span>Download Signed Slip</span>
              </button>

              <button
                type="button"
                onClick={() => setDisputeModalOpen(true)}
                className="w-full min-h-[48px] bg-[#FF9933] hover:bg-[#FFDCC2] text-black border-2 border-black py-2.5 px-4 rounded-lg text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  gavel
                </span>
                <span>Raise Weighment / Payment Dispute</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: SIGNED WEIGHBRIDGE & ESCROW SLIP */}
      {slipModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="slip-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-3 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="slip-modal-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Digital Weigh-Slip &amp; Escrow Receipt (Illustrative)
              </h2>
              <button
                type="button"
                onClick={() => setSlipModalOpen(false)}
                aria-label="Close signed slip dialog"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 text-xs font-tabular space-y-1.5 text-black">
              <div className="flex justify-between">
                <span className="font-bold">Slip Reference:</span>
                <span className="font-extrabold text-[#000080]">
                  {ACTIVE_WEIGHMENT.evidenceReference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Gate Token &amp; Truck:</span>
                <span className="font-extrabold">
                  {ACTIVE_PICKUP.queueToken} • {ACTIVE_PICKUP.vehicleId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Gross / Tare / Net Weight:</span>
                <span className="font-extrabold text-[#138808]">
                  {grossKg} Kg / {tareKg} Kg / {netKg} Kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Karda Deduction:</span>
                <span className="font-extrabold text-[#138808]">
                  0.0 Kg (Zero Karda Verified)
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[#000080]/20">
                <span className="font-bold">Total Payable Value:</span>
                <span className="font-extrabold text-[#000080]">
                  {formatINR(payment.totalPayableAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">1st Installment (50%):</span>
                <span className="font-extrabold text-[#138808]">
                  {formatINR(payment.firstInstallment)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">2nd Installment (50%):</span>
                <span className="font-extrabold text-[#000080]">
                  {formatINR(payment.remainingAmount)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSlipModalOpen(false);
                  showToast(
                    'Downloaded illustrative weigh-slip receipt summary.',
                    'green'
                  );
                }}
                className="px-4 py-2 rounded bg-[#138808] text-white text-xs font-extrabold"
              >
                Save Receipt Copy
              </button>
              <button
                type="button"
                onClick={() => setSlipModalOpen(false)}
                className="px-4 py-2 rounded bg-[#000080] text-white text-xs font-extrabold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: WEIGHBRIDGE EVIDENCE */}
      {evidenceModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wb-evidence-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="wb-evidence-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Weighbridge RS232 Telemetry Evidence (Demo)
              </h2>
              <button
                type="button"
                onClick={() => setEvidenceModalOpen(false)}
                aria-label="Close weighbridge evidence"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#00003C] text-white rounded-lg p-4 flex flex-col items-center text-center gap-2 border border-[#000080]">
              <span className="material-symbols-outlined text-[#9DF6B9] text-[42px]">
                scale
              </span>
              <span className="text-sm font-extrabold">
                Khandwa Central Hub — Terminal #104
              </span>
              <span className="text-xs font-tabular text-[#9DF6B9]">
                RS232 Serial Frame: ST,GS,+05420.0kg | TR,+02920.0kg |
                NT,+02500.0kg
              </span>
              <span className="text-[11px] text-white/90">
                Vehicle Plate OCR: {ACTIVE_PICKUP.vehicleId} • Token:{' '}
                {ACTIVE_PICKUP.queueToken}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setEvidenceModalOpen(false)}
              className="w-full py-2.5 rounded bg-[#000080] text-white text-xs font-extrabold"
            >
              Close Evidence View
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: DISPUTE ACTION */}
      {disputeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispute-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-black rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="dispute-modal-title"
                className="text-base font-extrabold text-[#371A00]"
              >
                Open Weighment / Escrow Settlement Dispute
              </h2>
              <button
                type="button"
                onClick={() => setDisputeModalOpen(false)}
                aria-label="Close dispute dialog"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-black font-semibold">
              Opening a dispute places a simulated hold on the remaining escrow
              milestone and notifies the FPO Mandi Registrar.
            </p>

            <label
              htmlFor="dispute-reason-input"
              className="text-xs font-extrabold text-[#000080]"
            >
              Describe Dispute Reason (तौल या भुगतान शिकायत):
            </label>
            <textarea
              id="dispute-reason-input"
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g., Tare weight discrepancy or delayed second installment..."
              className="w-full p-2.5 rounded border-2 border-[#000080] text-xs text-black"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisputeModalOpen(false)}
                className="px-4 py-2 rounded border border-[#000080] text-[#000080] text-xs font-extrabold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentStatus('DISPUTE_OPENED', 'DISPUTED');
                  setDisputeModalOpen(false);
                }}
                className="px-4 py-2 rounded bg-[#FF9933] text-black border border-black text-xs font-extrabold"
              >
                Log Simulated Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
