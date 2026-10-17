import {
  CropReadinessItem,
  CropLedgerEvent,
  SellingOptionEstimate,
  ComparisonResult,
  CropToCashSnapshot,
  NewCropLedgerEvent,
  ProcurementState,
  SellingQuote,
  CropScreeningResult,
  ScreeningRequestPayload,
} from '../types/cropToCash';
import {
  calculateSellingOptions,
  SellingCosts,
} from './cropToCashCalculations';

export interface CropToCashAdapter {
  getSnapshot(lotId: string): Promise<CropToCashSnapshot>;
  getQuotes(lotId: string): Promise<SellingQuote[]>;
  recordComparison(
    lotId: string,
    quantityQtl: number,
    costs: SellingCosts
  ): Promise<ComparisonResult>;
  appendEvent(event: NewCropLedgerEvent): Promise<CropLedgerEvent>;
  screenImage(
    lotId: string,
    payload: ScreeningRequestPayload
  ): Promise<CropScreeningResult>;
}

export class CropToCashApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = 'CropToCashApiError';
  }
}

const SOURCE_VALUES = [
  'VERIFIED',
  'ESTIMATED',
  'CACHED',
  'MANUAL',
  'DEMO',
] as const;
const EVENT_TYPES = ['READINESS', 'COMPARISON', 'PROCUREMENT', 'SALE'] as const;
const PROCUREMENT_VALUES = [
  'PLANNED',
  'VISITED',
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'RESCHEDULED',
  'NOT_COMPLETED',
] as const;
const OPTION_VALUES = ['FCI_MSP_REFERENCE', 'MANDI', 'DIRECT_BUYER'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPayload(
  value: unknown
): value is Record<string, string | number | boolean> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) =>
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
    )
  );
}

function isCropLedgerEvent(value: unknown): value is CropLedgerEvent {
  return (
    isRecord(value) &&
    typeof value.eventId === 'string' &&
    typeof value.lotId === 'string' &&
    EVENT_TYPES.includes(value.type as (typeof EVENT_TYPES)[number]) &&
    typeof value.occurredAt === 'string' &&
    SOURCE_VALUES.includes(value.source as (typeof SOURCE_VALUES)[number]) &&
    typeof value.verification === 'string' &&
    typeof value.summary === 'string' &&
    isPayload(value.payload)
  );
}

function isReadinessItem(value: unknown): value is CropReadinessItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.labelEn === 'string' &&
    typeof value.labelHi === 'string' &&
    typeof value.ready === 'boolean'
  );
}

function isSnapshot(value: unknown): value is CropToCashSnapshot {
  return (
    isRecord(value) &&
    typeof value.lotId === 'string' &&
    Array.isArray(value.events) &&
    value.events.every(isCropLedgerEvent) &&
    Array.isArray(value.readiness) &&
    value.readiness.every(isReadinessItem) &&
    PROCUREMENT_VALUES.includes(
      value.procurementState as (typeof PROCUREMENT_VALUES)[number]
    )
  );
}

function isQuote(value: unknown): value is SellingQuote {
  return (
    isRecord(value) &&
    OPTION_VALUES.includes(value.option as (typeof OPTION_VALUES)[number]) &&
    typeof value.lotId === 'string' &&
    typeof value.pricePerQuintal === 'number' &&
    Number.isFinite(value.pricePerQuintal) &&
    typeof value.commodity === 'string' &&
    typeof value.grade === 'string' &&
    typeof value.market === 'string' &&
    typeof value.source === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.freshness === 'string' &&
    SOURCE_VALUES.includes(value.provenance as (typeof SOURCE_VALUES)[number]) &&
    (value.minimumRate === undefined ||
      (typeof value.minimumRate === 'number' &&
        Number.isFinite(value.minimumRate))) &&
    (value.maximumRate === undefined ||
      (typeof value.maximumRate === 'number' &&
        Number.isFinite(value.maximumRate))) &&
    (value.modalRate === undefined ||
      (typeof value.modalRate === 'number' &&
        Number.isFinite(value.modalRate)))
  );
}

