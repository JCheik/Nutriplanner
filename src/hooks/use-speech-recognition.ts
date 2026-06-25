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
 * Safari). Uses getUserMedia to prime the audio subsystem before starting
 * recognition — on Windows/Chrome this is required for SpeechRecognition to
 * actually capture audio. Crucially, recognition is started WHILE the
 * getUserMedia stream is still open (so the audio hardware stays warm), and the
 * stream is only released after recognition has taken over.
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
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const chunk = res?.[0]?.transcript ?? '';
        if (res?.isFinal) finalText += chunk;
        else interimText += chunk;
      }
      if (finalText) {
        setTranscript(finalText);
        onResultRef.current?.(finalText);
      } else if (interimText) {
        setTranscript(interimText);
      }
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

    if (navigator.mediaDevices?.getUserMedia) {
      // Prime the audio subsystem. We start recognition WHILE this stream is
      // still open so the audio hardware doesn't go idle between the two calls.
      // Only after recognition has claimed the mic do we release our own stream.
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        reportError(
          err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
            ? 'not-allowed'
            : 'audio-capture'
        );
        return;
      }
      try {
        rec.start();
        setIsListening(true);
      } catch {
        // start() throws if already running — ignore.
      }
      // Release our capture now that SpeechRecognition has taken over.
      stream.getTracks().forEach(t => t.stop());
    } else {
      // No getUserMedia — let SpeechRecognition request permission itself.
      try {
        rec.start();
        setIsListening(true);
      } catch {
        // already running
      }
    }
  }, [reportError]);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setIsListening(false);
  }, []);

  return { isListening, transcript, isSupported, error, start, stop };
}
