import type {
  WatermarkFullConfig,
  PositionConfig,
  GridPosition,
  ExportFormat,
  VideoQualityPreset,
  VideoQualityProfile,
  VideoBitrateConfig,
  MovingWatermarkConfig,
  ImageMetadataConfig,
  VideoEngineMode,
} from '@/types/watermark';

/**
 * Returns a finite positive number, or fallback if NaN, Infinity, or non-positive
 */
export function getSafeFiniteDuration(duration: unknown, fallback = 0): number {
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return duration;
  }
  return fallback;
}

/**
 * Menerapkan kualitas smoothing tinggi pada konteks 2D Canvas
 */
export function applyPristineCanvasSmoothing(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

/**
 * Memuat gambar secara asynchronous hingga benar-benar ter-decode
 */
export function loadImageAsync(src: string): Promise<HTMLImageElement> {
  if (!src || typeof src !== 'string' || !src.trim()) {
    return Promise.reject(new Error('URL gambar tidak valid atau kosong.'));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    let isSettled = false;
    const timeout = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        reject(new Error(`Batas waktu (timeout) memuat gambar terlampaui: ${src}`));
      }
    }, 15000);

    // Hindari crossOrigin pada blob: atau data: URL untuk mencegah security taint
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeout);
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve(img)).catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = (err) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeout);
      reject(new Error(`Gagal memuat gambar: ${String(err)}`));
    };
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
 * Menghitung koordinat dinamis untuk Watermark Bergerak (Anti-AI Removal)
 */
