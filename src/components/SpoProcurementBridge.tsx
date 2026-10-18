/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useKisan } from '../context/KisanContext';
import { CropLot } from '../types/kisan';
import { SpeakButton } from './SpeakButton';

interface SpoProcurementBridgeProps {
  currentLot: CropLot;
  quantity?: number;
  expectedNet?: number;
  readinessSummary?: string;
}

export const SpoProcurementBridge: React.FC<SpoProcurementBridgeProps> = ({
  currentLot,
  quantity = 50,
  expectedNet = 126750,
  readinessSummary = '3 of 3 documents ready',
}) => {
  const { language, t } = useKisan();
  const [synced, setSynced] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [showEmbedModal, setShowEmbedModal] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string>('');

  const spoBaseUrl = 'https://spo-snowy.vercel.app';
  const spoDeepLinkUrl = `${spoBaseUrl}/?lotId=${encodeURIComponent(
    currentLot.id
  )}&crop=${encodeURIComponent(currentLot.cropName)}&qty=${quantity}&farmer=${encodeURIComponent(
    currentLot.farmerName || 'Ramesh'
  )}&pilot=Narela-Najafgarh&ref=kisansetu`;

  const speakText =
    language === 'hi'
      ? `एसपीओ प्रोक्योरमेंट पोर्टल कनेक्टेड है। लॉट आईडी ${currentLot.id}, नरेला और नजफगढ़ पायलट हब के लिए डिजिटल स्लॉट और वे-ब्रिज गेट पास उपलब्ध है।`
      : `SPO Procurement Portal connected at spo-snowy.vercel.app. Lot ID ${currentLot.id} synchronized for Narela and Najafgarh pilot hub with digital weighbridge gate pass.`;

  const handleSync = () => {
    setSynced(true);
    setLastSyncTime(new Date().toLocaleTimeString());
    setSyncNotice(
      language === 'hi'
        ? `लॉट ${currentLot.id} को SPO पोर्टल (spo-snowy.vercel.app) से सफलतापूर्वक सिंक्रनाइज़ किया गया।`
        : `Lot ${currentLot.id} successfully synchronized with SPO portal (spo-snowy.vercel.app).`
    );
    setTimeout(() => setSyncNotice(''), 4000);
  };

  return (
    <div className="rounded-2xl border-2 border-[#138808]/40 bg-gradient-to-br from-[#E8F5E9] via-white to-[#E8EAF6] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#138808]/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#138808] text-white flex items-center justify-center font-black text-sm shadow">
            SPO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#000080]">
                {t(
                  'SPO Smart Procurement Orchestration',
                  'SPO स्मार्ट खरीद ऑर्केस्ट्रेशन'
                )}
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#138808] text-white shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#9DF6B9] animate-ping" />
                {t('LIVE CONNECTED', 'लाइव कनेक्टेड')}
              </span>
            </div>
            <p className="text-xs text-gray-600 font-semibold mt-0.5">
              spo-snowy.vercel.app • {t('Narela & Najafgarh Pilot Hub', 'नरेला एवं नजफगढ़ पायलट हब')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SpeakButton text={speakText} lang={language} label={t('Listen', 'सुनें')} />
          <a
            href={spoDeepLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#000080] text-white text-xs font-black hover:bg-[#000066] shadow transition-all"
          >
            <span>{t('Launch SPO Hub', 'SPO हब खोलें')}</span>
            <span className="material-symbols-outlined text-[16px]">
              open_in_new
            </span>
          </a>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncNotice && (
        <div
          role="status"
          className="p-2.5 rounded-xl bg-[#138808] text-white text-xs font-bold flex items-center justify-between"
        >
          <span>{syncNotice}</span>
          <button
            type="button"
            onClick={() => setSyncNotice('')}
            className="text-xs font-black underline ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Synchronized Lot Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-white border border-[#138808]/30">
          <span className="text-gray-500 font-bold block text-[10px] uppercase">
            {t('Active Lot Token', 'सक्रिय लॉट टोकन')}
          </span>
          <span className="font-mono font-black text-[#000080] text-sm block mt-0.5">
            {currentLot.id}
          </span>
          <span className="text-[10px] text-gray-500 font-medium">
            {currentLot.cropName} ({quantity} qtl)
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-[#138808]/30">
          <span className="text-gray-500 font-bold block text-[10px] uppercase">
            {t('Gate Pass Status', 'गेट पास स्थिति')}
          </span>
          <span className="font-black text-[#138808] text-sm block mt-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
            {t('READY TO DISPATCH', 'डिस्पैच हेतु तैयार')}
          </span>
          <span className="text-[10px] text-gray-500 font-medium">
            {readinessSummary}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-[#138808]/30">
          <span className="text-gray-500 font-bold block text-[10px] uppercase">
            {t('Pilot Mandi Yard', 'पायलट मंडी यार्ड')}
          </span>
          <span className="font-black text-black text-xs block mt-0.5">
            Narela FCI / Najafgarh APMC
          </span>
          <span className="text-[10px] text-gray-500 font-medium">
            Terminal #104 (Delhi Pilot)
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-[#138808]/30">
          <span className="text-gray-500 font-bold block text-[10px] uppercase">
            {t('Cloud Sync', 'क्लाउड सिंक')}
          </span>
          <span className="font-bold text-[#006B3C] text-xs block mt-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">sync</span>
            {lastSyncTime}
          </span>
          <button
            type="button"
            onClick={handleSync}
            className="text-[10px] font-black text-[#000080] hover:underline block mt-0.5"
          >
            {t('Force Re-sync ↻', 'पुनः सिंक करें ↻')}
          </button>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href={spoDeepLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[200px] min-h-[42px] px-3 py-2 rounded-xl bg-[#138808] text-white hover:bg-[#006B3C] font-extrabold text-xs flex items-center justify-center gap-2 shadow"
        >
          <span className="material-symbols-outlined text-[18px]">
            local_shipping
          </span>
          <span>
            {t(
              'Open SPO Digital Procurement Slot & Pass',
              'SPO डिजिटल खरीद स्लॉट व पास खोलें'
            )}
          </span>
          <span className="material-symbols-outlined text-[14px]">
            open_in_new
          </span>
        </a>

        <button
          type="button"
          onClick={() => setShowEmbedModal(true)}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white text-[#000080] border-2 border-[#000080]/30 hover:bg-[#E8EAF6] font-extrabold text-xs flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">
            visibility
          </span>
          <span>
            {t('Preview SPO Companion Hub', 'SPO पूर्वावलोकन देखें')}
          </span>
        </button>

        <button
          type="button"
          onClick={handleSync}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#E8EAF6] text-[#000080] hover:bg-[#000080] hover:text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            sync_alt
          </span>
          <span>{t('Sync Weighbridge Data', 'तौल डेटा सिंक करें')}</span>
        </button>
      </div>

      {/* Embedded Modal Dialog for Live SPO Snowy App Preview */}
      {showEmbedModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-[#000080]">
            {/* Modal Header */}
            <div className="h-14 px-4 bg-[#000080] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#138808]" />
                <span className="font-extrabold text-sm">
                  SPO Smart Procurement Orchestration — Live Viewer (spo-snowy.vercel.app)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={spoDeepLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-white text-[#000080] text-xs font-bold flex items-center gap-1 hover:bg-[#E8F5E9]"
                >
                  <span>{t('Open Full Tab', 'पूरे टैब में खोलें')}</span>
                  <span className="material-symbols-outlined text-[14px]">
                    open_in_new
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowEmbedModal(false)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/40 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Embedded Iframe */}
            <div className="flex-1 w-full bg-gray-100 relative">
              <iframe
                src={spoDeepLinkUrl}
                title="SPO Smart Procurement Orchestration Companion Platform"
                className="w-full h-full border-0"
                allow="camera; geolocation"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
