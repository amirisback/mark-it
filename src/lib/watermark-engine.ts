import type {
  WatermarkFullConfig,
  PositionConfig,
  GridPosition,
  ExportFormat,
} from '@/types/watermark';

/**
 * Memuat gambar secara asynchronous hingga benar-benar ter-decode
 */
/**
 * Memuat gambar secara asynchronous hingga benar-benar ter-decode
 */
export function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Hindari crossOrigin pada blob: atau data: URL untuk mencegah security taint
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve(img)).catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = (err) => reject(new Error(`Gagal memuat gambar: ${String(err)}`));
    img.src = src;
  });
}

/**
 * Menghitung koordinat berdasarkan 9-Grid Position + Persentase Offset
 */
export function computeCoordinates(
  mediaWidth: number,
  mediaHeight: number,
  contentWidth: number,
  contentHeight: number,
  pos: PositionConfig
): { x: number; y: number } {
  let baseX = 0;
  let baseY = 0;

  const paddingX = mediaWidth * 0.03;
  const paddingY = mediaHeight * 0.03;

  switch (pos.grid as GridPosition) {
    case 'top-left':
      baseX = paddingX;
      baseY = paddingY;
      break;
    case 'top-center':
      baseX = (mediaWidth - contentWidth) / 2;
      baseY = paddingY;
      break;
    case 'top-right':
      baseX = mediaWidth - contentWidth - paddingX;
      baseY = paddingY;
      break;
    case 'middle-left':
      baseX = paddingX;
      baseY = (mediaHeight - contentHeight) / 2;
      break;
    case 'center':
      baseX = (mediaWidth - contentWidth) / 2;
      baseY = (mediaHeight - contentHeight) / 2;
      break;
    case 'middle-right':
      baseX = mediaWidth - contentWidth - paddingX;
      baseY = (mediaHeight - contentHeight) / 2;
      break;
    case 'bottom-left':
      baseX = paddingX;
      baseY = mediaHeight - contentHeight - paddingY;
      break;
    case 'bottom-center':
      baseX = (mediaWidth - contentWidth) / 2;
      baseY = mediaHeight - contentHeight - paddingY;
      break;
    case 'bottom-right':
    default:
      baseX = mediaWidth - contentWidth - paddingX;
      baseY = mediaHeight - contentHeight - paddingY;
      break;
  }

  const offsetX = (pos.offsetX / 100) * mediaWidth;
  const offsetY = (pos.offsetY / 100) * mediaHeight;

  return {
    x: Math.round(baseX + offsetX),
    y: Math.round(baseY + offsetY),
  };
}

/**
 * Merender watermark berlapis (Frame, Media, Teks, Logo) ke elemen HTML5 Canvas
 */
