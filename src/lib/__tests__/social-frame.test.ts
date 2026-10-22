import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SocialFrameOverlay } from '@/components/studio/social-frame-overlay';
import { WATERMARK_PRESETS, DEFAULT_WATERMARK_CONFIG } from '@/data/presets';
import { drawWatermarkOnSocialCanvas } from '@/lib/watermark-engine';

describe('Social Media Safe Zone Frame & UI Mockup Overlays', () => {
  it('should render null when frame is "none"', () => {
    const html = renderToString(React.createElement(SocialFrameOverlay, { frame: 'none' }));
    expect(html).toBe('');
  });

  it('should render TikTok safe zone and interaction UI elements', () => {
    const html = renderToString(
      React.createElement(SocialFrameOverlay, {
        frame: 'tiktok',
        showDangerZone: true,
        showUiElements: true,
      })
    );

    expect(html).toContain('ZONE BAHAYA: HEADER (TIKTOK)');
    expect(html).toContain('AREA AMAN WATERMARK');
    expect(html).toContain('Untuk Anda');
    expect(html).toContain('842.5K');
    expect(html).toContain('@studio.markit');
  });

  it('should render Instagram Reels safe zone and UI elements', () => {
    const html = renderToString(
      React.createElement(SocialFrameOverlay, {
        frame: 'reels',
        showDangerZone: true,
        showUiElements: true,
      })
    );

    expect(html).toContain('ZONE BAHAYA: HEADER (REELS)');
    expect(html).toContain('AREA AMAN WATERMARK');
    expect(html).toContain('Reels');
    expect(html).toContain('Ikuti');
    expect(html).toContain('120K');
    expect(html).toContain('studio.markit');
  });

  it('should render YouTube Shorts safe zone and UI elements', () => {
    const html = renderToString(
      React.createElement(SocialFrameOverlay, {
        frame: 'shorts',
        showDangerZone: true,
        showUiElements: true,
      })
    );

    expect(html).toContain('ZONE BAHAYA: HEADER (SHORTS)');
    expect(html).toContain('AREA AMAN WATERMARK');
    expect(html).toContain('Shorts');
    expect(html).toContain('Subscribe');
    expect(html).toContain('350K');
    expect(html).toContain('Tidak suka');
  });

  it('should omit danger zone masks when showDangerZone is false', () => {
    const html = renderToString(
      React.createElement(SocialFrameOverlay, {
        frame: 'tiktok',
        showDangerZone: false,
        showUiElements: true,
      })
    );

    expect(html).not.toContain('ZONE BAHAYA');
    expect(html).not.toContain('AREA AMAN WATERMARK');
    expect(html).toContain('Untuk Anda');
  });

  it('should omit UI buttons when showUiElements is false', () => {
    const html = renderToString(
      React.createElement(SocialFrameOverlay, {
        frame: 'tiktok',
        showDangerZone: true,
        showUiElements: false,
      })
    );

    expect(html).toContain('ZONE BAHAYA');
    expect(html).not.toContain('842.5K');
    expect(html).not.toContain('Untuk Anda');
  });

  it('should apply custom opacity style', () => {
    const html = renderToString(
      React.createElement(SocialFrameOverlay, {
        frame: 'reels',
        opacity: 0.5,
      })
    );

    expect(html).toContain('opacity:0.5');
  });

  it('should include the social-safe-shortform preset in presets list', () => {
    const preset = WATERMARK_PRESETS.find((p) => p.id === 'social-safe-shortform');
    expect(preset).toBeDefined();
    expect(preset?.name).toContain('Safe Zone');
    expect(preset?.config.text?.position?.grid).toBe('top-left');
  });

  it('should calibrate canvas to 720 x 1280 px for social media content', () => {
    let cleared = false;
    let drawCallCount = 0;
    const mockCtx = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: '',
      clearRect: () => {
        cleared = true;
      },
      drawImage: () => {
        drawCallCount++;
      },
      save: () => {},
      restore: () => {},
      measureText: () => ({ width: 100 }),
      fillText: () => {},
      translate: () => {},
      rotate: () => {},
      strokeRect: () => {},
      fillRect: () => {},
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => mockCtx,
    } as unknown as HTMLCanvasElement;

    const mockMedia = {} as CanvasImageSource;
    drawWatermarkOnSocialCanvas(
      mockCanvas,
      mockMedia,
      1920,
      1080,
      DEFAULT_WATERMARK_CONFIG,
      null,
      720,
      1280
    );

    expect(mockCanvas.width).toBe(720);
    expect(mockCanvas.height).toBe(1280);
    expect(cleared).toBe(true);
    expect(drawCallCount).toBeGreaterThan(0);
  });
});
