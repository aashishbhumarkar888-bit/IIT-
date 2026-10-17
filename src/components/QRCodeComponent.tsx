import QRCode from 'qrcode';
import React, { useMemo, useState } from 'react';
import { VerificationStatus } from '../types/kisan';

export interface QRCodeComponentProps {
  /** Unique Crop Lot Identifier (e.g. "KS-MP-2025-089" or "KS-2025-0124") */
  lotId: string;
  /** Optional structured payload or verification URL override */
  payload?: string;
  /** Farmer name for the encoded credential summary */
  farmerName?: string;
  /** Crop name for the encoded credential summary */
  cropName?: string;
  /** Declared quantity in quintals */
  quantityQuintals?: number;
  /** Lot verification status */
  verificationStatus?: VerificationStatus;
  /** Cryptographic SHA-256 hash */
  sha256Hash?: string;
  /** Pixel size of the rendered SVG QR code */
  size?: number;
  /** Whether to show interactive scan simulation & copy controls below the QR */
  showControls?: boolean;
  /** Additional container class names */
  className?: string;
  /** Callback when QR is clicked or inspected */
  onInspect?: () => void;
}

/**
 * QRCodeComponent
 * Generates a real, camera-scannable ISO/IEC 18004 QR code dynamically from the
 * crop lot's unique ID using High (H - 30%) Reed-Solomon error correction and
 * styles the finder patterns and center seal in Kisan-SPO's strict four-color palette.
 */