export function drawWatermarkOnCanvas(
  canvas: HTMLCanvasElement,
  mediaSource: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  config: WatermarkFullConfig,
  logoImg?: HTMLImageElement | null
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { frame, text, logo } = config;

  // Tentukan apakah frame mode banner / card aktif yang mengubah rasio kanvas
  let finalCanvasWidth = sourceWidth;
  let finalCanvasHeight = sourceHeight;
  let mediaDrawX = 0;
  let mediaDrawY = 0;
  const mediaDrawWidth = sourceWidth;
  const mediaDrawHeight = sourceHeight;
  let bannerHeight = 0;

  if (frame.enabled && frame.style === 'banner') {
    bannerHeight = Math.max(48, Math.round(sourceHeight * 0.08));
    finalCanvasHeight = sourceHeight + bannerHeight;
  } else if (frame.enabled && frame.style === 'card') {
    const cardBorder = Math.round(sourceWidth * (frame.borderWidth / 100));
    const cardBottom = Math.round(sourceHeight * 0.16);
    finalCanvasWidth = sourceWidth + cardBorder * 2;
    finalCanvasHeight = sourceHeight + cardBorder + cardBottom;
    mediaDrawX = cardBorder;
    mediaDrawY = cardBorder;
  }

  canvas.width = finalCanvasWidth;
  canvas.height = finalCanvasHeight;

  ctx.clearRect(0, 0, finalCanvasWidth, finalCanvasHeight);

  // 1. Gambar Dasar / Frame Background jika tipe card
  if (frame.enabled && frame.style === 'card') {
    ctx.fillStyle = frame.borderColor || '#ffffff';
    ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);
  }

  // 2. Gambar Media Utama (Foto atau Frame Video)
  ctx.drawImage(mediaSource, mediaDrawX, mediaDrawY, mediaDrawWidth, mediaDrawHeight);

  // 3. Gambar Frame Dekoratif
  if (frame.enabled) {
    ctx.save();
    const borderWidth = Math.max(1, Math.round(sourceWidth * (frame.borderWidth / 100)));
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = frame.borderColor;

    if (frame.style === 'solid') {
      const inset = Math.round(sourceWidth * (frame.padding / 100));
      ctx.strokeRect(inset, inset, finalCanvasWidth - inset * 2, finalCanvasHeight - inset * 2);
    } else if (frame.style === 'double') {
      const inset1 = Math.round(sourceWidth * (frame.padding / 100));
      const inset2 = inset1 + borderWidth * 2;
      ctx.strokeRect(inset1, inset1, finalCanvasWidth - inset1 * 2, finalCanvasHeight - inset1 * 2);
      ctx.lineWidth = Math.max(1, Math.round(borderWidth * 0.5));
      ctx.strokeRect(inset2, inset2, finalCanvasWidth - inset2 * 2, finalCanvasHeight - inset2 * 2);
    } else if (frame.style === 'dashed') {
      const inset = Math.round(sourceWidth * (frame.padding / 100));
      ctx.setLineDash([borderWidth * 3, borderWidth * 2]);
      ctx.strokeRect(inset, inset, finalCanvasWidth - inset * 2, finalCanvasHeight - inset * 2);
    } else if (frame.style === 'banner') {
      // Banner bawah dengan metadata teks
      ctx.fillStyle = frame.borderColor || '#ffffff';
      ctx.fillRect(0, sourceHeight, finalCanvasWidth, bannerHeight);

      if (frame.metaText) {
        ctx.fillStyle = frame.metaColor || '#0f172a';
        const fontSize = Math.max(12, Math.round((frame.metaFontSize / 100) * sourceHeight));
        ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(frame.metaText, finalCanvasWidth / 2, sourceHeight + bannerHeight / 2);
      }
    } else if (frame.style === 'card' && frame.metaText) {
      // Teks bawah pada gaya kartu polaroid
      ctx.fillStyle = frame.metaColor || '#0f172a';
      const fontSize = Math.max(12, Math.round((frame.metaFontSize / 100) * sourceHeight));
      ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const bottomAreaCenter = sourceHeight + (finalCanvasHeight - sourceHeight) / 2;
      ctx.fillText(frame.metaText, finalCanvasWidth / 2, bottomAreaCenter);
    }
    ctx.restore();
  }

  // 4. Gambar Teks Watermark
  if (text.enabled && text.text.trim().length > 0) {
    ctx.save();
    const minDim = Math.min(sourceWidth, sourceHeight);
    const computedFontSize = computeFontSizePixels(text.fontSize, minDim);
    const resolvedFont = resolveCanvasFontFamily(text.fontFamily);
    ctx.font = `600 ${computedFontSize}px ${resolvedFont}`;
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(text.text);
    const textWidth = textMetrics.width;
    const textHeight = computedFontSize;

    ctx.globalAlpha = Math.max(0, Math.min(1, text.opacity));

    if (text.tile) {
      // Diagonal repeating tile pattern
      const angleRad = (text.rotation * Math.PI) / 180;
      const step = Math.max(80, Math.round((text.tileSpacing / 100) * minDim * 0.7));

      ctx.translate(finalCanvasWidth / 2, finalCanvasHeight / 2);
      ctx.rotate(angleRad);
      ctx.translate(-finalCanvasWidth / 2, -finalCanvasHeight / 2);

      const maxRadius = Math.sqrt(finalCanvasWidth ** 2 + finalCanvasHeight ** 2);
      const startX = -maxRadius;
      const endX = maxRadius * 2;
      const startY = -maxRadius;
      const endY = maxRadius * 2;

      for (let y = startY; y < endY; y += step) {
        for (let x = startX; x < endX; x += step + textWidth * 0.4) {
          drawSingleText(ctx, text.text, x, y, text);
        }
      }
    } else {
      // Single positioned watermark
      const coords = computeCoordinates(finalCanvasWidth, finalCanvasHeight, textWidth, textHeight, text.position);
      const centerX = coords.x + textWidth / 2;
      const centerY = coords.y + textHeight / 2;

      ctx.translate(centerX, centerY);
      if (text.rotation !== 0) {
        ctx.rotate((text.rotation * Math.PI) / 180);
      }
      ctx.translate(-centerX, -centerY);

      drawSingleText(ctx, text.text, coords.x, coords.y + textHeight / 2, text);
    }
    ctx.restore();
  }

  // 5. Gambar Logo Watermark
  if (logo.enabled && logoImg) {
    ctx.save();
    const logoScale = Math.max(0.05, Math.min(0.8, logo.scale / 100));
    const targetWidth = Math.round(sourceWidth * logoScale);
    const aspect = logoImg.height / logoImg.width;
    const targetHeight = Math.round(targetWidth * aspect);

    ctx.globalAlpha = Math.max(0, Math.min(1, logo.opacity));

    if (logo.tile) {
      const step = Math.max(100, targetWidth * 1.8);
      const angleRad = (logo.rotation * Math.PI) / 180;

      ctx.translate(finalCanvasWidth / 2, finalCanvasHeight / 2);
      ctx.rotate(angleRad);
      ctx.translate(-finalCanvasWidth / 2, -finalCanvasHeight / 2);

      const maxRadius = Math.sqrt(finalCanvasWidth ** 2 + finalCanvasHeight ** 2);
      for (let y = -maxRadius; y < maxRadius * 2; y += step) {
        for (let x = -maxRadius; x < maxRadius * 2; x += step) {
          ctx.drawImage(logoImg, x, y, targetWidth, targetHeight);
        }
      }
    } else {
      const coords = computeCoordinates(finalCanvasWidth, finalCanvasHeight, targetWidth, targetHeight, logo.position);
      const centerX = coords.x + targetWidth / 2;
      const centerY = coords.y + targetHeight / 2;

      ctx.translate(centerX, centerY);
      if (logo.rotation !== 0) {
        ctx.rotate((logo.rotation * Math.PI) / 180);
      }
      ctx.translate(-centerX, -centerY);

      ctx.drawImage(logoImg, coords.x, coords.y, targetWidth, targetHeight);
    }
    ctx.restore();
  }
}

