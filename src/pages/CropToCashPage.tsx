import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKisan } from '../context/KisanContext';
import {
  createCropToCashApiAdapter,
  createCropToCashMockAdapter,
  cropToCashApiEnabled,
  CropToCashAdapter,
} from '../services/cropToCashAdapter';
import { calculateSellingOptions } from '../services/cropToCashCalculations';
import { ComparisonResult } from '../types/cropToCash';
import {
  NewCropLedgerEvent,
  CropToCashSnapshot,
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
  const { currentLot, language, navigate, token, t } = useKisan();
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
  const [comparisonSaved, setComparisonSaved] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<{
    inputKey: string;
    result: ComparisonResult;
  } | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');

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
    confirmedEstimate
      ? confirmedEstimate.downsideNet
      : estimate.downsideNet;

  const appendEvent = async (
    event: Omit<NewCropLedgerEvent, 'lotId'>
  ) => {
    if (!snapshot) return;
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
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError(t('Choose an image file.', 'कृपया छवि फ़ाइल चुनें।'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError(
        t('Image must be 10 MB or smaller.', 'छवि 10 MB या उससे छोटी होनी चाहिए।')
      );
      return;
    }
    setImageUrl(URL.createObjectURL(file));
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
          onClick={() => navigate('/crop-passport')}
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
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#000080]">
                    {t('Crop image screening', 'फसल की छवि जाँच')}
                  </h2>
                  <p className="mt-1 text-sm">
                    {t(
                      'Add a photo for preview. Image screening is not connected, so this page will not produce a diagnosis or treatment advice.',
                      'पूर्वावलोकन के लिए फ़ोटो जोड़ें। छवि जाँच सेवा जुड़ी नहीं है, इसलिए यहाँ कोई रोग-निदान या उपचार सलाह नहीं दी जाएगी।'
                    )}
                  </p>
                </div>
                <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#000080]/40 bg-[#F7F8FC] p-4 text-center font-bold text-[#000080] focus-within:outline focus-within:outline-4 focus-within:outline-[#138808]">
                  <span>
                    {t('Choose a crop image (max 10 MB)', 'फसल की छवि चुनें (अधिकतम 10 MB)')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => handleImage(event.target.files?.[0])}
                  />
                </label>
                {imageError && <p role="alert" className="text-sm font-bold text-red-800">{imageError}</p>}
                {imageUrl && (
                  <figure className="space-y-2">
                    <img
                      src={imageUrl}
                      alt={t('Selected crop photo preview', 'चुनी गई फसल की फ़ोटो का पूर्वावलोकन')}
                      className="max-h-72 w-full rounded-lg border object-contain"
                    />
                    <figcaption className="text-sm font-bold">
                      {t(
                        'Local preview only. It is not uploaded or screened.',
                        'केवल स्थानीय पूर्वावलोकन। इसे अपलोड या जाँचा नहीं गया है।'
                      )}
                    </figcaption>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="min-h-11 rounded-lg border border-[#000080]/40 px-3 font-bold text-[#000080]"
                    >
                      {t('Remove photo', 'फ़ोटो हटाएँ')}
                    </button>
                  </figure>
                )}
              </div>
            )}

            {tab === 'compare' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#000080]">
                    {t('Compare estimated net returns', 'अनुमानित शुद्ध आय की तुलना करें')}
                  </h2>
                  <p className="mt-1 text-sm">
                    {t(
                      cropToCashApiEnabled
                        ? 'Client calculation is a preview; use the backend-confirmed result after recording. MSP is a reference, not a guaranteed offer.'
                        : 'Fictional 50-qtl wheat fixture — MSP is a reference, not a guaranteed offer.',
                      cropToCashApiEnabled
                        ? 'क्लाइंट गणना केवल पूर्वावलोकन है; दर्ज करने के बाद बैकएंड से पुष्ट परिणाम देखें। MSP संदर्भ है, पक्का प्रस्ताव नहीं।'
                        : 'काल्पनिक 50-क्विंटल गेहूँ उदाहरण — MSP संदर्भ है, पक्का प्रस्ताव नहीं।'
                    )}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold">
                    {t('Quantity (quintals)', 'मात्रा (क्विंटल)')}
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={quantity}
                      onChange={(event) => setQuantity(Number(event.target.value))}
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
                  <p className="rounded-lg border border-[#FF9933] bg-[#FFF4E8] p-3 font-bold">
                    {t('Downside if direct sale adds an extra trip:', 'सीधी बिक्री में अतिरिक्त यात्रा होने पर:')}{' '}
                    {formatINR(displayedDownside)}
                  </p>
                )}
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
                  className="min-h-11 rounded-lg bg-[#000080] px-4 py-2 font-extrabold text-white disabled:opacity-50"
                >
                  {saving
                    ? t('Saving…', 'सहेज रहे हैं…')
                    : t('Add comparison to lot ledger', 'तुलना को लॉट लेज़र में जोड़ें')}
                </button>
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
                  <p className="mt-1 text-sm">
                    {t(
                      'Track readiness without collecting identity-document numbers or images. Centre and schedule are not verified in this demo.',
                      'पहचान दस्तावेज़ के नंबर या छवि लिए बिना तैयारी दर्ज करें। इस डेमो में केंद्र और समय सत्यापित नहीं हैं।'
                    )}
                  </p>
                </div>
                <fieldset className="space-y-3">
                  <legend className="font-extrabold">
                    {t('Readiness checklist (yes / no only)', 'तैयारी सूची (केवल हाँ / नहीं)')}
                  </legend>
                  {snapshot.readiness.map((item) => (
                    <label
                      key={item.id}
                      className="flex min-h-11 items-center gap-3 rounded-lg border p-3 font-semibold"
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
                      <span>{language === 'hi' ? item.labelHi : item.labelEn}</span>
                    </label>
                  ))}
                </fieldset>
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
                    className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#000080]/30 px-3"
                  />
                </label>
                <form
                  className="space-y-3 rounded-xl border-2 border-[#000080]/20 p-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const actualNet = Math.round(quantity * salePrice) - actualCosts;
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
                  <h3 className="font-extrabold">
                    {t('Record farmer-reported sale', 'किसान द्वारा बताई बिक्री दर्ज करें')}
                  </h3>
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
                    disabled={saving || quantity <= 0 || salePrice < 0 || actualCosts < 0}
                    className="min-h-11 rounded-lg bg-[#138808] px-4 py-2 font-extrabold text-white disabled:opacity-50"
                  >
                    {saving ? t('Saving…', 'सहेज रहे हैं…') : t('Add sale event', 'बिक्री घटना जोड़ें')}
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
                <li key={event.eventId} className="border-l-4 border-[#138808] pl-3">
                  <p className="text-xs font-extrabold uppercase">
                    {event.type} · {event.source}
                  </p>
                  <p className="mt-1 text-sm">{event.summary}</p>
                  <p className="mt-1 text-xs text-black/75">
                    {new Date(event.occurredAt).toLocaleString()} · {event.verification}
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
