'use client';

/**
 * Client-side media helpers for the recipe image features. Kept out of any
 * 'use server' file so they can use the browser (canvas, <video>, atob).
 */

/**
 * Grabs a still frame from a local video File and returns it as a JPEG File.
 * Used when importing a recipe from an uploaded reel — the frame near the end
 * usually shows the finished, plated dish. Downscaled to a sane width. Returns
 * null (never throws) if the browser can't decode/seek the video so callers can
 * silently fall back to "no image".
 */
export function captureVideoFrame(file: File, fraction = 0.85): Promise<File | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: File | null, url?: string) => {
      if (settled) return;
      settled = true;
      if (url) URL.revokeObjectURL(url);
      resolve(result);
    };

    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = url;

      // Hard timeout so a stuck decode never blocks the import flow.
      const timer = setTimeout(() => finish(null, url), 15000);

      const grab = () => {
        try {
          const maxW = 1080;
          const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) { clearTimeout(timer); finish(null, url); return; }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              clearTimeout(timer);
              finish(blob ? new File([blob], 'captura.jpg', { type: 'image/jpeg' }) : null, url);
            },
            'image/jpeg',
            0.85
          );
        } catch {
          clearTimeout(timer);
          finish(null, url);
        }
      };

      video.onloadeddata = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        if (duration > 0.2) {
          video.onseeked = grab;
          try {
            video.currentTime = Math.min(duration * fraction, duration - 0.1);
          } catch {
            grab();
          }
        } else {
          // No known duration (some streams): just grab the current frame.
          grab();
        }
      };
      video.onerror = () => { clearTimeout(timer); finish(null, url); };
    } catch {
      finish(null);
    }
  });
}

/** Converts a `data:` URL (e.g. an og:image fetched server-side) to a File. */
export function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const [head, b64] = dataUrl.split(',');
    if (!b64) return null;
    const mime = head.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}
