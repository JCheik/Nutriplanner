'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// The Web Speech API isn't in the standard TS lib; type the bits we use loosely.
type SpeechRecognitionInstance = any;

interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (text: string) => void;
  /** Called with a user-facing message when the mic can't be used (permission, no mic, etc.). */
  onError?: (message: string) => void;
}

/**
 * Maps a SpeechRecognition/getUserMedia error code to a user-facing Spanish
 * message. Returns null for codes that don't warrant a notification (e.g. the
 * user aborted, or a benign no-op).
 */
function mapSpeechError(code: string): string | null {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Permiso de micrófono denegado. Actívalo en los ajustes del navegador para usar la voz.';
    case 'audio-capture':
      return 'No se detecta ningún micrófono. Conecta uno e inténtalo de nuevo.';
    case 'no-speech':
      return 'No te he oído. Vuelve a tocar el micro e inténtalo de nuevo.';
    case 'network':
      return 'Sin conexión para el dictado por voz. Revisa tu conexión a internet.';
    case 'aborted':
      return null; // user cancelled — no message needed
    case 'not-supported':
      return 'Tu navegador no admite el dictado por voz. Escribe tu instrucción.';
    default:
      return 'No se pudo usar el dictado por voz. Inténtalo de nuevo o escribe tu instrucción.';
  }
}

/**
 * Thin wrapper over the browser SpeechRecognition API (Chrome/Edge; webkit on
 * Safari). Feature-detects support, requests microphone permission explicitly so
 * the browser shows its prompt (and we get a clear grant/deny), and surfaces
 * permission/no-support errors via `onError` so the UI can react. Single-utterance
 * mode: one phrase per start().
 */
export function useSpeechRecognition(opts?: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef<UseSpeechRecognitionOptions['onResult']>(opts?.onResult);
  onResultRef.current = opts?.onResult;
  const onErrorRef = useRef<UseSpeechRecognitionOptions['onError']>(opts?.onError);
  onErrorRef.current = opts?.onError;

  const reportError = useCallback((code: string) => {
    const msg = mapSpeechError(code);
    setError(msg);
    if (msg) onErrorRef.current?.(msg);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const rec: SpeechRecognitionInstance = new SR();
    rec.lang = opts?.lang ?? 'es-ES';
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const text: string = e.results?.[0]?.[0]?.transcript ?? '';
      setTranscript(text);
      if (text) onResultRef.current?.(text);
    };
    rec.onerror = (e: any) => {
      reportError(e?.error ?? 'speech-error');
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    return () => {
      try { rec.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    };
  }, [opts?.lang, reportError]);

  const start = useCallback(async () => {
    const rec = recognitionRef.current;
    if (!rec) {
      reportError('not-supported');
      return;
    }
    setError(null);
    setTranscript('');

    // Request mic permission explicitly. SpeechRecognition can fail silently when
    // the permission hasn't been granted (or the origin isn't a secure context);
    // getUserMedia forces the browser's permission prompt and gives a clear deny.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // We only needed the grant — release the mic immediately.
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (err: any) {
      reportError(err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'not-allowed' : 'audio-capture');
      return;
    }

    try {
      rec.start();
      setIsListening(true);
    } catch {
      // start() throws if already running — ignore.
    }
  }, [reportError]);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setIsListening(false);
  }, []);

  return { isListening, transcript, isSupported, error, start, stop };
}
