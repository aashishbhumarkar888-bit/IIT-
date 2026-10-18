import React, { useEffect, useMemo, useState } from 'react';
import { DetailAccordion } from '../components/DetailAccordion';
import { QRCodeComponent } from '../components/QRCodeComponent';
import { useKisan } from '../context/KisanContext';
import { CROP_LOTS } from '../data/kisanData';
import {
  buildCropPassportPayload,
  getVerificationBadgeMeta,
} from '../services/kisanService';
import { VerificationStatus } from '../types/kisan';

interface CropPassportPageProps {
  compactMode?: boolean;
}

const VERIFICATION_STATUS_OPTIONS: {
  value: VerificationStatus;
  label: string;
}[] = [
  { value: 'INDEPENDENTLY_VERIFIED', label: 'Independently Verified' },
  { value: 'LABORATORY_TESTED', label: 'Laboratory Tested' },
  { value: 'DOCUMENT_VERIFIED', label: 'Document Verified' },
  { value: 'FARMER_DECLARED', label: 'Farmer Declared' },
  { value: 'VERIFICATION_PENDING', label: 'Verification Pending' },
];

export const CropPassportPage: React.FC<CropPassportPageProps> = ({
  compactMode = false,
}) => {
  const {
    currentLot,
    currentPlot,
    allLots,
    selectedLotId,
    setSelectedLotId,
    updateLotVerificationStatus,
    navigate,
    showToast,
  } = useKisan();

  const [selectedPinId, setSelectedPinId] = useState<string>('P2');
  const [evidenceModalOpen, setEvidenceModalOpen] = useState<boolean>(false);
  const [passportModalOpen, setPassportModalOpen] = useState<boolean>(false);
  const [mapModalOpen, setMapModalOpen] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [customLotIdInput, setCustomLotIdInput] = useState<string>('');

  // Support scanning a QR URL with ?lot=KS-... query parameter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const scannedLot = params.get('lot');
    if (
      scannedLot &&
      (allLots.some((l) => l.id === scannedLot) ||
        CROP_LOTS.some((l) => l.id === scannedLot))
    ) {
      setSelectedLotId(scannedLot);
    }
  }, [allLots, setSelectedLotId]);

  const activeQrLotId = customLotIdInput.trim() || currentLot.id;

  const qrPayload = useMemo(
    () => buildCropPassportPayload(currentLot),
    [currentLot]
  );

  const badgeMeta = useMemo(
    () => getVerificationBadgeMeta(currentLot.verificationStatus),
    [currentLot.verificationStatus]
  );

  const handleSharePassport = async () => {
    const shareText = `Kisan-SPO Crop Passport ${currentLot.id} — Farmer: ${currentLot.farmerName}, Crop: ${currentLot.cropName}, Quantity: ${currentLot.quantityQuintals} Quintals (${currentLot.verificationStatus.replace(/_/g, ' ')})`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Kisan-SPO Passport ${currentLot.shortCode}`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard/toast if share cancelled
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${qrPayload}`);
        showToast(
          `Copied Crop Passport ${currentLot.shortCode} credential payload to clipboard.`,
          'green'
        );
        return;
      } catch {
        // Ignore
      }
    }

    showToast(
      `Prepared Crop Passport ${currentLot.shortCode} summary for Mandi / FPO desk.`,
      'green'
    );
  };

  const handleRequestDeviceGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus(
        'Geolocation API is not supported by this browser. Showing illustrative cadastre coordinates.'
      );
      showToast('Geolocation unavailable — using sample plot coordinates.', 'saffron');
      return;
    }

    setGpsStatus('Requesting device GPS position...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        setGpsStatus(
          `Measured Device GPS: ${lat}° N, ${lng}° E (±${Math.round(
            pos.coords.accuracy
          )}m) • Compared against illustrative Khandwa plot (${
            currentPlot.centroidLat
          }, ${currentPlot.centroidLng})`
        );
        showToast('Device GPS position acquired for comparison.', 'green');
      },
      () => {
        setGpsStatus(
          'Location permission denied or unavailable. Retaining illustrative Khandwa cadastre coordinates (21.8245° N, 76.3512° E).'
        );
        showToast(
          'GPS permission denied — showing illustrative plot coordinates.',
          'saffron'
        );
      },
      { timeout: 6000 }
    );
  };

  return (
    <div className="w-full bg-white text-black">
      <div
        className={`mx-auto w-full ${
          compactMode ? 'p-3' : 'max-w-6xl px-4 sm:px-6 py-4'
        }`}
      >
        {/* Sub-header Breadcrumb & Metadata Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#000080]/15">
          <div className="flex items-center gap-2.5">
            {!compactMode && (
              <button
                type="button"
                onClick={() => navigate('/advisory')}
                aria-label="Go back to Advisory"
                className="w-10 h-10 rounded-full bg-[#E8EAF6] border border-[#000080]/30 flex items-center justify-center text-[#000080] hover:bg-[#000080] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  arrow_back
                </span>
              </button>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-extrabold text-[#000080] tracking-tight">
                  Passport {currentLot.shortCode}
                </h1>
                <span className="px-2 py-0.5 rounded bg-[#138808] text-white text-[10px] font-extrabold uppercase">
                  DEMO RECORD
                </span>
              </div>
              <span className="text-xs text-black font-bold font-hindi">
                डिजिटल फसल पासपोर्ट • Lot {currentLot.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSharePassport}
              aria-label="Share passport"
              className="h-10 px-3 rounded-lg bg-[#E8EAF6] border border-[#000080]/30 flex items-center gap-1.5 text-[#000080] text-xs font-extrabold hover:bg-[#000080] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                share
              </span>
              {!compactMode && <span>Share</span>}
            </button>
          </div>
        </div>

        {/* Lot Switcher & Verification Tier Selector (Non-compact or compact pill strip) */}
        <div className="mt-3 p-3 rounded-xl bg-[#E8EAF6] border border-[#000080]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase text-[#000080] mr-1">
              Sample Lot:
            </span>
            {CROP_LOTS.map((lot) => {
              const active = lot.id === selectedLotId;
              return (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => setSelectedLotId(lot.id)}
                  className={`px-2.5 py-1.5 rounded text-xs font-extrabold transition-colors min-h-[36px] ${
                    active
                      ? 'bg-[#000080] text-white shadow-sm'
                      : 'bg-white text-black border border-[#000080]/30 hover:bg-white/80'
                  }`}
                >
                  {lot.shortCode} ({lot.farmerName} • {lot.cropName})
                </button>
              );
            })}
          </div>

          {!compactMode && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="verification-status-select"
                className="text-[11px] font-extrabold text-[#000080] uppercase whitespace-nowrap"
              >
                Credential State:
              </label>
              <select
                id="verification-status-select"
                value={currentLot.verificationStatus}
                onChange={(e) =>
                  updateLotVerificationStatus(
                    currentLot.id,
                    e.target.value as VerificationStatus
                  )
                }
                className="px-2.5 py-1.5 rounded bg-white text-black border-2 border-[#000080] text-xs font-extrabold min-h-[36px]"
              >
                {VERIFICATION_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Responsive Grid: 1 col on mobile/compact, 12-col split on desktop */}
        <div
          className={`mt-4 grid grid-cols-1 ${
            compactMode ? 'gap-3.5' : 'lg:grid-cols-12 gap-5 items-start'
          }`}
        >
          {/* LEFT COLUMN (7 cols on desktop): Verified Lot Badge + AgriStack Identity Matrix + Geospatial Farm Plot */}
          <div
            className={`flex flex-col gap-4 ${
              compactMode ? '' : 'lg:col-span-7'
            }`}
          >
            {/* 1. Verified Lot Badge (Green if Residue-Free Lab Evidence exists, Saffron if Pending/Self-Declared) */}
            <div
              className={`rounded-xl p-4 shadow-md relative overflow-hidden border-2 ${
                badgeMeta.isResidueFreeVerified
                  ? 'bg-[#138808] text-white border-[#006B3C]'
                  : 'bg-[#FF9933] text-black border-black'
              }`}
            >
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      badgeMeta.isResidueFreeVerified
                        ? 'bg-white text-[#138808]'
                        : 'bg-black text-[#FF9933]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      {badgeMeta.isResidueFreeVerified ? 'verified' : 'info'}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-extrabold block ${
                        badgeMeta.isResidueFreeVerified
                          ? 'text-[#9DF6B9]'
                          : 'text-black'
                      }`}
                    >
                      {badgeMeta.tierLabel}
                    </span>
                    <h2 className="text-base sm:text-lg font-extrabold leading-snug">
                      {badgeMeta.titleEn}
                    </h2>
                    <span className="text-xs font-bold font-hindi block">
                      {badgeMeta.titleHi}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEvidenceModalOpen(true)}
                  className={`px-3 py-1.5 rounded font-extrabold text-xs flex items-center gap-1 shadow-sm shrink-0 min-h-[36px] ${
                    badgeMeta.isResidueFreeVerified
                      ? 'bg-white text-[#006B3C] hover:bg-[#E8F5E9]'
                      : 'bg-black text-white hover:opacity-90'
                  }`}
                >
                  <span>Evidence</span>
                  <span className="material-symbols-outlined text-[14px]">
                    open_in_new
                  </span>
                </button>
              </div>

              <p className="text-xs mt-2 font-semibold leading-snug">
                {badgeMeta.description}
              </p>

              <div
                className={`mt-3 -mx-4 -mb-4 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold ${
                  badgeMeta.isResidueFreeVerified
                    ? 'bg-[#006B3C] text-white'
                    : 'bg-black text-[#FF9933]'
                }`}
              >
                <span className="font-tabular">
                  {currentLot.quantityQuintals} Quintals (
                  {(currentLot.quantityQuintals * 100).toLocaleString('en-IN')}{' '}
                  Kg)
                </span>
                <span className="font-hindi">
                  प्रमाणित फसल लॉट • {currentLot.evidence.certificateNumber}
                </span>
              </div>
            </div>

            {/* 2. Digital Credential Structured Card (AgriStack Identity Matrix) */}
            <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-[#000080]/25">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#000080]/15">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#000080] text-[20px]">
                    badge
                  </span>
                  <h3 className="text-base font-extrabold text-[#000080]">
                    AgriStack Identity Matrix (Demo Data)
                  </h3>
                </div>
                <span className="text-[10px] text-[#006B3C] bg-[#E8F5E9] border border-[#138808] px-2.5 py-0.5 rounded-full font-extrabold uppercase">
                  {currentLot.verificationStatus.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                <div className="bg-[#E8EAF6] p-3 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-[#000080] font-extrabold block uppercase">
                    FARMER / कृषक
                  </span>
                  <span className="text-sm sm:text-base text-black font-extrabold block truncate mt-0.5">
                    {currentLot.farmerName} ({currentLot.farmerNameHi})
                  </span>
                  <span className="text-xs text-black font-semibold block truncate">
                    Khandwa, MP (Lot {currentLot.id})
                  </span>
                </div>

                <div className="bg-[#E8EAF6] p-3 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-[#000080] font-extrabold block uppercase">
                    CROP VARIETY / किस्म
                  </span>
                  <span className="text-sm sm:text-base text-black font-extrabold block truncate mt-0.5">
                    {currentLot.cropName}
                  </span>
                  <span className="text-xs text-[#138808] font-extrabold font-hindi block">
                    {currentLot.variety}
                  </span>
                </div>

                <div className="bg-[#E8EAF6] p-3 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-[#000080] font-extrabold block uppercase">
                    CADASTRAL SURVEY / खसरा
                  </span>
                  <span className="text-sm sm:text-base text-[#000080] font-extrabold font-tabular block mt-0.5">
                    {currentLot.surveyNumber}
                  </span>
                  <span className="text-xs text-black font-semibold font-tabular block">
                    {currentLot.plotAreaHectares} Hectares (Registered)
                  </span>
                </div>

                <div className="bg-[#E8EAF6] p-3 rounded-lg border border-[#000080]/20">
                  <span className="text-[10px] text-[#000080] font-extrabold block uppercase">
                    HARVESTED / कटाई
                  </span>
                  <span className="text-sm sm:text-base text-black font-extrabold font-tabular block mt-0.5">
                    {currentLot.harvestDate}
                  </span>
                  <span className="text-xs text-[#138808] font-extrabold font-tabular block">
                    Declared: {currentLot.quantityQuintals.toFixed(1)} QTL
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Geospatial Farm Plot (Khandwa Cadastre Geo-Fence with 4 GPS Corner Points) */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border-2 border-[#000080] flex flex-col">
              <div className="p-3 bg-[#000080] text-white flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#9DF6B9]">
                    satellite_alt
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold tracking-wide">
                    {currentPlot.locationLabel}
                  </span>
                </div>
                <span className="bg-white text-[#000080] text-[10px] font-extrabold px-2 py-0.5 rounded font-tabular">
                  LAT {currentPlot.centroidLat}
                </span>
              </div>

              {/* Geospatial Canvas Visualization */}
              <div className="relative w-full h-56 bg-[#00003C] overflow-hidden flex items-center justify-center">
                {/* Field Grid Pattern */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="cadastreGrid"
                      width="24"
                      height="24"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 24 0 L 0 0 0 24"
                        fill="none"
                        stroke="#138808"
                        strokeOpacity="0.35"
                        strokeWidth="0.7"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="#00003C" />
                  <rect width="100%" height="100%" fill="url(#cadastreGrid)" />
                </svg>

                {/* Geospatial Cadastral Polygon Layer */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 350 200"
                >
                  {/* Outer Buffer Zone */}
                  <polygon
                    fill="none"
                    points="50,40 280,30 310,160 80,170"
                    stroke="#FFFFFF"
                    strokeDasharray="4 3"
                    strokeOpacity="0.4"
                    strokeWidth="2"
                  />
                  {/* Verified Farmland Parcel Polygon */}
                  <polygon
                    fill="#138808"
                    fillOpacity="0.35"
                    points="65,55 265,45 295,145 95,155"
                    stroke="#9DF6B9"
                    strokeWidth="2.5"
                  />
                  {/* Survey Traverse Sub-Plot Lines */}
                  <line
                    x1="165"
                    y1="50"
                    x2="195"
                    y2="150"
                    stroke="#9DF6B9"
                    strokeDasharray="3 3"
                    strokeOpacity="0.7"
                    strokeWidth="1"
                  />
                  <line
                    x1="80"
                    y1="105"
                    x2="280"
                    y2="95"
                    stroke="#9DF6B9"
                    strokeDasharray="3 3"
                    strokeOpacity="0.7"
                    strokeWidth="1"
                  />
                </svg>

                {/* 4 Interactive High-Precision GPS Corner Pins */}
                {/* Pin 1 (Top-Left) */}
                <button
                  type="button"
                  onClick={() => setSelectedPinId('P1')}
                  className="absolute top-10 left-10 flex flex-col items-center group"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full ring-2 ring-white shadow ${
                      selectedPinId === 'P1' ? 'bg-[#FF9933]' : 'bg-[#138808]'
                    }`}
                  />
                  <span className="bg-[#000080] text-white px-1.5 py-0.5 rounded font-tabular text-[10px] font-bold mt-1 border border-white/40">
                    {currentPlot.boundaryCoordinates[0].label}
                  </span>
                </button>

                {/* Pin 2 (Top-Right Active Saffron Highlight) */}
                <button
                  type="button"
                  onClick={() => setSelectedPinId('P2')}
                  className="absolute top-7 right-12 flex flex-col items-center"
                >
                  <span className="w-4 h-4 rounded-full bg-[#FF9933] ring-2 ring-white shadow-lg" />
                  <span className="bg-[#FF9933] text-black px-2 py-0.5 rounded font-tabular text-[10px] font-extrabold mt-1 shadow border border-black">
                    {currentPlot.boundaryCoordinates[1].label}
                  </span>
                </button>

                {/* Pin 3 (Bottom-Right) */}
                <button
                  type="button"
                  onClick={() => setSelectedPinId('P3')}
                  className="absolute bottom-10 right-8 flex flex-col items-center"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full ring-2 ring-white shadow ${
                      selectedPinId === 'P3' ? 'bg-[#FF9933]' : 'bg-[#138808]'
                    }`}
                  />
                  <span className="bg-[#000080] text-white px-1.5 py-0.5 rounded font-tabular text-[10px] font-bold mt-1 border border-white/40">
                    {currentPlot.boundaryCoordinates[2].label}
                  </span>
                </button>

                {/* Pin 4 (Bottom-Left) */}
                <button
                  type="button"
                  onClick={() => setSelectedPinId('P4')}
                  className="absolute bottom-9 left-16 flex flex-col items-center"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full ring-2 ring-white shadow ${
                      selectedPinId === 'P4' ? 'bg-[#FF9933]' : 'bg-[#138808]'
                    }`}
                  />
                  <span className="bg-[#000080] text-white px-1.5 py-0.5 rounded font-tabular text-[10px] font-bold mt-1 border border-white/40">
                    {currentPlot.boundaryCoordinates[3].label}
                  </span>
                </button>

                {/* Overlay Widgets (North Compass & Area Badge) */}
                <div className="absolute top-2.5 left-3 bg-black/80 rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-white/30">
                  <span className="text-[#FF9933] font-extrabold text-[11px] font-tabular">
                    ▲ N
                  </span>
                  <span className="text-white text-[10px] font-tabular font-bold">
                    0.04° DEV
                  </span>
                </div>

                <div className="absolute bottom-2.5 left-3 bg-[#138808] text-white text-[11px] font-extrabold px-2.5 py-1 rounded shadow flex items-center gap-1 border border-white/40">
                  <span className="material-symbols-outlined text-[14px]">
                    crop_free
                  </span>
                  <span>
                    Plot Area: {currentPlot.areaHectares} Ha (Illustrative)
                  </span>
                </div>

                <div className="absolute bottom-2.5 right-3 bg-black/80 text-white text-[11px] font-bold px-2.5 py-1 rounded flex items-center gap-1 font-tabular border border-white/30">
                  <span className="material-symbols-outlined text-[#9DF6B9] text-[13px]">
                    gps_fixed
                  </span>
                  <span>RTK ±2cm</span>
                </div>
              </div>

              {/* Coordinate Footer Matrix */}
              <div className="bg-[#E8EAF6] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[#000080]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    pin_drop
                  </span>
                  <span className="text-xs font-extrabold font-tabular">
                    Centroid: {currentPlot.centroidLat},{' '}
                    {currentPlot.centroidLng}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRequestDeviceGps}
                    className="text-xs font-extrabold text-[#000080] underline hover:text-[#138808]"
                  >
                    Verify Device GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapModalOpen(true)}
                    className="text-xs font-extrabold text-[#138808] uppercase tracking-wider hover:underline"
                  >
                    Expand Map
                  </button>
                </div>
              </div>

              {gpsStatus && (
                <div className="px-4 py-2 bg-[#FFDCC2] border-t border-[#FF9933] text-xs text-black font-semibold">
                  {gpsStatus}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols on desktop): Cryptographic QR Block + Soil Moisture & Pump Runtime + Actions */}
          <div
            className={`flex flex-col gap-4 ${
              compactMode ? '' : 'lg:col-span-5'
            }`}
          >
            {/* 4. Cryptographic QR Verification Block (Dynamic Scannable QRCodeComponent) */}
            <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-[#000080]">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <QRCodeComponent
                  lotId={activeQrLotId}
                  farmerName={currentLot.farmerName}
                  cropName={currentLot.cropName}
                  quantityQuintals={currentLot.quantityQuintals}
                  verificationStatus={currentLot.verificationStatus}
                  sha256Hash={currentLot.evidence.sha256Hash}
                  size={compactMode ? 96 : 116}
                  showControls={!compactMode}
                  onInspect={() => setPassportModalOpen(true)}
                  className="shrink-0"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between w-full">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#138808]" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#138808]">
                          Cryptographic Ledger Sealed
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-[#E8EAF6] text-[#000080] text-[10px] font-extrabold font-tabular">
                        ISO/IEC 18004 • ECC-H
                      </span>
                    </div>
                    <span className="text-xs font-tabular text-[#000080] font-extrabold block truncate mt-1">
                      Lot ID: {activeQrLotId}
                    </span>
                    <span className="text-[11px] font-tabular text-black font-bold block truncate mt-0.5">
                      SHA-256: {currentLot.evidence.sha256Hash.slice(0, 10)}...
                      {currentLot.evidence.sha256Hash.slice(-8)}
                    </span>
                    <p className="text-[11px] text-black font-medium mt-1 leading-snug">
                      Audited by {currentLot.evidence.labName} under AgriStack
                      Spec v2.4 (Demonstration Credential — Not a Government
                      Authority).
                    </p>
                  </div>

                  {!compactMode && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#000080]/15">
                      <label
                        htmlFor="custom-lot-qr-input"
                        className="block text-[10px] font-extrabold uppercase text-[#000080] mb-1"
                      >
                        Dynamic Lot ID QR Generator:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="custom-lot-qr-input"
                          type="text"
                          value={customLotIdInput}
                          onChange={(e) => setCustomLotIdInput(e.target.value)}
                          placeholder={currentLot.id}
                          className="flex-1 h-9 px-2.5 rounded bg-white text-black border border-[#000080]/40 text-xs font-tabular font-bold"
                        />
                        {customLotIdInput && (
                          <button
                            type="button"
                            onClick={() => setCustomLotIdInput('')}
                            className="h-9 px-2.5 rounded bg-[#E8EAF6] text-[#000080] text-[11px] font-extrabold"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-1 text-[#138808] text-xs font-extrabold">
                    <span className="material-symbols-outlined text-[16px]">
                      check_circle
                    </span>
                    <span>
                      {badgeMeta.isResidueFreeVerified
                        ? 'Zero MRL Exceedance Found'
                        : 'Pending Lab MRL Certificate'}
                    </span>
                  </div>
                </div>
              </div>

              {!compactMode && (
                <div className="mt-3">
                  <DetailAccordion
                    title="Inspect Full SHA-256 Digest & QR Payload URI"
                    subtitle="Cryptographic verification parameters & raw JSON credential"
                    badgeText={activeQrLotId}
                    icon="qr_code_2"
                  >
                    <div className="flex flex-col gap-2 text-xs font-tabular">
                      <div className="p-2 rounded bg-[#E8EAF6] text-black break-all">
                        <strong className="text-[#000080] block text-[10px] uppercase">
                          Full SHA-256 Digest:
                        </strong>
                        {currentLot.evidence.sha256Hash}
                      </div>
                      <pre className="p-2.5 rounded bg-[#00003C] text-white text-[10px] overflow-x-auto leading-relaxed">
                        {qrPayload}
                      </pre>
                    </div>
                  </DetailAccordion>
                </div>
              )}
            </div>

            {/* 5. IoT Telemetry Metrics Cards (Soil Moisture + Pump Runtime) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Soil Moisture Card with Semicircular Radial Gauge */}
              <div className="bg-white rounded-xl p-3.5 shadow-sm border-2 border-[#000080]/25 flex flex-col items-center text-center justify-between">
                <div className="w-full flex items-center justify-between pb-1">
                  <span className="text-[10px] uppercase font-extrabold text-[#000080]">
                    Soil Moisture
                  </span>
                  <span className="material-symbols-outlined text-[#138808] text-[18px]">
                    water_drop
                  </span>
                </div>

                <div className="relative w-28 h-16 flex items-end justify-center my-1">
                  <svg className="w-28 h-16" viewBox="0 0 100 55">
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="#E8EAF6"
                      strokeLinecap="round"
                      strokeWidth="9"
                    />
                    <path
                      d="M 10 50 A 40 40 0 0 1 76 22"
                      fill="none"
                      stroke="#138808"
                      strokeLinecap="round"
                      strokeWidth="9"
                    />
                  </svg>
                  <div className="absolute bottom-0 flex flex-col items-center">
                    <span className="text-xl font-extrabold text-[#000080] font-tabular leading-none">
                      {currentPlot.soilMoisturePercent}%
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[#138808] font-extrabold block">
                    Optimal Field Cap
                  </span>
                  <span className="text-[10px] text-black font-semibold block">
                    {currentPlot.soilSensorId} (Sample)
                  </span>
                </div>
              </div>

              {/* Pump Runtime Card */}
              <div className="bg-white rounded-xl p-3.5 shadow-sm border-2 border-[#000080]/25 flex flex-col justify-between">
                <div>
                  <div className="w-full flex items-center justify-between pb-1">
                    <span className="text-[10px] uppercase font-extrabold text-[#000080]">
                      Pump Runtime
                    </span>
                    <span className="material-symbols-outlined text-[#FF9933] text-[20px]">
                      solar_power
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-2">
                    <div className="w-10 h-10 rounded-full bg-[#E8F5E9] border border-[#138808] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#138808] text-[22px]">
                        eco
                      </span>
                    </div>
                    <div>
                      <span className="text-lg sm:text-xl font-extrabold text-[#000080] font-tabular leading-none block">
                        {currentPlot.pumpRuntimeDisplay}
                      </span>
                      <span className="text-[11px] text-[#138808] font-extrabold block mt-0.5">
                        Today (Solar Synced)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#E8F5E9] border border-[#138808]/30 rounded p-2 mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-black font-bold">
                    Micro-Drip Line
                  </span>
                  <span className="text-[11px] text-[#006B3C] font-extrabold font-tabular">
                    {currentPlot.pumpLitresDelivered.toLocaleString('en-IN')} L
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Primary Institutional Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPassportModalOpen(true)}
                className="w-full min-h-[48px] py-2.5 px-4 bg-[#138808] hover:bg-[#006B3C] text-white rounded-lg font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  assignment_turned_in
                </span>
                <span>View Verified Passport (पासपोर्ट खोलें)</span>
              </button>

              <button
                type="button"
                onClick={handleSharePassport}
                className="w-full min-h-[48px] py-2.5 px-4 bg-white hover:bg-[#E8EAF6] text-[#000080] border-2 border-[#000080] rounded-lg font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  send_to_mobile
                </span>
                <span>Share Lot Details with Mandi / FPO</span>
              </button>

              {!compactMode && (
                <button
                  type="button"
                  onClick={() => navigate('/market-comparison')}
                  className="w-full min-h-[44px] py-2 px-4 bg-[#000080] hover:bg-[#00003C] text-white rounded-lg font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Proceed to Buyer Match &amp; Net-Pocket Arbitrage</span>
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: VERIFICATION EVIDENCE & LAB AUDIT */}
      {evidenceModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="evidence-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-3 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="evidence-modal-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Lot Verification Evidence ({currentLot.id})
              </h2>
              <button
                type="button"
                onClick={() => setEvidenceModalOpen(false)}
                aria-label="Close evidence dialog"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs text-black">
              <div className="p-3 rounded bg-[#E8F5E9] border border-[#138808]">
                <span className="font-extrabold text-[#138808] block uppercase">
                  Verification Status: {badgeMeta.titleEn}
                </span>
                <p className="mt-1 font-medium">{badgeMeta.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-tabular">
                <div className="p-2.5 rounded bg-[#E8EAF6]">
                  <span className="text-[10px] font-bold text-[#000080] block uppercase">
                    Testing Lab
                  </span>
                  <span className="font-extrabold">
                    {currentLot.evidence.labName}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#E8EAF6]">
                  <span className="text-[10px] font-bold text-[#000080] block uppercase">
                    Certificate ID
                  </span>
                  <span className="font-extrabold">
                    {currentLot.evidence.certificateNumber}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#E8EAF6]">
                  <span className="text-[10px] font-bold text-[#000080] block uppercase">
                    Moisture Content
                  </span>
                  <span className="font-extrabold text-[#138808]">
                    {currentLot.evidence.moisturePercent}% (Pass &lt;12%)
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#E8EAF6]">
                  <span className="text-[10px] font-bold text-[#000080] block uppercase">
                    Foreign Matter
                  </span>
                  <span className="font-extrabold text-[#138808]">
                    {currentLot.evidence.foreignMatterPercent}% (Pass &lt;2%)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#FFDCC2] border border-[#FF9933] font-semibold">
                <strong>Non-Government Credential Disclaimer:</strong> This
                digital crop passport is an illustrative Kisan-SPO platform
                record. It does not represent a statutory government-issued
                certification authority.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEvidenceModalOpen(false)}
              className="w-full py-2.5 rounded bg-[#000080] text-white text-xs font-extrabold"
            >
              Close Evidence Record
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL CRYPTOGRAPHIC QR & CREDENTIAL PAYLOAD */}
      {passportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="passport-qr-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="passport-qr-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Verified Digital Crop Passport &amp; QR Payload
              </h2>
              <button
                type="button"
                onClick={() => setPassportModalOpen(false)}
                aria-label="Close passport dialog"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#E8EAF6] p-4 rounded-xl border border-[#000080]/30">
              <QRCodeComponent
                lotId={activeQrLotId}
                farmerName={currentLot.farmerName}
                cropName={currentLot.cropName}
                quantityQuintals={currentLot.quantityQuintals}
                verificationStatus={currentLot.verificationStatus}
                sha256Hash={currentLot.evidence.sha256Hash}
                size={148}
                showControls={true}
              />
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-extrabold text-[#138808] uppercase">
                  {currentLot.verificationStatus.replace(/_/g, ' ')}
                </span>
                <span className="text-base font-extrabold text-[#000080]">
                  {currentLot.farmerName} • {currentLot.cropName}
                </span>
                <span className="font-tabular font-bold">
                  Lot ID: {currentLot.id} ({currentLot.quantityQuintals}{' '}
                  Quintals)
                </span>
                <span className="font-tabular font-semibold">
                  Plot: {currentLot.surveyNumber} ({currentLot.plotAreaHectares}{' '}
                  Ha)
                </span>
                <span className="font-tabular font-semibold">
                  Harvest Date: {currentLot.harvestDate}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase text-[#000080] block mb-1">
                Encoded Structured JSON Credential Payload:
              </span>
              <pre className="p-3 rounded bg-[#00003C] text-white text-[11px] font-tabular overflow-x-auto leading-relaxed">
                {qrPayload}
              </pre>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSharePassport}
                className="px-4 py-2 rounded bg-[#138808] text-white text-xs font-extrabold"
              >
                Copy / Share Payload
              </button>
              <button
                type="button"
                onClick={() => setPassportModalOpen(false)}
                className="px-4 py-2 rounded bg-[#000080] text-white text-xs font-extrabold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EXPANDED CADASTRAL GEO-FENCE & 4 CORNER COORDINATES */}
      {mapModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="map-modal-title"
                className="text-base font-extrabold text-[#000080]"
              >
                4-Point GPS Boundary Coordinates ({currentPlot.surveyNumber})
              </h2>
              <button
                type="button"
                onClick={() => setMapModalOpen(false)}
                aria-label="Close coordinate details"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-tabular">
              {currentPlot.boundaryCoordinates.map((pin) => (
                <div
                  key={pin.id}
                  className={`p-3 rounded-lg border-2 ${
                    pin.isReference
                      ? 'bg-[#FFDCC2] border-[#FF9933] text-black'
                      : 'bg-[#E8EAF6] border-[#000080]/30 text-black'
                  }`}
                >
                  <span className="font-extrabold block text-[#000080]">
                    Corner {pin.id} {pin.isReference ? '(Active RTK Ref)' : ''}
                  </span>
                  <span className="block mt-0.5 font-bold">
                    Lat: {pin.latDisplay}
                  </span>
                  <span className="block font-bold">Lng: {pin.lngDisplay}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-black font-semibold">
              Note: Above boundary points represent illustrative sample farm
              plot coordinates in Khandwa District, Madhya Pradesh.
            </p>

            <button
              type="button"
              onClick={() => setMapModalOpen(false)}
              className="w-full py-2.5 rounded bg-[#000080] text-white text-xs font-extrabold"
            >
              Close Boundary Table
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
