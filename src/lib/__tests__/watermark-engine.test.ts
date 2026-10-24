import { describe, it, expect } from 'bun:test';
import {
  computeFontSizePixels,
  resolveCanvasFontFamily,
  computeCoordinates,
  ensureFontLoadedAsync,
  exportWatermarkedVideoAsync,
  drawWatermarkOnCanvas,
  drawWatermarkOnSocialCanvas,
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

    it('should enable canvas video track and compose audio stream properly', async () => {
      const mockVideoTrack = { enabled: false, stop: () => {} };
      const mockAudioTrack = { enabled: true, stop: () => {} };
      let createdStreamTracks: unknown[] = [];

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
        captureStream: () => ({
          getVideoTracks: () => [mockVideoTrack],
          getTracks: () => [mockVideoTrack],
        }),
      };

      const origDoc = (globalThis as unknown as { document?: unknown }).document;
      (globalThis as unknown as { document: unknown }).document = {
        createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas : {}),
        fonts: { check: () => true, load: async () => [] },
      };

      class MockStreamWithInspection {
        tracks: unknown[];
        constructor(tracks: unknown[] = []) {
          this.tracks = tracks;
          createdStreamTracks = tracks;
        }
        getTracks() {
          return this.tracks;
        }
        getVideoTracks() {
          return this.tracks.filter((t) => t === mockVideoTrack);
        }
        getAudioTracks() {
          return this.tracks.filter((t) => t === mockAudioTrack);
        }
      }

      const origMediaStream = (globalThis as unknown as { MediaStream?: unknown }).MediaStream;
      const origMediaRecorder = (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;

      class MockRecorder {
        state = 'recording';
        ondataavailable: ((e: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        static isTypeSupported() {
          return true;
        }
        start() {}
        stop() {
          this.state = 'inactive';
          if (this.onstop) this.onstop();
        }
      }

      (globalThis as unknown as { MediaStream?: unknown }).MediaStream = MockStreamWithInspection;
      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = MockRecorder;

      const listeners: Record<string, ((e?: Event) => void)[]> = {};
      const fakeVideo = {
        currentTime: 0,
        duration: 1,
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
          if (listeners[event]) listeners[event] = listeners[event].filter((f) => f !== fn);
        },
        captureStream: () => ({
          getAudioTracks: () => [mockAudioTrack],
        }),
      } as unknown as HTMLVideoElement;

      try {
        const promise = exportWatermarkedVideoAsync({
          videoElement: fakeVideo,
          sourceWidth: 1280,
          sourceHeight: 720,
          duration: 1,
          config: DEFAULT_WATERMARK_CONFIG,
        });

        setTimeout(() => {
          if (listeners['ended']) listeners['ended'].forEach((fn) => fn());
        }, 10);

        await promise;
        expect(mockVideoTrack.enabled).toBe(true);
        expect(createdStreamTracks).toContain(mockVideoTrack);
        expect(createdStreamTracks).toContain(mockAudioTrack);
      } finally {
        (globalThis as unknown as { document?: unknown }).document = origDoc;
        (globalThis as unknown as { MediaStream?: unknown }).MediaStream = origMediaStream;
        (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = origMediaRecorder;
      }
    });

    it('should not prematurely cancel requestVideoFrameCallback on 24fps/30fps videos (~42ms frame time)', async () => {
      let rvfcCompletedCount = 0;
      let nextHandle = 1;
      const activeHandles = new Map<number, ReturnType<typeof setTimeout>>();

      const listeners: Record<string, ((e?: Event) => void)[]> = {};
      const fakeVideo = {
        videoWidth: 1280,
        videoHeight: 720,
        currentTime: 0,
        duration: 0.12,
        muted: false,
        volume: 1,
        paused: false,
        play: () => Promise.resolve(),
        pause: () => {},
        requestVideoFrameCallback: (cb: () => void) => {
          const handle = nextHandle++;
          // Simulate 24fps video frame delivery (~42ms > 33ms)
          const timer = setTimeout(() => {
            activeHandles.delete(handle);
            rvfcCompletedCount++;
            fakeVideo.currentTime += 0.045;
            cb();
          }, 42);
          activeHandles.set(handle, timer);
          return handle;
        },
        cancelVideoFrameCallback: (handle: number) => {
          const timer = activeHandles.get(handle);
          if (timer) {
            clearTimeout(timer);
            activeHandles.delete(handle);
          }
        },
        addEventListener: (event: string, fn: (e?: Event) => void) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(fn);
        },
        removeEventListener: (event: string, fn: (e?: Event) => void) => {
          if (listeners[event]) listeners[event] = listeners[event].filter((f) => f !== fn);
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
        captureStream: () => ({
          getVideoTracks: () => [{ enabled: true, stop: () => {} }],
          getTracks: () => [{ enabled: true, stop: () => {} }],
        }),
      };

      const origDoc = (globalThis as unknown as { document?: unknown }).document;
      const origMediaStream = (globalThis as unknown as { MediaStream?: unknown }).MediaStream;
      const origMediaRecorder = (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;

      (globalThis as unknown as { document: unknown }).document = {
        createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas : {}),
        fonts: { check: () => true, load: async () => [] },
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
        start() {}
        stop() {
          this.state = 'inactive';
          if (this.onstop) this.onstop();
        }
      }

      (globalThis as unknown as { MediaStream?: unknown }).MediaStream = MockMediaStream;
      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = MockMediaRecorder;

      try {
        await exportWatermarkedVideoAsync({
          videoElement: fakeVideo,
          sourceWidth: 1280,
          sourceHeight: 720,
          duration: 0.12,
          fps: 30,
          config: DEFAULT_WATERMARK_CONFIG,
        });

        expect(rvfcCompletedCount).toBeGreaterThanOrEqual(2);
      } finally {
        activeHandles.forEach((t) => clearTimeout(t));
        (globalThis as unknown as { document?: unknown }).document = origDoc;
        (globalThis as unknown as { MediaStream?: unknown }).MediaStream = origMediaStream;
        (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = origMediaRecorder;
      }
    });

    it('should override zero-opacity and negative z-index on videoElement during rendering to prevent GPU decoder suspension', async () => {
      let observedOpacityDuringDraw = '';
      let observedZIndexDuringDraw = '';
      let drawCallsAfterPlay = 0;
      let isPlaying = false;

      const listeners: Record<string, ((e?: Event) => void)[]> = {};
      const fakeVideo = {
        videoWidth: 1280,
        videoHeight: 720,
        currentTime: 0,
        duration: 1,
        muted: false,
        volume: 1,
        get paused() {
          return !isPlaying;
        },
        style: {
          opacity: '0',
          zIndex: '-9999',
          top: '-9999px',
          left: '-9999px',
          position: 'fixed',
          width: '1px',
          height: '1px',
          pointerEvents: 'none',
        },
        play: () => {
          isPlaying = true;
          return Promise.resolve();
        },
        pause: () => {
          isPlaying = false;
        },
        addEventListener: (event: string, fn: (e?: Event) => void) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(fn);
        },
        removeEventListener: (event: string, fn: (e?: Event) => void) => {
          if (listeners[event]) listeners[event] = listeners[event].filter((f) => f !== fn);
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
          drawImage: (source: unknown) => {
            if (source === fakeVideo && isPlaying) {
              drawCallsAfterPlay++;
              observedOpacityDuringDraw = fakeVideo.style.opacity;
              observedZIndexDuringDraw = fakeVideo.style.zIndex;
            }
          },
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
        captureStream: () => ({
          getVideoTracks: () => [{ enabled: true, stop: () => {} }],
          getTracks: () => [{ enabled: true, stop: () => {} }],
        }),
      };

      const origDoc = (globalThis as unknown as { document?: unknown }).document;
      const origMediaStream = (globalThis as unknown as { MediaStream?: unknown }).MediaStream;
      const origMediaRecorder = (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;

      (globalThis as unknown as { document: unknown }).document = {
        createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas : {}),
        fonts: { check: () => true, load: async () => [] },
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
        start() {}
        stop() {
          this.state = 'inactive';
          if (this.onstop) this.onstop();
        }
      }

      (globalThis as unknown as { MediaStream?: unknown }).MediaStream = MockMediaStream;
      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = MockMediaRecorder;

      try {
        const promise = exportWatermarkedVideoAsync({
          videoElement: fakeVideo,
          sourceWidth: 1280,
          sourceHeight: 720,
          duration: 1,
          config: DEFAULT_WATERMARK_CONFIG,
        });

        setTimeout(() => {
          if (listeners['ended']) listeners['ended'].forEach((fn) => fn());
        }, 15);

        await promise;

        expect(drawCallsAfterPlay).toBeGreaterThanOrEqual(1);
        expect(observedOpacityDuringDraw).not.toBe('0');
        expect(Number(observedOpacityDuringDraw)).toBeGreaterThan(0);
        expect(Number(observedZIndexDuringDraw)).toBeGreaterThanOrEqual(0);
        // Restored after cleanup
        expect(fakeVideo.style.opacity).toBe('0');
        expect(fakeVideo.style.zIndex).toBe('-9999');
      } finally {
        (globalThis as unknown as { document?: unknown }).document = origDoc;
        (globalThis as unknown as { MediaStream?: unknown }).MediaStream = origMediaStream;
        (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = origMediaRecorder;
      }
    });

    it('should restore videoElement.style and stop media tracks if playback fails', async () => {
      let stoppedVideoTrack = false;
      const fakeVideo = {
        videoWidth: 1280,
        videoHeight: 720,
        currentTime: 0,
        duration: 1,
        muted: false,
        volume: 1,
        paused: true,
        style: {
          opacity: '0',
          zIndex: '-10',
          top: '-9999px',
          left: '-9999px',
          bottom: '',
          right: '',
          width: '1px',
          height: '1px',
          position: 'fixed',
          pointerEvents: 'none',
        },
        play: () => Promise.reject(new Error('Decoder failure')),
        pause: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        captureStream: () => ({
          getAudioTracks: () => [],
          getVideoTracks: () => [],
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
        }),
        captureStream: () => ({
          getVideoTracks: () => [
            {
              enabled: true,
              stop: () => {
                stoppedVideoTrack = true;
              },
            },
          ],
          getTracks: () => [
            {
              stop: () => {
                stoppedVideoTrack = true;
              },
            },
          ],
        }),
      };

      const origDoc = (globalThis as unknown as { document?: unknown }).document;
      const origMediaStream = (globalThis as unknown as { MediaStream?: unknown }).MediaStream;
      const origMediaRecorder = (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;

      (globalThis as unknown as { document: unknown }).document = {
        createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas : {}),
        fonts: { check: () => true, load: async () => [] },
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
        onstop: (() => void) | null = null;
        start() {}
        stop() {
          this.state = 'inactive';
          if (this.onstop) this.onstop();
        }
      }

      (globalThis as unknown as { MediaStream?: unknown }).MediaStream = MockMediaStream;
      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = MockMediaRecorder;

      try {
        await expect(
          exportWatermarkedVideoAsync({
            videoElement: fakeVideo,
            sourceWidth: 1280,
            sourceHeight: 720,
            duration: 1,
            config: DEFAULT_WATERMARK_CONFIG,
          })
        ).rejects.toThrow('Gagal memutar video untuk rendering');

        expect(stoppedVideoTrack).toBe(true);
        expect(fakeVideo.style.opacity).toBe('0');
        expect(fakeVideo.style.zIndex).toBe('-10');
      } finally {
        (globalThis as unknown as { document?: unknown }).document = origDoc;
        (globalThis as unknown as { MediaStream?: unknown }).MediaStream = origMediaStream;
        (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = origMediaRecorder;
      }
    });

    it('should enforce playbackRate 1.0 and captureStream with target 60 fps to preserve video speed', async () => {
      let passedCaptureFps: number | undefined;
      let recordedPlaybackRate: number | undefined;

      const listeners: Record<string, ((e?: Event) => void)[]> = {};
      const fakeVideo = {
        videoWidth: 1280,
        videoHeight: 720,
        currentTime: 0,
        duration: 0.5,
        muted: false,
        volume: 1,
        paused: false,
        playbackRate: 0.5, // Start with altered playbackRate
        play: () => {
          recordedPlaybackRate = fakeVideo.playbackRate;
          return Promise.resolve();
        },
        pause: () => {},
        addEventListener: (event: string, fn: (e?: Event) => void) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(fn);
        },
        removeEventListener: (event: string, fn: (e?: Event) => void) => {
          if (listeners[event]) listeners[event] = listeners[event].filter((f) => f !== fn);
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
          imageSmoothingQuality: 'medium',
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
        }),
        captureStream: (targetFps?: number) => {
          passedCaptureFps = targetFps;
          return {
            getVideoTracks: () => [{ enabled: true, stop: () => {}, requestFrame: () => {} }],
            getTracks: () => [{ enabled: true, stop: () => {} }],
          };
        },
      };

      const origDoc = (globalThis as unknown as { document?: unknown }).document;
      const origMediaStream = (globalThis as unknown as { MediaStream?: unknown }).MediaStream;
      const origMediaRecorder = (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;

      (globalThis as unknown as { document: unknown }).document = {
        createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas : {}),
        fonts: { check: () => true, load: async () => [] },
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
        start() {}
        stop() {
          this.state = 'inactive';
          if (this.onstop) this.onstop();
        }
      }

      (globalThis as unknown as { MediaStream?: unknown }).MediaStream = MockMediaStream;
      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = MockMediaRecorder;

      try {
        const promise = exportWatermarkedVideoAsync({
          videoElement: fakeVideo,
          sourceWidth: 1280,
          sourceHeight: 720,
          duration: 0.5,
          config: DEFAULT_WATERMARK_CONFIG,
        });

        setTimeout(() => {
          if (listeners['ended']) listeners['ended'].forEach((fn) => fn());
        }, 15);

        await promise;

        expect(recordedPlaybackRate).toBe(1.0);
        expect(passedCaptureFps).toBe(60);
      } finally {
        (globalThis as unknown as { document?: unknown }).document = origDoc;
        (globalThis as unknown as { MediaStream?: unknown }).MediaStream = origMediaStream;
        (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = origMediaRecorder;
      }
    });
  });

  describe('drawWatermarkOnCanvas & drawWatermarkOnSocialCanvas - Frame & Safety Guards', () => {
    it('should align banner fillRect height with exact bannerH (0.08 * sourceHeight) without overlapping source image', () => {
      const fillRectCalls: Array<{ x: number; y: number; w: number; h: number }> = [];
      const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
          clearRect: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          measureText: () => ({ width: 80 }),
          fillText: () => {},
          strokeText: () => {},
          translate: () => {},
          rotate: () => {},
          fillRect: (x: number, y: number, w: number, h: number) => {
            fillRectCalls.push({ x, y, w, h });
          },
          strokeRect: () => {},
        }),
      } as unknown as HTMLCanvasElement;

      const config = {
        ...DEFAULT_WATERMARK_CONFIG,
        text: { ...DEFAULT_WATERMARK_CONFIG.text, enabled: false },
        frame: {
          ...DEFAULT_WATERMARK_CONFIG.frame,
          enabled: true,
          style: 'banner' as const,
          metaText: 'Shot on MarkIt',
        },
      };

      drawWatermarkOnCanvas(
        fakeCanvas,
        {} as HTMLImageElement,
        1000,
        1000,
        config,
        null
      );

      // sourceHeight = 1000 => bannerH = 80, canvas.height = 1080
      expect(fakeCanvas.width).toBe(1000);
      expect(fakeCanvas.height).toBe(1080);
      expect(fillRectCalls.length).toBe(1);
      expect(fillRectCalls[0]).toEqual({ x: 0, y: 1000, w: 1000, h: 80 });
    });

    it('should render Polaroid card frame and metadata in drawWatermarkOnSocialCanvas', () => {
      const fillRectCalls: Array<{ x: number; y: number; w: number; h: number }> = [];
      const fillTextCalls: string[] = [];
      const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
          clearRect: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          measureText: () => ({ width: 80 }),
          fillText: (text: string) => {
            fillTextCalls.push(text);
          },
          strokeText: () => {},
          translate: () => {},
          rotate: () => {},
          fillRect: (x: number, y: number, w: number, h: number) => {
            fillRectCalls.push({ x, y, w, h });
          },
          strokeRect: () => {},
        }),
      } as unknown as HTMLCanvasElement;

      const config = {
        ...DEFAULT_WATERMARK_CONFIG,
        text: { ...DEFAULT_WATERMARK_CONFIG.text, enabled: false },
        frame: {
          ...DEFAULT_WATERMARK_CONFIG.frame,
          enabled: true,
          style: 'card' as const,
          metaText: 'Polaroid Social Test',
        },
      };

      drawWatermarkOnSocialCanvas(
        fakeCanvas,
        {} as HTMLImageElement,
        720,
        1280,
        config,
        null,
        720,
        1280
      );

      expect(fillRectCalls.length).toBe(4);
      expect(fillTextCalls).toContain('Polaroid Social Test');
    });

    it('should guard against zero-width logo image and non-positive tileSpacing without throwing or hanging', () => {
      const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
          clearRect: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          measureText: () => ({ width: 50 }),
          fillText: () => {},
          strokeText: () => {},
          translate: () => {},
          rotate: () => {},
          fillRect: () => {},
          strokeRect: () => {},
        }),
      } as unknown as HTMLCanvasElement;

      const config = {
        ...DEFAULT_WATERMARK_CONFIG,
        text: {
          ...DEFAULT_WATERMARK_CONFIG.text,
          enabled: true,
          tile: true,
          tileSpacing: 0, // Invalid zero spacing should be clamped safely
        },
        logo: {
          ...DEFAULT_WATERMARK_CONFIG.logo,
          enabled: true,
          logoUrl: 'blob:test',
          tile: true,
          tileSpacing: -2, // Invalid negative spacing
        },
      };

      const zeroLogo = { width: 0, height: 0 } as HTMLImageElement;

      expect(() =>
        drawWatermarkOnCanvas(fakeCanvas, {} as HTMLImageElement, 800, 600, config, zeroLogo)
      ).not.toThrow();
    });
  });
});