/**
 * Helper untuk menggambar teks dengan shadow dan stroke
 */
function drawSingleText(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  textConfig: WatermarkFullConfig['text']
): void {
  if (textConfig.shadow) {
    ctx.save();
    ctx.shadowColor = textConfig.shadowColor || 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = textConfig.shadowBlur || 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = textConfig.color || '#ffffff';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  if (textConfig.stroke) {
    ctx.save();
    ctx.strokeStyle = textConfig.strokeColor || '#000000';
    ctx.lineWidth = textConfig.strokeWidth || 2;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
    ctx.restore();
  }

  ctx.fillStyle = textConfig.color || '#ffffff';
  ctx.fillText(str, x, y);
}

/**
 * Ekspor Canvas ke Blob & URL untuk proses download
 */
export function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat = 'image/png',
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Gagal mengonversi Canvas ke Blob'));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Memicu download file lokal di browser
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Menghitung ukuran font pixel secara proporsional dan linear
 */
export function computeFontSizePixels(fontSizePercent: number, minDimension: number): number {
  return Math.max(10, Math.round((fontSizePercent / 100) * minDimension));
}

/**
 * Memastikan string font family concrete dan aman untuk Canvas 2D
 */
export function resolveCanvasFontFamily(fontFamily?: string): string {
  if (!fontFamily || fontFamily.includes('var(')) {
    return '"Inter", sans-serif';
  }
  const trimmed = fontFamily.trim();
  // Pastikan font multi-kata tanpa tanda kutip dibungkus dengan tanda kutip untuk parser Canvas 2D
  if (trimmed.includes(' ') && !trimmed.startsWith('"') && !trimmed.startsWith("'")) {
    return `"${trimmed}"`;
  }
  return trimmed;
}

/**
 * Memastikan web font telah termuat sebelum digambar di canvas
 */
export async function ensureFontLoadedAsync(fontFamily: string, testText = 'MarkIt'): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) return true;
  try {
    const match = fontFamily.match(/["']?([^"',]+)["']?/);
    const primaryName = match ? match[1].trim() : fontFamily.trim();
    if (!primaryName || primaryName.startsWith('var(')) return true;

    const fontSpec = `600 24px "${primaryName}"`;
    const loadPromise = document.fonts.load(fontSpec, testText);
    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500));
    await Promise.race([loadPromise, timeoutPromise]);
    return document.fonts.check(fontSpec, testText);
  } catch {
    return false;
  }
}