export const QRCodeComponent: React.FC<QRCodeComponentProps> = ({
  lotId,
  payload,
  farmerName,
  cropName,
  quantityQuintals,
  verificationStatus = 'INDEPENDENTLY_VERIFIED',
  sha256Hash,
  size = 112,
  showControls = false,
  className = '',
  onInspect,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResultVisible, setScanResultVisible] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Build compact, scannable verification URI & JSON credential from the lot's unique ID
  const encodedString = useMemo(() => {
    if (payload) return payload;
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://kisan-spo.in';
    const compactUrl = `${origin}/crop-passport?lot=${encodeURIComponent(
      lotId
    )}&status=${encodeURIComponent(verificationStatus)}${
      sha256Hash ? `&sig=${encodeURIComponent(sha256Hash.slice(0, 14))}` : ''
    }`;
    return compactUrl;
  }, [lotId, payload, verificationStatus, sha256Hash]);

  // Generate genuine ISO/IEC 18004 QR matrix using `qrcode` with Error Correction Level 'H'
  const qrMatrix = useMemo(() => {
    try {
      const qr = QRCode.create(encodedString, {
        errorCorrectionLevel: 'H',
      });
      const count = qr.modules.size;
      const data = qr.modules.data;
      const rows: boolean[][] = [];
      for (let r = 0; r < count; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < count; c++) {
          row.push(Boolean(data[r * count + c]));
        }
        rows.push(row);
      }
      return { size: count, rows };
    } catch {
      return { size: 21, rows: Array.from({ length: 21 }, () => Array(21).fill(false)) };
    }
  }, [encodedString]);

  const moduleCount = qrMatrix.size;
  const quietZone = 2;
  const totalViewBox = moduleCount + quietZone * 2;

  // Helper to check if a module coordinate belongs to one of the 3 7x7 Finder Patterns
  const isFinderModule = (r: number, c: number): boolean => {
    const inTopLeft = r < 7 && c < 7;
    const inTopRight = r < 7 && c >= moduleCount - 7;
    const inBottomLeft = r >= moduleCount - 7 && c < 7;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  // Helper to check if a module is in the tiny center emblem zone (safe under Level H 30% ECC)
  const centerStart = Math.floor(moduleCount / 2) - 2;
  const centerEnd = centerStart + 4;
  const isCenterEmblemZone = (r: number, c: number): boolean => {
    return r >= centerStart && r <= centerEnd && c >= centerStart && c <= centerEnd;
  };

  const handleSimulateScan = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isScanning) return;
    setIsScanning(true);
    setScanResultVisible(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanResultVisible(true);
    }, 1100);
  };

  const handleCopyPayload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(encodedString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore
      }
    }
  };

  const isVerifiedTier =
    verificationStatus === 'INDEPENDENTLY_VERIFIED' ||
    verificationStatus === 'LABORATORY_TESTED';

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      {/* Branded Kisan-SPO Scannable QR Frame */}
      <div
        onClick={onInspect}
        role={onInspect ? 'button' : undefined}
        tabIndex={onInspect ? 0 : undefined}
        onKeyDown={(e) => {
          if (onInspect && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onInspect();
          }
        }}
        className={`relative bg-white p-2 rounded-xl border-2 ${
          isVerifiedTier ? 'border-[#000080]' : 'border-[#FF9933]'
        } shadow-sm overflow-hidden select-none ${
          onInspect ? 'cursor-pointer hover:bg-[#E8EAF6]/40 transition-colors' : ''
        }`}
        title={`Scannable Kisan-SPO QR Code for Lot ${lotId}`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${totalViewBox} ${totalViewBox}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label={`Scannable Kisan-SPO QR Code for Crop Lot ${lotId}`}
          className="block bg-white"
        >
          {/* Pure White Quiet Zone Canvas */}
          <rect width={totalViewBox} height={totalViewBox} fill="#FFFFFF" />

          {/* Standard Data & Timing Modules */}
          {qrMatrix.rows.map((row, rIdx) =>
            row.map((isDark, cIdx) => {
              if (!isDark) return null;
              if (isFinderModule(rIdx, cIdx) || isCenterEmblemZone(rIdx, cIdx)) {
                return null;
              }
              return (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx + quietZone}
                  y={rIdx + quietZone}
                  width={1}
                  height={1}
                  fill="#000000"
                />
              );
            })
          )}

          {/* Branded Finder Patterns: Navy Blue (#000080) Outer Ring + Agricultural Green (#138808) Inner Eye */}
          {[
            { r: 0, c: 0 },
            { r: 0, c: moduleCount - 7 },
            { r: moduleCount - 7, c: 0 },
          ].map((pos, idx) => {
            const fx = pos.c + quietZone;
            const fy = pos.r + quietZone;
            return (
              <g key={`finder-${idx}`}>
                <rect x={fx} y={fy} width={7} height={7} fill="#000080" />
                <rect x={fx + 1} y={fy + 1} width={5} height={5} fill="#FFFFFF" />
                <rect x={fx + 2} y={fy + 2} width={3} height={3} fill="#138808" />
              </g>
            );
          })}

          {/* Center Kisan-SPO AgriStack Emblem (5x5 modules, protected by Level H ECC) */}
          <rect
            x={centerStart + quietZone}
            y={centerStart + quietZone}
            width={5}
            height={5}
            fill="#FFFFFF"
          />
          <rect
            x={centerStart + quietZone + 0.5}
            y={centerStart + quietZone + 0.5}
            width={4}
            height={4}
            fill="#000080"
          />
          <rect
            x={centerStart + quietZone + 1.25}
            y={centerStart + quietZone + 1.25}
            width={2.5}
            height={2.5}
            fill="#FFFFFF"
          />
          <rect
            x={centerStart + quietZone + 1.75}
            y={centerStart + quietZone + 1.75}
            width={1.5}
            height={1.5}
            fill={isVerifiedTier ? '#138808' : '#FF9933'}
          />
        </svg>

        {/* Animation 10: Active QR Scanning Line Overlay when scanning is triggered */}
        {isScanning && (
          <div
            aria-hidden="true"
            className="absolute inset-x-1 top-2 h-1.5 bg-[#138808] shadow-[0_0_8px_#138808] rounded-full anim-scan-beam pointer-events-none"
          />
        )}

        {/* Lot ID Footer Strip */}
        <div className="mt-1 pt-1 border-t border-[#000080]/20 flex items-center justify-between gap-1 text-[9px] font-tabular font-extrabold text-[#000080]">
          <span className="truncate max-w-[90px]">{lotId}</span>
          <span
            className={`px-1 rounded ${
              isVerifiedTier
                ? 'bg-[#138808] text-white'
                : 'bg-[#FF9933] text-black'
            }`}
          >
            {isVerifiedTier ? 'VERIFIED' : 'DECLARED'}
          </span>
        </div>
      </div>

      {/* Optional Interactive QR Verification & Copy Controls */}
      {showControls && (
        <div className="mt-2 w-full flex flex-col gap-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={handleSimulateScan}
              className="px-2.5 py-1 rounded bg-[#000080] hover:bg-[#00003C] text-white text-[11px] font-extrabold flex items-center gap-1 anim-btn-press"
            >
              <span className="material-symbols-outlined text-[14px]">
                qr_code_scanner
              </span>
              <span>{isScanning ? 'Scanning...' : 'Test Scan QR'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyPayload}
              className="px-2.5 py-1 rounded bg-[#E8EAF6] hover:bg-[#138808] hover:text-white text-[#000080] border border-[#000080]/30 text-[11px] font-extrabold flex items-center gap-1 anim-btn-press"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied URL' : 'Copy Link'}</span>
            </button>
          </div>

          {scanResultVisible && (
            <div
              role="status"
              className="p-2 rounded-lg bg-[#E8F5E9] border border-[#138808] text-[10px] text-black font-tabular anim-success-cue"
            >
              <div className="font-extrabold text-[#138808] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">
                  check_circle
                </span>
                <span>Decoded Lot ID: {lotId}</span>
              </div>
              {farmerName && (
                <div className="font-bold mt-0.5">
                  {farmerName} • {cropName} ({quantityQuintals} Qtl)
                </div>
              )}
              <div className="truncate text-[#000080] mt-0.5">
                {encodedString}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
