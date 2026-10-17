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
  'ACCEPTED',
  'PENDING',
  'REJECTED',
  'RESCHEDULED',
  'NOT_COMPLETED',
];

const PROCUREMENT_STATE_LABELS: Record<
  ProcurementState,
  { en: string; hi: string }
> = {
  PLANNED: { en: 'Planned visit', hi: 'नियोजित यात्रा (Planned)' },
  VISITED: { en: 'Centre visited', hi: 'केंद्र का दौरा किया (Visited)' },
  ACCEPTED: { en: 'Accepted at gate', hi: 'गेट पर स्वीकृत (Accepted)' },
  PENDING: { en: 'Pending quality check', hi: 'गुणवत्ता जाँच लंबित (Pending)' },
  REJECTED: { en: 'Rejected at gate', hi: 'अस्वीकृत (Rejected)' },
  RESCHEDULED: { en: 'Rescheduled slot', hi: 'पुनर्निर्धारित (Rescheduled)' },
  NOT_COMPLETED: { en: 'Not completed', hi: 'अधूरा (Not Completed)' },
};

const OPTION_LABELS: Record<SellingOptionKind, { en: string; hi: string }> = {
  FCI_MSP_REFERENCE: { en: 'FCI / MSP reference', hi: 'FCI / MSP संदर्भ' },
  MANDI: { en: 'Local APMC Mandi', hi: 'स्थानीय मंडी (APMC)' },
  DIRECT_BUYER: { en: 'Direct institutional buyer', hi: 'सीधा संस्थागत खरीदार' },
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
  const [imageFileMeta, setImageFileMeta] = useState<{
    format: 'jpeg' | 'png' | 'webp';
    sizeBytes: number;
  } | null>(null);
  const [imageError, setImageError] = useState<string>('');
  const [screeningLoading, setScreeningLoading] = useState<boolean>(false);
  const [screeningResult, setScreeningResult] = useState<{
    outcomeCategory: string;
    isMockOrDemo: boolean;
    calibratedConfidence: boolean;
    topClass: {
      className: string;
      classNameHi?: string;
      confidence: number;
    } | null;
    diagnosticNotes: string;
    safeExpertReferral: string;
  } | null>(null);

  const isLiveApi = cropToCashApiEnabled && Boolean(token);

  const adapter: CropToCashAdapter = useMemo(
    () =>
      isLiveApi
        ? createCropToCashApiAdapter(() => token)
        : createCropToCashMockAdapter(),
    [isLiveApi, token]
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
        throw new Error(
          t(
            'The service returned data for a different crop lot.',
            'सेवा ने किसी अन्य फसल लॉट का डेटा लौटाया है।'
          )
        );
      }
      setSnapshot(nextSnapshot);
      setQuotes(nextQuotes);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t(
              'Could not load this crop lot. Please retry.',
              'यह फसल लॉट लोड नहीं हो सका। कृपया पुनः प्रयास करें।'
            )
      );
    } finally {
      setLoading(false);
    }
  }, [adapter, currentLot.id, t]);

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
  const displayedDownside = confirmedEstimate
    ? confirmedEstimate.downsideNet
    : estimate.downsideNet;

  const appendEvent = async (event: Omit<NewCropLedgerEvent, 'lotId'>) => {
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
          : t(
              'Could not save this update. Please retry.',
              'यह अपडेट सहेजा नहीं जा सका। कृपया पुनः प्रयास करें।'
            )
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleImage = (file?: File) => {
    setImageError('');
    setScreeningResult(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError(t('Choose an image file.', 'कृपया छवि फ़ाइल चुनें।'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError(
        t(
          'Image must be 10 MB or smaller.',
          'छवि 10 MB या उससे छोटी होनी चाहिए।'
        )
      );
      return;
    }
    const format: 'jpeg' | 'png' | 'webp' = file.type.includes('png')
      ? 'png'
      : file.type.includes('webp')
        ? 'webp'
        : 'jpeg';
    setImageFileMeta({ format, sizeBytes: file.size });
    setImageUrl(URL.createObjectURL(file));
  };

  const runDemoScreening = async () => {
    setScreeningLoading(true);
    setImageError('');
    try {
      const payload = {
        imageFormat: imageFileMeta?.format || 'jpeg',
        imageSizeBytes: imageFileMeta?.sizeBytes || 350 * 1024,
        cropDeclared: currentLot.cropName,
      };
      if (isLiveApi && token) {
        const res = await fetch(
          `/api/v1/lots/${encodeURIComponent(currentLot.id)}/screenings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data?.error?.message ||
              t(
                'Could not complete demo leaf screening.',
                'डेमो पत्ती जाँच पूरी नहीं हो सकी।'
              )
          );
        }
        setScreeningResult({
          outcomeCategory: data.outcomeCategory,
          isMockOrDemo: Boolean(data.isMockOrDemo),
          calibratedConfidence: Boolean(data.calibratedConfidence),
          topClass: data.topClass || null,
          diagnosticNotes: data.explanation?.diagnosticNotes || '',
          safeExpertReferral: data.explanation?.safeExpertReferral || '',
        });
      } else {
        setScreeningResult({
          outcomeCategory: 'DISEASE_DETECTED',
          isMockOrDemo: true,
          calibratedConfidence: false,
          topClass: {
            className: 'Soybean Rust (Phakopsora pachyrhizi)',
            classNameHi: 'सोयाबीन रतुआ (फकोस्पोरा पचीरिजी)',
            confidence: 0.88,
          },
          diagnosticNotes: t(
            'Visual inspection indicates typical reddish-brown foliar pustules. Pre-Harvest Interval (PHI) compliance mandatory before any harvest scheduling.',
            'दृश्य निरीक्षण में पत्तियों पर लाल-भूरे धब्बे दिखे हैं। कटाई से पहले सुरक्षित प्रतीक्षा अवधि (PHI) का पालन अनिवार्य है।'
          ),
          safeExpertReferral: t(
            'Automated systems do not prescribe synthetic pesticides from imagery alone. Please consult your Block Agriculture Extension Officer or visit the nearest Krishi Vigyan Kendra (KVK) for an official field agronomy prescription.',
            'स्वचालित प्रणाली केवल फ़ोटो के आधार पर रासायनिक कीटनाशक की सलाह नहीं देती। कृपया आधिकारिक कृषि परामर्श के लिए अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि विस्तार अधिकारी से संपर्क करें।'
          ),
        });
      }
    } catch (cause) {
      setImageError(
        cause instanceof Error
          ? cause.message
          : t(
              'Screening failed. Please retry.',
              'जाँच विफल रही। कृपया पुनः प्रयास करें।'
            )
      );
    } finally {
      setScreeningLoading(false);
    }
  };

  const selectedEstimate = displayedEstimates.find(
    (item) => item.option === 'DIRECT_BUYER'
  );

  const tabs: {
    id: WorkflowTab;
    en: string;
    hi: string;
    descEn: string;
    descHi: string;
  }[] = [
    {
      id: 'detect',
      en: '01. Leaf Screening',
      hi: '01. फसल पत्ती जाँच',
      descEn: 'Safe pre-harvest inspection',
      descHi: 'कटाई-पूर्व सुरक्षा जाँच',
    },
    {
      id: 'compare',
      en: '02. Net Price Compare',
      hi: '02. शुद्ध आय तुलना',
      descEn: 'MSP vs Mandi vs Direct',
      descHi: 'MSP बनाम मंडी बनाम सीधा खरीदार',
    },
    {
      id: 'complete',
      en: '03. Readiness & Sale',
      hi: '03. तैयारी और बिक्री',
      descEn: 'Checklist & ledger entry',
      descHi: 'तैयारी सूची और बिक्री रिकॉर्ड',
    },
  ];

  const costFields = [
    {
      key: 'fciCosts' as const,
      en: 'FCI / MSP costs (₹)',
      hi: 'FCI / MSP लागत (₹)',
    },
    {
      key: 'mandiCosts' as const,
      en: 'Mandi transport & fees (₹)',
      hi: 'मंडी परिवहन और शुल्क (₹)',
    },
    {
      key: 'directCosts' as const,
      en: 'Direct buyer costs (₹)',
      hi: 'सीधे खरीदार की लागत (₹)',
    },
    {
      key: 'extraTripCost' as const,
      en: 'Extra trip downside (₹)',
      hi: 'अतिरिक्त यात्रा खर्च (₹)',
    },
  ];

  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 text-black sm:px-6 space-y-6"
      role="region"
      aria-label={t(
        'Crop-to-Cash Connected Ledger',
        'फसल से भुगतान तक जुड़ा हुआ लेज़र'
      )}
    >
      {/* Top Page Header */}
      <header className="flex flex-col gap-4 border-b border-[#000080]/20 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#006B3C]">
            {t(
              'Kisan-SPO · Crop-to-Cash Ledger',
              'किसान-एसपीओ · फसल से भुगतान लेज़र'
            )}
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-[#000080] sm:text-3xl">
            {t(
              'One crop lot. One connected journey.',
              'एक फसल लॉट। एक जुड़ी हुई यात्रा।'
            )}
          </h1>
          <p className="mt-1 text-sm font-semibold text-black/80">
            <span>{currentLot.cropName}</span>
            <span aria-hidden="true"> · </span>
            <span className="font-tabular">
              {currentLot.quantityQuintals} {t('qtl', 'क्विंटल')}
            </span>
            <span aria-hidden="true"> · </span>
            <span className="font-mono text-[#000080] font-bold">
              {currentLot.id}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label={t(
              'Return to Personal Workspace Dashboard',
              'व्यक्तिगत डैशबोर्ड पर वापस जाएँ'
            )}
            className="min-h-11 rounded-lg border border-[#000080]/30 bg-white px-3.5 py-2 text-xs font-extrabold text-[#000080] hover:bg-[#E8EAF6]"
          >
            {t('← Workspace', '← कार्यक्षेत्र')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/crop-passport')}
            aria-label={t(
              'Open Digital Crop Passport for this lot',
              'इस लॉट का डिजिटल फसल पासपोर्ट खोलें'
            )}
            className="min-h-11 rounded-lg bg-[#000080] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#00003C]"
          >
            {t('Open Crop Passport →', 'फसल पासपोर्ट खोलें →')}
          </button>
        </div>
      </header>

      {/* Connection Status Banner */}
      <div
        className={`rounded-xl border p-3.5 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 ${
          isLiveApi
            ? 'border-[#138808]/40 bg-[#E8F5E9] text-[#064E22]'
            : 'border-[#FF9933] bg-[#FFF4E8] text-[#371A00]'
        }`}
        role="status"
        aria-live="polite"
      >
        <span>
          {isLiveApi
            ? t(
                'Connected service mode (/api/v1/lots). Data is saved to the active server ledger after each update.',
                'सेवा मोड जुड़ा है (/api/v1/lots)। प्रत्येक अपडेट के बाद डेटा सक्रिय सर्वर लेज़र में सहेजा जाता है।'
              )
            : t(
                'DEMO MODE — fictional prices and in-memory changes only. Nothing here is saved to the server or a device.',
                'डेमो मोड — काल्पनिक भाव और केवल अस्थायी बदलाव। कुछ भी सर्वर या डिवाइस पर सहेजा नहीं जाता।'
              )}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-[#B42318] bg-[#FEF3F2] p-3.5 text-sm font-semibold text-[#7A271A]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void reload()}
            aria-label={t(
              'Retry loading crop lot ledger',
              'फसल लॉट लेज़र पुनः लोड करें'
            )}
            className="min-h-11 rounded border border-current px-3 font-extrabold"
          >
            {t('Retry', 'फिर कोशिश करें')}
          </button>
        </div>
      )}

      {/* 3-Step Segmented Workflow Navigation */}
      <nav
        aria-label={t('Crop-to-cash workflow steps', 'फसल से भुगतान के चरण')}
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#E8EAF6]/60 p-1.5 rounded-xl border border-[#000080]/20"
      >
        {tabs.map((item) => {
          const isCurrent = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`${language === 'hi' ? item.hi : item.en} — ${
                language === 'hi' ? item.descHi : item.descEn
              }`}
              onClick={() => setTab(item.id)}
              className={`min-h-14 rounded-lg px-4 py-2.5 text-left transition-colors flex flex-col justify-center ${
                isCurrent
                  ? 'bg-[#000080] text-white shadow-sm'
                  : 'bg-white text-[#000080] hover:bg-[#E8EAF6] border border-[#000080]/15'
              }`}
            >
              <span className="text-sm font-extrabold">
                {language === 'hi' ? item.hi : item.en}
              </span>
              <span
                className={`text-[11px] font-semibold mt-0.5 ${
                  isCurrent ? 'text-[#9DF6B9]' : 'text-black/70'
                }`}
              >
                {language === 'hi' ? item.descHi : item.descEn}
              </span>
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-[#000080]/20 p-6 font-bold text-[#000080]"
        >
          {t('Loading crop ledger…', 'फसल लेज़र लोड हो रहा है…')}
        </div>
      ) : snapshot ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
          <section
            aria-label={t(
              'Active Workflow Step Content',
              'सक्रिय चरण का कार्यक्षेत्र'
            )}
            className="min-w-0 rounded-2xl border border-[#000080]/25 bg-white p-5 shadow-sm sm:p-6"
          >
            {tab === 'detect' && (
              <div className="space-y-5">
                <div className="border-b border-[#000080]/15 pb-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#138808]">
                    {t('STEP 1 OF 3 · CROP SAFETY', 'चरण 1 / 3 · फसल सुरक्षा')}
                  </span>
                  <h2 className="text-xl font-extrabold text-[#000080] mt-0.5">
                    {t(
                      'Crop leaf image screening (कटाई-पूर्व पत्ती जाँच)',
                      'फसल की छवि जाँच (Crop Image Screening)'
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-black/80 font-medium">
                    {t(
                      'Upload a field photo or run a demo screening. To protect farmer safety, automated screening never prescribes synthetic chemicals and always refers to KVK agronomists.',
                      'खेत की फ़ोटो अपलोड करें या डेमो जाँच चलाएँ। किसान सुरक्षा के लिए स्वचालित प्रणाली कभी भी सिंथेटिक रसायन नहीं सुझाती और हमेशा KVK विशेषज्ञों से जोड़ती है।'
                    )}
                  </p>
                </div>

                <label
                  aria-label={t(
                    'Upload crop leaf image (maximum 10 megabytes)',
                    'फसल की पत्ती की छवि अपलोड करें (अधिकतम 10 MB)'
                  )}
                  className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#000080]/40 bg-[#F7F8FC] p-5 text-center font-bold text-[#000080] hover:bg-[#E8EAF6]/60 focus-within:outline focus-within:outline-4 focus-within:outline-[#138808]"
                >
                  <span className="material-symbols-outlined text-[28px] text-[#138808]">
                    add_a_photo
                  </span>
                  <span className="text-sm font-extrabold">
                    {t(
                      'Choose a crop image (max 10 MB)',
                      'फसल की छवि चुनें (अधिकतम 10 MB)'
                    )}
                  </span>
                  <span className="text-xs font-semibold text-black/70">
                    {t(
                      'Supports JPEG, PNG, WebP',
                      'JPEG, PNG, WebP समर्थित हैं'
                    )}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label={t(
                      'Select crop photo file',
                      'फसल फ़ोटो फ़ाइल चुनें'
                    )}
                    className="sr-only"
                    onChange={(event) => handleImage(event.target.files?.[0])}
                  />
                </label>

                {imageError && (
                  <p
                    role="alert"
                    className="text-sm font-bold text-red-800 bg-red-50 border border-red-300 rounded-lg p-3"
                  >
                    {imageError}
                  </p>
                )}

                {imageUrl && (
                  <figure className="space-y-3 rounded-xl border border-[#000080]/20 p-4 bg-[#FAF9F6]">
                    <img
                      src={imageUrl}
                      alt={t(
                        'Selected crop photo preview',
                        'चुनी गई फसल की फ़ोटो का पूर्वावलोकन'
                      )}
                      className="max-h-72 w-full rounded-lg border object-contain bg-white"
                    />
                    <figcaption className="text-xs sm:text-sm font-bold text-black/80">
                      {t(
                        'Local preview ready. You may run the explicitly labeled Demo Screening below (no synthetic pesticide prescription).',
                        'स्थानीय पूर्वावलोकन तैयार है। आप नीचे स्पष्ट रूप से चिह्नित डेमो जाँच चला सकते हैं (कोई रासायनिक कीटनाशक सलाह नहीं)।'
                      )}
                    </figcaption>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        disabled={screeningLoading}
                        onClick={() => void runDemoScreening()}
                        className="min-h-11 rounded-lg bg-[#000080] px-4 py-2 text-xs sm:text-sm font-extrabold text-white disabled:opacity-50"
                      >
                        {screeningLoading
                          ? t('Running Demo Screening…', 'डेमो जाँच चल रही है…')
                          : t(
                              'Run Demo Leaf Screening',
                              'डेमो पत्ती जाँच चलाएँ'
                            )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setImageFileMeta(null);
                          setScreeningResult(null);
                        }}
                        className="min-h-11 rounded-lg border border-[#000080]/40 px-3 text-xs sm:text-sm font-bold text-[#000080]"
                      >
                        {t('Remove photo', 'फ़ोटो हटाएँ')}
                      </button>
                    </div>
                  </figure>
                )}

                {!imageUrl && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      disabled={screeningLoading}
                      onClick={() => void runDemoScreening()}
                      className="min-h-11 rounded-lg border-2 border-[#000080] bg-white px-4 py-2 text-xs sm:text-sm font-extrabold text-[#000080] hover:bg-[#E8EAF6] disabled:opacity-50"
                    >
                      {screeningLoading
                        ? t('Running Demo Screening…', 'डेमो जाँच चल रही है…')
                        : t(
                            'Test Sample Leaf Screening (Demo)',
                            'नमूना पत्ती जाँच का परीक्षण करें (डेमो)'
                          )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTab('compare')}
                      className="min-h-11 rounded-lg bg-[#138808] px-4 py-2 text-xs sm:text-sm font-extrabold text-white hover:bg-[#006B3C]"
                    >
                      {t(
                        'Next: Compare Net Returns →',
                        'आगे: शुद्ध आय की तुलना करें →'
                      )}
                    </button>
                  </div>
                )}

                {screeningResult && (
                  <div
                    role="region"
                    aria-label={t(
                      'Demo Screening Result',
                      'डेमो जाँच परिणाम'
                    )}
                    className="rounded-xl border-2 border-[#FF9933] bg-[#FFF4E8] p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded bg-[#FF9933] px-2.5 py-0.5 text-xs font-extrabold text-black">
                        {t(
                          'DEMO / MOCK SCREENING — UNCALIBRATED',
                          'डेमो / मॉक जाँच — अपुष्ट'
                        )}
                      </span>
                      <span className="text-xs font-extrabold text-[#000080]">
                        {screeningResult.outcomeCategory}
                      </span>
                    </div>
                    {screeningResult.topClass && (
                      <p className="text-base font-extrabold text-[#000080]">
                        {language === 'hi' &&
                        screeningResult.topClass.classNameHi
                          ? screeningResult.topClass.classNameHi
                          : screeningResult.topClass.className}{' '}
                        ({Math.round(screeningResult.topClass.confidence * 100)}
                        % {t('uncalibrated score', 'अपुष्ट स्कोर')})
                      </p>
                    )}
                    <p className="text-sm font-semibold text-black">
                      {screeningResult.diagnosticNotes}
                    </p>
                    <p className="text-xs font-bold text-[#006B3C] border-t border-[#FF9933]/50 pt-2">
                      {t('Safe KVK Referral:', 'सुरक्षित KVK परामर्श:')}{' '}
                      {screeningResult.safeExpertReferral}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'compare' && (
              <div className="space-y-5">
                <div className="border-b border-[#000080]/15 pb-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#138808]">
                    {t(
                      'STEP 2 OF 3 · TRANSPARENT ARBITRAGE',
                      'चरण 2 / 3 · पारदर्शी शुद्ध आय'
                    )}
                  </span>
                  <h2 className="text-xl font-extrabold text-[#000080] mt-0.5">
                    {t(
                      'Compare estimated net returns (अनुमानित शुद्ध आय की तुलना)',
                      'अनुमानित शुद्ध आय की तुलना करें (Compare Net Returns)'
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-black/80 font-medium">
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

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 bg-[#F7F8FC] p-4 rounded-xl border border-[#000080]/20">
                  <label className="text-xs sm:text-sm font-bold text-[#000080]">
                    {t('Quantity (quintals)', 'मात्रा (क्विंटल)')}
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      aria-label={t(
                        'Lot quantity in quintals',
                        'क्विंटल में फसल की मात्रा'
                      )}
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(Number(event.target.value))
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#000080]/30 bg-white px-3 text-black font-tabular font-extrabold"
                    />
                  </label>
                  {costFields.map((field) => (
                    <label
                      key={field.key}
                      className="text-xs sm:text-sm font-bold text-[#000080]"
                    >
                      {language === 'hi' ? field.hi : field.en}
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label={language === 'hi' ? field.hi : field.en}
                        value={costs[field.key]}
                        onChange={(event) =>
                          setCosts((previous) => ({
                            ...previous,
                            [field.key]: Number(event.target.value),
                          }))
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#000080]/30 bg-white px-3 text-black font-tabular font-extrabold"
                      />
                    </label>
                  ))}
                </div>

                {estimate.error && (
                  <p role="alert" className="text-sm font-bold text-red-800">
                    {estimate.error}
                  </p>
                )}

                <div className="grid gap-3.5 md:grid-cols-3">
                  {quotes.map((quote) => {
                    const result = displayedEstimates.find(
                      (item) => item.option === quote.option
                    );
                    if (!result) return null;
                    const isDirect = quote.option === 'DIRECT_BUYER';
                    return (
                      <article
                        key={quote.option}
                        aria-label={`${
                          language === 'hi'
                            ? OPTION_LABELS[quote.option].hi
                            : OPTION_LABELS[quote.option].en
                        }`}
                        className={`rounded-xl border-2 p-4 flex flex-col justify-between gap-3 ${
                          isDirect
                            ? 'border-[#138808] bg-[#E8F5E9]/40'
                            : 'border-[#000080]/20 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="font-extrabold text-[#000080] text-sm sm:text-base">
                              {language === 'hi'
                                ? OPTION_LABELS[quote.option].hi
                                : OPTION_LABELS[quote.option].en}
                            </h3>
                            <span className="text-[11px] font-bold text-[#006B3C]">
                              {quote.provenance} · {quote.freshness}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs font-semibold text-black">
                            {quote.commodity} · {quote.grade} · {quote.market}
                          </p>
                          <p className="text-[11px] text-black/70">
                            {quote.source}
                          </p>
                          {quote.minimumRate !== undefined && (
                            <p className="mt-1.5 text-xs font-bold font-tabular">
                              {t('Min / Modal / Max:', 'न्यूनतम / मॉडल / अधिकतम:')}{' '}
                              {formatINR(quote.minimumRate)} /{' '}
                              {formatINR(quote.modalRate || 0)} /{' '}
                              {formatINR(quote.maximumRate || 0)}
                            </p>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-[#000080]/15 space-y-1">
                          <p className="text-xs font-semibold font-tabular text-black">
                            {formatINR(quote.pricePerQuintal)} /{' '}
                            {t('qtl', 'क्विंटल')} · {t('Gross', 'कुल')}{' '}
                            {formatINR(result.gross)} · {t('Costs', 'खर्च')}{' '}
                            {formatINR(result.deductions)}
                          </p>
                          <p className="text-base sm:text-lg font-black text-[#006B3C] font-tabular">
                            {t('Estimated net', 'अनुमानित शुद्ध राशि')}:{' '}
                            {formatINR(result.net)}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {displayedDownside !== null && (
                  <p className="rounded-lg border border-[#FF9933] bg-[#FFF4E8] p-3 text-xs sm:text-sm font-bold text-[#371A00]">
                    {t(
                      'Downside if direct sale adds an extra trip:',
                      'सीधी बिक्री में अतिरिक्त यात्रा होने पर शुद्ध राशि:'
                    )}{' '}
                    <span className="font-tabular">
                      {formatINR(displayedDownside)}
                    </span>
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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
                            t(
                              'The service returned a comparison for a different crop lot.',
                              'सेवा ने किसी अन्य फसल लॉट की तुलना लौटाई है।'
                            )
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
                            ? t(
                                'Comparison was recorded, but the lot timeline could not be refreshed. Please reload.',
                                'तुलना दर्ज हो गई, लेकिन समयरेखा रीफ़्रेश नहीं हो सकी। कृपया पुनः लोड करें।'
                              )
                            : cause instanceof Error
                              ? cause.message
                              : t(
                                  'Could not record this comparison. Please retry.',
                                  'यह तुलना दर्ज नहीं की जा सकी। कृपया पुनः प्रयास करें।'
                                )
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="min-h-11 rounded-lg bg-[#000080] px-4 py-2 text-xs sm:text-sm font-extrabold text-white disabled:opacity-50"
                  >
                    {saving
                      ? t('Saving…', 'सहेज रहे हैं…')
                      : t(
                          'Add comparison to lot ledger',
                          'तुलना को लॉट लेज़र में जोड़ें'
                        )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('complete')}
                    className="min-h-11 rounded-lg bg-[#138808] px-4 py-2 text-xs sm:text-sm font-extrabold text-white hover:bg-[#006B3C]"
                  >
                    {t(
                      'Next: Readiness & Sale →',
                      'आगे: तैयारी और बिक्री रिकॉर्ड →'
                    )}
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
                <div className="border-b border-[#000080]/15 pb-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#138808]">
                    {t(
                      'STEP 3 OF 3 · DISPATCH & SETTLEMENT RECORD',
                      'चरण 3 / 3 · खरीद और बिक्री रिकॉर्ड'
                    )}
                  </span>
                  <h2 className="text-xl font-extrabold text-[#000080] mt-0.5">
                    {t(
                      'Procurement readiness and sale record',
                      'खरीद तैयारी और बिक्री रिकॉर्ड'
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-black/80 font-medium">
                    {t(
                      'Track readiness without collecting identity-document numbers or images. Centre and schedule are not verified in this demo.',
                      'पहचान दस्तावेज़ के नंबर या छवि लिए बिना तैयारी दर्ज करें। इस डेमो में केंद्र और समय सत्यापित नहीं हैं।'
                    )}
                  </p>
                </div>

                <fieldset className="space-y-2.5">
                  <legend className="font-extrabold text-[#000080] text-sm">
                    {t(
                      'Readiness checklist (yes / no only)',
                      'तैयारी सूची (केवल हाँ / नहीं)'
                    )}
                  </legend>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {snapshot.readiness.map((item) => (
                      <label
                        key={item.id}
                        className="flex min-h-11 items-center gap-3 rounded-lg border border-[#000080]/20 bg-[#FAF9F6] p-3 text-xs sm:text-sm font-semibold cursor-pointer hover:bg-[#E8EAF6]/50"
                      >
                        <input
                          type="checkbox"
                          checked={item.ready}
                          disabled={saving}
                          aria-label={
                            language === 'hi' ? item.labelHi : item.labelEn
                          }
                          onChange={(event) => {
                            void appendEvent({
                              type: 'READINESS',
                              source: cropToCashApiEnabled ? 'MANUAL' : 'DEMO',
                              verification: cropToCashApiEnabled
                                ? 'USER_REPORTED'
                                : 'DEMO ONLY — not saved to a server',
                              summary: `${item.id} readiness marked ${
                                event.target.checked ? 'yes' : 'no'
                              }.`,
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
                  </div>
                </fieldset>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <label className="block text-xs sm:text-sm font-bold text-[#000080]">
                    {t('Procurement attempt state', 'खरीद प्रयास की स्थिति')}
                    <select
                      value={snapshot.procurementState}
                      disabled={saving}
                      aria-label={t(
                        'Procurement attempt state',
                        'खरीद प्रयास की स्थिति चुनें'
                      )}
                      onChange={(event) => {
                        const state = event.target.value as ProcurementState;
                        void appendEvent({
                          type: 'PROCUREMENT',
                          source: cropToCashApiEnabled ? 'MANUAL' : 'DEMO',
                          verification: cropToCashApiEnabled
                            ? 'FARMER_REPORTED'
                            : 'DEMO ONLY — not saved to a server',
                          summary: `Procurement attempt marked ${state}.${
                            procurementReason
                              ? ` Reason: ${procurementReason}`
                              : ''
                          }`,
                          payload: { state, reason: procurementReason },
                        });
                      }}
                      className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#000080]/30 bg-white px-3 text-black font-bold"
                    >
                      {PROCUREMENT_STATES.map((state) => (
                        <option key={state} value={state}>
                          {language === 'hi'
                            ? PROCUREMENT_STATE_LABELS[state].hi
                            : PROCUREMENT_STATE_LABELS[state].en}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs sm:text-sm font-bold text-[#000080]">
                    {t(
                      'Visit / rejection note (farmer reported)',
                      'यात्रा / अस्वीकृति टिप्पणी (किसान द्वारा बताई गई)'
                    )}
                    <input
                      type="text"
                      maxLength={240}
                      value={procurementReason}
                      placeholder={t(
                        'Optional note on queue or moisture check',
                        'कतार या नमी जाँच पर वैकल्पिक टिप्पणी'
                      )}
                      onChange={(event) =>
                        setProcurementReason(event.target.value)
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#000080]/30 bg-white px-3 text-black font-semibold"
                    />
                  </label>
                </div>

                <form
                  className="space-y-3.5 rounded-xl border border-[#000080]/25 bg-[#F7F8FC] p-4"
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
                      summary: `Sale reported: ${quantity} qtl at ${formatINR(
                        salePrice
                      )} per qtl; actual net ${formatINR(actualNet)}.`,
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
                        t(
                          `Actual net ${formatINR(actualNet)}; ${
                            actualNet - (selectedEstimate?.net || 0) >= 0
                              ? 'above'
                              : 'below'
                          } estimate by ${formatINR(
                            Math.abs(actualNet - (selectedEstimate?.net || 0))
                          )}.`,
                          `वास्तविक शुद्ध आय ${formatINR(actualNet)}; अनुमान से ${formatINR(
                            Math.abs(actualNet - (selectedEstimate?.net || 0))
                          )} ${
                            actualNet - (selectedEstimate?.net || 0) >= 0
                              ? 'अधिक'
                              : 'कम'
                          }।`
                        )
                      );
                    }
                  }}
                >
                  <h3 className="font-extrabold text-[#000080]">
                    {t(
                      'Record farmer-reported sale',
                      'किसान द्वारा बताई बिक्री दर्ज करें'
                    )}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs sm:text-sm font-bold text-[#000080]">
                      {t('Agreed price (₹/qtl)', 'तय भाव (₹/क्विंटल)')}
                      <input
                        type="number"
                        min="0"
                        value={salePrice}
                        onChange={(event) =>
                          setSalePrice(Number(event.target.value))
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border border-[#000080]/30 bg-white px-3 text-black font-tabular font-extrabold"
                      />
                    </label>
                    <label className="text-xs sm:text-sm font-bold text-[#000080]">
                      {t('Actual costs (₹)', 'वास्तविक खर्च (₹)')}
                      <input
                        type="number"
                        min="0"
                        value={actualCosts}
                        onChange={(event) =>
                          setActualCosts(Number(event.target.value))
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border border-[#000080]/30 bg-white px-3 text-black font-tabular font-extrabold"
                      />
                    </label>
                    <label className="text-xs sm:text-sm font-bold text-[#000080]">
                      {t(
                        'Payment status (reported)',
                        'भुगतान स्थिति (बताई गई)'
                      )}
                      <select
                        value={salePaymentStatus}
                        onChange={(event) =>
                          setSalePaymentStatus(event.target.value)
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border border-[#000080]/30 bg-white px-3 text-black font-bold"
                      >
                        <option value="PENDING">
                          {t('Pending', 'लंबित')}
                        </option>
                        <option value="PAID">
                          {t('Paid', 'भुगतान हुआ')}
                        </option>
                        <option value="DISPUTED">
                          {t('Disputed', 'विवादित')}
                        </option>
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
                    className="min-h-11 rounded-lg bg-[#138808] px-4 py-2 text-xs sm:text-sm font-extrabold text-white disabled:opacity-50"
                  >
                    {saving
                      ? t('Saving…', 'सहेज रहे हैं…')
                      : t('Add sale event', 'बिक्री घटना जोड़ें')}
                  </button>
                  {saleSaved && (
                    <p
                      role="status"
                      className="text-sm font-bold text-[#006B3C]"
                    >
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

          {/* Right Audit Trail Sidebar */}
          <aside
            aria-label={t('Lot ledger timeline', 'लॉट लेज़र समयरेखा')}
            className="rounded-2xl border border-[#000080]/25 bg-[#F7F8FC] p-4 sm:p-5"
          >
            <div className="border-b border-[#000080]/15 pb-3">
              <h2 className="font-extrabold text-[#000080] text-base">
                {t('Lot ledger (लॉट लेज़र)', 'लॉट लेज़र (Lot Ledger)')}
              </h2>
              <p className="mt-0.5 break-all text-xs font-mono font-bold text-[#006B3C]">
                {snapshot.lotId}
              </p>
            </div>

            <ol className="mt-4 space-y-3">
              {[...snapshot.events].reverse().map((event) => (
                <li
                  key={event.eventId}
                  className="rounded-xl border border-[#000080]/15 bg-white p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold uppercase text-[#000080]">
                    <span>{event.type}</span>
                    <span className="text-[#138808]">{event.source}</span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-black">
                    {event.summary}
                  </p>
                  <p className="mt-1 text-[11px] text-black/70 font-tabular">
                    {new Date(event.occurredAt).toLocaleString()} ·{' '}
                    {event.verification}
                  </p>
                </li>
              ))}
            </ol>
            {!snapshot.events.length && (
              <p className="mt-3 text-sm text-black/75">
                {t('No events recorded yet.', 'अभी कोई घटना दर्ज नहीं है।')}
              </p>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
};