/**
 * Opsi konfigurasi ekspor video bermarkah
 */
export interface VideoExportOptions {
  videoElement: HTMLVideoElement;
  sourceWidth: number;
  sourceHeight: number;
  duration: number;
  config: WatermarkFullConfig;
  logoImg?: HTMLImageElement | null;
  fps?: number;
  mimeType?: string;
  onProgress?: (progress: { percent: number; currentTime: number; totalTime: number }) => void;
  signal?: AbortSignal;
}

/**
 * Ekspor video utuh bermarkah beserta sinkronisasi audio via Canvas + MediaRecorder
 */
export async function exportWatermarkedVideoAsync(options: VideoExportOptions): Promise<Blob> {
  const {
    videoElement,
    sourceWidth,
    sourceHeight,
    duration,
    config,
    logoImg,
    fps = 30,
    mimeType,
    onProgress,
    signal,
  } = options;

  if (signal?.aborted) {
    throw new DOMException('Proses ekspor video dibatalkan oleh pengguna.', 'AbortError');
  }

  // Pre-load font if text watermark is active
  if (config.text.enabled && config.text.fontFamily) {
    await ensureFontLoadedAsync(config.text.fontFamily);
  }

  // Persiapkan canvas offscreen
  const offscreenCanvas = document.createElement('canvas');
  drawWatermarkOnCanvas(offscreenCanvas, videoElement, sourceWidth, sourceHeight, config, logoImg);

  const captureStreamFn =
    offscreenCanvas.captureStream ||
    (offscreenCanvas as unknown as { mozCaptureStream?: (fps?: number) => MediaStream }).mozCaptureStream;

  if (typeof captureStreamFn !== 'function') {
    throw new Error('Browser Anda tidak mendukung captureStream pada Canvas.');
  }

  const canvasStream: MediaStream = captureStreamFn.call(offscreenCanvas, fps);

  // Ambil audio track asli dari elemen video jika tersedia
  let audioTracks: MediaStreamTrack[] = [];
  try {
    const vStreamFn =
      (videoElement as unknown as { captureStream?: () => MediaStream }).captureStream ||
      (videoElement as unknown as { mozCaptureStream?: () => MediaStream }).mozCaptureStream;
    if (typeof vStreamFn === 'function') {
      const vStream = vStreamFn.call(videoElement);
      if (vStream) {
        audioTracks = vStream.getAudioTracks();
      }
    }
  } catch (err) {
    console.warn('Gagal menangkap audio track dari video source:', err);
  }

  const combinedTracks: MediaStreamTrack[] = [canvasStream.getVideoTracks()[0], ...audioTracks];
  const recordingStream = new MediaStream(combinedTracks);

  // Tentukan MIME type yang didukung
  const mimeCandidates = [
    mimeType,
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
  ].filter(Boolean) as string[];

  let chosenMime = '';
  if (typeof MediaRecorder !== 'undefined') {
    for (const cand of mimeCandidates) {
      if (MediaRecorder.isTypeSupported(cand)) {
        chosenMime = cand;
        break;
      }
    }
  }

  if (!chosenMime && typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder tidak didukung di lingkungan peramban ini.');
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(
    recordingStream,
    chosenMime ? { mimeType: chosenMime, videoBitsPerSecond: 8_000_000 } : undefined
  );

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const totalDuration = duration > 0 ? duration : videoElement.duration || 1;

  // Simpan state video sebelumnya
  const prevTime = videoElement.currentTime;
  const prevMuted = videoElement.muted;
  const prevVolume = videoElement.volume;
  const prevPaused = videoElement.paused;

  let isCleanedUp = false;
  // Cleanup helper
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    combinedTracks.forEach((track) => track.stop());
    canvasStream.getTracks().forEach((track) => track.stop());
    videoElement.muted = prevMuted;
    videoElement.volume = prevVolume;
    videoElement.currentTime = prevTime;
    if (prevPaused) {
      videoElement.pause();
    }
  };

  return new Promise<Blob>((resolve, reject) => {
    let animFrameId: number | null = null;
    let isFinished = false;

    const handleAbort = () => {
      if (isFinished) return;
      isFinished = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      videoElement.pause();
      cleanup();
      reject(new DOMException('Proses ekspor video dibatalkan oleh pengguna.', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', handleAbort, { once: true });
    }

    recorder.onstop = () => {
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
      cleanup();
      if (!signal?.aborted) {
        const finalBlob = new Blob(chunks, { type: chosenMime || 'video/webm' });
        resolve(finalBlob);
      }
    };

    recorder.onerror = (e) => {
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
      cleanup();
      reject(new Error(`MediaRecorder error: ${String(e)}`));
    };

    const onSeekedInitial = async () => {
      if (signal?.aborted) {
        handleAbort();
        return;
      }

      // Mulai rekam
      try {
        recorder.start(100);
      } catch (err) {
        cleanup();
        reject(err);
        return;
      }

      // Mulai playback video
      try {
        await videoElement.play();
      } catch (err) {
        recorder.stop();
        cleanup();
        reject(new Error(`Gagal memutar video untuk rendering: ${String(err)}`));
        return;
      }

      // Loop rendering frame demi frame
      const renderLoop = () => {
        if (signal?.aborted) {
          handleAbort();
          return;
        }

        drawWatermarkOnCanvas(offscreenCanvas, videoElement, sourceWidth, sourceHeight, config, logoImg);

        const curTime = videoElement.currentTime;
        const percent = Math.min(100, Math.round((curTime / totalDuration) * 100));
        onProgress?.({ percent, currentTime: curTime, totalTime: totalDuration });

        if (curTime >= totalDuration - 0.05 || videoElement.ended) {
          isFinished = true;
          videoElement.pause();
          onProgress?.({ percent: 100, currentTime: totalDuration, totalTime: totalDuration });
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
          return;
        }

        animFrameId = requestAnimationFrame(renderLoop);
      };

      animFrameId = requestAnimationFrame(renderLoop);
    };

    // Robust seek guard: jika video sudah di frame 0, langsung mulai
    if (Math.abs(videoElement.currentTime) < 0.01) {
      onSeekedInitial();
    } else {
      videoElement.addEventListener('seeked', onSeekedInitial, { once: true });
      videoElement.currentTime = 0;
    }
  });
}