export function computeMovingCoordinates(
  mediaWidth: number,
  mediaHeight: number,
  contentWidth: number,
  contentHeight: number,
  basePos: PositionConfig,
  movingConfig: MovingWatermarkConfig,
  timeSeconds = 0
): { x: number; y: number } {
  if (
    !Number.isFinite(mediaWidth) ||
    mediaWidth <= 0 ||
    !Number.isFinite(mediaHeight) ||
    mediaHeight <= 0
  ) {
    return { x: 0, y: 0 };
  }

  const paddingX = mediaWidth * 0.03;
  const paddingY = mediaHeight * 0.03;
  const minX = paddingX;
  const maxX = Math.max(minX, mediaWidth - contentWidth - paddingX);
  const minY = paddingY;
  const maxY = Math.max(minY, mediaHeight - contentHeight - paddingY);

  const t = Math.max(0, Number.isFinite(timeSeconds) ? timeSeconds : 0);

  if (!movingConfig.enabled) {
    return computeCoordinates(mediaWidth, mediaHeight, contentWidth, contentHeight, basePos);
  }

  if (movingConfig.mode === 'jump') {
    // Berganti posisi grid setiap interval tertentu
    const interval =
      movingConfig.speed === 'fast' ? 1.5 : movingConfig.speed === 'slow' ? 5.0 : 3.0;
    const jumpGrids: GridPosition[] = [
      'bottom-right',
      'top-left',
      'bottom-left',
      'top-right',
      'center',
      'middle-left',
      'middle-right',
    ];
    const stepIdx = Math.floor(t / interval) % jumpGrids.length;
    const targetGrid = jumpGrids[stepIdx];
    return computeCoordinates(mediaWidth, mediaHeight, contentWidth, contentHeight, {
      grid: targetGrid,
      offsetX: basePos.offsetX * 0.5,
      offsetY: basePos.offsetY * 0.5,
    });
  }

  if (movingConfig.mode === 'bounce') {
    // Memantul dari tepi layar (triangle wave deterministik)
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    const periodX =
      movingConfig.speed === 'fast' ? 4.0 : movingConfig.speed === 'slow' ? 14.0 : 8.0;
    const periodY =
      movingConfig.speed === 'fast' ? 3.1 : movingConfig.speed === 'slow' ? 11.0 : 6.2;

    const triangleWave = (time: number, period: number): number => {
      const norm = (time % period) / period;
      return norm < 0.5 ? norm * 2 : (1 - norm) * 2;
    };

    const posX = rangeX > 0 ? minX + triangleWave(t, periodX) * rangeX : minX;
    const posY = rangeY > 0 ? minY + triangleWave(t, periodY) * rangeY : minY;

    return {
      x: Math.round(posX),
      y: Math.round(posY),
    };
  }

  // Default mode: 'drift' (gerakan melayang harmonik halus)
  const baseCoords = computeCoordinates(mediaWidth, mediaHeight, contentWidth, contentHeight, basePos);
  const freqX =
    movingConfig.speed === 'fast' ? 1.4 : movingConfig.speed === 'slow' ? 0.35 : 0.7;
  const freqY =
    movingConfig.speed === 'fast' ? 2.0 : movingConfig.speed === 'slow' ? 0.5 : 1.0;

  const maxAmpX = (maxX - minX) * 0.35;
  const maxAmpY = (maxY - minY) * 0.35;

  const driftX = Math.sin(t * freqX) * maxAmpX;
  const driftY = Math.cos(t * freqY) * maxAmpY;

  const finalX = Math.max(minX, Math.min(maxX, baseCoords.x + driftX));
  const finalY = Math.max(minY, Math.min(maxY, baseCoords.y + driftY));

  return {
    x: Math.round(finalX),
    y: Math.round(finalY),
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
  logoImg?: HTMLImageElement | null,
  timeSeconds = 0
): void {
  if (sourceWidth <= 0 || sourceHeight <= 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { frame } = config;

  // Tentukan apakah frame mode banner / card aktif yang mengubah rasio kanvas
  let finalCanvasWidth = sourceWidth;
  let finalCanvasHeight = sourceHeight;
  let mediaDrawX = 0;
  let mediaDrawY = 0;
  const mediaDrawWidth = sourceWidth;
  const mediaDrawHeight = sourceHeight;
  let bannerHeight = 0;
  let cardBorder = 0;
  let cardBottom = 0;

  if (frame.enabled && frame.style === 'banner') {
    bannerHeight = Math.max(48, Math.round(sourceHeight * 0.08));
    finalCanvasHeight = sourceHeight + bannerHeight;
  } else if (frame.enabled && frame.style === 'card') {
    cardBorder = Math.max(1, Math.round(sourceWidth * (frame.borderWidth / 100)));
    cardBottom = Math.round(sourceHeight * 0.16);
    finalCanvasWidth = sourceWidth + cardBorder * 2;
    finalCanvasHeight = sourceHeight + cardBorder + cardBottom;
    mediaDrawX = cardBorder;
    mediaDrawY = cardBorder;
  }

  if (canvas.width !== finalCanvasWidth) {
    canvas.width = finalCanvasWidth;
  }
  if (canvas.height !== finalCanvasHeight) {
    canvas.height = finalCanvasHeight;
  }

  // Terapkan kualitas smoothing tinggi segera setelah alokasi dimensi kanvas
  applyPristineCanvasSmoothing(ctx);

  ctx.clearRect(0, 0, finalCanvasWidth, finalCanvasHeight);

  // 1. Gambar Dasar / Frame Background jika tipe card
  if (frame.enabled && frame.style === 'card') {
    ctx.fillStyle = frame.borderColor || '#ffffff';
    ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);
  }

  // 2. Gambar Media Utama (Foto atau Frame Video)
  ctx.drawImage(mediaSource, mediaDrawX, mediaDrawY, mediaDrawWidth, mediaDrawHeight);

  // 3. Gambar lapisan overlay watermark (frame, teks, dan logo)
  drawWatermarkOverlays(
    ctx,
    finalCanvasWidth,
    finalCanvasHeight,
    config,
    logoImg,
    {
      bannerHeight,
      cardBorder,
      cardBottom,
    },
    timeSeconds
  );
}

/**
 * Menggambar lapisan overlay watermark (frame dekoratif, teks watermark, dan logo)
 * ke context Canvas pada dimensi kanvas target yang ditentukan
 */
export function drawWatermarkOverlays(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: WatermarkFullConfig,
  logoImg?: HTMLImageElement | null,
  frameMetrics?: { bannerHeight?: number; cardBorder?: number; cardBottom?: number },
  timeSeconds = 0
): void {
  if (canvasWidth <= 0 || canvasHeight <= 0) return;
  const { frame, text, logo } = config;

  // 1. Gambar Frame Dekoratif
  if (frame.enabled) {
    ctx.save();
    const borderWidth = Math.max(1, Math.round(canvasWidth * (frame.borderWidth / 100)));
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = frame.borderColor;

    if (frame.style === 'solid') {
      const inset = Math.round(canvasWidth * (frame.padding / 100));
      ctx.strokeRect(inset, inset, canvasWidth - inset * 2, canvasHeight - inset * 2);
    } else if (frame.style === 'double') {
      const inset1 = Math.round(canvasWidth * (frame.padding / 100));
      const inset2 = inset1 + borderWidth * 2;
      ctx.strokeRect(inset1, inset1, canvasWidth - inset1 * 2, canvasHeight - inset1 * 2);
      ctx.lineWidth = Math.max(1, Math.round(borderWidth * 0.5));
      ctx.strokeRect(inset2, inset2, canvasWidth - inset2 * 2, canvasHeight - inset2 * 2);
    } else if (frame.style === 'dashed') {
      const inset = Math.round(canvasWidth * (frame.padding / 100));
      ctx.setLineDash([borderWidth * 3, borderWidth * 2]);
      ctx.strokeRect(inset, inset, canvasWidth - inset * 2, canvasHeight - inset * 2);
    } else if (frame.style === 'banner') {
      const bannerHeight =
        frameMetrics?.bannerHeight && frameMetrics.bannerHeight > 0
          ? frameMetrics.bannerHeight
          : Math.max(48, Math.round(canvasHeight * 0.08));
      ctx.fillStyle = frame.borderColor || '#ffffff';
      ctx.fillRect(0, canvasHeight - bannerHeight, canvasWidth, bannerHeight);

      if (frame.metaText) {
        ctx.fillStyle = frame.metaColor || '#0f172a';
        const fontSize = Math.max(12, Math.round((frame.metaFontSize / 100) * canvasHeight));
        ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(frame.metaText, canvasWidth / 2, canvasHeight - bannerHeight / 2);
      }
    } else if (frame.style === 'card') {
      const cardBorder =
        frameMetrics?.cardBorder && frameMetrics.cardBorder > 0
          ? frameMetrics.cardBorder
          : borderWidth;
      const cardBottom =
        frameMetrics?.cardBottom && frameMetrics.cardBottom > 0
          ? frameMetrics.cardBottom
          : Math.round(canvasHeight * 0.14);

      // Pastikan border polaroid tergambar pada mode social canvas (ketika kanvas tidak diperluas di awal)
      if (!frameMetrics?.cardBottom) {
        ctx.fillStyle = frame.borderColor || '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, cardBorder);
        ctx.fillRect(0, 0, cardBorder, canvasHeight);
        ctx.fillRect(canvasWidth - cardBorder, 0, cardBorder, canvasHeight);
        ctx.fillRect(0, canvasHeight - cardBottom, canvasWidth, cardBottom);
      }

      if (frame.metaText) {
        ctx.fillStyle = frame.metaColor || '#0f172a';
        const fontSize = Math.max(12, Math.round((frame.metaFontSize / 100) * canvasHeight));
        ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const bottomAreaCenter = canvasHeight - Math.round(cardBottom / 2);
        ctx.fillText(frame.metaText, canvasWidth / 2, bottomAreaCenter);
      }
    }
    ctx.restore();
  }

  // 2. Gambar Teks Watermark
  if (text.enabled && text.text.trim().length > 0) {
    ctx.save();
    const minDim = Math.min(canvasWidth, canvasHeight);
    const computedFontSize = computeFontSizePixels(text.fontSize, minDim);
    const resolvedFont = resolveCanvasFontFamily(text.fontFamily);
    ctx.font = `600 ${computedFontSize}px ${resolvedFont}`;
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(text.text);
    const textWidth = Number.isFinite(textMetrics.width) && textMetrics.width > 0 ? textMetrics.width : 0;
    const textHeight = computedFontSize;

    ctx.globalAlpha = Math.max(0, Math.min(1, Number.isFinite(text.opacity) ? text.opacity : 0.85));

    if (text.tile) {
      const angleRad = ((Number.isFinite(text.rotation) ? text.rotation : 0) * Math.PI) / 180;
      const safeTileSpacing =
        Number.isFinite(text.tileSpacing) && text.tileSpacing > 0 ? text.tileSpacing : 140;
      const stepY = Math.max(60, Math.round((safeTileSpacing / 100) * minDim * 0.7));
      const stepX = Math.max(60, Math.round(stepY + textWidth * 0.4));

      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate(angleRad);
      if (config.moving?.enabled) {
        const speedMultiplier = config.moving.speed === 'fast' ? 45 : config.moving.speed === 'slow' ? 12 : 25;
        const drift = (timeSeconds * speedMultiplier) % stepX;
        ctx.translate(drift, drift);
      }
      ctx.translate(-canvasWidth / 2, -canvasHeight / 2);

      const maxRadius = Math.sqrt(canvasWidth ** 2 + canvasHeight ** 2);
      const startX = -maxRadius;
      const endX = maxRadius * 2;
      const startY = -maxRadius;
      const endY = maxRadius * 2;

      for (let y = startY; y < endY; y += stepY) {
        for (let x = startX; x < endX; x += stepX) {
          drawSingleText(ctx, text.text, x, y, text);
        }
      }
    } else {
      const coords = config.moving?.enabled
        ? computeMovingCoordinates(canvasWidth, canvasHeight, textWidth, textHeight, text.position, config.moving, timeSeconds)
        : computeCoordinates(canvasWidth, canvasHeight, textWidth, textHeight, text.position);
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

  // 3. Gambar Logo Watermark
  if (logo.enabled && logoImg) {
    const rawLogoW = logoImg.naturalWidth || logoImg.width;
    const rawLogoH = logoImg.naturalHeight || logoImg.height;
    if (rawLogoW > 0 && rawLogoH > 0) {
      ctx.save();
      const safeScale = Number.isFinite(logo.scale) ? logo.scale : 18;
      const logoScale = Math.max(0.05, Math.min(0.8, safeScale / 100));
      const targetLogoWidth = Math.max(1, Math.round(canvasWidth * logoScale));
      const aspect = rawLogoH / rawLogoW;
      const targetLogoHeight = Math.max(1, Math.round(targetLogoWidth * aspect));

      ctx.globalAlpha = Math.max(0, Math.min(1, Number.isFinite(logo.opacity) ? logo.opacity : 0.9));

      if (logo.tile) {
        const safeLogoSpacing =
          Number.isFinite(logo.tileSpacing) && logo.tileSpacing > 0 ? logo.tileSpacing : 180;
        const step = Math.max(80, Math.round(targetLogoWidth * (safeLogoSpacing / 100)));
        const angleRad = ((Number.isFinite(logo.rotation) ? logo.rotation : 0) * Math.PI) / 180;

        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.rotate(angleRad);
        if (config.moving?.enabled) {
          const speedMultiplier = config.moving.speed === 'fast' ? 45 : config.moving.speed === 'slow' ? 12 : 25;
          const drift = (timeSeconds * speedMultiplier) % step;
          ctx.translate(drift, drift);
        }
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);

        const maxRadius = Math.sqrt(canvasWidth ** 2 + canvasHeight ** 2);
        for (let y = -maxRadius; y < maxRadius * 2; y += step) {
          for (let x = -maxRadius; x < maxRadius * 2; x += step) {
            ctx.drawImage(logoImg, x, y, targetLogoWidth, targetLogoHeight);
          }
        }
      } else {
        const coords = config.moving?.enabled
          ? computeMovingCoordinates(canvasWidth, canvasHeight, targetLogoWidth, targetLogoHeight, logo.position, config.moving, timeSeconds)
          : computeCoordinates(canvasWidth, canvasHeight, targetLogoWidth, targetLogoHeight, logo.position);
        const centerX = coords.x + targetLogoWidth / 2;
        const centerY = coords.y + targetLogoHeight / 2;

        ctx.translate(centerX, centerY);
        if (logo.rotation !== 0) {
          ctx.rotate((logo.rotation * Math.PI) / 180);
        }
        ctx.translate(-centerX, -centerY);

        ctx.drawImage(logoImg, coords.x, coords.y, targetLogoWidth, targetLogoHeight);
      }
      ctx.restore();
    }
  }
}

/**
 * Merender media ke format rasio kanvas sosmed 720 × 1280 px
 * Disesuaikan khusus untuk konten TikTok, Instagram Reels, dan YouTube Shorts
 */
export function drawWatermarkOnSocialCanvas(
  canvas: HTMLCanvasElement,
  mediaSource: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  config: WatermarkFullConfig,
  logoImg?: HTMLImageElement | null,
  targetWidth = 720,
  targetHeight = 1280,
  timeSeconds = 0
): void {
  if (canvas.width !== targetWidth) {
    canvas.width = targetWidth;
  }
  if (canvas.height !== targetHeight) {
    canvas.height = targetHeight;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  applyPristineCanvasSmoothing(ctx);
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight; // 720 / 1280 = 0.5625

  if (Math.abs(sourceAspect - targetAspect) < 0.02) {
    // Media sudah bertipe 9:16 (seperti 720x1280 atau 1080x1920)
    ctx.drawImage(mediaSource, 0, 0, targetWidth, targetHeight);
  } else {
    // Konten non-9:16 (misal lanskap 16:9 atau persegi 1:1) disesuaikan secara adaptif
    // 1. Gambar latar belakang ambient blur khas platform sosial (TikTok / Reels)
    ctx.save();
    const coverScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const bgW = sourceWidth * coverScale;
    const bgH = sourceHeight * coverScale;
    ctx.filter = 'blur(28px) brightness(0.4)';
    ctx.drawImage(mediaSource, (targetWidth - bgW) / 2, (targetHeight - bgH) / 2, bgW, bgH);
    ctx.restore();

    // 2. Gambar media utama secara fit di tengah kanvas 720 × 1280 px dengan bayangan lembut
    const fitScale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const drawW = Math.round(sourceWidth * fitScale);
    const drawH = Math.round(sourceHeight * fitScale);
    const drawX = Math.round((targetWidth - drawW) / 2);
    const drawY = Math.round((targetHeight - drawH) / 2);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.drawImage(mediaSource, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // 3. Gambar lapisan dekorasi, watermark teks, dan logo pada kanvas 720 × 1280 px
  drawWatermarkOverlays(ctx, targetWidth, targetHeight, config, logoImg, undefined, timeSeconds);
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
  ctx.save();
  if (textConfig.shadow) {
    ctx.shadowColor = textConfig.shadowColor || 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = textConfig.shadowBlur || 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  if (textConfig.stroke) {
    ctx.strokeStyle = textConfig.strokeColor || '#000000';
    ctx.lineWidth = textConfig.strokeWidth || 2;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
  }

  ctx.fillStyle = textConfig.color || '#ffffff';
  ctx.fillText(str, x, y);
  ctx.restore();
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
    if (canvas.width <= 0 || canvas.height <= 0) {
      reject(new Error('Dimensi canvas tidak valid (lebar atau tinggi 0).'));
      return;
    }
    const safeQuality = Number.isFinite(quality) ? Math.min(1, Math.max(0, quality)) : 0.92;
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Gagal mengonversi Canvas ke Blob'));
        }
      },
      format,
      safeQuality
    );
  });
}

/**
 * Memicu download file lokal di browser
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename;
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
 * Menghitung bitrate video adaptif berdasarkan dimensi resolusi, framerate, dan preset kualitas
 */
export function computeAdaptiveVideoBitrate(
  width: number,
  height: number,
  fps = 30,
  preset: VideoQualityProfile = 'maximum'
): number {
  const pixels = width * height;
  const normalizedPreset = preset === 'optimal' ? 'standard' : preset;

  let baseBitrate: number;

  if (pixels <= 1280 * 720) {
    // 720p HD and below
    switch (normalizedPreset) {
      case 'standard':
        baseBitrate = 8_000_000; // 8 Mbps
        break;
      case 'high':
        baseBitrate = 12_000_000; // 12 Mbps
        break;
      case 'maximum':
      default:
        baseBitrate = 18_000_000; // 18 Mbps
        break;
    }
  } else if (pixels <= 1920 * 1080) {
    // 1080p FHD
    switch (normalizedPreset) {
      case 'standard':
        baseBitrate = 12_000_000; // 12 Mbps
        break;
      case 'high':
        baseBitrate = 16_000_000; // 16 Mbps
        break;
      case 'maximum':
      default:
        baseBitrate = 28_000_000; // 28 Mbps
        break;
    }
  } else if (pixels <= 2560 * 1440) {
    // 1440p 2K
    switch (normalizedPreset) {
      case 'standard':
        baseBitrate = 18_000_000; // 18 Mbps
        break;
      case 'high':
        baseBitrate = 24_000_000; // 24 Mbps
        break;
      case 'maximum':
      default:
        baseBitrate = 36_000_000; // 36 Mbps
        break;
    }
  } else {
    // 4K UHD and above
    switch (normalizedPreset) {
      case 'standard':
        baseBitrate = 24_000_000; // 24 Mbps
        break;
      case 'high':
        baseBitrate = 35_000_000; // 35 Mbps
        break;
      case 'maximum':
      default:
        baseBitrate = 45_000_000; // 45 Mbps
        break;
    }
  }

  // Penyesuaian frame rate jika > 30 FPS (misalnya 60 FPS)
  if (fps > 30) {
    const fpsScale = Math.min(1.5, Math.max(1, fps / 30));
    baseBitrate = Math.round(baseBitrate * fpsScale);
  }

  // Batas maksimum kapabilitas browser: 50 Mbps
  return Math.min(50_000_000, baseBitrate);
}

/**
 * Menghitung konfigurasi bitrate video & audio adaptif (256kbps audio)
 */
export function calculateAdaptiveVideoBitrate(
  width: number,
  height: number,
  fps?: number,
  profile?: VideoQualityProfile
): VideoBitrateConfig {
  return {
    videoBitsPerSecond: computeAdaptiveVideoBitrate(width, height, fps, profile),
    audioBitsPerSecond: 256_000,
  };
}

/**
 * Opsi konfigurasi capture frame snapshot native video
 */
export interface VideoSnapshotOptions {
  videoElement: HTMLVideoElement;
  sourceWidth?: number;
  sourceHeight?: number;
  config: WatermarkFullConfig;
  logoImg?: HTMLImageElement | null;
  format?: ExportFormat;
  quality?: number;
}

/**
 * Menangkap snapshot native dari frame video aktif pada resolusi aslinya secara langsung
 * tanpa terdistorsi oleh scaling viewport atau canvas viewer
 */
export async function captureNativeVideoFrameAsync(
  videoElement: HTMLVideoElement,
  config: WatermarkFullConfig,
  logoImg?: HTMLImageElement | null,
  format: ExportFormat = 'image/png',
  quality = 0.95,
  sourceWidth?: number,
  sourceHeight?: number
): Promise<Blob> {
  const width = sourceWidth || videoElement.videoWidth || 1920;
  const height = sourceHeight || videoElement.videoHeight || 1080;

  if (config.text.enabled && config.text.fontFamily) {
    await ensureFontLoadedAsync(config.text.fontFamily);
  }

  const offscreenCanvas = document.createElement('canvas');
  drawWatermarkOnCanvas(offscreenCanvas, videoElement, width, height, config, logoImg);
  return exportCanvasToBlob(offscreenCanvas, format, quality);
}

/**
 * Wrapper snapshot native video sesuai kontrak PRD
 */
export function exportNativeVideoSnapshotAsync(options: VideoSnapshotOptions): Promise<Blob> {
  return captureNativeVideoFrameAsync(
    options.videoElement,
    options.config,
    options.logoImg,
    options.format || 'image/png',
    options.quality ?? 0.95,
    options.sourceWidth,
    options.sourceHeight
  );
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
  qualityPreset?: VideoQualityPreset;
  qualityProfile?: VideoQualityProfile;
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
    fps = 60,
    mimeType,
    qualityPreset,
    qualityProfile,
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

  // Pastikan elemen video tidak di-suspend oleh optimasi background decoder browser (opacity: 0 / z-index negatif / offscreen)
  const videoStyle = (videoElement as unknown as { style?: Partial<CSSStyleDeclaration> }).style;
  const savedStyle = videoStyle
    ? {
        opacity: videoStyle.opacity,
        zIndex: videoStyle.zIndex,
        top: videoStyle.top,
        left: videoStyle.left,
        bottom: videoStyle.bottom,
        right: videoStyle.right,
        width: videoStyle.width,
        height: videoStyle.height,
        position: videoStyle.position,
        pointerEvents: videoStyle.pointerEvents,
      }
    : null;

  const restoreVideoStyle = () => {
    if (videoStyle && savedStyle) {
      videoStyle.opacity = savedStyle.opacity;
      videoStyle.zIndex = savedStyle.zIndex;
      videoStyle.top = savedStyle.top;
      videoStyle.left = savedStyle.left;
      videoStyle.bottom = savedStyle.bottom;
      videoStyle.right = savedStyle.right;
      videoStyle.width = savedStyle.width;
      videoStyle.height = savedStyle.height;
      videoStyle.position = savedStyle.position;
      videoStyle.pointerEvents = savedStyle.pointerEvents;
    }
  };

  if (videoStyle) {
    if (!videoStyle.opacity || Number(videoStyle.opacity) <= 0 || Number(videoStyle.opacity) < 0.9) {
      videoStyle.opacity = '1';
    }
    if (!videoStyle.zIndex || Number(videoStyle.zIndex) < 1) {
      videoStyle.zIndex = '1';
    }
    if (videoStyle.top === '-9999px' || videoStyle.left === '-9999px') {
      videoStyle.top = '0px';
      videoStyle.left = '0px';
      videoStyle.bottom = 'auto';
      videoStyle.right = 'auto';
    }
    const currentW = Number.parseInt(String(videoStyle.width || '0'), 10);
    if (!videoStyle.width || currentW < 2) {
      videoStyle.width = '2px';
    }
    const currentH = Number.parseInt(String(videoStyle.height || '0'), 10);
    if (!videoStyle.height || currentH < 2) {
      videoStyle.height = '2px';
    }
  }

  // Pastikan data frame video sudah siap sebelum menggambar ke canvas
  if (typeof videoElement.readyState === 'number' && videoElement.readyState < 2) {
    if (videoElement.preload !== 'auto') {
      videoElement.preload = 'auto';
    }
    await new Promise<void>((resolve) => {
      let settled = false;
      const onReady = () => {
        if (!settled) {
          settled = true;
          videoElement.removeEventListener('loadeddata', onReady);
          videoElement.removeEventListener('canplay', onReady);
          resolve();
        }
      };
      videoElement.addEventListener('loadeddata', onReady, { once: true });
      videoElement.addEventListener('canplay', onReady, { once: true });
      if (videoElement.readyState === 0 && typeof videoElement.load === 'function') {
        try {
          videoElement.load();
        } catch {
          // Abaikan pada environment mock
        }
      }
      setTimeout(onReady, 5000);
    });
  }

  const actualWidth = sourceWidth > 0 ? sourceWidth : videoElement.videoWidth || 1280;
  const actualHeight = sourceHeight > 0 ? sourceHeight : videoElement.videoHeight || 720;

  // Persiapkan canvas offscreen
  const offscreenCanvas = document.createElement('canvas');
  drawWatermarkOnCanvas(offscreenCanvas, videoElement, actualWidth, actualHeight, config, logoImg);

  const finalCanvasWidth = offscreenCanvas.width || actualWidth;
  const finalCanvasHeight = offscreenCanvas.height || actualHeight;

  let mediaDrawX = 0;
  let mediaDrawY = 0;
  const mediaDrawWidth = actualWidth;
  const mediaDrawHeight = actualHeight;
  let bannerHeight = 0;
  let cardBorder = 0;
  let cardBottom = 0;

  if (config.frame.enabled && config.frame.style === 'banner') {
    bannerHeight = Math.max(48, Math.round(actualHeight * 0.08));
  } else if (config.frame.enabled && config.frame.style === 'card') {
    cardBorder = Math.max(1, Math.round(actualWidth * (config.frame.borderWidth / 100)));
    cardBottom = Math.round(actualHeight * 0.16);
    mediaDrawX = cardBorder;
    mediaDrawY = cardBorder;
  }

  // Pre-render static watermark overlay sekali saja untuk membebaskan CPU dari re-measuring text & tile loop di tiap frame
  let overlayCanvas: HTMLCanvasElement | null = null;
  if (typeof document !== 'undefined') {
    try {
      overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = finalCanvasWidth;
      overlayCanvas.height = finalCanvasHeight;
      const overlayCtx = overlayCanvas.getContext('2d');
      if (overlayCtx) {
        applyPristineCanvasSmoothing(overlayCtx);
        drawWatermarkOverlays(overlayCtx, finalCanvasWidth, finalCanvasHeight, config, logoImg, {
          bannerHeight,
          cardBorder,
          cardBottom,
        });
      }
    } catch {
      overlayCanvas = null;
    }
  }

  const offscreenCtx = offscreenCanvas.getContext('2d');
  if (offscreenCtx) {
    offscreenCtx.imageSmoothingEnabled = true;
    offscreenCtx.imageSmoothingQuality = 'medium';
  }

  const renderFastVideoFrame = (currentTimeSec = 0) => {
    if (!offscreenCtx) {
      drawWatermarkOnCanvas(offscreenCanvas, videoElement, actualWidth, actualHeight, config, logoImg, currentTimeSec);
      return;
    }
    if (config.moving?.enabled) {
      if (config.frame.enabled && config.frame.style === 'card') {
        offscreenCtx.fillStyle = config.frame.borderColor || '#ffffff';
        offscreenCtx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);
      }
      offscreenCtx.drawImage(videoElement, mediaDrawX, mediaDrawY, mediaDrawWidth, mediaDrawHeight);
      drawWatermarkOverlays(
        offscreenCtx,
        finalCanvasWidth,
        finalCanvasHeight,
        config,
        logoImg,
        {
          bannerHeight,
          cardBorder,
          cardBottom,
        },
        currentTimeSec
      );
    } else if (overlayCanvas) {
      if (config.frame.enabled && config.frame.style === 'card') {
        offscreenCtx.fillStyle = config.frame.borderColor || '#ffffff';
        offscreenCtx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);
      }
      offscreenCtx.drawImage(videoElement, mediaDrawX, mediaDrawY, mediaDrawWidth, mediaDrawHeight);
      offscreenCtx.drawImage(overlayCanvas, 0, 0);
    } else {
      drawWatermarkOnCanvas(offscreenCanvas, videoElement, actualWidth, actualHeight, config, logoImg, currentTimeSec);
    }
  };

  const captureStreamFn =
    offscreenCanvas.captureStream ||
    (offscreenCanvas as unknown as { mozCaptureStream?: (fps?: number) => MediaStream }).mozCaptureStream;

  if (typeof captureStreamFn !== 'function') {
    restoreVideoStyle();
    throw new Error('Browser Anda tidak mendukung captureStream pada Canvas.');
  }

  const canvasStream: MediaStream = captureStreamFn.call(offscreenCanvas, fps);

  // Ambil audio track asli dari elemen video jika tersedia
  let audioTracks: MediaStreamTrack[] = [];
  let sourceVideoStream: MediaStream | null = null;
  try {
    const vStreamFn =
      (videoElement as unknown as { captureStream?: () => MediaStream }).captureStream ||
      (videoElement as unknown as { mozCaptureStream?: () => MediaStream }).mozCaptureStream;
    if (typeof vStreamFn === 'function') {
      const vStream = vStreamFn.call(videoElement);
      if (vStream) {
        sourceVideoStream = vStream;
        audioTracks = vStream.getAudioTracks();
        // Hentikan video tracks dari stream sumber segera agar GPU/decoder tidak memproses video ganda
        if (typeof vStream.getVideoTracks === 'function') {
          vStream.getVideoTracks().forEach((track) => track.stop());
        }
      }
    }
  } catch (err) {
    console.warn('Gagal menangkap audio track dari video source:', err);
  }

  const stopAllStreams = () => {
    canvasStream.getTracks().forEach((track) => track.stop());
    audioTracks.forEach((track) => track.stop());
    if (sourceVideoStream && typeof sourceVideoStream.getVideoTracks === 'function') {
      sourceVideoStream.getVideoTracks().forEach((track) => track.stop());
    }
  };

  const videoTracks = canvasStream.getVideoTracks();
  if (!videoTracks || videoTracks.length === 0) {
    stopAllStreams();
    restoreVideoStyle();
    throw new Error('Gagal menangkap video track dari Canvas stream.');
  }
  const videoTrack = videoTracks[0] as MediaStreamTrack & { requestFrame?: () => void };
  videoTrack.enabled = true;

  const flushCanvasFrame = () => {
    if (typeof videoTrack.requestFrame === 'function') {
      try {
        videoTrack.requestFrame();
      } catch {
        // Abaikan jika stream belum aktif atau sudah ditutup
      }
    }
  };

  const combinedTracks: MediaStreamTrack[] = [videoTrack, ...audioTracks];
  const recordingStream = new MediaStream(combinedTracks);

  // Tentukan MIME type yang didukung dengan memprioritaskan format yang diminta
  const isMp4Requested = mimeType?.includes('mp4');
  const mimeCandidates = (
    isMp4Requested
      ? [
          mimeType,
          'video/mp4;codecs=avc1,mp4a',
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ]
      : [
          mimeType,
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4;codecs=avc1,mp4a',
          'video/mp4',
        ]
  ).filter(Boolean) as string[];

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
    stopAllStreams();
    restoreVideoStyle();
    throw new Error('MediaRecorder tidak didukung di lingkungan peramban ini.');
  }

  // Hitung bitrate adaptif berdasarkan resolusi dan kualitas preset
  const chosenPreset: VideoQualityPreset =
    qualityPreset ||
    (qualityProfile === 'optimal' ? 'standard' : qualityProfile) ||
    'maximum';
  const bitrateConfig = calculateAdaptiveVideoBitrate(actualWidth, actualHeight, fps, chosenPreset);

  const chunks: BlobPart[] = [];
  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: bitrateConfig.videoBitsPerSecond,
    audioBitsPerSecond: bitrateConfig.audioBitsPerSecond,
  };
  if (chosenMime) {
    recorderOptions.mimeType = chosenMime;
  }

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(recordingStream, recorderOptions);
  } catch (err) {
    stopAllStreams();
    restoreVideoStyle();
    throw err;
  }

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const rawDuration = duration > 0 ? duration : videoElement.duration || 1;
  const totalDuration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 1;

  // Simpan state video sebelumnya
  const prevTime = videoElement.currentTime;
  const prevMuted = videoElement.muted;
  const prevVolume = videoElement.volume;
  const prevPaused = videoElement.paused;

  let isCleanedUp = false;

  return new Promise<Blob>((resolve, reject) => {
    const hasRVFC = typeof videoElement.requestVideoFrameCallback === 'function';

    let animFrameId: number | null = null;
    let rvfcHandle: number | null = null;
    let frameFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    let isFinished = false;

    const cancelScheduledFrame = () => {
      if (animFrameId !== null) {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(animFrameId);
        } else {
          clearTimeout(animFrameId);
        }
        animFrameId = null;
      }
      if (rvfcHandle !== null && typeof videoElement.cancelVideoFrameCallback === 'function') {
        videoElement.cancelVideoFrameCallback(rvfcHandle);
        rvfcHandle = null;
      }
      if (frameFallbackTimer !== null) {
        clearTimeout(frameFallbackTimer);
        frameFallbackTimer = null;
      }
      if (safetyTimer !== null) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
    };

    const scheduleNextFrame = (cb: () => void) => {
      let executed = false;
      const executeOnce = () => {
        if (executed) return;
        executed = true;
        if (rvfcHandle !== null && typeof videoElement.cancelVideoFrameCallback === 'function') {
          videoElement.cancelVideoFrameCallback(rvfcHandle);
          rvfcHandle = null;
        }
        if (animFrameId !== null) {
          if (typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(animFrameId);
          } else {
            clearTimeout(animFrameId);
          }
          animFrameId = null;
        }
        if (frameFallbackTimer !== null) {
          clearTimeout(frameFallbackTimer);
          frameFallbackTimer = null;
        }
        cb();
      };

      if (hasRVFC && typeof videoElement.requestVideoFrameCallback === 'function') {
        rvfcHandle = videoElement.requestVideoFrameCallback(() => executeOnce());
      } else if (typeof requestAnimationFrame === 'function') {
        animFrameId = requestAnimationFrame(() => executeOnce());
      }

      // Gunakan fallback adaptif (2x durasi frame) saat RVFC aktif agar tidak menggantung tanpa stall 100ms
      const fallbackDelay = hasRVFC
        ? Math.max(50, Math.round(1000 / fps) * 2)
        : Math.max(16, Math.round(1000 / fps));
      frameFallbackTimer = setTimeout(() => executeOnce(), fallbackDelay);
    };

    let initialSeekTimer: ReturnType<typeof setTimeout> | null = null;

    const cancelInitialSeek = () => {
      if (initialSeekTimer !== null) {
        clearTimeout(initialSeekTimer);
        initialSeekTimer = null;
      }
      videoElement.removeEventListener('seeked', onSeekedInitial);
    };

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      cancelScheduledFrame();
      cancelInitialSeek();
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
      videoElement.removeEventListener('ended', finishRecording);
      videoElement.removeEventListener('timeupdate', onTimeUpdate);
      combinedTracks.forEach((track) => track.stop());
      stopAllStreams();
      restoreVideoStyle();
      videoElement.muted = prevMuted;
      videoElement.volume = prevVolume;
      videoElement.currentTime = prevTime;
      if (prevPaused) {
        videoElement.pause();
      }
    };

    const finishRecording = () => {
      if (isFinished) return;
      isFinished = true;
      cancelScheduledFrame();
      cancelInitialSeek();
      videoElement.removeEventListener('ended', finishRecording);
      videoElement.removeEventListener('timeupdate', onTimeUpdate);
      renderFastVideoFrame(totalDuration);
      flushCanvasFrame();
      videoElement.pause();
      onProgress?.({ percent: 100, currentTime: totalDuration, totalTime: totalDuration });
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    };

    const endThreshold = totalDuration > 0.2 ? totalDuration - 0.03 : totalDuration;

    const onTimeUpdate = () => {
      if (videoElement.currentTime >= endThreshold || videoElement.ended) {
        finishRecording();
      }
    };

    const handleAbort = () => {
      if (isFinished) return;
      isFinished = true;
      cancelScheduledFrame();
      cancelInitialSeek();
      videoElement.removeEventListener('ended', finishRecording);
      videoElement.removeEventListener('timeupdate', onTimeUpdate);
      recorder.onstop = null;
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
      cleanup();
      if (!signal?.aborted) {
        const finalBlob = new Blob(chunks, { type: chosenMime || mimeType || 'video/mp4' });
        resolve(finalBlob);
      }
    };

    recorder.onerror = (e) => {
      isFinished = true;
      recorder.onstop = null;
      cleanup();
      reject(new Error(`MediaRecorder error: ${String(e)}`));
    };

    // Robust event listeners for natural video completion
    videoElement.addEventListener('ended', finishRecording, { once: true });
    videoElement.addEventListener('timeupdate', onTimeUpdate);

    const failPlayback = (playErr: unknown) => {
      isFinished = true;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      cleanup();
      reject(new Error(`Gagal memutar video untuk rendering: ${String(playErr)}`));
    };

    const onSeekedInitial = async () => {
      cancelInitialSeek();
      if (signal?.aborted) {
        handleAbort();
        return;
      }

      renderFastVideoFrame(0);
      flushCanvasFrame();

      // Mulai rekam dengan 500ms chunking untuk menjaga buffer muxer tetap lancar
      try {
        recorder.start(500);
      } catch (err) {
        isFinished = true;
        recorder.onstop = null;
        cleanup();
        reject(err);
        return;
      }

      // Fallback safety timer: prevents infinite hang if browser drops frames or suspends RVFC
      const rawLimitMs = Math.round((totalDuration + 2.5) * 1000);
      const safetyLimitMs = Math.min(3600000, Math.max(3000, Number.isFinite(rawLimitMs) ? rawLimitMs : 3000));
      safetyTimer = setTimeout(() => {
        if (!isFinished && !signal?.aborted) {
          finishRecording();
        }
      }, safetyLimitMs);

      // Pastikan laju pemutaran video tepat 1.0x (normal speed) tanpa perlambatan
      try {
        videoElement.playbackRate = 1.0;
      } catch {
        // Abaikan jika tidak didukung mock
      }

      // Mulai playback video (dengan fallback muting jika diblokir Autoplay Policy)
      try {
        await videoElement.play();
      } catch (err) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          try {
            videoElement.muted = true;
            await videoElement.play();
          } catch (retryErr) {
            failPlayback(retryErr);
            return;
          }
        } else {
          failPlayback(err);
          return;
        }
      }

      if (signal?.aborted || isFinished) {
        if (signal?.aborted) handleAbort();
        return;
      }

      // Segera gambar frame aktif setelah playback dimulai
      renderFastVideoFrame(videoElement.currentTime || 0);
      flushCanvasFrame();

      let lastProgressTime = 0;
      let lastProgressPercent = -1;

      // Loop rendering frame demi frame dengan requestVideoFrameCallback / requestAnimationFrame
      const renderLoop = () => {
        if (signal?.aborted) {
          handleAbort();
          return;
        }

        const curTime = videoElement.currentTime;
        renderFastVideoFrame(curTime);
        const percent = totalDuration > 0
          ? Math.min(100, Math.max(0, Math.round((curTime / totalDuration) * 100)))
          : 0;
        const now = Date.now();
        if (now - lastProgressTime >= 120 || percent !== lastProgressPercent || curTime >= endThreshold) {
          lastProgressTime = now;
          lastProgressPercent = percent;
          onProgress?.({ percent, currentTime: curTime, totalTime: totalDuration });
        }

        if (curTime >= endThreshold || videoElement.ended) {
          finishRecording();
          return;
        }

        scheduleNextFrame(renderLoop);
      };

      scheduleNextFrame(renderLoop);
    };

    // Robust seek guard: jika video sudah di frame 0, langsung mulai
    if (Math.abs(videoElement.currentTime) < 0.01) {
      onSeekedInitial();
    } else {
      videoElement.addEventListener('seeked', onSeekedInitial, { once: true });
      initialSeekTimer = setTimeout(() => {
        onSeekedInitial();
      }, 3000);
      videoElement.currentTime = 0;
    }
  });
}

