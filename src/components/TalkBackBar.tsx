/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useKisan } from '../context/KisanContext';
import { talkBack, TalkBackVoiceState } from '../services/talkBackService';

interface TalkBackBarProps {
  currentModuleSummary?: string;
}

export const TalkBackBar: React.FC<TalkBackBarProps> = ({ currentModuleSummary }) => {
  const { language, route, t } = useKisan();
  const [state, setState] = useState<TalkBackVoiceState>(talkBack.getState());
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    const unsub = talkBack.subscribe(setState);
    return unsub;
  }, []);

  // Keyboard shortcut Alt + T to toggle TalkBack
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        const enabled = talkBack.toggle();
        if (enabled) {
          talkBack.speak(
            language === 'hi'
              ? 'टॉक-बैक सक्रिय है। आवाज़ से मार्गदर्शन शुरू हो रहा है।'
              : 'TalkBack enabled. Audio guidance is active.',
            language
          );
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [language]);

  if (!talkBack.isSupported()) {
    return null;
  }

  const handleReadCurrentScreen = () => {
    let summary = currentModuleSummary;
    if (!summary) {
      if (route === '/crop-to-cash') {
        summary =
          language === 'hi'
            ? 'किसान-सेतु फसल से भुगतान लेज़र। तीन मुख्य चरण हैं: पत्ती की बीमारी की जाँच, तीन बाज़ार विकल्पों के शुद्ध मुनाफे की तुलना, और खरीद केंद्र यात्रा व बैंक भुगतान पूर्ण करना।'
            : 'KisanSetu Crop to Cash Ledger. Three primary stages: Detect crop disease, Compare net returns across FCI, Mandi, and Direct Buyer, and Complete procurement visit and UPI escrow payment.';
      } else if (route === '/dashboard') {
        summary =
          language === 'hi'
            ? 'किसान संचालन डैशबोर्ड। यहाँ आपकी सक्रिय फसल लॉट, मौसम अलर्ट, और खरीद तैयारी दिखाई दे रही है।'
            : 'Operations Dashboard. Displays your active crop lots, weather alerts, and procurement readiness status.';
      } else if (route === '/market-comparison') {
        summary =
          language === 'hi'
            ? 'बाज़ार और भाव तुलना। एफसीआई न्यूनतम समर्थन मूल्य, स्थानीय मंडी और सीधे संस्थागत खरीदारों के वास्तविक दामों की तुलना करें।'
            : 'Market and Price Arbitrage. Compare FCI MSP, local mandi, and direct institutional buyer net returns.';
      } else {
        summary =
          language === 'hi'
            ? 'किसान सेतु एआई में आपका स्वागत है। सही सलाह, बेहतर दाम, और सुरक्षित भुगतान।'
            : 'Welcome to KisanSetu AI. Fairer Markets, Transparent Procurement, and Secured Escrow.';
      }
    }

    talkBack.speak(summary, language);
  };

  return (
    <aside
      aria-label="TalkBack Audio Accessibility"
      className="fixed bottom-3 left-3 sm:left-6 z-50 transition-all duration-300"
    >
      <div
        className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl shadow-xl backdrop-blur-md border-2 transition-all ${
          state.speaking
            ? 'bg-[#138808] text-white border-white ring-4 ring-[#9DF6B9]/50'
            : state.enabled
            ? 'bg-white/95 text-black border-[#000080]/30 shadow-blue-900/10'
            : 'bg-gray-100/90 text-gray-600 border-gray-300'
        }`}
      >
        {/* Toggle On/Off Pill */}
        <button
          type="button"
          onClick={() => {
            const nowEnabled = talkBack.toggle();
            if (nowEnabled) {
              talkBack.speak(
                language === 'hi'
                  ? 'आवाज़ टॉक-बैक चालू है'
                  : 'TalkBack Voice Guidance Active',
                language
              );
            }
          }}
          title="Toggle TalkBack voice assistance (Alt + T)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs min-h-[36px] transition-all ${
            state.speaking
              ? 'bg-white text-[#138808] shadow'
              : state.enabled
              ? 'bg-[#E8F5E9] text-[#006B3C] hover:bg-[#138808] hover:text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {state.speaking
              ? 'record_voice_over'
              : state.enabled
              ? 'volume_up'
              : 'volume_off'}
          </span>
          <span className="whitespace-nowrap font-bold">
            {state.speaking
              ? t('Speaking…', 'बोल रहा है…')
              : state.enabled
              ? t('TalkBack ON', 'टॉक-बैक चालू')
              : t('TalkBack OFF', 'टॉक-बैक बंद')}
          </span>
          {state.speaking && (
            <span className="flex gap-0.5 items-center ml-1">
              <span className="w-1 h-3 bg-[#138808] rounded-full animate-bounce" />
              <span className="w-1 h-4 bg-[#138808] rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-1 h-2 bg-[#138808] rounded-full animate-bounce [animation-delay:0.3s]" />
            </span>
          )}
        </button>

        {state.enabled && (
          <>
            {/* Read Current Screen Button */}
            <button
              type="button"
              onClick={handleReadCurrentScreen}
              title={
                language === 'hi'
                  ? 'वर्तमान स्क्रीन को बोलकर सुनें'
                  : 'Read active screen aloud'
              }
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold min-h-[36px] border ${
                state.speaking
                  ? 'bg-white/20 text-white border-white/40 hover:bg-white/30'
                  : 'bg-[#E8EAF6] text-[#000080] border-[#000080]/20 hover:bg-[#000080] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                hearing
              </span>
              <span className="hidden sm:inline font-bold">
                {t('Read Screen', 'स्क्रीन सुनें')}
              </span>
            </button>

            {/* Stop Speech Button */}
            {state.speaking && (
              <button
                type="button"
                onClick={() => talkBack.stop()}
                title="Stop speaking"
                className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold hover:bg-red-700 shadow"
              >
                <span className="material-symbols-outlined text-[18px]">
                  stop
                </span>
              </button>
            )}

            {/* Expand / Controls toggle */}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              title="Voice Speed & Audio Settings"
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                state.speaking
                  ? 'border-white/40 text-white hover:bg-white/20'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {expanded ? 'close' : 'tune'}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Expanded Audio Tuning Drawer */}
      {expanded && state.enabled && (
        <div className="mt-2 p-3 rounded-2xl bg-white shadow-2xl border-2 border-[#000080]/30 text-xs text-black max-w-xs space-y-2 anim-slide-up">
          <div className="flex items-center justify-between font-extrabold text-[#000080]">
            <span>{t('Voice Speed (आवाज़ की गति)', 'आवाज़ की गति')}</span>
            <span className="text-[10px] text-gray-500 font-mono">Alt + T</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { rate: 0.8, label: '0.8x धीमा' },
              { rate: 0.95, label: '1.0x सामान्य' },
              { rate: 1.2, label: '1.2x तेज़' },
            ].map((opt) => (
              <button
                key={opt.rate}
                type="button"
                onClick={() => {
                  talkBack.setRate(opt.rate);
                  talkBack.speak(
                    language === 'hi' ? 'आवाज़ की गति सेट की गई' : 'Speed updated',
                    language
                  );
                }}
                className={`py-1 px-2 rounded-lg font-bold text-center border ${
                  Math.abs(state.rate - opt.rate) < 0.05
                    ? 'bg-[#138808] text-white border-[#138808]'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 font-semibold pt-1">
            {t(
              'Supports Hindi & Indian English voices with Web Speech API.',
              'वेब स्पीच एपीआई द्वारा हिंदी एवं भारतीय अंग्रेजी आवाज़ में सहायता।'
            )}
          </p>
        </div>
      )}
    </aside>
  );
};
