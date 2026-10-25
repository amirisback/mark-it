import { describe, it, expect } from 'vitest';
import {
  computeMovingCoordinates,
  computeCoordinates,
  computeCrc32,
  injectPngTextChunks,
  injectJpegExif,
  injectImageMetadataAsync,
  isWebCodecsSupported,
} from '@/lib/watermark-engine';
import type { PositionConfig, MovingWatermarkConfig, ImageMetadataConfig } from '@/types/watermark';

describe('Advanced Features: Moving Watermark (Anti-AI)', () => {
  const basePos: PositionConfig = {
    grid: 'center',
    offsetX: 0,
    offsetY: 0,
  };

  it('should return static coordinates when moving watermark is disabled', () => {
    const moving: MovingWatermarkConfig = {
      enabled: false,
      mode: 'drift',
      speed: 'medium',
    };

    const staticCoords = computeCoordinates(1920, 1080, 200, 50, basePos);
    const movingCoords = computeMovingCoordinates(1920, 1080, 200, 50, basePos, moving, 10);

    expect(movingCoords.x).toBe(staticCoords.x);
    expect(movingCoords.y).toBe(staticCoords.y);
  });

  it('should produce harmonic drift coordinates that stay strictly inside canvas boundaries', () => {
    const moving: MovingWatermarkConfig = {
      enabled: true,
      mode: 'drift',
      speed: 'fast',
    };

    const width = 1000;
    const height = 800;
    const contentW = 150;
    const contentH = 40;

    const paddingX = width * 0.03;
    const paddingY = height * 0.03;
    const maxX = width - contentW - paddingX;
    const maxY = height - contentH - paddingY;

    // Test across a full 30-second timeline with 0.5s increments
    for (let t = 0; t <= 30; t += 0.5) {
      const coords = computeMovingCoordinates(width, height, contentW, contentH, basePos, moving, t);
      expect(coords.x).toBeGreaterThanOrEqual(paddingX);
      expect(coords.x).toBeLessThanOrEqual(maxX);
      expect(coords.y).toBeGreaterThanOrEqual(paddingY);
      expect(coords.y).toBeLessThanOrEqual(maxY);
    }
  });

  it('should compute deterministic bounce coordinates across time', () => {
    const moving: MovingWatermarkConfig = {
      enabled: true,
      mode: 'bounce',
      speed: 'medium',
    };

    const width = 1280;
    const height = 720;
    const contentW = 200;
    const contentH = 60;

    const coordsT0 = computeMovingCoordinates(width, height, contentW, contentH, basePos, moving, 0);
    const coordsT2 = computeMovingCoordinates(width, height, contentW, contentH, basePos, moving, 2);
    const coordsT4 = computeMovingCoordinates(width, height, contentW, contentH, basePos, moving, 4);

    // Coordinates at different timestamps must be different (moving)
    expect(coordsT0).not.toEqual(coordsT2);
    expect(coordsT2).not.toEqual(coordsT4);

    // Repeated call at same timestamp must be 100% deterministic
    const coordsT2Repeat = computeMovingCoordinates(width, height, contentW, contentH, basePos, moving, 2);
    expect(coordsT2Repeat).toEqual(coordsT2);
  });

  it('should cycle across distinct quadrant positions in jump mode', () => {
    const moving: MovingWatermarkConfig = {
      enabled: true,
      mode: 'jump',
      speed: 'medium', // 3.0s interval
    };

    const width = 1920;
    const height = 1080;
    const contentW = 250;
    const contentH = 80;

    const step0 = computeMovingCoordinates(width, height, contentW, contentH, basePos, moving, 0.5);
    const step1 = computeMovingCoordinates(width, height, contentW, contentH, basePos, moving, 3.5);
    const step2 = computeMovingCoordinates(width, height, contentW, contentH, basePos, moving, 6.5);

    expect(step0).not.toEqual(step1);
    expect(step1).not.toEqual(step2);
  });
});

