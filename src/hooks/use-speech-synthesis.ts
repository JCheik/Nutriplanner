'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'nutriplanner.tts.voiceURI';

// Lowercased markers that flag higher-quality / cloud / neural voices, best
// first. The browser default is often a robotic local voice, so we actively
// prefer voices whose name carries one of these markers.
const QUALITY_MARKERS = ['natural', 'neural', 'online', 'google', 'microsoft'];

// Ranks a voice for Spanish playback. Higher = better. Non-Spanish voices score
// below zero so they never win.
function scoreVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang?.toLowerCase() ?? '';
  if (!lang.startsWith('es')) return -1;

  let score = 0;
  // Prefer peninsular Spanish, then any other Spanish variant.
  if (lang === 'es-es') score += 40;
  else if (lang.startsWith('es')) score += 20;

  const name = v.name?.toLowerCase() ?? '';
  const markerIdx = QUALITY_MARKERS.findIndex((m) => name.includes(m));
  if (markerIdx !== -1) score += (QUALITY_MARKERS.length - markerIdx) * 10;

  // Cloud (non-local) voices are usually the most natural-sounding.
  if (!v.localService) score += 15;

  return score;
}

export interface SpeechVoiceOption {
  uri: string;
  name: string;
  lang: string;
}

/**
 * Wrapper over the browser SpeechSynthesis API to read assistant replies aloud.
 * Picks the most natural Spanish voice available (preferring cloud/"Google"
 * voices over the robotic default), lets the caller override and remembers the
 * choice, and works around Chrome's long-utterance pause bug. No-op where
 * unsupported.
 */
export function useSpeechSynthesis(opts?: { lang?: string }) {
  const fallbackLang = opts?.lang ?? 'es-ES';
  const [isSupported, setIsSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechVoiceOption[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const allVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearResume = useCallback(() => {
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  // Load the Spanish voice list and keep it in sync. getVoices() is empty until
  // the engine fires 'voiceschanged', so we listen for that too.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setIsSupported(true);

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }

    const load = () => {
      const spanish = window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang?.toLowerCase().startsWith('es'));
      if (spanish.length === 0) return;

      const ranked = [...spanish].sort((a, b) => scoreVoice(b) - scoreVoice(a));
      allVoicesRef.current = ranked;
      setVoices(ranked.map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang })));
      setVoiceURI((prev) => {
        if (prev && ranked.some((v) => v.voiceURI === prev)) return prev;
        if (stored && ranked.some((v) => v.voiceURI === stored)) return stored;
        return ranked[0]?.voiceURI ?? null;
      });
    };

    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  // Stop any in-flight speech when the hook unmounts.
  useEffect(() => clearResume, [clearResume]);

  const setVoice = useCallback((uri: string) => {
    setVoiceURI(uri);
    try {
      localStorage.setItem(STORAGE_KEY, uri);
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = allVoicesRef.current.find((v) => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? fallbackLang;
      // Slightly slower than default reads more naturally for a conversational
      // assistant; neutral pitch avoids the "chipmunk" effect.
      utterance.rate = 0.98;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        clearResume();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        clearResume();
      };
      window.speechSynthesis.speak(utterance);

      // Chrome silently pauses synthesis after ~15s. Nudge it to keep going.
      clearResume();
      resumeTimerRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearResume();
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10000);
    },
    [voiceURI, fallbackLang, clearResume]
  );

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    clearResume();
    setSpeaking(false);
  }, [clearResume]);

  return { isSupported, speaking, speak, cancel, voices, voiceURI, setVoice };
}
