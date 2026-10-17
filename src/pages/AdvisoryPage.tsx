import React, { useEffect, useRef, useState } from 'react';
import { useKisan } from '../context/KisanContext';
import { ADVISORY_SPECIMENS } from '../data/kisanData';

interface AdvisoryPageProps {
  compactMode?: boolean;
}

export const AdvisoryPage: React.FC<AdvisoryPageProps> = ({
  compactMode = false,
}) => {
  const { showToast, navigate } = useKisan();

  const [specimenIndex, setSpecimenIndex] = useState<number>(0);
  const specimen = ADVISORY_SPECIMENS[specimenIndex];

  const [scannerStatus, setScannerStatus] = useState<
    'IDLE_DEMO' | 'SCANNING' | 'CAMERA_ACTIVE' | 'CAMERA_ERROR' | 'UPLOADED'
  >('IDLE_DEMO');
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string>('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [imgFallback, setImgFallback] = useState<boolean>(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioSeconds, setAudioSeconds] = useState<number>(32);
  const [barHeights, setBarHeights] = useState<number[]>([
    12, 20, 28, 16, 24, 32, 20, 28, 12, 24, 16, 28, 20, 10,
  ]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');

  // Modals
  const [bottleScanModalOpen, setBottleScanModalOpen] =
    useState<boolean>(false);
  const [selectedBottleCode, setSelectedBottleCode] = useState<
    'RESTRICTED_TRIAZOLE' | 'APPROVED_TRICHODERMA'
  >('RESTRICTED_TRIAZOLE');
  const [guidanceModalOpen, setGuidanceModalOpen] = useState<boolean>(false);
  const [expertModalOpen, setExpertModalOpen] = useState<boolean>(false);
  const [expertQueryText, setExpertQueryText] = useState<string>('');
  const [expertTicketSubmitted, setExpertTicketSubmitted] =
    useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Audio waveform timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAudioSeconds((prev) => (prev >= 75 ? 0 : prev + 1));
      setBarHeights((prev) =>
        prev.map((_, idx) => ((idx * 7 + Date.now()) % 22) + 8)
      );
    }, 300);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScannerStatus('IDLE_DEMO');
  };

  const handleStartLiveCamera = async () => {
    setCameraErrorMsg('');
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setScannerStatus('CAMERA_ERROR');
      setCameraErrorMsg(
        'Camera hardware API is unavailable in this browser context. Using high-resolution field specimen demonstration mode.'
      );
      showToast(
        'Camera unavailable — showing illustrative field specimen #0942.',
        'saffron'
      );
      return;
    }

    try {
      setScannerStatus('SCANNING');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setScannerStatus('CAMERA_ACTIVE');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
      showToast(
        'Live camera feed active. Note: Disease detection uses demonstration rules.',
        'green'
      );
    } catch {
      setScannerStatus('CAMERA_ERROR');
      setCameraErrorMsg(
        'Camera permission was denied or no camera device was found. You can upload a leaf photo or use the demonstration specimen.'
      );
      showToast(
        'Camera permission denied. Switched to fallback specimen view.',
        'saffron'
      );
    }
  };

  const handleTriggerRescan = () => {
    setScannerStatus('SCANNING');
    setTimeout(() => {
      setSpecimenIndex((prev) => (prev + 1) % ADVISORY_SPECIMENS.length);
      setScannerStatus(uploadedImageUrl ? 'UPLOADED' : 'IDLE_DEMO');
      showToast(
        `Scanned next specimen: ${
          ADVISORY_SPECIMENS[(specimenIndex + 1) % ADVISORY_SPECIMENS.length]
            .specimenCode
        } (Demonstration Analysis)`,
        'green'
      );
    }, 650);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        stopCamera();
        setUploadedImageUrl(reader.result);
        setScannerStatus('UPLOADED');
        showToast(
          'Uploaded leaf image loaded for demonstration analysis.',
          'green'
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const togglePlayAudio = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (nextState) {
        const utterance = new SpeechSynthesisUtterance(
          specimen.hindiTranscript.replace(/[“”"]/g, '')
        );
        utterance.lang = 'hi-IN';
        utterance.rate = 0.95;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => {
          // Keep visual waveform running even if TTS voice pack is absent
        };
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleToggleVoiceQuery = () => {
    if (isRecording) {
      setIsRecording(false);
      setVoiceTranscript(
        '“क्या मैं कटाई से 8 दिन पहले ट्राइकोडर्मा का छिड़काव सुबह के समय कर सकता हूँ?” (Simulated Voice Transcript — Verify with FPO Officer)'
      );
      showToast(
        'Voice query captured (Demonstration transcript preview).',
        'blue'
      );
    } else {
      setIsRecording(true);
      setVoiceTranscript('Listening via microphone (बोलिए...)...');
      setTimeout(() => {
        setIsRecording(false);
        setVoiceTranscript(
          '“क्या मैं कटाई से 8 दिन पहले ट्राइकोडर्मा का छिड़काव सुबह के समय कर सकता हूँ?” (Simulated Voice Transcript — Verify with FPO Officer)'
        );
      }, 2800);
    }
  };

  const formatAudioTime = (secs: number) => {
    const mins = String(Math.floor(secs / 60)).padStart(2, '0');
    const rem = String(secs % 60).padStart(2, '0');
    return `${mins}:${rem}`;
  };

  return (
    <div className="w-full bg-white text-black">
      {/* Top Institutional Ticker / Mandi Status Strip */}
      <div className="w-full bg-[#000080] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9DF6B9]" />
          <span className="text-[11px] uppercase tracking-wider text-[#9DF6B9] font-extrabold">
            Mandi Surveillance Active (Demo Analysis)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-white font-medium">MRL Thresholds:</span>
          <span className="font-extrabold text-white bg-[#138808] px-2 py-0.5 rounded">
            FSSAI / APEDA STDS
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div
        className={`mx-auto w-full ${
          compactMode ? 'p-3' : 'max-w-6xl px-4 sm:px-6 py-4'
        }`}
      >
        {/* Screen Identity Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#000080]/15">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#000080] tracking-tight">
                Monitor &amp; Safe Advisory
              </h1>
              <span className="material-symbols-outlined material-symbols-filled text-[#138808] text-[22px]">
                verified
              </span>
              <span className="px-2 py-0.5 rounded bg-[#E8EAF6] text-[#000080] text-[10px] font-extrabold uppercase">
                Illustrative AI Demo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-black font-bold font-hindi mt-0.5">
              फसल निगरानी और सुरक्षित रासायनिक सलाह
            </p>
          </div>

          {!compactMode && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-lg bg-[#E8EAF6] text-[#000080] border border-[#000080]/30 text-xs font-extrabold flex items-center gap-1.5 min-h-[40px] hover:bg-[#000080] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  upload_file
                </span>
                <span>Upload Leaf Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload crop leaf image"
              />
              <button
                type="button"
                onClick={() => navigate('/crop-passport')}
                className="px-3 py-2 rounded-lg bg-[#138808] text-white text-xs font-extrabold flex items-center gap-1.5 min-h-[40px] hover:bg-[#006B3C] transition-colors"
              >
                <span>Open Crop Passport</span>
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Responsive Grid: 1 col on mobile/compact, 12-col split on desktop */}
        <div
          className={`mt-4 grid grid-cols-1 ${
            compactMode ? 'gap-3.5' : 'lg:grid-cols-12 gap-5 items-start'
          }`}
        >
          {/* LEFT COLUMN (7 cols on desktop): Camera Viewfinder + PHI Saffron Warning */}
          <div
            className={`flex flex-col gap-4 ${
              compactMode ? '' : 'lg:col-span-7'
            }`}
          >
            {/* 1. Live Crop Scanner Viewfinder */}
            <div className="w-full rounded-xl bg-[#00003C] text-white overflow-hidden shadow-md border-2 border-[#000080] flex flex-col relative">
              <div
                className={`relative w-full ${
                  compactMode ? 'h-52' : 'h-64 sm:h-72'
                } bg-[#00003C] flex items-center justify-center overflow-hidden`}
              >
                {scannerStatus === 'CAMERA_ACTIVE' ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : uploadedImageUrl ? (
                  <img
                    src={uploadedImageUrl}
                    alt="User uploaded crop foliage specimen for demonstration analysis"
                    className="w-full h-full object-cover select-none"
                  />
                ) : !imgFallback ? (
                  <img
                    src={specimen.imageUrl}
                    alt="Macro daylight photograph of agricultural crop leaf displaying circular fungal leaf spot lesions"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFallback(true)}
                    className="w-full h-full object-cover select-none"
                  />
                ) : (
                  /* Resilient SVG Fallback if image fails */
                  <div className="w-full h-full bg-[#006B3C] flex flex-col items-center justify-center p-4 text-center">
                    <span className="material-symbols-outlined text-[#9DF6B9] text-[56px]">
                      eco
                    </span>
                    <span className="text-sm font-extrabold text-white mt-2">
                      {specimen.cropName} — {specimen.diseaseName}
                    </span>
                    <span className="text-xs text-[#9DF6B9] mt-1">
                      High-Contrast Vector Botanical Specimen View
                    </span>
                  </div>
                )}

                {/* High-Contrast Daylight Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#00003C]/90 via-transparent to-[#00003C]/50 pointer-events-none" />

                {/* Computer Vision Reticle & Corner Brackets */}
                <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="w-7 h-7 border-t-4 border-l-4 border-[#9DF6B9] rounded-tl" />
                    <div className="bg-[#00003C]/90 px-3 py-1 rounded-full border border-[#9DF6B9] flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#9DF6B9]" />
                      <span className="text-[10px] text-white font-extrabold tracking-wider uppercase">
                        {scannerStatus === 'SCANNING'
                          ? 'ANALYZING LEAF...'
                          : scannerStatus === 'CAMERA_ACTIVE'
                          ? 'LIVE CAMERA STREAM'
                          : 'DEMO CV TARGET'}
                      </span>
                    </div>
                    <div className="w-7 h-7 border-t-4 border-r-4 border-[#9DF6B9] rounded-tr" />
                  </div>

                  {/* Center Target Reticle */}
                  <div className="self-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#9DF6B9] flex items-center justify-center bg-[#00003C]/40">
                      <div className="w-3 h-3 bg-[#FF9933] rounded-full border border-white" />
                    </div>
                    <div className="mt-1.5 bg-white text-[#000080] px-2.5 py-0.5 rounded shadow border border-[#000080]">
                      <span className="text-[11px] font-extrabold font-tabular">
                        {specimen.scientificName}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="w-7 h-7 border-b-4 border-l-4 border-[#9DF6B9] rounded-bl" />
                    <div className="w-7 h-7 border-b-4 border-r-4 border-[#9DF6B9] rounded-br" />
                  </div>
                </div>

                {/* Top-Left Match Confidence Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#138808] text-white px-2.5 py-1 rounded shadow border border-white/40 pointer-events-none">
                  <span className="material-symbols-outlined text-[16px]">
                    psychology
                  </span>
                  <span className="text-[11px] font-extrabold font-tabular">
                    {specimen.matchConfidence}% Match • उच्च सटीकता (Demo)
                  </span>
                </div>

                {/* Bottom Viewfinder Controls Tray */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                  <button
                    type="button"
                    onClick={() => setBottleScanModalOpen(true)}
                    className="bg-white text-[#000080] border-2 border-[#000080] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md hover:bg-[#E8EAF6] min-h-[40px]"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      barcode_scanner
                    </span>
                    <span className="text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                      Scan Bottle / पैक
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    {scannerStatus === 'CAMERA_ACTIVE' ? (
                      <button
                        type="button"
                        onClick={stopCamera}
                        aria-label="Stop Live Camera"
                        className="px-3 h-10 rounded-full bg-[#FF9933] text-black font-extrabold text-xs flex items-center gap-1 shadow"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          videocam_off
                        </span>
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleTriggerRescan}
                        aria-label="Switch or Re-focus Specimen"
                        title="Switch Specimen / Re-scan"
                        className="w-10 h-10 rounded-full bg-[#000080] text-white border border-white flex items-center justify-center shadow hover:bg-[#00003C]"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          refresh
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleStartLiveCamera}
                      aria-label="Capture or Start Camera Scan"
                      title="Start Live Camera Scan"
                      className="w-12 h-12 rounded-full bg-[#138808] text-white border-2 border-white flex items-center justify-center shadow-lg hover:bg-[#006B3C]"
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        photo_camera
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Camera Error Notice if triggered */}
              {scannerStatus === 'CAMERA_ERROR' && cameraErrorMsg && (
                <div className="bg-[#FFDCC2] text-black px-3 py-2 border-t border-[#FF9933] flex items-center justify-between gap-2 text-xs font-semibold">
                  <span>{cameraErrorMsg}</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded bg-[#000080] text-white font-bold whitespace-nowrap shrink-0"
                  >
                    Upload Photo
                  </button>
                </div>
              )}

              {/* Telemetry Strip below camera preview */}
              <div className="bg-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-black border-t border-[#000080]/20">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#138808] text-[18px]">
                    nature
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#000080]">
                    Target: {specimen.diseaseName} ({specimen.diseaseNameHi})
                  </span>
                </div>
                <span className="text-[11px] bg-[#E8EAF6] border border-[#000080]/20 px-2.5 py-0.5 rounded text-[#000080] font-extrabold font-tabular">
                  {specimen.specimenCode}
                </span>
              </div>
            </div>

            {/* 2. Chemical Safety Warning (Statutory Pre-Harvest Interval Block) — SAFFRON #FF9933 */}
            <div className="w-full bg-[#FF9933] text-black rounded-xl p-4 shadow-sm border-2 border-black relative overflow-hidden flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-black text-[#FF9933] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      warning
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold block text-black">
                      STATUTORY NOTICE • वैधानिक चेतावनी
                    </span>
                    <h2 className="text-base sm:text-lg text-black font-extrabold leading-tight">
                      PHI Waiting Period: {specimen.phiDaysRemaining} Days Left
                    </h2>
                  </div>
                </div>
                <div className="bg-black text-[#FF9933] px-2.5 py-1 rounded text-right shrink-0">
                  <span className="text-[11px] font-extrabold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      lock
                    </span>
                    BLOCKED
                  </span>
                </div>
              </div>

              <div className="bg-white/90 rounded-lg p-3 border border-black relative z-10">
                <p className="text-sm font-extrabold text-black font-hindi leading-snug">
                  कटाई से पहले {specimen.phiDaysRemaining} दिन प्रतीक्षा करें
                  (Pre-Harvest Interval Active)
                </p>
                <p className="text-xs text-black font-semibold mt-1 leading-relaxed">
                  <strong>What is PHI?</strong> Pre-Harvest Interval is the
                  mandatory safety waiting period between applying a pesticide
                  and harvesting the crop. Synthetic fungicide applications are
                  strictly prohibited right now—spraying chemicals within{' '}
                  {specimen.phiDaysRemaining} days of harvest will exceed
                  Maximum Residue Limits (MRL) and trigger lot rejection at
                  mandi weighbridges and buyer laboratories.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 relative z-10">
                <div className="flex items-center gap-1.5 text-black">
                  <span className="material-symbols-outlined text-[18px]">
                    do_not_disturb_on
                  </span>
                  <span className="text-xs font-extrabold line-through">
                    {specimen.restrictedChemicalName}
                  </span>
                </div>
                <span className="bg-black text-white px-2.5 py-1 rounded text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 font-hindi">
                  <span className="material-symbols-outlined text-[14px]">
                    gavel
                  </span>
                  मंडी पाबंदी लागू (Restricted)
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols on desktop): Safe Generic Remedy + Hindi Voice Assistant + Primary CTAs */}
          <div
            className={`flex flex-col gap-4 ${
              compactMode ? '' : 'lg:col-span-5'
            }`}
          >
            {/* 3. Safe Generic Remedy Card */}
            <div className="w-full bg-white rounded-xl shadow-sm border-2 border-[#138808] overflow-hidden flex flex-col">
              <div className="bg-[#138808] px-4 py-2.5 flex items-center justify-between gap-2 text-white">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px]">
                    verified
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold">
                    Safe Generic Remedy (सुरक्षित जैविक उपचार)
                  </span>
                </div>
                <span className="text-[10px] bg-white text-[#006B3C] px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
                  ZERO MRL RESIDUE
                </span>
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-[10px] text-[#138808] uppercase font-extrabold tracking-wider">
                      BIO-FUNGICIDE SOLUTION
                    </span>
                    <h3 className="text-lg sm:text-xl text-[#000080] font-extrabold mt-0.5">
                      {specimen.remedyName}
                    </h3>
                    <p className="text-xs text-black font-medium mt-1 leading-relaxed">
                      Biological disease-management option. Natural antagonist
                      against foliage pathogens with zero synthetic chemical
                      residue withholding requirement.
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-lg bg-[#E8F5E9] border border-[#138808] flex flex-col items-center justify-center shrink-0 text-center p-1">
                    <span className="material-symbols-outlined text-[#138808] text-[26px]">
                      eco
                    </span>
                    <span className="text-[10px] text-[#000080] font-extrabold">
                      100% Bio
                    </span>
                  </div>
                </div>

                {/* Dosage & PHI Period */}
                <div className="grid grid-cols-2 gap-2.5 bg-[#E8F5E9] p-3 rounded-lg border border-[#138808]/30">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-black font-bold font-hindi">
                      अनुशंसित मात्रा (Dosage)
                    </span>
                    <span className="text-xs sm:text-sm text-[#000080] font-extrabold font-tabular mt-0.5">
                      {specimen.dosage}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-black font-bold font-hindi">
                      प्रतीक्षा अवधि (PHI Period)
                    </span>
                    <span className="text-xs sm:text-sm text-[#138808] font-extrabold mt-0.5">
                      0 Days (Safe to harvest)
                    </span>
                  </div>
                </div>

                {/* Mandatory Safety Disclaimer */}
                <div className="p-2.5 rounded bg-[#E8EAF6] border border-[#000080]/20 text-[11px] text-black font-medium leading-snug">
                  <strong className="text-[#000080] font-extrabold">
                    Agricultural Safety Disclaimer:
                  </strong>{' '}
                  An AI visual scan alone never validates pesticide legality or
                  agronomic safety. Confirm crop-specific compatibility, water
                  volume, and CIB&amp;RC label instructions with your local FPO
                  extension officer before application.
                </div>

                <div className="flex items-center justify-between pt-1 gap-2">
                  <span className="text-[11px] text-black font-bold italic">
                    *CIB&amp;RC Bio-Input Protocol
                  </span>
                  <button
                    type="button"
                    onClick={() => setGuidanceModalOpen(true)}
                    className="px-3.5 py-2 bg-[#000080] text-white rounded-lg text-xs font-extrabold flex items-center gap-1 hover:bg-[#00003C] min-h-[40px]"
                  >
                    <span>View Full Guidance</span>
                    <span className="material-symbols-outlined text-[16px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Hindi Voice Assistant Module */}
            <div className="w-full bg-white rounded-xl p-4 shadow-sm border-2 border-[#000080]/25 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#138808] flex items-center justify-center text-white shrink-0">
                    <span className="material-symbols-outlined text-[18px]">
                      record_voice_over
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base text-[#000080] font-extrabold">
                      Kisan Voice Advisor
                    </h4>
                    <span className="text-[11px] text-[#138808] font-extrabold font-hindi block">
                      हिंदी ऑडियो विश्लेषण उपलब्ध
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleVoiceQuery}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 min-h-[36px] border ${
                    isRecording
                      ? 'bg-[#FF9933] text-black border-black'
                      : 'bg-[#E8EAF6] text-[#000080] border-[#000080]/30 hover:bg-[#000080] hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isRecording ? 'stop_circle' : 'mic'}
                  </span>
                  <span>{isRecording ? 'Stop Mic' : 'Voice Query'}</span>
                </button>
              </div>

              {/* Audio Player Control & Waveform Container */}
              <div className="bg-[#E8EAF6] rounded-lg p-3 flex items-center gap-3 border border-[#000080]/20">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  aria-label={
                    isPlaying ? 'Pause Advisory Audio' : 'Play Advisory Audio'
                  }
                  className="w-12 h-12 rounded-full bg-[#138808] text-white flex items-center justify-center shrink-0 shadow hover:bg-[#006B3C]"
                >
                  <span className="material-symbols-outlined material-symbols-filled text-[28px]">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div
                    className="flex items-end justify-between h-8 px-1 gap-1"
                    aria-hidden="true"
                  >
                    {barHeights.map((h, i) => (
                      <span
                        key={i}
                        style={{ height: `${h}px` }}
                        className={`w-1.5 rounded-full transition-all duration-150 ${
                          i % 2 === 0 ? 'bg-[#138808]' : 'bg-[#000080]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-black text-[11px] font-extrabold font-tabular">
                    <span className="text-[#138808]">
                      {formatAudioTime(audioSeconds)}
                    </span>
                    <span>01:15</span>
                  </div>
                </div>
              </div>

              {/* Hindi Audio Transcript Readout */}
              <div className="bg-[#E8F5E9] border border-[#138808]/30 px-3 py-2.5 rounded-lg text-black leading-relaxed">
                <p className="text-xs sm:text-sm font-bold text-black font-hindi">
                  {specimen.hindiTranscript}
                </p>
                <p className="text-[11px] font-medium text-black mt-1">
                  {specimen.englishTranscript}
                </p>
              </div>

              {/* Voice Query Transcript Preview if recorded */}
              {voiceTranscript && (
                <div className="bg-[#FFDCC2] border border-[#FF9933] px-3 py-2 rounded-lg text-xs text-black font-semibold">
                  <span className="font-extrabold uppercase text-[#371A00] block text-[10px]">
                    Voice Query Transcript Preview:
                  </span>
                  {voiceTranscript}
                </div>
              )}
            </div>

            {/* 5. Primary Action Deck */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleTriggerRescan}
                className="w-full min-h-[48px] py-2.5 px-4 bg-[#138808] hover:bg-[#006B3C] text-white rounded-lg flex items-center justify-center gap-2 shadow font-extrabold text-sm uppercase tracking-wider transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">
                  center_focus_strong
                </span>
                <span>Scan Next Crop Leaf (नई पत्ती स्कैन करें)</span>
              </button>

              <button
                type="button"
                onClick={() => setExpertModalOpen(true)}
                className="w-full min-h-[48px] py-2.5 px-4 bg-white hover:bg-[#E8EAF6] text-[#000080] border-2 border-[#000080] rounded-lg flex items-center justify-center gap-2 shadow-sm font-extrabold text-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[#000080] text-[20px]">
                  support_agent
                </span>
                <span>Ask Agricultural Extension Officer (विशेषज्ञ सहायता)</span>
              </button>
            </div>

            {/* Regulatory Bottom Mark */}
            <div className="text-center py-1 flex items-center justify-center gap-1.5 text-black text-[11px] font-bold">
              <span className="material-symbols-outlined text-[#000080] text-[15px]">
                policy
              </span>
              <span>
                National Pest &amp; Residue Monitoring System (NPRMS) Protocol
                Compliant
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: PESTICIDE PRODUCT SCANNER INTERFACE */}
      {bottleScanModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bottle-scan-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#000080] block">
                  PESTICIDE PRODUCT BARCODE &amp; PHI SCANNER
                </span>
                <h2
                  id="bottle-scan-title"
                  className="text-lg font-extrabold text-[#000080]"
                >
                  Verify Chemical Bottle Legality &amp; Waiting Period
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setBottleScanModalOpen(false)}
                aria-label="Close product scanner"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedBottleCode('RESTRICTED_TRIAZOLE')}
                className={`p-2.5 rounded-lg border-2 text-xs font-extrabold text-left ${
                  selectedBottleCode === 'RESTRICTED_TRIAZOLE'
                    ? 'bg-[#FF9933] text-black border-black'
                    : 'bg-white text-black border-[#000080]/30'
                }`}
              >
                Sample Bottle A: Synthetic Triazole 25% EC (Restricted)
              </button>
              <button
                type="button"
                onClick={() => setSelectedBottleCode('APPROVED_TRICHODERMA')}
                className={`p-2.5 rounded-lg border-2 text-xs font-extrabold text-left ${
                  selectedBottleCode === 'APPROVED_TRICHODERMA'
                    ? 'bg-[#138808] text-white border-[#006B3C]'
                    : 'bg-white text-black border-[#000080]/30'
                }`}
              >
                Sample Pack B: Trichoderma viride 1.0% WP (Bio-Safe)
              </button>
            </div>

            {selectedBottleCode === 'RESTRICTED_TRIAZOLE' ? (
              <div className="p-4 rounded-xl bg-[#FF9933] text-black border-2 border-black flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase bg-black text-[#FF9933] px-2 py-0.5 rounded">
                    RESTRICTED CHEMICAL — DO NOT SPRAY
                  </span>
                  <span className="text-xs font-extrabold font-tabular">
                    Label PHI: 30 Days
                  </span>
                </div>
                <h3 className="text-base font-extrabold">
                  Synthetic Triazole / Carbendazim Fungicide
                </h3>
                <p className="text-xs font-semibold leading-relaxed">
                  Your registered harvest date is in{' '}
                  <strong>8 days (18 Oct 2026)</strong>, while this synthetic
                  chemical requires a minimum <strong>30-day</strong>{' '}
                  Pre-Harvest Interval (PHI). Application now is blocked under
                  e-NAM / APEDA residue standards.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#E8F5E9] text-black border-2 border-[#138808] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase bg-[#138808] text-white px-2 py-0.5 rounded">
                    BIO-INPUT COMPATIBLE — 0 DAY PHI
                  </span>
                  <span className="text-xs font-extrabold text-[#138808] font-tabular">
                    Label PHI: 0 Days
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#000080]">
                  Trichoderma viride 1.0% WP (Bio-Fungicide)
                </h3>
                <p className="text-xs font-semibold leading-relaxed">
                  Biological antagonist formulation with zero synthetic residue.
                  Caveat: Always verify batch expiry, crop-specific label
                  instructions, and foliar moisture guidelines before spraying.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setBottleScanModalOpen(false)}
              className="w-full py-2.5 rounded-lg bg-[#000080] text-white text-xs font-extrabold"
            >
              Close Product Scanner
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL REMEDY GUIDANCE */}
      {guidanceModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guidance-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#138808] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="guidance-modal-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Biological Treatment Guidance: {specimen.remedyName}
              </h2>
              <button
                type="button"
                onClick={() => setGuidanceModalOpen(false)}
                aria-label="Close guidance modal"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-black flex flex-col gap-2 leading-relaxed">
              <p>
                <strong>1. Recommended Dilution:</strong> Mix {specimen.dosage}{' '}
                in clean, non-chlorinated water. Apply during late afternoon or
                early morning to protect live biological spores from intense UV
                sunlight.
              </p>
              <p>
                <strong>2. Tank Cleanliness:</strong> Do not use a sprayer tank
                that previously held synthetic chemical fungicides or herbicides,
                as trace chemical residues will both kill the biological agent
                and contaminate the harvest lot.
              </p>
              <p className="p-2.5 rounded bg-[#FFDCC2] border border-[#FF9933] font-semibold">
                <strong>3. Mandatory Safety Caveat:</strong> This advisory is an
                illustrative decision-support demonstration. Always read the
                physical CIB&amp;RC-approved product label and confirm with a
                certified agronomist before field application.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGuidanceModalOpen(false)}
              className="w-full py-2.5 rounded bg-[#138808] text-white text-xs font-extrabold"
            >
              Acknowledge Safety Guidance
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: ASK AGRICULTURAL EXTENSION OFFICER */}
      {expertModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expert-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-white border-2 border-[#000080] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#000080]/20 pb-2">
              <h2
                id="expert-modal-title"
                className="text-base font-extrabold text-[#000080]"
              >
                Consult FPO Agricultural Extension Officer
              </h2>
              <button
                type="button"
                onClick={() => setExpertModalOpen(false)}
                aria-label="Close extension officer dialog"
                className="w-9 h-9 rounded border border-[#000080]/30 font-bold"
              >
                ✕
              </button>
            </div>

            {expertTicketSubmitted ? (
              <div className="p-4 rounded-lg bg-[#E8F5E9] border border-[#138808] text-xs text-black flex flex-col gap-2">
                <span className="font-extrabold text-[#138808] text-sm">
                  ✓ Advisory Request Logged (Demo Ticket #KVK-409)
                </span>
                <p>
                  Assigned to: <strong>Dr. A. K. Sharma (Khandwa KVK Desk)</strong>.
                  Specimen {specimen.specimenCode} and PHI status attached.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setExpertTicketSubmitted(false);
                    setExpertModalOpen(false);
                  }}
                  className="mt-2 py-2 rounded bg-[#138808] text-white font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <label
                  htmlFor="expert-question-input"
                  className="text-xs font-bold text-black"
                >
                  Describe field symptoms or upload label question for KVK
                  Agronomist:
                </label>
                <textarea
                  id="expert-question-input"
                  rows={3}
                  value={expertQueryText}
                  onChange={(e) => setExpertQueryText(e.target.value)}
                  placeholder="e.g., Please verify Trichoderma viride dosage for 2.4 Ha plot 8 days before harvest..."
                  className="w-full p-2.5 rounded border-2 border-[#000080]/40 text-xs text-black focus:border-[#000080] focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setExpertModalOpen(false)}
                    className="px-4 py-2 rounded border border-[#000080] text-[#000080] text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpertTicketSubmitted(true);
                      showToast(
                        'Sent specimen #0942 to FPO Extension Officer (Demo).',
                        'green'
                      );
                    }}
                    className="px-4 py-2 rounded bg-[#138808] text-white text-xs font-extrabold"
                  >
                    Submit to Agronomist
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