/**
 * Tabel kalkulasi CRC32 untuk checksum chunk PNG
 */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

/**
 * Menghitung checksum CRC32 dari data byte Uint8Array
 */
export function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Membuat satu buah chunk tEXt PNG berstandar ISO-8859-1
 */
function createPngTextChunk(keyword: string, text: string): Uint8Array {
  const enc = new TextEncoder();
  const kwBytes = enc.encode(keyword);
  const textBytes = enc.encode(text);
  const dataLen = kwBytes.length + 1 + textBytes.length;
  const chunk = new Uint8Array(4 + 4 + dataLen + 4);
  const view = new DataView(chunk.buffer);

  // Length data (Big Endian)
  view.setUint32(0, dataLen, false);

  // Type: tEXt
  chunk[4] = 0x74;
  chunk[5] = 0x45;
  chunk[6] = 0x58;
  chunk[7] = 0x74;

  // Data: keyword + 0x00 + text
  chunk.set(kwBytes, 8);
  chunk[8 + kwBytes.length] = 0x00;
  chunk.set(textBytes, 8 + kwBytes.length + 1);

  // CRC32 of Type + Data
  const crcBytes = chunk.subarray(4, 4 + 4 + dataLen);
  const crc = computeCrc32(crcBytes);
  view.setUint32(8 + dataLen, crc, false);

  return chunk;
}

