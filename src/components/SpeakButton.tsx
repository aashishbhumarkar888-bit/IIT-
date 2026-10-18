/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { talkBack } from '../services/talkBackService';

interface SpeakButtonProps {
  text: string;
  lang?: 'en' | 'hi';
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const SpeakButton: React.FC<SpeakButtonProps> = ({
  text,
  lang = 'hi',
  label,
  className = '',
  size = 'sm',
}) => {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up when unmounting
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (speaking) {
      talkBack.stop();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      talkBack.speak(
        text,
        lang,
        () => setSpeaking(true),
        () => setSpeaking(false)
      );
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleClick}
      title={lang === 'hi' ? 'बोलकर सुनें (TalkBack)' : 'Listen Aloud (TalkBack)'}
      aria-label={label || (lang === 'hi' ? 'बोलकर सुनें' : 'Listen aloud')}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all shadow-sm ${
        speaking
          ? 'bg-[#138808] text-white animate-pulse ring-2 ring-[#9DF6B9]'
          : 'bg-[#E8F5E9] text-[#006B3C] hover:bg-[#138808] hover:text-white border border-[#138808]/30'
      } ${
        isSmall
          ? 'px-2 py-1 text-xs'
          : 'px-3 py-1.5 text-sm min-h-[36px]'
      } ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">
        {speaking ? 'volume_up' : 'volume_up'}
      </span>
      {label && <span>{label}</span>}
      {speaking && (
        <span className="flex gap-0.5 items-center">
          <span className="w-1 h-2 bg-white rounded-full animate-bounce" />
          <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:0.15s]" />
          <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:0.3s]" />
        </span>
      )}
    </button>
  );
};