function isEstimate(value: unknown): value is SellingOptionEstimate {
  return (
    isRecord(value) &&
    OPTION_VALUES.includes(value.option as (typeof OPTION_VALUES)[number]) &&
    typeof value.gross === 'number' &&
    Number.isFinite(value.gross) &&
    typeof value.deductions === 'number' &&
    Number.isFinite(value.deductions) &&
    typeof value.net === 'number' &&
    Number.isFinite(value.net)
  );
}

function isComparisonResult(value: unknown): value is ComparisonResult {
  return (
    isRecord(value) &&
    typeof value.lotId === 'string' &&
    typeof value.calculationVersion === 'string' &&
    Array.isArray(value.estimates) &&
    value.estimates.every(isEstimate) &&
    (typeof value.downsideNet === 'number' ||
      value.downsideNet === null) &&
    isCropLedgerEvent(value.event) &&
    value.event.lotId === value.lotId &&
    value.event.type === 'COMPARISON'
  );
}

function isCropScreeningResult(value: unknown): value is CropScreeningResult {
  return (
    isRecord(value) &&
    typeof value.screeningId === 'string' &&
    typeof value.modelName === 'string' &&
    typeof value.modelVersion === 'string' &&
    typeof value.isMockOrDemo === 'boolean' &&
    typeof value.outcomeCategory === 'string' &&
    typeof value.calibratedConfidence === 'boolean' &&
    isRecord(value.explanation) &&
    typeof (value.explanation as Record<string, unknown>).safeExpertReferral ===
      'string'
  );
}

function apiPath(lotId: string, resource: string): string {
  return `/api/v1/lots/${encodeURIComponent(lotId)}/${resource}`;
}

export function createCropToCashApiAdapter(
  getToken: () => string | null,
  fetcher: typeof fetch = fetch
): CropToCashAdapter {
  async function request<T>(
    path: string,
    validate: (value: unknown) => value is T,
    init?: RequestInit
  ): Promise<T> {
    const token = getToken();
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    if (init?.body) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let response: Response;
    try {
      response = await fetcher(path, { ...init, headers });
    } catch (error) {
      throw new CropToCashApiError(
        error instanceof Error ? error.message : 'Network request failed.',
        0,
        true
      );
    }

    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const envelope =
        typeof data === 'object' && data !== null && 'error' in data
          ? data.error
          : null;
      const message =
        typeof envelope === 'object' &&
        envelope !== null &&
        'message' in envelope &&
        typeof envelope.message === 'string'
          ? envelope.message
          : `Request failed with status ${response.status}.`;
      const retryable =
        typeof envelope === 'object' &&
        envelope !== null &&
        'retryable' in envelope &&
        typeof envelope.retryable === 'boolean'
          ? envelope.retryable
          : response.status >= 500;
      throw new CropToCashApiError(message, response.status, retryable);
    }
    if (!validate(data)) {
      throw new CropToCashApiError(
        'The service returned data that does not match the agreed response format.',
        response.status,
        false
      );
    }
    return data;
  }

  return {
    getSnapshot: (lotId) =>
      request<CropToCashSnapshot>(
        apiPath(lotId, 'ledger'),
        isSnapshot
      ),
    getQuotes: (lotId) =>
      request<SellingQuote[]>(
        apiPath(lotId, 'quotes'),
        (data): data is SellingQuote[] =>
          Array.isArray(data) && data.every(isQuote)
      ),
    recordComparison: (lotId, quantityQtl, costs) =>
      request<ComparisonResult>(
        apiPath(lotId, 'comparisons'),
        isComparisonResult,
        {
          method: 'POST',
          body: JSON.stringify({ quantityQtl, costs }),
        }
      ),
    appendEvent: (event) => {
      const path =
        event.type === 'READINESS'
          ? apiPath(event.lotId, 'readiness')
          : event.type === 'PROCUREMENT'
          ? apiPath(event.lotId, 'procurement-attempts')
          : apiPath(event.lotId, 'sales');
      return request<CropLedgerEvent>(path, isCropLedgerEvent, {
          method: 'POST',
          body: JSON.stringify(event),
        });
    },
    screenImage: (lotId, payload) =>
      request<CropScreeningResult>(
        apiPath(lotId, 'screenings'),
        isCropScreeningResult,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
  };
}

