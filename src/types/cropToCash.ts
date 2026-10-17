export type CropToCashSource =
  | 'VERIFIED'
  | 'ESTIMATED'
  | 'CACHED'
  | 'MANUAL'
  | 'DEMO';

export type SellingOptionKind = 'FCI_MSP_REFERENCE' | 'MANDI' | 'DIRECT_BUYER';

export type ProcurementState =
  | 'PLANNED'
  | 'VISITED'
  | 'ACCEPTED'
  | 'PENDING'
  | 'REJECTED'
  | 'RESCHEDULED'
  | 'NOT_COMPLETED';

export interface SellingQuote {
  option: SellingOptionKind;
  lotId: string;
  pricePerQuintal: number;
  commodity: string;
  grade: string;
  market: string;
  source: string;
  timestamp: string;
  freshness: string;
  provenance: CropToCashSource;
  minimumRate?: number;
  maximumRate?: number;
  modalRate?: number;
}

export interface SellingOptionEstimate {
  option: SellingOptionKind;
  gross: number;
  deductions: number;
  net: number;
}

export interface CropLedgerEvent {
  eventId: string;
  lotId: string;
  type: 'READINESS' | 'COMPARISON' | 'PROCUREMENT' | 'SALE';
  occurredAt: string;
  source: CropToCashSource;
  verification: string;
  summary: string;
  payload: Record<string, string | number | boolean>;
}

export type NewCropLedgerEvent = Omit<
  CropLedgerEvent,
  'eventId' | 'occurredAt' | 'type'
> & {
  type: 'READINESS' | 'PROCUREMENT' | 'SALE';
};

export interface ComparisonResult {
  lotId: string;
  calculationVersion: string;
  estimates: SellingOptionEstimate[];
  downsideNet: number | null;
  event: CropLedgerEvent;
}

export interface CropReadinessItem {
  id: string;
  labelEn: string;
  labelHi: string;
  ready: boolean;
}

export interface CropToCashSnapshot {
  lotId: string;
  events: CropLedgerEvent[];
  readiness: CropReadinessItem[];
  procurementState: ProcurementState;
}
