import {
  CropLedgerEvent,
  CropReadinessItem,
  ProcurementState,
} from '../types/cropToCash';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ScreeningOutcomeCategory =
  | 'CLEAR_HEALTHY'
  | 'DISEASE_DETECTED'
  | 'IMAGE_QUALITY_REJECTED'
  | 'UNSUPPORTED_CROP'
  | 'ABSTENTION_UNCERTAIN';

export interface ScreeningRequest {
  lotId?: string;
  imageFormat: 'jpeg' | 'png' | 'webp';
  imageBase64?: string;
  imageSizeBytes: number;
  cropDeclared?: string;
}

export interface ScreeningPrediction {
  className: string;
  classNameHi?: string;
  confidence: number; // Raw model confidence, uncalibrated unless calibratedConfidence is true
  scientificName?: string;
}

export interface CropScreeningResult {
  screeningId: string;
  lotId?: string;
  modelName: string;
  modelVersion: string;
  isMockOrDemo: boolean;
  timestamp: string;
  outcomeCategory: ScreeningOutcomeCategory;
  topClass: ScreeningPrediction | null;
  runnerUp: ScreeningPrediction | null;
  calibratedConfidence: boolean;
  abstentionReason?: string;
  explanation: {
    visualQualityScore: number;
    lightingAdequate: boolean;
    blurDetected: boolean;
    diagnosticNotes: string;
    safeExpertReferral: string;
  };
}

export interface PriceQuote {
  commodity: string;
  variety: string;
  grade: string;
  marketLocation: string;
  priceType: 'MSP_REFERENCE' | 'MANDI_MODAL' | 'DIRECT_BUYER_QUOTE';
  pricePerQuintal: number;
  minPricePerQuintal?: number;
  maxPricePerQuintal?: number;
  source: string;
  sourceTimestamp: string;
  retrievedAt: string;
  freshness: 'FRESH' | 'RECENT' | 'STALE' | 'REFERENCE_STATIC';
  verificationStatus: 'OFFICIAL_GOVERNMENT' | 'REGISTERED_BUYER' | 'SIMULATED_DEMO';
}

export interface ReturnEngineOption {
  optionKey: 'FCI_MSP' | 'MANDI' | 'DIRECT_BUYER' | 'DOWNSIDE_FALLBACK';
  optionTitle: string;
  unitPrice: number;
  grossAmount: number;
  deductions: {
    transportCost: number;
    loadingHandlingCost: number;
    mandiCessFee: number;
    platformFee: number;
    extraVisitCosts: number;
    expectedDeductions: number;
    totalDeductions: number;
  };
  netReturn: number;
  netRealizationPerQuintal: number;
  scenarioNotes: string;
}

export interface ReturnEngineEstimate {
  estimateId: string;
  calculationVersion: string;
  calculatedAt: string;
  lotId: string;
  acceptedQuantityQuintals: number;
  options: {
    fciMsp: ReturnEngineOption;
    mandi: ReturnEngineOption;
    directBuyer: ReturnEngineOption;
    downsideFallback: ReturnEngineOption;
  };
  bestOptionKey: string;
  reproducibleFormula: string;
}

export interface ProcurementAttempt {
  attemptId: string;
  lotId: string;
  attemptTimestamp: string;
  reporter: string;
  reporterRole: string;
  centreId: string;
  centreName: string;
  isCentreVerified: boolean;
  outcome: 'ACCEPTED' | 'REJECTED' | 'PENDING' | 'RESCHEDULED' | 'NOT_COMPLETED';
  outcomeReason?: string;
  documentReadiness: {
    farmerIdPresented: boolean;
    landRecordReady: boolean;
    bankPassbookReady: boolean;
    allDocumentsReady: boolean;
  };
}

export interface SaleRecord {
  saleId: string;
  lotId: string;
  buyerName: string;
  buyerType: 'GOVERNMENT_FCI' | 'MANDI_TRADER' | 'INSTITUTIONAL_BUYER';
  acceptedQuantityQuintals: number;
  actualPricePerQuintal: number;
  actualGrossAmount: number;
  actualDeductions: {
    transport: number;
    loading: number;
    handling: number;
    fees: number;
    discrepancyDeduction: number;
    totalDeductions: number;
  };
  actualNetAmount: number;
  paymentStatus:
    | 'AWAITING_PAYMENT'
    | 'FIRST_INSTALLMENT_PAID'
    | 'FULLY_SETTLED'
    | 'PAYMENT_FAILED';
  settledAt?: string;
  estimatedVsActualGap: {
    estimatedNet: number;
    actualNet: number;
    variance: number;
  };
}