const sampleQuotes: SellingQuote[] = [
  {
    option: 'FCI_MSP_REFERENCE',
    lotId: '',
    pricePerQuintal: 2585,
    commodity: 'Sharbati wheat',
    grade: 'FAQ (illustrative)',
    market: 'Illustrative FCI/MSP reference',
    source: 'Fictional product-test fixture',
    timestamp: '2026-10-18T00:00:00.000Z',
    freshness: 'Demo fixture; not a live quote',
    provenance: 'DEMO',
  },
  {
    option: 'MANDI',
    lotId: '',
    pricePerQuintal: 2300,
    commodity: 'Sharbati wheat',
    grade: 'FAQ (illustrative)',
    market: 'Illustrative local mandi',
    source: 'Fictional product-test fixture',
    timestamp: '2026-10-18T00:00:00.000Z',
    freshness: 'Demo fixture; not a live quote',
    provenance: 'DEMO',
    minimumRate: 2200,
    maximumRate: 2400,
    modalRate: 2300,
  },
  {
    option: 'DIRECT_BUYER',
    lotId: '',
    pricePerQuintal: 2350,
    commodity: 'Sharbati wheat',
    grade: 'FAQ (illustrative)',
    market: 'Illustrative direct buyer',
    source: 'Fictional product-test fixture',
    timestamp: '2026-10-18T00:00:00.000Z',
    freshness: 'Demo fixture; not a live quote',
    provenance: 'DEMO',
  },
];

const defaultReadiness = [
  {
    id: 'registration',
    labelEn: 'Farmer & Land Registration',
    labelHi: 'किसान एवं भूमि पंजीकरण',
    ready: false,
  },
  {
    id: 'bankAccount',
    labelEn: 'Aadhaar-Linked Bank Account (Readiness flag only)',
    labelHi: 'आधार लिंक बैंक खाता (केवल तैयारी स्थिति)',
    ready: false,
  },
  {
    id: 'landRecord',
    labelEn: 'Khasra / Land Record Verification',
    labelHi: 'खसरा / भूमि रिकॉर्ड सत्यापन',
    ready: false,
  },
  {
    id: 'qualityCheck',
    labelEn: 'Pre-Procurement Quality / Moisture Check',
    labelHi: 'खरीद-पूर्व गुणवत्ता / नमी जांच',
    ready: false,
  },
];

const mockSnapshots = new Map<string, CropToCashSnapshot>();

function createMockSnapshot(lotId: string): CropToCashSnapshot {
  const created: CropLedgerEvent = {
    eventId: `demo-created-${lotId}`,
    lotId,
    type: 'READINESS',
    occurredAt: '2026-10-18T00:00:00.000Z',
    source: 'DEMO',
    verification: 'DEMO ONLY — not saved to a server',
    summary: 'Illustrative crop-to-cash ledger opened.',
    payload: { initialized: true },
  };
  return {
    lotId,
    events: [created],
    readiness: defaultReadiness.map((item) => ({ ...item })),
    procurementState: 'PLANNED',
  };
}

