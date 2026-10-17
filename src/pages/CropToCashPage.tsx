import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKisan } from '../context/KisanContext';
import {
  createCropToCashApiAdapter,
  createCropToCashMockAdapter,
  cropToCashApiEnabled,
  CropToCashAdapter,
} from '../services/cropToCashAdapter';
import { calculateSellingOptions } from '../services/cropToCashCalculations';
import {
  ComparisonResult,
  CropScreeningResult,
  CropToCashSnapshot,
  NewCropLedgerEvent,
  ProcurementState,
  SellingOptionKind,
  SellingQuote,
} from '../types/cropToCash';
import { formatINR } from '../services/kisanService';

type WorkflowTab = 'detect' | 'compare' | 'complete';

const PROCUREMENT_STATES: ProcurementState[] = [
  'PLANNED',
  'VISITED',
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'RESCHEDULED',
  'NOT_COMPLETED',
];

const OPTION_LABELS: Record<SellingOptionKind, { en: string; hi: string }> = {
  FCI_MSP_REFERENCE: { en: 'FCI / MSP reference', hi: 'FCI / MSP संदर्भ' },
  MANDI: { en: 'Mandi', hi: 'मंडी' },
  DIRECT_BUYER: { en: 'Direct buyer', hi: 'सीधा खरीदार' },
};

const initialCosts = {
  fciCosts: 2500,
  mandiCosts: 4000,
  directCosts: 4000,
  extraTripCost: 1000,
};

