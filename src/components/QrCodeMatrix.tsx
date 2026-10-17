import React from 'react';
import { QRCodeComponent } from './QRCodeComponent';

interface QrCodeMatrixProps {
  payload: string;
  lotId?: string;
  size?: number;
  className?: string;
}

/**
 * Backwards-compatible wrapper around QRCodeComponent so existing callers
 * render the real ISO/IEC 18004 scannable QRCodeComponent.
 */
export const QrCodeMatrix: React.FC<QrCodeMatrixProps> = ({
  payload,
  lotId = 'KS-MP-2025-089',
  size = 96,
  className = '',
}) => {
  return (
    <QRCodeComponent
      lotId={lotId}
      payload={payload}
      size={size}
      className={className}
    />
  );
};