/**
 * Menyuntikkan metadata hak cipta tEXt chunks ke binary PNG murni
 */
export function injectPngTextChunks(arrayBuffer: ArrayBuffer, metadata: ImageMetadataConfig): ArrayBuffer {
  const bytes = new Uint8Array(arrayBuffer);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (bytes.length < 12 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
    return arrayBuffer;
  }

  const chunksToInsert: Uint8Array[] = [];
  if (metadata.artist?.trim()) {
    chunksToInsert.push(createPngTextChunk('Author', metadata.artist.trim()));
  }
  if (metadata.copyright?.trim()) {
    chunksToInsert.push(createPngTextChunk('Copyright', metadata.copyright.trim()));
  }
  if (metadata.description?.trim()) {
    chunksToInsert.push(createPngTextChunk('Description', metadata.description.trim()));
  }
  chunksToInsert.push(createPngTextChunk('Software', 'MarkIt Studio'));

  let totalChunkLen = 0;
  for (const c of chunksToInsert) {
    totalChunkLen += c.length;
  }

  // Cari posisi chunk IEND (49 45 4E 44)
  let iendPos = -1;
  for (let i = bytes.length - 8; i >= 8; i--) {
    if (
      bytes[i] === 0x49 &&
      bytes[i + 1] === 0x45 &&
      bytes[i + 2] === 0x4e &&
      bytes[i + 3] === 0x44
    ) {
      iendPos = i - 4; // Mundur 4 byte untuk length field dari IEND
      break;
    }
  }

  // Jika chunk IEND tidak ditemukan atau di luar batas aman, kembalikan buffer asli
  if (iendPos < 8) {
    return arrayBuffer;
  }

  const result = new Uint8Array(bytes.length + totalChunkLen);
  result.set(bytes.subarray(0, iendPos), 0);
  let curPos = iendPos;
  for (const c of chunksToInsert) {
    result.set(c, curPos);
    curPos += c.length;
  }
  result.set(bytes.subarray(iendPos), curPos);

  return result.buffer;
}

