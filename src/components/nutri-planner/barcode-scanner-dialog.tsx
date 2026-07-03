'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanBarcode, Keyboard } from 'lucide-react';

interface BarcodeScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once with the detected (or typed) barcode; the dialog closes itself. */
  onDetected: (barcode: string) => void;
}

// Minimal typing for the native BarcodeDetector (not yet in lib.dom).
interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => NativeBarcodeDetector;

/**
 * Camera barcode scanner. Uses the native BarcodeDetector API when available
 * (Android Chrome), falls back to @zxing/browser (iOS Safari), and always
 * offers a manual input as last resort. Needs HTTPS (or localhost) for camera.
 */
export function BarcodeScannerDialog({ isOpen, onClose, onDetected }: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  // Guards against double-fires: detection loops can tick once more after a hit.
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    firedRef.current = false;
    setError(null);
    setManualCode('');

    let cancelled = false;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let zxingControls: { stop: () => void } | null = null;
    // Captured once so the cleanup below releases the same element the effect used.
    const video = videoRef.current;

    const fire = (code: string) => {
      if (firedRef.current || !code) return;
      firedRef.current = true;
      onDetected(code);
      onClose();
    };

    const start = async () => {
      if (!video) return;
      try {
        const DetectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

        if (DetectorCtor) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
          if (cancelled) return;
          video.srcObject = stream;
          await video.play();
          const detector = new DetectorCtor({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
          });
          const tick = async () => {
            if (cancelled || firedRef.current) return;
            try {
              const codes = await detector.detect(video);
              if (codes.length > 0) {
                fire(codes[0].rawValue);
                return;
              }
            } catch {
              /* a frame can fail while the camera warms up — keep looping */
            }
            rafId = requestAnimationFrame(tick);
          };
          rafId = requestAnimationFrame(tick);
        } else {
          // iOS Safari and older browsers: ZXing drives the camera itself.
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          if (cancelled) return;
          const reader = new BrowserMultiFormatReader();
          zxingControls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
            if (result) fire(result.getText());
          });
        }
      } catch (e) {
        console.warn('Barcode scanner error:', e);
        if (!cancelled) {
          setError('No se pudo acceder a la cámara. Comprueba los permisos o escribe el código a mano.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [isOpen, onClose, onDetected]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md bg-glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-primary" />
            Escanear código de barras
          </DialogTitle>
          <DialogDescription>
            Apunta la cámara al código de barras del producto.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          {/* Aiming guide */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-4/5 rounded-lg border-2 border-primary/80" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            inputMode="numeric"
            placeholder="…o escribe el código a mano"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualCode.trim()) {
                onDetected(manualCode.trim());
                onClose();
              }
            }}
          />
          <Button
            variant="secondary"
            disabled={!manualCode.trim()}
            onClick={() => { onDetected(manualCode.trim()); onClose(); }}
          >
            Buscar
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