export const CropToCashPage: React.FC = () => {
  const { currentLot, language, navigate, token, t, setSelectedLotId } =
    useKisan();
  const [tab, setTab] = useState<WorkflowTab>('detect');
  const [snapshot, setSnapshot] = useState<CropToCashSnapshot | null>(null);
  const [quotes, setQuotes] = useState<SellingQuote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(50);
  const [costs, setCosts] = useState(initialCosts);
  const [salePrice, setSalePrice] = useState<number>(2350);
  const [actualCosts, setActualCosts] = useState<number>(4000);
  const [salePaymentStatus, setSalePaymentStatus] = useState<string>('PENDING');
  const [saleSummary, setSaleSummary] = useState<string>('');
  const [procurementReason, setProcurementReason] = useState<string>('');
  const [saleSaved, setSaleSaved] = useState<boolean>(false);
  const [hasSubmittedSale, setHasSubmittedSale] = useState<boolean>(false);
  const [comparisonSaved, setComparisonSaved] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<{
    inputKey: string;
    result: ComparisonResult;
  } | null>(null);

  // Screening state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [screeningResult, setScreeningResult] =
    useState<CropScreeningResult | null>(null);
  const [screeningInProgress, setScreeningInProgress] =
    useState<boolean>(false);
  const [screeningSaved, setScreeningSaved] = useState<boolean>(false);

  const adapter: CropToCashAdapter = useMemo(
    () =>
      cropToCashApiEnabled
        ? createCropToCashApiAdapter(() => token)
        : createCropToCashMockAdapter(),
    [token]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextSnapshot, nextQuotes] = await Promise.all([
        adapter.getSnapshot(currentLot.id),
        adapter.getQuotes(currentLot.id),
      ]);
      if (
        nextSnapshot.lotId !== currentLot.id ||
        nextQuotes.some((quote) => quote.lotId !== currentLot.id)
      ) {
        throw new Error('The service returned data for a different crop lot.');
      }
      setSnapshot(nextSnapshot);
      setQuotes(nextQuotes);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not load this crop lot. Please retry.'
      );
    } finally {
      setLoading(false);
    }
  }, [adapter, currentLot.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl]
  );

  const estimate = useMemo(
    () => calculateSellingOptions(quantity, quotes, costs),
    [costs, quantity, quotes]
  );
  const comparisonInputKey = JSON.stringify({
    lotId: currentLot.id,
    quantity,
    costs,
    prices: quotes.map(({ option, pricePerQuintal }) => [
      option,
      pricePerQuintal,
    ]),
  });
  const confirmedEstimate =
    comparisonResult?.inputKey === comparisonInputKey
      ? comparisonResult.result
      : null;
  const displayedEstimates =
    confirmedEstimate?.estimates || estimate.estimates;
  const displayedDownside =
    confirmedEstimate ? confirmedEstimate.downsideNet : estimate.downsideNet;

  const appendEvent = async (event: Omit<NewCropLedgerEvent, 'lotId'>) => {
    if (!snapshot) return false;
    setSaving(true);
    setError('');
    try {
      await adapter.appendEvent({ ...event, lotId: currentLot.id });
      const nextSnapshot = await adapter.getSnapshot(currentLot.id);
      setSnapshot(nextSnapshot);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save this update. Please retry.'
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleImage = (file?: File) => {
    setImageError('');
    setScreeningResult(null);
    setScreeningSaved(false);
    if (!file) {
      setSelectedFile(null);
      setImageUrl('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setImageError(t('Choose an image file.', 'कृपया छवि फ़ाइल चुनें।'));
      setSelectedFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError(
        t('Image must be 10 MB or smaller.', 'छवि 10 MB या उससे छोटी होनी चाहिए।')
      );
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const runScreening = async () => {
    if (!selectedFile) return;
    setScreeningInProgress(true);
    setImageError('');
    try {
      const rawFormat = selectedFile.type.split('/')[1]?.toLowerCase();
      const imageFormat: 'jpeg' | 'png' | 'webp' =
        rawFormat === 'png' ? 'png' : rawFormat === 'webp' ? 'webp' : 'jpeg';
      const result = await adapter.screenImage(currentLot.id, {
        imageFormat,
        imageSizeBytes: selectedFile.size,
        cropDeclared: currentLot.cropName,
      });
      setScreeningResult(result);
    } catch (cause) {
      setImageError(
        cause instanceof Error
          ? cause.message
          : t('Screening failed. Please retry.', 'छवि जाँच विफल रही। कृपया पुनः प्रयास करें।')
      );
    } finally {
      setScreeningInProgress(false);
    }
  };

  const saveScreeningToLedger = async () => {
    if (!screeningResult) return;
    const outcomeText =
      language === 'hi' && screeningResult.topClass?.classNameHi
        ? screeningResult.topClass.classNameHi
        : screeningResult.topClass?.className || screeningResult.outcomeCategory;
    const confText = screeningResult.topClass
      ? ` (${Math.round(screeningResult.topClass.confidence * 100)}% uncalibrated)`
      : '';

    const success = await appendEvent({
      type: 'READINESS',
      source: screeningResult.isMockOrDemo ? 'DEMO' : 'VERIFIED',
      verification: 'IMAGE_SCREENING_ADAPTER',
      summary: `Crop screening: ${outcomeText}${confText}. KVK referral advised; zero synthetic pesticides prescribed.`,
      payload: {
        screeningId: screeningResult.screeningId,
        outcomeCategory: screeningResult.outcomeCategory,
        topClass: screeningResult.topClass?.className || 'None',
        calibratedConfidence: screeningResult.calibratedConfidence,
        uncalibratedConfidence: screeningResult.topClass?.confidence || 0,
        safeReferral: 'Krishi Vigyan Kendra (KVK)',
      },
    });
    if (success) {
      setScreeningSaved(true);
    }
  };

  const selectedEstimate = displayedEstimates.find(
    (item) => item.option === 'DIRECT_BUYER'
  );

  const tabs: { id: WorkflowTab; en: string; hi: string; number: string }[] = [
    { id: 'detect', en: '1. Detect', hi: '1. पहचान', number: '01' },
    { id: 'compare', en: '2. Compare', hi: '2. तुलना', number: '02' },
    { id: 'complete', en: '3. Complete', hi: '3. पूरी करें', number: '03' },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 text-black sm:px-6">
      <header className="flex flex-col gap-3 border-b-2 border-[#000080]/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#006B3C]">
            KisanSetu AI · Crop-to-Cash Ledger
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-[#000080] sm:text-3xl">
            {t('One crop lot. One connected journey.', 'एक फसल लॉट। एक जुड़ी हुई यात्रा।')}
          </h1>
          <p className="mt-1 text-sm font-semibold">
            {currentLot.cropName} · {currentLot.quantityQuintals} qtl ·{' '}
            <span className="font-mono">{currentLot.id}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedLotId(currentLot.id);
            navigate('/crop-passport');
          }}
          className="min-h-11 rounded-lg border-2 border-[#000080]/30 px-4 py-2 text-sm font-bold text-[#000080] hover:bg-[#E8EAF6]"
        >
          {t('Open this lot’s Crop Passport', 'इस लॉट का फसल पासपोर्ट खोलें')}
        </button>
      </header>

      <div
        className={`mt-4 rounded-xl border-2 p-3 text-sm font-bold ${
          cropToCashApiEnabled
            ? 'border-[#138808]/50 bg-[#E8F5E9] text-[#064E22]'
            : 'border-[#FF9933] bg-[#FFF4E8] text-[#371A00]'
        }`}
        role="status"
      >
        {cropToCashApiEnabled
          ? t(
              'Connected service mode. Data is saved only after the backend confirms each update.',
              'सेवा मोड जुड़ा है। डेटा तभी सहेजा जाएगा जब बैकएंड पुष्टि करेगा।'
            )
          : t(
              'DEMO MODE — fictional prices and in-memory changes only. Nothing here is saved to the server or a device.',
              'डेमो मोड — काल्पनिक भाव और केवल अस्थायी बदलाव। कुछ भी सर्वर या डिवाइस पर सहेजा नहीं जाता।'
            )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-[#B42318] bg-[#FEF3F2] p-3 text-sm font-semibold text-[#7A271A]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void reload()}
            className="min-h-11 rounded border border-current px-3 font-extrabold"
          >
            {t('Retry', 'फिर कोशिश करें')}
          </button>
        </div>
      )}

      <nav
        aria-label={t('Crop-to-cash steps', 'फसल से भुगतान के चरण')}
        className="mt-5 grid grid-cols-3 gap-2"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={tab === item.id ? 'step' : undefined}
            onClick={() => setTab(item.id)}
            className={`min-h-12 rounded-lg border-2 px-2 py-2 text-sm font-extrabold sm:px-4 ${
              tab === item.id
                ? 'border-[#000080] bg-[#000080] text-white'
                : 'border-[#000080]/25 bg-white text-[#000080] hover:bg-[#E8EAF6]'
            }`}
          >
            {language === 'hi' ? item.hi : item.en}
          </button>
        ))}
      </nav>

      {loading ? (
        <div role="status" className="mt-5 rounded-xl border p-5 font-bold">
          {t('Loading crop ledger…', 'फसल लेज़र लोड हो रहा है…')}
        </div>
      ) : snapshot ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 rounded-2xl border-2 border-[#000080]/20 bg-white p-4 shadow-sm sm:p-6">
            {tab === 'detect' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-extrabold text-[#000080]">
                    {t('Crop Leaf Image Screening', 'फसल पत्ती छवि जाँच')}
                  </h2>
                  <p className="mt-1 text-sm text-gray-700">
                    {t(
                      'Upload or capture a leaf photo to screen for visual disease symptoms. Automated screening provides safe orientation and referrals to Krishi Vigyan Kendra (KVK); it never prescribes synthetic pesticides.',
                      'पत्ती की फ़ोटो अपलोड या कैप्चर करके रोग के लक्षणों की जाँच करें। स्वचालित जाँच सुरक्षित मार्गदर्शन व कृषि विज्ञान केंद्र (KVK) संदर्भ प्रदान करती है; यह कभी रासायनिक कीटनाशक नहीं बताती।'
                    )}
                  </p>
                </div>

                <div className="rounded-xl border-2 border-dashed border-[#000080]/30 bg-[#F7F8FC] p-4">
                  <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center text-center font-bold text-[#000080] focus-within:outline focus-within:outline-4 focus-within:outline-[#138808]">
                    <span className="text-base">
                      {t('Choose or capture crop image (JPEG, PNG, WebP · Max 10 MB)', 'फसल की छवि चुनें या लें (JPEG, PNG, WebP · अधिकतम 10 MB)')}
                    </span>
                    <span className="mt-1 text-xs text-gray-500">
                      {t('Lot: ', 'लॉट: ')} {currentLot.id} ({currentLot.cropName})
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      className="sr-only"
                      onChange={(event) =>
                        handleImage(event.target.files?.[0])
                      }
                    />
                  </label>
                </div>

                {imageError && (
                  <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">
                    {imageError}
                  </p>
                )}

                {imageUrl && (
                  <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                    <figure className="space-y-2">
                      <img
                        src={imageUrl}
                        alt={t('Selected crop photo preview', 'चुनी गई फसल की फ़ोटो का पूर्वावलोकन')}
                        className="max-h-72 w-full rounded-lg border object-contain bg-gray-50"
                      />
                      <figcaption className="flex flex-wrap items-center justify-between text-xs font-semibold text-gray-600">
                        <span>
                          {selectedFile?.name} ({((selectedFile?.size || 0) / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleImage(undefined)}
                          className="font-bold text-red-700 hover:underline"
                        >
                          {t('Remove photo', 'फ़ोटो हटाएँ')}
                        </button>
                      </figcaption>
                    </figure>

                    <button
                      type="button"
                      disabled={screeningInProgress}
                      onClick={() => void runScreening()}
                      className="min-h-11 w-full rounded-lg bg-[#000080] px-4 py-2 font-extrabold text-white hover:bg-[#000066] disabled:opacity-50"
                    >
                      {screeningInProgress
                        ? t('Running screening adapter…', 'छवि जाँच चल रही है…')
                        : t('Run Crop Leaf Screening', 'फसल पत्ती जाँच चलाएँ')}
                    </button>
                  </div>
                )}

                {screeningResult && (
                  <div className="space-y-4 rounded-xl border-2 border-[#000080]/30 bg-[#F9FAFC] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-wide text-gray-500">
                          {t('Screening Result', 'जाँच परिणाम')}
                        </span>
                        <h3 className="text-lg font-black text-[#000080]">
                          {screeningResult.outcomeCategory.replace(/_/g, ' ')}
                        </h3>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300">
                        {screeningResult.isMockOrDemo
                          ? t('DEMO INFERENCE', 'डेमो निष्कर्ष')
                          : t('PRODUCTION ADAPTER', 'उत्पादन एडेप्टर')}
                      </span>
                    </div>

                    {/* Uncalibrated Inference Disclaimer */}
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                      <strong>
                        {t(
                          '⚠️ Demonstration Screening Notice: ',
                          '⚠️ प्रदर्शन जाँच सूचना: '
                        )}
                      </strong>
                      {t(
                        'Confidence scores are uncalibrated and intended for workflow demonstration. This screening does not constitute regulatory agricultural inspection.',
                        'कॉन्फिडेंस स्कोर अनकैलिब्रेटेड हैं और केवल वर्कफ़्लो प्रदर्शन के लिए हैं। यह कोई आधिकारिक नियामक कृषि निरीक्षण नहीं है।'
                      )}
                    </div>

                    {screeningResult.topClass && (
                      <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-800">
                            {language === 'hi' && screeningResult.topClass.classNameHi
                              ? screeningResult.topClass.classNameHi
                              : screeningResult.topClass.className}
                          </span>
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-extrabold text-blue-800">
                            {Math.round(screeningResult.topClass.confidence * 100)}%{' '}
                            {t('(Uncalibrated)', '(अनकैलिब्रेटेड)')}
                          </span>
                        </div>
                        {screeningResult.topClass.scientificName && (
                          <p className="mt-1 text-xs italic text-gray-500">
                            {screeningResult.topClass.scientificName}
                          </p>
                        )}
                        {screeningResult.runnerUp && (
                          <div className="mt-2 border-t pt-2 text-xs text-gray-600">
                            <span>{t('Runner-up: ', 'अन्य संभावना: ')}</span>
                            {language === 'hi' && screeningResult.runnerUp.classNameHi
                              ? screeningResult.runnerUp.classNameHi
                              : screeningResult.runnerUp.className}{' '}
                            ({Math.round(screeningResult.runnerUp.confidence * 100)}%)
                          </div>
                        )}
                      </div>
                    )}

                    {screeningResult.abstentionReason && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
                        {screeningResult.abstentionReason}
                      </div>
                    )}

                    {/* Diagnostic & Quality Notes */}
                    <div className="grid gap-2 text-xs font-semibold sm:grid-cols-3">
                      <div className="rounded border bg-white p-2">
                        <span className="text-gray-500">{t('Quality Score', 'गुणवत्ता स्कोर')}:</span>{' '}
                        {Math.round(screeningResult.explanation.visualQualityScore * 100)}%
                      </div>
                      <div className="rounded border bg-white p-2">
                        <span className="text-gray-500">{t('Lighting', 'प्रकाश')}:</span>{' '}
                        {screeningResult.explanation.lightingAdequate
                          ? t('Adequate', 'पर्याप्त')
                          : t('Inadequate', 'अपर्याप्त')}
                      </div>
                      <div className="rounded border bg-white p-2">
                        <span className="text-gray-500">{t('Blur Check', 'धुंधलापन')}:</span>{' '}
                        {screeningResult.explanation.blurDetected
                          ? t('Blur Detected', 'धुंधला मिला')
                          : t('Clear', 'स्पष्ट')}
                      </div>
                    </div>

                    <p className="text-xs text-gray-700">
                      <strong>{t('Diagnostic Notes: ', 'निदान टिप्पणी: ')}</strong>
                      {screeningResult.explanation.diagnosticNotes}
                    </p>

                    {/* Safe Agronomic Referral Banner — Strictly No Pesticides */}
                    <div className="rounded-lg border-2 border-[#006B3C]/40 bg-[#E8F5E9] p-3 text-xs text-[#064E22]">
                      <p className="font-extrabold text-[#006B3C]">
                        {t(
                          '🌱 Safe Agronomic Advisory & KVK Referral',
                          '🌱 सुरक्षित कृषि परामर्श एवं KVK संदर्भ'
                        )}
                      </p>
                      <p className="mt-1 font-semibold">
                        {screeningResult.explanation.safeExpertReferral}
                      </p>
                      <p className="mt-2 text-[11px] text-[#064E22]/80">
                        {t(
                          'Strict Zero-Chemical Policy: KisanSetu AI does not prescribe synthetic chemical pesticides from an image alone. Please consult an authorized agronomist or your local Krishi Vigyan Kendra (KVK).',
                          'सख्त रसायन-मुक्त नीति: किसानसेतु एआई केवल छवि से रासायनिक कीटनाशकों की सिफारिश नहीं करता। कृपया अधिकृत कृषि विस्तार अधिकारी या KVK विशेषज्ञ से परामर्श लें।'
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        disabled={saving || screeningSaved}
                        onClick={() => void saveScreeningToLedger()}
                        className="min-h-11 rounded-lg bg-[#006B3C] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#005530] disabled:opacity-50"
                      >
                        {screeningSaved
                          ? t('✓ Screening Saved to Ledger', '✓ जाँच लेज़र में सहेजी गई')
                          : saving
                          ? t('Saving…', 'सहेज रहे हैं…')
                          : t('Save Screening to Lot Timeline', 'जाँच परिणाम को लॉट लेज़र में जोड़ें')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('compare')}
                        className="min-h-11 rounded-lg border-2 border-[#000080] bg-white px-4 py-2 text-sm font-extrabold text-[#000080] hover:bg-[#E8EAF6]"
                      >
                        {t('Proceed to Step 2: Compare Net Returns →', 'चरण 2 पर जाएँ: शुद्ध आय की तुलना करें →')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'compare' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#000080]">
                    {t('Compare estimated net returns', 'अनुमानित शुद्ध आय की तुलना करें')}
                  </h2>
                  <p className="mt-1 text-sm text-gray-700">
                    {t(
                      'Evaluate MSP reference procurement, local mandi auction, and direct buyer realization after all handling, transport, and cess deductions.',
                      'सभी हैंडलिंग, परिवहन और मंडी उपकर कटौती के बाद MSP संदर्भ खरीद, स्थानीय मंडी नीलामी और सीधे खरीदार से मिलने वाली शुद्ध राशि की तुलना करें।'
                    )}
                  </p>
                </div>

                {/* Legal Disclaimer Banner */}
                <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                  <strong>
                    {t(
                      '⚖️ Legal Notice & Reference Benchmark Disclaimer: ',
                      '⚖️ कानूनी सूचना एवं संदर्भ बेंचमार्क अस्वीकरण: '
                    )}
                  </strong>
                  {t(
                    'The MSP rate is an illustrative economic reference benchmark based on central government announcements. It is NOT an accepted government booking, escrow guarantee, or procurement pledge.',
                    'MSP दर केंद्र सरकार की घोषणाओं पर आधारित एक सांकेतिक संदर्भ बेंचमार्क है। यह कोई स्वीकृत सरकारी खरीद बुकिंग, एस्क्रो गारंटी या खरीद प्रतिज्ञा नहीं है।'
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold">
                    {t('Quantity (quintals)', 'मात्रा (क्विंटल)')}
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(Number(event.target.value))
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#000080]/30 px-3"
                    />
                  </label>
                  {([
                    ['fciCosts', 'FCI costs / लागत'],
                    ['mandiCosts', 'Mandi costs / लागत'],
                    ['directCosts', 'Direct costs / लागत'],
                    ['extraTripCost', 'Extra trip downside / अतिरिक्त यात्रा'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="text-sm font-bold">
                      {label} (₹)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={costs[key]}
                        onChange={(event) =>
                          setCosts((previous) => ({
                            ...previous,
                            [key]: Number(event.target.value),
                          }))
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#000080]/30 px-3"
                      />
                    </label>
                  ))}
                </div>

                {estimate.error && (
                  <p role="alert" className="text-sm font-bold text-red-800">
                    {estimate.error}
                  </p>
                )}

                <div className="grid gap-3">
                  {quotes.map((quote) => {
                    const result = displayedEstimates.find(
                      (item) => item.option === quote.option
                    );
                    if (!result) return null;
                    return (
                      <article
                        key={quote.option}
                        className="rounded-xl border-2 border-[#000080]/20 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-extrabold text-[#000080]">
                            {language === 'hi'
                              ? OPTION_LABELS[quote.option].hi
                              : OPTION_LABELS[quote.option].en}
                          </h3>
                          <span className="rounded bg-[#FFF4E8] px-2 py-1 text-xs font-extrabold text-[#371A00]">
                            {quote.provenance} · {quote.freshness}
                          </span>
                        </div>
                        <p className="mt-2 text-sm">
                          {quote.commodity} · {quote.grade} · {quote.market}
                        </p>
                        <p className="text-xs text-black/80">
                          {quote.source} · {new Date(quote.timestamp).toLocaleString()}
                        </p>
                        {quote.minimumRate !== undefined && (
                          <p className="mt-1 text-xs font-bold">
                            Min / Modal / Max: {formatINR(quote.minimumRate)} /{' '}
                            {formatINR(quote.modalRate || 0)} /{' '}
                            {formatINR(quote.maximumRate || 0)} per qtl
                          </p>
                        )}
                        <p className="mt-3 text-sm">
                          {formatINR(quote.pricePerQuintal)} / qtl · gross{' '}
                          {formatINR(result.gross)} · costs{' '}
                          {formatINR(result.deductions)}
                        </p>
                        <p className="mt-1 text-lg font-black text-[#006B3C]">
                          {t('Estimated net', 'अनुमानित शुद्ध राशि')}:{' '}
                          {formatINR(result.net)}
                        </p>
                      </article>
                    );
                  })}
                </div>

                {displayedDownside !== null && (
                  <div className="rounded-lg border-2 border-[#FF9933] bg-[#FFF4E8] p-3 text-sm font-bold text-[#371A00]">
                    <p>
                      {t(
                        'Downside Scenario (FCI Rejection Fallback + ₹1,000 Extra Trip):',
                        'डाउनसाइड परिदृश्य (FCI अस्वीकृति पर सीधी बिक्री + ₹1,000 अतिरिक्त फेरा):'
                      )}{' '}
                      <span className="text-base font-black">
                        {formatINR(displayedDownside)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs font-normal">
                      {t(
                        'If goods are rejected at FCI due to moisture or queue delays and re-routed to a direct buyer with an additional logistics leg.',
                        'यदि नमी या कतार की देरी के कारण FCI में माल अस्वीकार हो जाए और अतिरिक्त परिवहन खर्च के साथ सीधे खरीदार को भेजा जाए।'
                      )}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    disabled={saving || Boolean(estimate.error)}
                    onClick={async () => {
                      const submittedInputKey = comparisonInputKey;
                      let comparisonRecorded = false;
                      setSaving(true);
                      setError('');
                      try {
                        const result = await adapter.recordComparison(
                          currentLot.id,
                          quantity,
                          costs
                        );
                        if (result.lotId !== currentLot.id) {
                          throw new Error(
                            'The service returned a comparison for a different crop lot.'
                          );
                        }
                        comparisonRecorded = true;
                        setComparisonResult({
                          inputKey: submittedInputKey,
                          result,
                        });
                        setComparisonSaved(true);
                        setSnapshot(await adapter.getSnapshot(currentLot.id));
                      } catch (cause) {
                        setError(
                          comparisonRecorded
                            ? 'Comparison was recorded, but the lot timeline could not be refreshed. Please reload.'
                            : cause instanceof Error
                            ? cause.message
                            : 'Could not record this comparison. Please retry.'
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="min-h-11 rounded-lg bg-[#000080] px-4 py-2 font-extrabold text-white hover:bg-[#000066] disabled:opacity-50"
                  >
                    {saving
                      ? t('Saving…', 'सहेज रहे हैं…')
                      : t('Add comparison to lot ledger', 'तुलना को लॉट लेज़र में जोड़ें')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('complete')}
                    className="min-h-11 rounded-lg border-2 border-[#000080] bg-white px-4 py-2 text-sm font-extrabold text-[#000080] hover:bg-[#E8EAF6]"
                  >
                    {t('Proceed to Step 3: Complete Sale & Procurement →', 'चरण 3 पर जाएँ: खरीद व बिक्री पूरी करें →')}
                  </button>
                </div>

                {comparisonSaved && confirmedEstimate && (
                  <p role="status" className="text-sm font-bold text-[#006B3C]">
                    {t(
                      cropToCashApiEnabled
                        ? 'Comparison was added to the server ledger.'
                        : 'Demo comparison added in memory only; it is not synced.',
                      cropToCashApiEnabled
                        ? 'तुलना सर्वर लेज़र में जोड़ी गई।'
                        : 'डेमो तुलना केवल अस्थायी रूप से जोड़ी गई; सिंक नहीं हुई।'
                    )}
                  </p>
                )}
              </div>
            )}

            {tab === 'complete' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-extrabold text-[#000080]">
                    {t('Procurement and sale record', 'खरीद और बिक्री रिकॉर्ड')}
                  </h2>
                  <p className="mt-1 text-sm text-gray-700">
                    {t(
                      'Complete pre-procurement readiness, schedule your centre visit, and record realized sale outcomes.',
                      'खरीद-पूर्व तैयारी पूरी करें, केंद्र यात्रा निर्धारित करें और वास्तविक बिक्री परिणाम दर्ज करें।'
                    )}
                  </p>
                </div>

                {/* Privacy & Zero-PII Guarantee Banner */}
                <div className="rounded-lg border-2 border-[#006B3C]/40 bg-[#E8F5E9] p-3 text-xs text-[#064E22]">
                  <p className="font-extrabold">
                    {t(
                      '🔒 Zero-PII & Privacy Safety Guarantee',
                      '🔒 शून्य-PII एवं गोपनीयता सुरक्षा गारंटी'
                    )}
                  </p>
                  <p className="mt-1 font-semibold">
                    {t(
                      'Zero Aadhaar numbers, bank account numbers, passbook scans, or land-record images are collected or stored. Readiness is tracked strictly as self-certified or officer-verified boolean status flags.',
                      'कोई आधार नंबर, बैंक खाता संख्या, पासबुक स्कैन या भूमि रिकॉर्ड छवि एकत्र या संग्रहीत नहीं की जाती है। तैयारी केवल स्व-प्रमाणित या अधिकारी-सत्यापित बूलियन स्थिति के रूप में दर्ज की जाती है।'
                    )}
                  </p>
                </div>

                {/* Procurement Centre Details Card */}
                <div className="rounded-xl border-2 border-[#000080]/20 bg-[#F7F8FC] p-4 text-sm">
                  <h3 className="font-black text-[#000080]">
                    {t('Designated Procurement Centre Details', 'नामित खरीद केंद्र विवरण')}
                  </h3>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs font-semibold">
                    <div>
                      <span className="text-gray-500">{t('Centre Name: ', 'केंद्र नाम: ')}</span>
                      Khandwa FCI Depot / APMC Mandi Yard #3
                    </div>
                    <div>
                      <span className="text-gray-500">{t('Operating Hours: ', 'संचालन समय: ')}</span>
                      09:00 AM – 05:00 PM (Mon–Sat)
                    </div>
                    <div>
                      <span className="text-gray-500">{t('Address: ', 'पता: ')}</span>
                      Warehouse Complex, Sector 4, Khandwa, MP 450001
                    </div>
                    <div>
                      <span className="text-gray-500">{t('Scheduled Appointment Slot: ', 'निर्धारित समय: ')}</span>
                      October 22, 2026 · Morning 09:30 AM
                    </div>
                  </div>
                </div>

                {/* Readiness Checklist */}
                <fieldset className="space-y-3">
                  <legend className="font-extrabold text-[#000080]">
                    {t('Readiness checklist (yes / no flags only)', 'तैयारी सूची (केवल हाँ / नहीं स्थिति)')}
                  </legend>
                  {snapshot.readiness.map((item) => (
                    <label
                      key={item.id}
                      className="flex min-h-11 items-center gap-3 rounded-lg border p-3 font-semibold hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={item.ready}
                        disabled={saving}
                        onChange={(event) => {
                          void appendEvent({
                            type: 'READINESS',
                            source: cropToCashApiEnabled ? 'MANUAL' : 'DEMO',
                            verification: cropToCashApiEnabled
                              ? 'USER_REPORTED'
                              : 'DEMO ONLY — not saved to a server',
                            summary: `${item.id} readiness marked ${event.target.checked ? 'yes' : 'no'}.`,
                            payload: {
                              readinessId: item.id,
                              ready: event.target.checked,
                            },
                          });
                        }}
                        className="h-5 w-5 accent-[#138808]"
                      />
                      <span>
                        {language === 'hi' ? item.labelHi : item.labelEn}
                      </span>
                    </label>
                  ))}
                </fieldset>

                {/* Visit State and Notes */}
                <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                  <label className="block text-sm font-bold">
                    {t('Procurement attempt state', 'खरीद प्रयास की स्थिति')}
                    <select
                      value={snapshot.procurementState}
                      disabled={saving}
                      onChange={(event) => {
                        const state = event.target.value as ProcurementState;
                        void appendEvent({
                          type: 'PROCUREMENT',
                          source: cropToCashApiEnabled ? 'MANUAL' : 'DEMO',
                          verification: cropToCashApiEnabled
                            ? 'FARMER_REPORTED'
                            : 'DEMO ONLY — not saved to a server',
                          summary: `Procurement attempt marked ${state}.${procurementReason ? ` Reason: ${procurementReason}` : ''}`,
                          payload: { state, reason: procurementReason },
                        });
                      }}
                      className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#000080]/30 px-3"
                    >
                      {PROCUREMENT_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    {t('Visit / rejection note (farmer reported)', 'यात्रा / अस्वीकृति टिप्पणी (किसान द्वारा बताई गई)')}
                    <input
                      type="text"
                      maxLength={240}
                      value={procurementReason}
                      onChange={(event) => setProcurementReason(event.target.value)}
                      placeholder={t('e.g., FAQ moisture 11.8% verified or re-routed', 'उदा. नमी 11.8% सत्यापित या पुनः निर्देशित')}
                      className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#000080]/30 px-3"
                    />
                  </label>
                </div>

                {/* Sale Record Form */}
                <form
                  className="space-y-3 rounded-xl border-2 border-[#000080]/20 p-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const actualNet =
                      Math.round(quantity * salePrice) - actualCosts;
                    const success = await appendEvent({
                      type: 'SALE',
                      source: cropToCashApiEnabled ? 'MANUAL' : 'DEMO',
                      verification: cropToCashApiEnabled
                        ? 'FARMER_REPORTED'
                        : 'DEMO ONLY — not saved to a server',
                      summary: `Sale reported: ${quantity} qtl at ${formatINR(salePrice)} per qtl; actual net ${formatINR(actualNet)}.`,
                      payload: {
                        quantityQtl: quantity,
                        agreedPricePerQtl: salePrice,
                        deductions: actualCosts,
                        actualNet,
                        paymentStatus: salePaymentStatus,
                        differenceFromEstimate:
                          actualNet - (selectedEstimate?.net || 0),
                      },
                    });
                    if (success) {
                      setSaleSaved(true);
                      setHasSubmittedSale(true);
                      setSaleSummary(
                        `Actual net ${formatINR(actualNet)}; ${
                          actualNet - (selectedEstimate?.net || 0) >= 0
                            ? 'above'
                            : 'below'
                        } estimate by ${formatINR(
                          Math.abs(actualNet - (selectedEstimate?.net || 0))
                        )}.`
                      );
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[#000080]">
                      {t('Record farmer-reported sale', 'किसान द्वारा बताई बिक्री दर्ज करें')}
                    </h3>
                    {hasSubmittedSale && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        {t('Sale already logged', 'बिक्री पहले ही दर्ज है')}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-bold">
                      {t('Agreed price (₹/qtl)', 'तय भाव (₹/क्विंटल)')}
                      <input
                        type="number"
                        min="0"
                        value={salePrice}
                        onChange={(event) =>
                          setSalePrice(Number(event.target.value))
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border px-3"
                      />
                    </label>
                    <label className="text-sm font-bold">
                      {t('Actual costs (₹)', 'वास्तविक खर्च (₹)')}
                      <input
                        type="number"
                        min="0"
                        value={actualCosts}
                        onChange={(event) =>
                          setActualCosts(Number(event.target.value))
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border px-3"
                      />
                    </label>
                    <label className="text-sm font-bold">
                      {t('Payment status (reported)', 'भुगतान स्थिति (बताई गई)')}
                      <select
                        value={salePaymentStatus}
                        onChange={(event) =>
                          setSalePaymentStatus(event.target.value)
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border px-3"
                      >
                        <option value="PENDING">{t('Pending', 'लंबित')}</option>
                        <option value="PAID">{t('Paid', 'भुगतान हुआ')}</option>
                        <option value="DISPUTED">{t('Disputed', 'विवादित')}</option>
                        <option value="NOT_REPORTED">
                          {t('Not reported', 'नहीं बताया गया')}
                        </option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={
                      saving ||
                      quantity <= 0 ||
                      salePrice < 0 ||
                      actualCosts < 0
                    }
                    className="min-h-11 rounded-lg bg-[#138808] px-4 py-2 font-extrabold text-white hover:bg-[#0f6b06] disabled:opacity-50"
                  >
                    {saving
                      ? t('Saving…', 'सहेज रहे हैं…')
                      : t('Add sale event', 'बिक्री घटना जोड़ें')}
                  </button>
                  {saleSaved && (
                    <p role="status" className="text-sm font-bold text-[#006B3C]">
                      {t(
                        cropToCashApiEnabled
                          ? `Sale event confirmed by the server. ${saleSummary}`
                          : `Demo event added in memory only; it is not synced. ${saleSummary}`,
                        cropToCashApiEnabled
                          ? `बिक्री घटना सर्वर द्वारा पुष्टि की गई। ${saleSummary}`
                          : `डेमो घटना केवल अस्थायी रूप से जोड़ी गई; सिंक नहीं हुई। ${saleSummary}`
                      )}
                    </p>
                  )}
                </form>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border-2 border-[#000080]/20 bg-[#F7F8FC] p-4 sm:p-5">
            <h2 className="font-extrabold text-[#000080]">
              {t('Lot ledger', 'लॉट लेज़र')}
            </h2>
            <p className="mt-1 break-all text-xs font-bold">{snapshot.lotId}</p>
            <ol className="mt-4 space-y-3">
              {[...snapshot.events].reverse().map((event) => (
                <li
                  key={event.eventId}
                  className="border-l-4 border-[#138808] pl-3"
                >
                  <p className="text-xs font-extrabold uppercase text-gray-800">
                    {event.type} · {event.source}
                  </p>
                  <p className="mt-1 text-sm font-medium">{event.summary}</p>
                  <p className="mt-1 text-xs text-black/75">
                    {new Date(event.occurredAt).toLocaleString()} ·{' '}
                    {event.verification}
                  </p>
                </li>
              ))}
            </ol>
            {!snapshot.events.length && (
              <p className="mt-3 text-sm">
                {t('No events recorded yet.', 'अभी कोई घटना दर्ज नहीं है।')}
              </p>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
};