export function createCropToCashMockAdapter(
  now: () => Date = () => new Date()
): CropToCashAdapter {
  const appendLedgerEvent = async (
    event: Omit<CropLedgerEvent, 'eventId' | 'occurredAt'>
  ): Promise<CropLedgerEvent> => {
    let snapshot = mockSnapshots.get(event.lotId);
    if (!snapshot) snapshot = createMockSnapshot(event.lotId);

    const created: CropLedgerEvent = {
      ...event,
      eventId: `demo-${now().getTime()}-${snapshot.events.length}`,
      occurredAt: now().toISOString(),
    };
    snapshot.events = [...snapshot.events, created];
    if (created.type === 'READINESS') {
      const readinessId = created.payload.readinessId;
      const ready = created.payload.ready;
      if (typeof readinessId === 'string' && typeof ready === 'boolean') {
        snapshot.readiness = snapshot.readiness.map((item) =>
          item.id === readinessId ? { ...item, ready } : item
        );
      }
    }
    if (
      created.type === 'PROCUREMENT' &&
      typeof created.payload.state === 'string'
    ) {
      snapshot.procurementState =
        created.payload.state as ProcurementState;
    }
    mockSnapshots.set(event.lotId, snapshot);
    return structuredClone(created);
  };

  return {
    async getSnapshot(lotId) {
      let snapshot = mockSnapshots.get(lotId);
      if (!snapshot) {
        snapshot = createMockSnapshot(lotId);
        mockSnapshots.set(lotId, snapshot);
      }
      return structuredClone(snapshot);
    },
    async getQuotes(lotId) {
      return sampleQuotes.map((quote) => ({ ...quote, lotId }));
    },
    async recordComparison(lotId, quantityQtl, costs) {
      const quotes = await this.getQuotes(lotId);
      const calculation = calculateSellingOptions(
        quantityQtl,
        quotes,
        costs
      );
      if (calculation.error) {
        throw new CropToCashApiError(calculation.error, 422, false);
      }
      const event = await appendLedgerEvent({
        lotId,
        type: 'COMPARISON',
        source: 'DEMO',
        verification: 'DEMO ONLY — not saved to a server',
        summary: `Compared selling options for ${quantityQtl} qtl.`,
        payload: {
          quantityQtl,
          ...Object.fromEntries(
            calculation.estimates.map((item) => [
              `${item.option}_net`,
              item.net,
            ])
          ),
          downsideNet: calculation.downsideNet || 0,
        },
      });
      return {
        lotId,
        calculationVersion: 'demo-fixture-v1',
        estimates: calculation.estimates,
        downsideNet: calculation.downsideNet,
        event,
      };
    },
    appendEvent: appendLedgerEvent,
    async screenImage(lotId, payload) {
      if (payload.imageSizeBytes > 10 * 1024 * 1024) {
        return {
          screeningId: `demo-scr-${now().getTime()}`,
          lotId,
          modelName: 'KisanSetu-Screening-Adapter',
          modelVersion: 'v1.0.0-mock',
          isMockOrDemo: true,
          timestamp: now().toISOString(),
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

      if (!['jpeg', 'png', 'webp'].includes(payload.imageFormat)) {
        return {
          screeningId: `demo-scr-${now().getTime()}`,
          lotId,
          modelName: 'KisanSetu-Screening-Adapter',
          modelVersion: 'v1.0.0-mock',
          isMockOrDemo: true,
          timestamp: now().toISOString(),
          outcomeCategory: 'IMAGE_QUALITY_REJECTED',
          topClass: null,
          runnerUp: null,
          calibratedConfidence: false,
          abstentionReason: `Unsupported image format: ${payload.imageFormat}`,
          explanation: {
            visualQualityScore: 0.2,
            lightingAdequate: false,
            blurDetected: false,
            diagnosticNotes: 'Only JPEG, PNG, or WebP images are supported.',
            safeExpertReferral: 'Upload a valid image format.',
          },
        };
      }

      return {
        screeningId: `demo-scr-${now().getTime()}`,
        lotId,
        modelName: 'KisanSetu-Screening-Adapter',
        modelVersion: 'v1.0.0-mock-demo',
        isMockOrDemo: true,
        timestamp: now().toISOString(),
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
        calibratedConfidence: false,
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
    },
  };
}

export const cropToCashApiEnabled =
  typeof import.meta.env !== 'undefined' &&
  import.meta.env.VITE_CROP_TO_CASH_API_ENABLED === 'true';
