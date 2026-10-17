import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  formatter?: (val: number) => string;
  durationMs?: number;
  className?: string;
}

/**
 * Animation 6: KPI Number Reveal
 * Gently interpolates a number from its previous value to the new value when
 * the underlying data changes. Does not restart on unrelated renders.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  formatter = (v) => Math.round(v).toLocaleString('en-IN'),
  durationMs = 280,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;
    prevValueRef.current = value;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    // Respect prefers-reduced-motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplayValue(endVal);
      return;
    }

    let rafId: number;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * eased;
      setDisplayValue(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return <span className={`font-tabular ${className}`}>{formatter(displayValue)}</span>;
};
