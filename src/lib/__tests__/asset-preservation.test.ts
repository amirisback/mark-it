import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  computeAdaptiveVideoBitrate,
  calculateAdaptiveVideoBitrate,
  applyPristineCanvasSmoothing,
  drawWatermarkOnCanvas,
  captureNativeVideoFrameAsync,
  exportNativeVideoSnapshotAsync,
  type VideoSnapshotOptions,
} from '@/lib/watermark-engine';
import { DEFAULT_WATERMARK_CONFIG } from '@/data/presets';
import type { WatermarkFullConfig } from '@/types/watermark';

// Mock next-themes for ThemeSwitcher testing
let currentMockTheme = 'dark';
mock.module('next-themes', () => ({
  useTheme: () => ({
    theme: currentMockTheme,
    setTheme: (t: string) => {
      currentMockTheme = t;
    },
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react useSyncExternalStore to simulate mounted client state for ThemeSwitcher
let simulateMounted = false;
mock.module('react', () => ({
  ...React,
  useSyncExternalStore: (
    _subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => unknown,
    getServerSnapshot?: () => unknown
  ) => {
    if (simulateMounted) {
      return getSnapshot();
    }
    return getServerSnapshot ? getServerSnapshot() : false;
  },
}));

// Import ThemeSwitcher after mocks
const { ThemeSwitcher } = await import('@/app/_components/theme-switcher');

describe('TASK-002: Theme Switcher & Asset Quality Preservation', () => {
  /* =========================================================================
   * 1. Adaptive Video Bitrate Engine Suite
   * ========================================================================= */
  describe('computeAdaptiveVideoBitrate - Multi-Resolution & Profiles', () => {
    describe('720p HD and Below (<= 1280x720 pixels)', () => {
      const w = 1280;
      const h = 720;

      it('should calculate 8 Mbps for standard profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'standard')).toBe(8_000_000);
      });

      it('should calculate 12 Mbps for high profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'high')).toBe(12_000_000);
      });

      it('should calculate 18 Mbps for maximum profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'maximum')).toBe(18_000_000);
      });

      it('should map optimal alias to standard profile (8 Mbps)', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'optimal')).toBe(8_000_000);
      });

      it('should handle lower resolutions (e.g. 640x360 SD) within 720p tier', () => {
        expect(computeAdaptiveVideoBitrate(640, 360, 30, 'standard')).toBe(8_000_000);
        expect(computeAdaptiveVideoBitrate(640, 360, 30, 'maximum')).toBe(18_000_000);
      });
    });

    describe('1080p Full HD (<= 1920x1080 pixels)', () => {
      const w = 1920;
      const h = 1080;

      it('should calculate 12 Mbps for standard profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'standard')).toBe(12_000_000);
      });

      it('should calculate 16 Mbps for high profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'high')).toBe(16_000_000);
      });

      it('should calculate 28 Mbps for maximum profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'maximum')).toBe(28_000_000);
      });

      it('should default to maximum profile when not specified', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30)).toBe(28_000_000);
      });
    });

    describe('1440p 2K QHD (<= 2560x1440 pixels)', () => {
      const w = 2560;
      const h = 1440;

      it('should calculate 18 Mbps for standard profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'standard')).toBe(18_000_000);
      });

      it('should calculate 24 Mbps for high profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'high')).toBe(24_000_000);
      });

      it('should calculate 36 Mbps for maximum profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'maximum')).toBe(36_000_000);
      });
    });

    describe('4K UHD and Above (> 2560x1440 pixels)', () => {
      const w = 3840;
      const h = 2160;

      it('should calculate 24 Mbps for standard profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'standard')).toBe(24_000_000);
      });

      it('should calculate 35 Mbps for high profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'high')).toBe(35_000_000);
      });

      it('should calculate 45 Mbps for maximum profile at 30 fps', () => {
        expect(computeAdaptiveVideoBitrate(w, h, 30, 'maximum')).toBe(45_000_000);
      });

      it('should handle vertical 4K reels (2160x3840)', () => {
        expect(computeAdaptiveVideoBitrate(2160, 3840, 30, 'maximum')).toBe(45_000_000);
      });
    });

    describe('High Framerate (60 FPS) & 50 Mbps Ceiling Guard', () => {
      it('should scale 1080p high profile at 60 fps by 1.5x (16 Mbps -> 24 Mbps)', () => {
        expect(computeAdaptiveVideoBitrate(1920, 1080, 60, 'high')).toBe(24_000_000);
      });

      it('should scale 1080p maximum profile at 60 fps by 1.5x (28 Mbps -> 42 Mbps)', () => {
        expect(computeAdaptiveVideoBitrate(1920, 1080, 60, 'maximum')).toBe(42_000_000);
      });

      it('should enforce hard 50 Mbps ceiling for 4K maximum profile at 60 fps (45 Mbps * 1.5 = 67.5 Mbps -> clamped to 50 Mbps)', () => {
        const uncapped = 45_000_000 * 1.5;
        expect(uncapped).toBe(67_500_000);
        expect(computeAdaptiveVideoBitrate(3840, 2160, 60, 'maximum')).toBe(50_000_000);
      });

      it('should enforce hard 50 Mbps ceiling even at 120 fps', () => {
        expect(computeAdaptiveVideoBitrate(3840, 2160, 120, 'maximum')).toBe(50_000_000);
      });
    });
  });

  describe('calculateAdaptiveVideoBitrate - Video & Audio Configuration', () => {
    it('should configure studio-grade 256 kbps audioBitsPerSecond alongside videoBitsPerSecond', () => {
      const config = calculateAdaptiveVideoBitrate(1920, 1080, 30, 'maximum');
      expect(config.videoBitsPerSecond).toBe(28_000_000);
      expect(config.audioBitsPerSecond).toBe(256_000);
    });

    it('should retain 256 kbps audio across all profiles and resolutions', () => {
      const config720p = calculateAdaptiveVideoBitrate(1280, 720, 30, 'standard');
      expect(config720p.audioBitsPerSecond).toBe(256_000);

      const config4K = calculateAdaptiveVideoBitrate(3840, 2160, 60, 'maximum');
      expect(config4K.audioBitsPerSecond).toBe(256_000);
      expect(config4K.videoBitsPerSecond).toBe(50_000_000);
    });
  });

  /* =========================================================================
   * 2. Canvas 2D Smoothing & Pristine Context Configuration
   * ========================================================================= */
  describe('applyPristineCanvasSmoothing - 2D Context Quality Preservation', () => {
    it('should enforce imageSmoothingEnabled = true and imageSmoothingQuality = "high"', () => {
      const mockCtx = {
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low' as ImageSmoothingQuality,
      } as unknown as CanvasRenderingContext2D;

      applyPristineCanvasSmoothing(mockCtx);

      expect(mockCtx.imageSmoothingEnabled).toBe(true);
      expect(mockCtx.imageSmoothingQuality).toBe('high');
    });

    it('should apply pristine smoothing immediately upon canvas dimension allocation in drawWatermarkOnCanvas', () => {
      const mockContext = {
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low' as ImageSmoothingQuality,
        clearRect: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        measureText: () => ({ width: 120 }),
        fillText: () => {},
        strokeText: () => {},
        fillRect: () => {},
        translate: () => {},
        rotate: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
      };

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: (type: string) => (type === '2d' ? mockContext : null),
      } as unknown as HTMLCanvasElement;

      const fakeMediaSource = {} as CanvasImageSource;
      const config: WatermarkFullConfig = {
        ...DEFAULT_WATERMARK_CONFIG,
        text: {
          ...DEFAULT_WATERMARK_CONFIG.text,
          enabled: true,
          text: 'Pristine Test',
        },
      };

      drawWatermarkOnCanvas(mockCanvas, fakeMediaSource, 1920, 1080, config);

      expect(mockCanvas.width).toBe(1920);
      expect(mockCanvas.height).toBe(1080);
      expect(mockContext.imageSmoothingEnabled).toBe(true);
      expect(mockContext.imageSmoothingQuality).toBe('high');
    });
  });

  /* =========================================================================
   * 3. Native Video Snapshot Export Contract & Dimension Preservation
   * ========================================================================= */
  describe('Native Video Snapshot Export - Contract & Unscaled Dimensions', () => {
    const originalDocument = globalThis.document;

    let createdCanvasWidth = 0;
    let createdCanvasHeight = 0;
    let exportedFormat = '';
    let exportedQuality = 0;

    beforeEach(() => {
      createdCanvasWidth = 0;
      createdCanvasHeight = 0;
      exportedFormat = '';
      exportedQuality = 0;

      const fakeCanvas = {
        get width() {
          return createdCanvasWidth;
        },
        set width(val: number) {
          createdCanvasWidth = val;
        },
        get height() {
          return createdCanvasHeight;
        },
        set height(val: number) {
          createdCanvasHeight = val;
        },
        getContext: () => ({
          imageSmoothingEnabled: false,
          imageSmoothingQuality: 'low',
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
        toBlob: (callback: (b: Blob | null) => void, format = 'image/png', quality = 0.95) => {
          exportedFormat = format;
          exportedQuality = quality;
          callback(new Blob(['fake-image-bytes'], { type: format }));
        },
      };

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
    });

    afterEach(() => {
      (globalThis as unknown as { document: unknown }).document = originalDocument;
    });

    it('should export native snapshot at full source dimensions (4K 3840x2160) without viewport downscaling', async () => {
      const fakeVideo = {
        videoWidth: 3840,
        videoHeight: 2160,
      } as unknown as HTMLVideoElement;

      const options: VideoSnapshotOptions = {
        videoElement: fakeVideo,
        sourceWidth: 3840,
        sourceHeight: 2160,
        config: DEFAULT_WATERMARK_CONFIG,
        format: 'image/png',
        quality: 1.0,
      };

      const blob = await exportNativeVideoSnapshotAsync(options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(createdCanvasWidth).toBe(3840);
      expect(createdCanvasHeight).toBe(2160);
      expect(exportedFormat).toBe('image/png');
      expect(exportedQuality).toBe(1.0);
    });

    it('should fallback to videoElement dimensions when sourceWidth & sourceHeight are omitted', async () => {
      const fakeVideo = {
        videoWidth: 1920,
        videoHeight: 1080,
      } as unknown as HTMLVideoElement;

      const blob = await captureNativeVideoFrameAsync(
        fakeVideo,
        DEFAULT_WATERMARK_CONFIG
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(createdCanvasWidth).toBe(1920);
      expect(createdCanvasHeight).toBe(1080);
      expect(exportedFormat).toBe('image/png');
      expect(exportedQuality).toBe(0.95);
    });
  });

  /* =========================================================================
   * 4. ThemeSwitcher WAI-ARIA Accessibility & Semantic Attributes
   * ========================================================================= */
  describe('ThemeSwitcher Component - WAI-ARIA & Accessibility Specification', () => {
    describe('Zero FOUC Skeleton Placeholder (Unmounted / SSR)', () => {
      beforeEach(() => {
        simulateMounted = false;
      });

      it('should render compact skeleton placeholder with aria-hidden="true" and exact pill dimensions', () => {
        const html = renderToString(React.createElement(ThemeSwitcher, { variant: 'compact' }));
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('animate-pulse');
        expect(html).toContain('w-[148px]');
        expect(html).toContain('h-8.5');
      });

      it('should render expanded skeleton placeholder with aria-hidden="true" and exact full grid dimensions', () => {
        const html = renderToString(React.createElement(ThemeSwitcher, { variant: 'expanded' }));
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('animate-pulse');
        expect(html).toContain('w-full');
        expect(html).toContain('h-11');
      });
    });

    describe('Mounted ThemeSwitcher - WAI-ARIA Radiogroup & Radio Controls', () => {
      beforeEach(() => {
        simulateMounted = true;
      });

      it('should render container with role="radiogroup" and accessible aria-label', () => {
        const html = renderToString(React.createElement(ThemeSwitcher, { variant: 'expanded' }));
        expect(html).toContain('role="radiogroup"');
        expect(html).toContain('aria-label="Pilihan tema tampilan"');
      });

      it('should render 3 radio items with role="radio"', () => {
        const html = renderToString(React.createElement(ThemeSwitcher, { variant: 'expanded' }));
        const radioMatches = html.match(/role="radio"/g);
        expect(radioMatches).not.toBeNull();
        expect(radioMatches?.length).toBe(3);
      });

      it('should correctly set aria-checked="true" and tabindex="0" on active theme (dark)', () => {
        currentMockTheme = 'dark';
        const html = renderToString(React.createElement(ThemeSwitcher, { variant: 'expanded' }));

        // Dark button should be checked
        expect(html).toContain('aria-checked="true"');
        expect(html).toContain('tabindex="0"');

        // Other two buttons should have aria-checked="false" and tabindex="-1"
        const uncheckedMatches = html.match(/aria-checked="false"/g);
        expect(uncheckedMatches?.length).toBe(2);
        const inactiveTabIndices = html.match(/tabindex="-1"/g);
        expect(inactiveTabIndices?.length).toBe(2);
      });

      it('should render title and descriptive aria-label on compact variant buttons', () => {
        currentMockTheme = 'light';
        const html = renderToString(React.createElement(ThemeSwitcher, { variant: 'compact' }));

        expect(html).toContain('aria-label="Ganti tema ke Terang"');
        expect(html).toContain('aria-label="Ganti tema ke Gelap"');
        expect(html).toContain('aria-label="Ganti tema ke Sistem"');
        expect(html).toContain('title="Terang"');
        expect(html).toContain('title="Gelap"');
        expect(html).toContain('title="Sistem"');
      });

      it('should support custom label overrides for localization', () => {
        currentMockTheme = 'system';
        const html = renderToString(
          React.createElement(ThemeSwitcher, {
            variant: 'expanded',
            labels: { light: 'Light Mode', dark: 'Dark Mode', system: 'System Auto' },
          })
        );

        expect(html).toContain('Light Mode');
        expect(html).toContain('Dark Mode');
        expect(html).toContain('System Auto');
      });

      it('should render geometric SVG icons with stroke-width 1.8 and aria-hidden="true"', () => {
        const html = renderToString(React.createElement(ThemeSwitcher, { variant: 'compact' }));
        expect(html).toContain('stroke-width="1.8"');
        expect(html).toContain('aria-hidden="true"');
      });
    });
  });
});
