/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TalkBackVoiceState {
  enabled: boolean;
  speaking: boolean;
  paused: boolean;
  rate: number;
  pitch: number;
  volume: number;
  currentText: string;
}

class TalkBackService {
  private enabled: boolean = true;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingInternal: boolean = false;
  private listeners: Set<(state: TalkBackVoiceState) => void> = new Set();
  private rate: number = 0.95;
  private pitch: number = 1.0;
  private volume: number = 1.0;
  private currentText: string = '';

  constructor() {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const saved = localStorage.getItem('kisansetu_talkback_enabled');
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      localStorage.setItem('kisansetu_talkback_enabled', String(val));
    }
    if (!val) {
      this.stop();
    }
    this.notify();
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public subscribe(cb: (state: TalkBackVoiceState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  public getState(): TalkBackVoiceState {
    return {
      enabled: this.enabled,
      speaking: this.isSpeakingInternal,
      paused: typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.paused : false,
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume,
      currentText: this.currentText,
    };
  }

  private notify(): void {
    const st = this.getState();
    this.listeners.forEach((l) => l(st));
  }

  public setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
    this.notify();
  }

  public stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
    this.isSpeakingInternal = false;
    this.currentText = '';
    this.notify();
  }

  /**
   * Speak arbitrary text in Hindi ('hi') or English ('en').
   * Cleans emojis, markdown asterisks, currency symbols, and technical markup for crisp rural pronunciation.
   */
  public speak(
    text: string,
    lang: 'en' | 'hi' = 'hi',
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (!this.isSupported() || !this.enabled || !text.trim()) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Clean spoken text
      let spoken = text
        .replace(/₹\s*([0-9,]+)/g, lang === 'hi' ? '$1 रुपये' : '$1 rupees')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/[#_~`]/g, ' ')
        .replace(/\bKVK\b/g, lang === 'hi' ? 'कृषि विज्ञान केंद्र' : 'KVK')
        .replace(/\bFCI\b/g, lang === 'hi' ? 'भारतीय खाद्य निगम' : 'FCI')
        .replace(/\bMSP\b/g, lang === 'hi' ? 'न्यूनतम समर्थन मूल्य' : 'MSP')
        .replace(/\bqtl\b/gi, lang === 'hi' ? 'क्विंटल' : 'quintals')
        .replace(/\s+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      if (lang === 'hi') {
        utterance.lang = 'hi-IN';
        const hiVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('hi') ||
            v.name.toLowerCase().includes('hindi') ||
            v.name.toLowerCase().includes('lekh')
        );
        if (hiVoice) utterance.voice = hiVoice;
      } else {
        utterance.lang = 'en-IN';
        const enVoice = voices.find(
          (v) =>
            v.lang === 'en-IN' ||
            v.name.toLowerCase().includes('india') ||
            v.lang.startsWith('en')
        );
        if (enVoice) utterance.voice = enVoice;
      }

      utterance.onstart = () => {
        this.isSpeakingInternal = true;
        this.currentText = text;
        this.notify();
        onStart?.();
      };

      utterance.onend = () => {
        this.isSpeakingInternal = false;
        this.currentText = '';
        this.notify();
        onEnd?.();
      };

      utterance.onerror = () => {
        this.isSpeakingInternal = false;
        this.currentText = '';
        this.notify();
        onEnd?.();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeakingInternal = false;
      this.notify();
    }
  }
}

export const talkBack = new TalkBackService();
