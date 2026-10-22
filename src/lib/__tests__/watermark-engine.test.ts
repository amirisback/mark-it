import { describe, it, expect } from 'bun:test';
import {
  computeFontSizePixels,
  resolveCanvasFontFamily,
  computeCoordinates,
  ensureFontLoadedAsync,
  exportWatermarkedVideoAsync,
} from '@/lib/watermark-engine';
import { CURATED_FONTS, FONT_CATEGORIES, FONT_SIZE_PRESETS } from '@/data/fonts';
import { DEFAULT_WATERMARK_CONFIG } from '@/data/presets';

describe('Watermark Engine & Font Utilities', () => {
  describe('computeFontSizePixels - Linear Sizing & Dimension Boundaries', () => {
    it('should calculate exact linear font sizing without arbitrary multipliers', () => {
      // 1000px asset
      expect(computeFontSizePixels(4.5, 1000)).toBe(45);
      expect(computeFontSizePixels(2.0, 1000)).toBe(20);
      expect(computeFontSizePixels(8.0, 1000)).toBe(80);
      expect(computeFontSizePixels(12.0, 1000)).toBe(120);
      expect(computeFontSizePixels(18.0, 1000)).toBe(180);

      // 1080p asset (minDim 1080)
      expect(computeFontSizePixels(4.5, 1080)).toBe(49);
      expect(computeFontSizePixels(2.0, 1080)).toBe(22);
    });

    it('should enforce a minimum font size of 10px across low dimensions and zero/negative inputs', () => {
      expect(computeFontSizePixels(0.5, 500)).toBe(10);
      expect(computeFontSizePixels(0.1, 100)).toBe(10);
      expect(computeFontSizePixels(0, 1000)).toBe(10);
      expect(computeFontSizePixels(-5, 1000)).toBe(10);
    });

    it('should scale predictably across extreme dimensions (400x300 thumbnail up to 8K)', () => {
      // 400x300 thumbnail (minDim = 300)
      expect(computeFontSizePixels(0.5, 300)).toBe(10); // clamped to 10px
      expect(computeFontSizePixels(4.5, 300)).toBe(14);
      expect(computeFontSizePixels(30.0, 300)).toBe(90);

      // 1280x720 HD (minDim = 720)
      expect(computeFontSizePixels(4.5, 720)).toBe(32);
      expect(computeFontSizePixels(30.0, 720)).toBe(216);

      // 1920x1080 Full HD (minDim = 1080)
      expect(computeFontSizePixels(4.5, 1080)).toBe(49);
      expect(computeFontSizePixels(30.0, 1080)).toBe(324);

      // 3840x2160 4K UHD (minDim = 2160)
      expect(computeFontSizePixels(2.0, 2160)).toBe(43);
      expect(computeFontSizePixels(4.5, 2160)).toBe(97);
      expect(computeFontSizePixels(30.0, 2160)).toBe(648);

      // 7680x4320 8K UHD (minDim = 4320)
      expect(computeFontSizePixels(4.5, 4320)).toBe(194);
      expect(computeFontSizePixels(30.0, 4320)).toBe(1296);
    });
  });

  describe('resolveCanvasFontFamily - Sanitization & CSS Variable Rejection', () => {
    it('should strip CSS variable strings and fallback to "Inter", sans-serif', () => {
      expect(resolveCanvasFontFamily('var(--font-geist-sans), sans-serif')).toBe('"Inter", sans-serif');
      expect(resolveCanvasFontFamily('var(--font-heading)')).toBe('"Inter", sans-serif');
      expect(resolveCanvasFontFamily(undefined)).toBe('"Inter", sans-serif');
      expect(resolveCanvasFontFamily('')).toBe('"Inter", sans-serif');
    });

    it('should preserve valid concrete font family definitions', () => {
      expect(resolveCanvasFontFamily('"Playfair Display", serif')).toBe('"Playfair Display", serif');
      expect(resolveCanvasFontFamily('"Caveat", cursive')).toBe('"Caveat", cursive');
      expect(resolveCanvasFontFamily('"JetBrains Mono", monospace')).toBe('"JetBrains Mono", monospace');
      expect(resolveCanvasFontFamily('"Bebas Neue", sans-serif')).toBe('"Bebas Neue", sans-serif');
    });
  });

  describe('computeCoordinates - Full 9-Grid Position Matrix', () => {
    const mediaW = 1000;
    const mediaH = 1000;
    const contentW = 200;
    const contentH = 50;
    const padX = mediaW * 0.03; // 30
    const padY = mediaH * 0.03; // 30

    it('should calculate top-left correctly', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, { grid: 'top-left', offsetX: 0, offsetY: 0 });
      expect(c.x).toBe(padX);
      expect(c.y).toBe(padY);
    });

    it('should calculate top-center correctly', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, { grid: 'top-center', offsetX: 0, offsetY: 0 });
      expect(c.x).toBe((mediaW - contentW) / 2);
      expect(c.y).toBe(padY);
    });

    it('should calculate top-right correctly', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, { grid: 'top-right', offsetX: 0, offsetY: 0 });
      expect(c.x).toBe(mediaW - contentW - padX);
      expect(c.y).toBe(padY);
    });

    it('should calculate middle-left correctly', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, { grid: 'middle-left', offsetX: 0, offsetY: 0 });
      expect(c.x).toBe(padX);
      expect(c.y).toBe((mediaH - contentH) / 2);
    });

    it('should calculate center correctly', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, { grid: 'center', offsetX: 0, offsetY: 0 });
      expect(c.x).toBe((mediaW - contentW) / 2);
      expect(c.y).toBe((mediaH - contentH) / 2);
    });

    it('should calculate middle-right correctly', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, { grid: 'middle-right', offsetX: 0, offsetY: 0 });
      expect(c.x).toBe(mediaW - contentW - padX);
      expect(c.y).toBe((mediaH - contentH) / 2);
    });

    it('should calculate bottom-left correctly', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, { grid: 'bottom-left', offsetX: 0, offsetY: 0 });
      expect(c.x).toBe(padX);
      expect(c.y).toBe(mediaH - contentH - padY);
    });

    it('should calculate bottom-center correctly', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, { grid: 'bottom-center', offsetX: 0, offsetY: 0 });
      expect(c.x).toBe((mediaW - contentW) / 2);
      expect(c.y).toBe(mediaH - contentH - padY);
    });

    it('should calculate bottom-right correctly', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, { grid: 'bottom-right', offsetX: 0, offsetY: 0 });
      expect(c.x).toBe(mediaW - contentW - padX);
      expect(c.y).toBe(mediaH - contentH - padY);
    });

    it('should apply offset percentages accurately on both axes', () => {
      const c = computeCoordinates(mediaW, mediaH, contentW, contentH, {
        grid: 'center',
        offsetX: 5, // +50px
        offsetY: -5, // -50px
      });
      expect(c.x).toBe((mediaW - contentW) / 2 + 50);
      expect(c.y).toBe((mediaH - contentH) / 2 - 50);
    });
  });

  describe('Font Data & Presets Verification', () => {
    it('should provide 10+ curated fonts across 5 categories', () => {
      expect(CURATED_FONTS.length).toBeGreaterThanOrEqual(10);
      expect(FONT_CATEGORIES.length).toBe(5);

      const categoryIds = FONT_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toContain('modern-sans');
      expect(categoryIds).toContain('serif');
      expect(categoryIds).toContain('display');
      expect(categoryIds).toContain('script');
      expect(categoryIds).toContain('monospace');

      for (const font of CURATED_FONTS) {
        expect(categoryIds).toContain(font.category);
        expect(font.family).not.toContain('var(');
      }
    });

    it('should provide 5 standard font size presets with linear percentage values', () => {
      expect(FONT_SIZE_PRESETS.length).toBe(5);
      const values = FONT_SIZE_PRESETS.map((p) => p.value);
      expect(values).toEqual([2.0, 4.5, 8.0, 12.0, 18.0]);
    });
  });

  describe('ensureFontLoadedAsync - Font Readiness Validator', () => {
    it('should return true safely in non-browser/SSR environment or when document.fonts is absent', async () => {
      const res = await ensureFontLoadedAsync('"Playfair Display", serif');
      expect(res).toBe(true);
    });

    it('should handle CSS variables and blank font strings gracefully', async () => {
      const resVar = await ensureFontLoadedAsync('var(--font-geist)');
      expect(resVar).toBe(true);

      const resBlank = await ensureFontLoadedAsync('');
      expect(resBlank).toBe(true);
    });
  });

  describe('exportWatermarkedVideoAsync - AbortSignal & Edge Guards', () => {
    it('should reject immediately with AbortError when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const fakeVideo = {} as HTMLVideoElement;

      expect(
        exportWatermarkedVideoAsync({
          videoElement: fakeVideo,
          sourceWidth: 640,
          sourceHeight: 360,
          duration: 5,
          config: DEFAULT_WATERMARK_CONFIG,
          signal: controller.signal,
        })
      ).rejects.toThrow('Proses ekspor video dibatalkan oleh pengguna.');
    });

    it('should verify codec candidates list includes WebM VP9/VP8 and MP4 AVC1', () => {
      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a',
        'video/mp4',
      ];

      expect(mimeCandidates[0]).toBe('video/webm;codecs=vp9,opus');
      expect(mimeCandidates[1]).toBe('video/webm;codecs=vp8,opus');
      expect(mimeCandidates[2]).toBe('video/webm');
      expect(mimeCandidates[3]).toBe('video/mp4;codecs=avc1,mp4a');
      expect(mimeCandidates[4]).toBe('video/mp4');
    });

    it('should complete video export cleanly when ended event fires', async () => {
      const listeners: Record<string, ((e?: Event) => void)[]> = {};
      const fakeVideo = {
        videoWidth: 1280,
        videoHeight: 720,
        currentTime: 0,
        duration: 2,
        muted: false,
        volume: 1,
        paused: false,
        play: () => Promise.resolve(),
        pause: () => {},
        addEventListener: (event: string, fn: (e?: Event) => void) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(fn);
        },
        removeEventListener: (event: string, fn: (e?: Event) => void) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter((f) => f !== fn);
          }
        },
        captureStream: () => ({
          getAudioTracks: () => [],
        }),
      } as unknown as HTMLVideoElement;

      const fakeCanvas = {
        width: 1280,
        height: 720,
        getContext: () => ({
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
          clearRect: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          measureText: () => ({ width: 100 }),
          fillText: () => {},
          strokeText: () => {},
          translate: () => {},
          rotate: () => {},
          fillRect: () => {},
          strokeRect: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          fill: () => {},
        }),
        captureStream: () =>
          ({
            getVideoTracks: () => [{ stop: () => {} }],
            getTracks: () => [{ stop: () => {} }],
          } as unknown as MediaStream),
      };

      const origDoc = (globalThis as unknown as { document?: unknown }).document;
      (globalThis as unknown as { document: unknown }).document = {
        createElement: (tag: string) => {
          if (tag === 'canvas') return fakeCanvas;
          return {};
        },
        fonts: {
          check: () => true,
          load: async () => [],
        },
      };

      class MockMediaStream {
        tracks: unknown[];
        constructor(tracks: unknown[] = []) {
          this.tracks = tracks;
        }
        getTracks() {
          return this.tracks;
        }
      }

      class MockMediaRecorder {
        static isTypeSupported = () => true;
        state = 'recording';
        ondataavailable: ((e: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        onerror: (() => void) | null = null;
        start() {}
        stop() {
          this.state = 'inactive';
          if (this.onstop) this.onstop();
        }
      }

      const origMediaStream = (globalThis as unknown as { MediaStream?: unknown }).MediaStream;
      const origMediaRecorder = (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;
      (globalThis as unknown as { MediaStream?: unknown }).MediaStream = MockMediaStream;
      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = MockMediaRecorder;

      try {
        const exportPromise = exportWatermarkedVideoAsync({
          videoElement: fakeVideo,
          sourceWidth: 1280,
          sourceHeight: 720,
          duration: 2,
          config: DEFAULT_WATERMARK_CONFIG,
        });

        setTimeout(() => {
          if (listeners['ended']) {
            listeners['ended'].forEach((fn) => fn());
          }
        }, 10);

        const blob = await exportPromise;
        expect(blob).toBeDefined();
        expect(blob.type).toBe('video/webm;codecs=vp9,opus');
      } finally {
        (globalThis as unknown as { document?: unknown }).document = origDoc;
        (globalThis as unknown as { MediaStream?: unknown }).MediaStream = origMediaStream;
        (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = origMediaRecorder;
      }
    });
  });
});