export interface CropPassportHistoryEvent {
  eventId: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  eventType:
    | 'LOT_CREATED'
    | 'SCREENING_PERFORMED'
    | 'ESTIMATE_GENERATED'
    | 'PROCUREMENT_ATTEMPT'
    | 'SALE_RECORDED'
    | 'PAYMENT_STATUS_CHANGED'
    | 'VERIFICATION_AUDITED';
  summary: string;
  isVerified: boolean;
  details: Record<string, unknown>;
}

export const DEFAULT_CROP_READINESS: CropReadinessItem[] = [
  {
    id: 'bank-details',
    labelEn: 'Bank details ready (readiness only)',
    labelHi: 'बैंक विवरण तैयार (केवल तैयारी)',
    ready: false,
  },
  {
    id: 'registration',
    labelEn: 'Farmer registration details ready',
    labelHi: 'किसान पंजीकरण विवरण तैयार',
    ready: false,
  },
  {
    id: 'produce',
    labelEn: 'Produce quantity and grade noted',
    labelHi: 'फसल की मात्रा और ग्रेड दर्ज',
    ready: false,
  },
];

export interface ExtendedCropLotRecord {
  id: string;
  ownerEmail: string;
  ownerId: string;
  farmerName: string;
  cropName: string;
  variety: string;
  grade: string;
  quantityQuintals: number;
  harvestDate: string;
  surveyNumber: string;
  plotAreaHectares: number;
  screeningResults: CropScreeningResult[];
  latestEstimate?: ReturnEngineEstimate;
  procurementAttempts: ProcurementAttempt[];
  saleRecord?: SaleRecord;
  historyEvents: CropPassportHistoryEvent[];
  readiness: CropReadinessItem[];
  procurementState: ProcurementState;
  ledgerEvents: CropLedgerEvent[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Service Layer: Crop-to-Cash Business Logic
// ============================================================================

export class CropToCashService {
  /**
   * Deterministic financial calculation engine.
   * Net return = (accepted quantity × price) − transport − loading/handling − fees − extra-visit costs − expected deductions.
   *
   * Fixture 50-quintal verification:
   * - FCI/MSP reference: ₹2,585/qtl - ₹2,500 costs = ₹1,26,750 estimated net.
   * - Mandi: ₹2,300/qtl - ₹4,000 costs = ₹1,11,000 estimated net.
   * - Direct buyer: ₹2,350/qtl - ₹4,000 costs = ₹1,13,500 estimated net.
   * - Downside: FCI rejected; fallback to direct buyer with additional ₹1,000 trip = ₹1,12,500 estimated net.
   */
  public static calculateReturnEstimate(
    lotId: string,
    quantityQuintals: number,
    customOverrides?: {
      mspPrice?: number;
      mandiPrice?: number;
      directPrice?: number;
      fciTransportCosts?: number;
      mandiTotalCosts?: number;
      directTotalCosts?: number;
      downsideTripCost?: number;
    }
  ): ReturnEngineEstimate {
    const qty = Math.max(1, Number(quantityQuintals) || 50);

    const mspPrice = customOverrides?.mspPrice ?? 2585;
    const mandiPrice = customOverrides?.mandiPrice ?? 2300;
    const directPrice = customOverrides?.directPrice ?? 2350;

    // FCI / MSP Option
    const fciGross = Math.round(qty * mspPrice);
    const fciTransport = customOverrides?.fciTransportCosts ?? 2500;
    const fciDeductions = {
      transportCost: fciTransport,
      loadingHandlingCost: 0,
      mandiCessFee: 0,
      platformFee: 0,
      extraVisitCosts: 0,
      expectedDeductions: 0,
      totalDeductions: fciTransport,
    };
    const fciNet = fciGross - fciDeductions.totalDeductions;

    // Mandi Option
    const mandiGross = Math.round(qty * mandiPrice);
    const mandiTotalCosts = customOverrides?.mandiTotalCosts ?? 4000;
    const mandiDeductions = {
      transportCost: 2000,
      loadingHandlingCost: 1000,
      mandiCessFee: 1000,
      platformFee: 0,
      extraVisitCosts: 0,
      expectedDeductions: 0,
      totalDeductions: mandiTotalCosts,
    };
    const mandiNet = mandiGross - mandiDeductions.totalDeductions;

    // Direct Buyer Option
    const directGross = Math.round(qty * directPrice);
    const directTotalCosts = customOverrides?.directTotalCosts ?? 4000;
    const directDeductions = {
      transportCost: 2500,
      loadingHandlingCost: 1000,
      mandiCessFee: 0,
      platformFee: 500,
      extraVisitCosts: 0,
      expectedDeductions: 0,
      totalDeductions: directTotalCosts,
    };
    const directNet = directGross - directDeductions.totalDeductions;

    // Downside Option: FCI Rejected -> Re-routed to Direct Buyer + extra trip
    const extraTripCost = customOverrides?.downsideTripCost ?? 1000;
    const downsideTotalDeductions = directTotalCosts + extraTripCost;
    const downsideDeductions = {
      ...directDeductions,
      extraVisitCosts: extraTripCost,
      totalDeductions: downsideTotalDeductions,
    };
    const downsideNet = directGross - downsideTotalDeductions;

    const fciOpt: ReturnEngineOption = {
      optionKey: 'FCI_MSP',
      optionTitle: 'FCI / MSP Reference Procurement',
      unitPrice: mspPrice,
      grossAmount: fciGross,
      deductions: fciDeductions,
      netReturn: fciNet,
      netRealizationPerQuintal: Number((fciNet / qty).toFixed(2)),
      scenarioNotes:
        'Official MSP procurement centre. Strict FAQ/moisture specifications apply.',
    };

    const mandiOpt: ReturnEngineOption = {
      optionKey: 'MANDI',
      optionTitle: 'Local APMC Mandi Auction',
      unitPrice: mandiPrice,
      grossAmount: mandiGross,
      deductions: mandiDeductions,
      netReturn: mandiNet,
      netRealizationPerQuintal: Number((mandiNet / qty).toFixed(2)),
      scenarioNotes:
        'Immediate same-day sale with standard APMC mandi fee, handling, and logistics deductions.',
    };

    const directOpt: ReturnEngineOption = {
      optionKey: 'DIRECT_BUYER',
      optionTitle: 'Direct Institutional Buyer / FPO Aggregation',
      unitPrice: directPrice,
      grossAmount: directGross,
      deductions: directDeductions,
      netReturn: directNet,
      netRealizationPerQuintal: Number((directNet / qty).toFixed(2)),
      scenarioNotes:
        'Escrow-backed forward contract with farmgate/hub delivery confirmation.',
    };

    const downsideOpt: ReturnEngineOption = {
      optionKey: 'DOWNSIDE_FALLBACK',
      optionTitle: 'FCI Rejection Fallback to Direct Buyer',
      unitPrice: directPrice,
      grossAmount: directGross,
      deductions: downsideDeductions,
      netReturn: downsideNet,
      netRealizationPerQuintal: Number((downsideNet / qty).toFixed(2)),
      scenarioNotes:
        'Procurement at FCI rejected due to moisture or queue timeout; cargo diverted to local buyer with 1 extra transport leg.',
    };

    return {
      estimateId: `EST-${Date.now()}`,
      calculationVersion: 'v2.0-deterministic',
      calculatedAt: new Date().toISOString(),
      lotId,
      acceptedQuantityQuintals: qty,
      options: {
        fciMsp: fciOpt,
        mandi: mandiOpt,
        directBuyer: directOpt,
        downsideFallback: downsideOpt,
      },
      bestOptionKey: 'FCI_MSP',
      reproducibleFormula:
        'Net return = (accepted quantity × price) − transport − loading/handling − fees − extra-visit costs − expected deductions',
    };
  }

  /**
   * Safe crop screening mock/adapter.
   * Model inference is isolated behind this interface so ONNX Runtime can be plugged in.
   * Strictly abstains from prescribing synthetic pesticides.
   */
  public static screenCropImage(req: ScreeningRequest): CropScreeningResult {
    // Validate payload size (e.g. limit to 10MB)
    if (req.imageSizeBytes > 10 * 1024 * 1024) {
      return {
        screeningId: `SCR-${Date.now()}`,
        lotId: req.lotId,
        modelName: 'KisanSetu-Screening-Adapter',
        modelVersion: 'v1.0.0-mock',
        isMockOrDemo: true,
        timestamp: new Date().toISOString(),
        outcomeCategory: 'IMAGE_QUALITY_REJECTED',
        topClass: null,
        runnerUp: null,
        calibratedConfidence: false,
        abstentionReason: 'Image payload exceeds 10MB limit.',
        explanation: {
          visualQualityScore: 0.1,
          lightingAdequate: false,
          blurDetected: true,
          diagnosticNotes: 'File size exceeds maximum supported boundary.',
          safeExpertReferral:
            'Please re-capture with lower resolution or consult local Krishi Vigyan Kendra (KVK).',
        },
      };
    }

    if (!['jpeg', 'png', 'webp'].includes(req.imageFormat)) {
      return {
        screeningId: `SCR-${Date.now()}`,
        lotId: req.lotId,
        modelName: 'KisanSetu-Screening-Adapter',
        modelVersion: 'v1.0.0-mock',
        isMockOrDemo: true,
        timestamp: new Date().toISOString(),
        outcomeCategory: 'IMAGE_QUALITY_REJECTED',
        topClass: null,
        runnerUp: null,
        calibratedConfidence: false,
        abstentionReason: `Unsupported image format: ${req.imageFormat}`,
        explanation: {
          visualQualityScore: 0.2,
          lightingAdequate: false,
          blurDetected: false,
          diagnosticNotes: 'Only JPEG, PNG, or WebP images are supported.',
          safeExpertReferral: 'Upload a valid image format.',
        },
      };
    }

    // Explicitly labeled mock response with safe referral advice (never pesticide prescriptions)
    return {
      screeningId: `SCR-${Date.now()}`,
      lotId: req.lotId,
      modelName: 'KisanSetu-Screening-Adapter',
      modelVersion: 'v1.0.0-mock-demo',
      isMockOrDemo: true,
      timestamp: new Date().toISOString(),
      outcomeCategory: 'DISEASE_DETECTED',
      topClass: {
        className: 'Soybean Rust (Phakopsora pachyrhizi)',
        classNameHi: 'सोयाबीन रतुआ (फकोस्पोरा पचीरिजी)',
        confidence: 0.88,
        scientificName: 'Phakopsora pachyrhizi',
      },
      runnerUp: {
        className: 'Cercospora Leaf Blight',
        classNameHi: 'सर्कोस्पोरा लीफ ब्लाइट',
        confidence: 0.08,
        scientificName: 'Cercospora kikuchii',
      },
      calibratedConfidence: false, // Explicitly false since this is uncalibrated mock inference
      explanation: {
        visualQualityScore: 0.85,
        lightingAdequate: true,
        blurDetected: false,
        diagnosticNotes:
          'Visual inspection indicates typical reddish-brown foliar pustules. Pre-Harvest Interval (PHI) compliance mandatory before any harvest scheduling.',
        safeExpertReferral:
          'Automated systems do not prescribe synthetic pesticides from imagery alone. Please consult your Block Agriculture Extension Officer or visit the nearest Krishi Vigyan Kendra (KVK) for an official field agronomy prescription.',
      },
    };
  }
}

// In-Memory storage of Extended Crop Lots keyed by lot ID
const extendedCropLots = new Map<string, ExtendedCropLotRecord>();

function seedDefaultDemoLot(
  id: string,
  cropName: string,
  variety: string,
  quantityQuintals: number
): void {
  const now = '2026-10-18T00:00:00.000Z';
  extendedCropLots.set(id, {
    id,
    ownerEmail: 'farmer@kisanspo.in',
    ownerId: 'USR-FARMER-01',
    farmerName: 'Rameshwar Patidar (Demo Farmer)',
    cropName,
    variety,
    grade: 'FAQ Grade A',
    quantityQuintals,
    harvestDate: 'Oct 2026',
    surveyNumber: 'Survey #104/2, Khandwa',
    plotAreaHectares: 4.0,
    screeningResults: [],
    procurementAttempts: [],
    historyEvents: [
      {
        eventId: `EV-SEED-${id}`,
        timestamp: now,
        actor: 'farmer@kisanspo.in',
        actorRole: 'farmer',
        eventType: 'LOT_CREATED',
        summary: `Seeded default demo crop lot ${id} (${cropName}).`,
        isVerified: true,
        details: { cropName, quantityQuintals },
      },
    ],
    readiness: DEFAULT_CROP_READINESS.map((item) => ({ ...item })),
    procurementState: 'PLANNED',
    ledgerEvents: [
      {
        eventId: `ev-init-${id}`,
        lotId: id,
        type: 'READINESS',
        occurredAt: now,
        source: 'DEMO',
        verification: 'SEEDED_DEMO_LOT',
        summary: `Crop-to-cash ledger initialized for ${cropName} (${id}).`,
        payload: { initialized: true },
      },
    ],
    createdAt: now,
    updatedAt: now,
  });
}

seedDefaultDemoLot('KS-MP-2025-089', 'Sharbati Wheat', 'HI-1544 Sharbati', 50);
seedDefaultDemoLot('KS-MP-2025-094', 'Soybean', 'JS-2034 High Oil', 42);
seedDefaultDemoLot('KS-MH-2025-210', 'Medium Staple Cotton', 'Bt-Hybrid H4', 35);

export function getExtendedLot(
  lotId: string
): ExtendedCropLotRecord | undefined {
  return extendedCropLots.get(lotId);
}

export function saveExtendedLot(lot: ExtendedCropLotRecord): void {
  extendedCropLots.set(lot.id, lot);
}

export function getAllExtendedLots(): ExtendedCropLotRecord[] {
  return Array.from(extendedCropLots.values());
}