describe('Advanced Features: EXIF & Metadata Stamping', () => {
  it('should calculate valid CRC32 checksums', () => {
    // "123456789" is standard CRC32 test vector (0xCBF43926 = 3421780262)
    const testData = new TextEncoder().encode('123456789');
    const crc = computeCrc32(testData);
    expect(crc).toBe(0xcbf43926);
  });

  it('should inject tEXt metadata chunks into PNG buffer before IEND', () => {
    // Construct minimal valid PNG with IHDR and IEND chunks
    // PNG Signature: 8 bytes
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    // IEND chunk: length 0 (4 bytes), type "IEND" (4 bytes), crc (4 bytes)
    const iendChunk = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
    const rawPng = new Uint8Array([...pngSignature, ...iendChunk]);

    const metadata: ImageMetadataConfig = {
      enabled: true,
      artist: 'Studio Amir',
      copyright: '© 2026 Amir Photography',
      description: 'Shot on Location',
    };

    const injectedBuffer = injectPngTextChunks(rawPng.buffer, metadata);
    const injectedBytes = new Uint8Array(injectedBuffer);
    const text = new TextDecoder('utf-8').decode(injectedBytes);

    expect(injectedBytes.length).toBeGreaterThan(rawPng.length);
    expect(text).toContain('tEXtAuthor\0Studio Amir');
    expect(text).toContain('tEXtCopyright\0© 2026 Amir Photography');
    expect(text).toContain('tEXtSoftware\0MarkIt Studio');
    // IEND must still be at the very end
    expect(injectedBytes[injectedBytes.length - 8]).toBe(0x49); // 'I'
    expect(injectedBytes[injectedBytes.length - 7]).toBe(0x45); // 'E'
    expect(injectedBytes[injectedBytes.length - 6]).toBe(0x4e); // 'N'
    expect(injectedBytes[injectedBytes.length - 5]).toBe(0x44); // 'D'
  });

  it('should inject APP1 EXIF segment into JPEG buffer with TIFF tags', () => {
    // Minimal mock JPEG: SOI (FF D8) + EOI (FF D9)
    const rawJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

    const metadata: ImageMetadataConfig = {
      enabled: true,
      artist: 'Fotografer Amir',
      copyright: '© 2026 Hak Cipta Dilindungi',
      description: 'Landscape 4K',
    };

    const injectedBuffer = injectJpegExif(rawJpeg.buffer, metadata);
    const injectedBytes = new Uint8Array(injectedBuffer);

    // SOI marker intact (bytes 0, 1)
    expect(injectedBytes[0]).toBe(0xff);
    expect(injectedBytes[1]).toBe(0xd8);

    // APP1 marker at bytes 2, 3
    expect(injectedBytes[2]).toBe(0xff);
    expect(injectedBytes[3]).toBe(0xe1);

    // Length field at bytes 4, 5
    const app1Length = (injectedBytes[4] << 8) | injectedBytes[5];
    expect(app1Length).toBeGreaterThan(16);

    // Exif identifier at bytes 6..11
    const exifId = new TextDecoder('utf-8').decode(injectedBytes.subarray(6, 12));
    expect(exifId).toBe('Exif\0\0');

    // TIFF Header Little Endian "II" at bytes 12, 13
    expect(injectedBytes[12]).toBe(0x49); // 'I'
    expect(injectedBytes[13]).toBe(0x49); // 'I'

    const fullText = new TextDecoder('utf-8').decode(injectedBytes);
    expect(fullText).toContain('Fotografer Amir');
    expect(fullText).toContain('© 2026 Hak Cipta Dilindungi');
    expect(fullText).toContain('MarkIt Studio');
  });

  it('should pass through blob unmodified when metadata is disabled or missing', async () => {
    const sampleBlob = new Blob(['sample-data'], { type: 'image/jpeg' });
    const result = await injectImageMetadataAsync(sampleBlob, {
      enabled: false,
      artist: 'Test',
      copyright: 'Test',
      description: 'Test',
    });

    expect(result).toBe(sampleBlob);
  });
});

describe('Advanced Features: WebCodecs Acceleration Readiness', () => {
  it('should safely detect WebCodecs availability without throwing', () => {
    const supported = isWebCodecsSupported();
    expect(typeof supported).toBe('boolean');
  });
});
