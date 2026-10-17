export type UserRole = 'farmer' | 'agent' | 'buyer';

export type Language = 'en' | 'hi';

export type OnboardingStatus = 'INCOMPLETE' | 'COMPLETED' | 'SKIPPED';

export type VerificationStatus =
  | 'INDEPENDENTLY_VERIFIED'
  | 'LABORATORY_TESTED'
  | 'DOCUMENT_VERIFIED'
  | 'FARMER_DECLARED'
  | 'VERIFICATION_PENDING';

export type PaymentStatus =
  | 'AWAITING_PAYMENT'
  | 'PROCESSING'
  | 'FIRST_INSTALLMENT_PAID'
  | 'DELIVERY_CONFIRMATION_PENDING'
  | 'REMAINING_PAYMENT_LOCKED'
  | 'FULLY_SETTLED'
  | 'PAYMENT_FAILED'
  | 'DISPUTE_OPENED';

export type DeliveryConfirmationStatus =
  | 'IN_TRANSIT'
  | 'AT_WEIGHBRIDGE'
  | 'WEIGHED_AND_SEALED'
  | 'DELIVERED_AT_MILL'
  | 'DISPUTED';

export interface Farmer {
  id: string;
  name: string;
  nameHi: string;
  uid: string;
  preferredLanguage: Language;
  village: string;
  district: string;
  state: string;
  authorizedProxyIds: string[];
  authorizedProxyName: string;
}

export interface GpsCoordinate {
  id: string;
  label: string;
  lat: number;
  lng: number;
  latDisplay: string;
  lngDisplay: string;
  isReference?: boolean;
}

export interface FarmPlot {
  id: string;
  cropLotId: string;
  surveyNumber: string;
  areaHectares: number;
  locationLabel: string;
  centroidLat: string;
  centroidLng: string;
  boundaryCoordinates: GpsCoordinate[];
  soilMoisturePercent: number;
  soilSensorId: string;
  pumpRuntimeDisplay: string;
  pumpLitresDelivered: number;
}

export interface VerificationEvidence {
  id: string;
  labName: string;
  certificateNumber: string;
  testedDate: string;
  mrlStatus: 'ZERO_EXCEEDANCE' | 'PENDING_LAB' | 'SELF_DECLARED';
  sha256Hash: string;
  moisturePercent: number;
  foreignMatterPercent: number;
}

export interface CropLot {
  id: string;
  shortCode: string;
  farmerId: string;
  farmerName: string;
  farmerNameHi: string;
  cropName: string;
  cropNameHi: string;
  variety: string;
  varietyHi: string;
  grade: string;
  quantityQuintals: number;
  harvestDate: string;
  plotAreaHectares: number;
  surveyNumber: string;
  verificationStatus: VerificationStatus;
  evidenceIds: string[];
  evidence: VerificationEvidence;
  mandiPricePerQuintal: number;
  directBuyerPricePerQuintal: number;
}

export interface BuyerOffer {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerNameHi: string;
  cropLotId: string;
  commodityName: string;
  pricePerQuintal: number;
  changePercent: string;
  demandMetricTons: number;
  pickupIncluded: boolean;
  bidExpiry: string;
  disclosedDeductions: {
    transport: number;
    loading: number;
    platformFee: number;
    commissionPercent: number;
  };
  termsStatus: 'ESCROW_BACKED' | 'OPEN_TENDER' | 'LOCKED_CONTRACT';
  deliveryLocation: string;
}

export interface Pickup {
  id: string;
  cropLotId: string;
  vehicleId: string;
  truckType: string;
  queueToken: string;
  scheduledTime: string;
  estimatedWaitMinutes: number;
  pickupStatus: 'POOLED_DISPATCH' | 'AT_GATE' | 'LOADING' | 'COMPLETED';
  originHub: string;
  destinationHub: string;
  stops: {
    name: string;
    farmerName: string;
    quantityQuintals: number;
    crop: string;
    status: string;
  }[];
  speedKmh: number;
  fastagBalance: number;
  freightSavingsPercent: number;
  etaDisplay: string;
}

export interface Weighment {
  id: string;
  pickupId: string;
  cropLotId: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netPayableWeightKg: number;
  kardaDeductionKg: number;
  deductionAmount: number;
  evidenceReference: string;
  terminalId: string;
  timestamp: string;
  verificationStatus: 'VERIFIED_ZERO_DISCREPANCY' | 'PENDING_TARE' | 'UNDER_AUDIT';
}

export interface Payment {
  id: string;
  cropLotId: string;
  farmerName: string;
  totalPayableAmount: number;
  firstInstallment: number;
  remainingAmount: number;
  status: PaymentStatus;
  paymentReference: string;
  escrowLockReference: string;
  bankNode: string;
  deliveryConfirmationStatus: DeliveryConfirmationStatus;
  updatedAt: string;
}

export interface ArbitrageCalculationInput {
  quantityQuintals: number;
  mandiPricePerQuintal: number;
  directPricePerQuintal: number;
  mandiTransportCost: number;
  mandiLoadingCost: number;
  mandiCessPercent: number;
  directPlatformFee: number;
  directTransportCost: number;
}

export interface ArbitrageCalculationResult {
  isValid: boolean;
  validationMessage?: string;
  quantityQuintals: number;
  mandiGross: number;
  mandiCessAmount: number;
  mandiTotalDeductions: number;
  mandiNetPayout: number;
  mandiNetPerQuintal: number;
  directGross: number;
  directTotalDeductions: number;
  directNetPayout: number;
  directNetPerQuintal: number;
  netDifference: number;
  percentageGain: number;
  firstInstallment50: number;
  remainingInstallment50: number;
}

export interface AdvisorySpecimen {
  id: string;
  specimenCode: string;
  cropName: string;
  diseaseName: string;
  diseaseNameHi: string;
  scientificName: string;
  matchConfidence: number;
  phiDaysRemaining: number;
  restrictedChemicalName: string;
  remedyName: string;
  remedyType: string;
  dosage: string;
  remedyPhiDays: number;
  hindiTranscript: string;
  englishTranscript: string;
  imageUrl: string;
}