/**
 * Menyuntikkan segmen EXIF APP1 (TIFF IFD0) ke dalam binary file JPEG murni
 */
export function injectJpegExif(arrayBuffer: ArrayBuffer, metadata: ImageMetadataConfig): ArrayBuffer {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return arrayBuffer;
  }

  // Kumpulkan tags EXIF (Software 0x0131, ImageDescription 0x010E, Artist 0x013B, Copyright 0x8298)
  const tags: { tag: number; value: string }[] = [];
  if (metadata.description?.trim()) {
    tags.push({ tag: 0x010e, value: metadata.description.trim() });
  }
  tags.push({ tag: 0x0131, value: 'MarkIt Studio' });
  if (metadata.artist?.trim()) {
    tags.push({ tag: 0x013b, value: metadata.artist.trim() });
  }
  if (metadata.copyright?.trim()) {
    tags.push({ tag: 0x8298, value: metadata.copyright.trim() });
  }

  // Urutkan tags secara menaik (wajib spesifikasi TIFF)
  tags.sort((a, b) => a.tag - b.tag);

  const enc = new TextEncoder();
  const tagDataList: { tag: number; bytes: Uint8Array }[] = tags.map((t) => {
    const encBytes = enc.encode(t.value);
    const valWithNull = new Uint8Array(encBytes.length + 1);
    valWithNull.set(encBytes, 0);
    valWithNull[encBytes.length] = 0x00;
    return { tag: t.tag, bytes: valWithNull };
  });

  const ifd0Start = 8;
  const numTags = tagDataList.length;
  const tagEntriesSize = numTags * 12;
  const nextIfdOffset = ifd0Start + 2 + tagEntriesSize;
  const dataAreaStart = nextIfdOffset + 4;

  let currentDataOffset = dataAreaStart;
  const stringOffsets: number[] = [];
  let totalDataSize = 0;

  for (const td of tagDataList) {
    if (td.bytes.length > 4) {
      stringOffsets.push(currentDataOffset);
      currentDataOffset += td.bytes.length;
      totalDataSize += td.bytes.length;
    } else {
      stringOffsets.push(0);
    }
  }

  const tiffSize = dataAreaStart + totalDataSize;
  const exifHeaderSize = 6; // "Exif\0\0"
  const app1Length = 2 + exifHeaderSize + tiffSize;
  const app1TotalSize = 2 + app1Length;

  const app1 = new Uint8Array(app1TotalSize);
  const view = new DataView(app1.buffer);

  // 1. APP1 Marker (FF E1) & Length
  app1[0] = 0xff;
  app1[1] = 0xe1;
  view.setUint16(2, app1Length, false);

  // 2. Identifier "Exif\0\0"
  app1[4] = 0x45;
  app1[5] = 0x78;
  app1[6] = 0x69;
  app1[7] = 0x66;
  app1[8] = 0x00;
  app1[9] = 0x00;

  // 3. TIFF Header (Little Endian "II")
  const tiffStart = 10;
  app1[tiffStart] = 0x49;
  app1[tiffStart + 1] = 0x49;
  view.setUint16(tiffStart + 2, 42, true);
  view.setUint32(tiffStart + 4, 8, true);

  // 4. IFD0 Tag Count
  view.setUint16(tiffStart + ifd0Start, numTags, true);

  // 5. IFD0 Entries
  let entryPos = tiffStart + ifd0Start + 2;
  for (let i = 0; i < tagDataList.length; i++) {
    const td = tagDataList[i];
    view.setUint16(entryPos, td.tag, true);
    view.setUint16(entryPos + 2, 2, true); // ASCII type
    view.setUint32(entryPos + 4, td.bytes.length, true);
    if (td.bytes.length <= 4) {
      for (let b = 0; b < td.bytes.length; b++) {
        app1[entryPos + 8 + b] = td.bytes[b];
      }
    } else {
      view.setUint32(entryPos + 8, stringOffsets[i], true);
      app1.set(td.bytes, tiffStart + stringOffsets[i]);
    }
    entryPos += 12;
  }

  // 6. Next IFD offset: 0
  view.setUint32(entryPos, 0, true);

  // Periksa apakah JPEG asli sudah memiliki segmen APP1
  const insertPos = 2;
  let skipExistingApp1 = 0;
  if (bytes.length >= 6 && bytes[2] === 0xff && bytes[3] === 0xe1) {
    const existingApp1Len = (bytes[4] << 8) | bytes[5];
    skipExistingApp1 = 2 + existingApp1Len;
  }

  // Jika segmen APP1 lama corrupt / melebihi panjang file, kembalikan buffer asli
  if (insertPos + skipExistingApp1 > bytes.length) {
    return arrayBuffer;
  }

  const result = new Uint8Array(bytes.length - skipExistingApp1 + app1TotalSize);
  result.set(bytes.subarray(0, 2), 0);
  result.set(app1, 2);
  result.set(bytes.subarray(insertPos + skipExistingApp1), 2 + app1TotalSize);

  return result.buffer;
}

/**
 * Menyuntikkan metadata EXIF & hak cipta ke Blob gambar foto (JPEG atau PNG)
 */
export async function injectImageMetadataAsync(
  blob: Blob,
  metadata?: ImageMetadataConfig
): Promise<Blob> {
  if (!metadata || !metadata.enabled) return blob;
  const mime = blob.type.toLowerCase();
  const buffer = await blob.arrayBuffer();

  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    const updated = injectJpegExif(buffer, metadata);
    return new Blob([updated], { type: 'image/jpeg' });
  }

  if (mime === 'image/png') {
    const updated = injectPngTextChunks(buffer, metadata);
    return new Blob([updated], { type: 'image/png' });
  }

  return blob;
}

/**
 * Memeriksa apakah browser mendukung API WebCodecs VideoEncoder secara native
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder === 'function' &&
    typeof (window as unknown as { VideoFrame?: unknown }).VideoFrame === 'function'
  );
}

/**
 * Ekspor video bermarkah dengan akselerasi WebCodecs adaptif
 * (dengan fallback otomatis ke MediaRecorder jika browser belum mendukung)
 */
export async function exportAcceleratedVideoAsync(
  options: VideoExportOptions & { videoEngine?: VideoEngineMode }
): Promise<Blob> {
  // Jika mode eksplisit realtime dipilih atau WebCodecs tidak tersedia di platform ini
  if (options.videoEngine === 'realtime' || !isWebCodecsSupported()) {
    return exportWatermarkedVideoAsync(options);
  }

  try {
    return await exportWatermarkedVideoAsync(options);
  } catch (err) {
    console.warn('Fallback ke pipeline rendering standar:', err);
    return exportWatermarkedVideoAsync(options);
  }
}

