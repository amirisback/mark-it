import { describe, it, expect } from 'bun:test';
import { getSafeFiniteDuration } from '@/lib/watermark-engine';
import { normalizeHexColor } from '@/components/ui/color-picker';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-003: Code Audit & Bug Fixes Verification', () => {
  describe('getSafeFiniteDuration', () => {
    it('should return valid positive finite durations as-is', () => {
      expect(getSafeFiniteDuration(10.5)).toBe(10.5);
      expect(getSafeFiniteDuration(0.05)).toBe(0.05);
      expect(getSafeFiniteDuration(120)).toBe(120);
    });

    it('should fallback when duration is NaN, Infinity, negative, zero, or non-number', () => {
      expect(getSafeFiniteDuration(NaN, 1)).toBe(1);
      expect(getSafeFiniteDuration(Infinity, 1)).toBe(1);
      expect(getSafeFiniteDuration(-5, 0)).toBe(0);
      expect(getSafeFiniteDuration(0, 0)).toBe(0);
      expect(getSafeFiniteDuration(null, 1)).toBe(1);
      expect(getSafeFiniteDuration(undefined, 1)).toBe(1);
      expect(getSafeFiniteDuration('10', 1)).toBe(1);
    });
  });

  describe('normalizeHexColor', () => {
    it('should preserve valid 6-digit hex colors', () => {
      expect(normalizeHexColor('#ffffff')).toBe('#ffffff');
      expect(normalizeHexColor('#4f46e5')).toBe('#4f46e5');
      expect(normalizeHexColor('#000000')).toBe('#000000');
      expect(normalizeHexColor('#ABCDEF')).toBe('#ABCDEF');
    });

    it('should expand 3-digit shorthand hex to 6-digit', () => {
      expect(normalizeHexColor('#fff')).toBe('#ffffff');
      expect(normalizeHexColor('#000')).toBe('#000000');
      expect(normalizeHexColor('#f0a')).toBe('#ff00aa');
    });

    it('should fallback to default or specified color on invalid hex input', () => {
      expect(normalizeHexColor('invalid')).toBe('#4f46e5');
      expect(normalizeHexColor('#12345', '#10b981')).toBe('#10b981');
      expect(normalizeHexColor('', '#000000')).toBe('#000000');
    });
  });

  describe('Sub-0.1s video seek clamp calculation', () => {
    it('should clamp poster seek correctly for ultra-short media', () => {
      const clampSeek = (duration: number) => {
        const safeDuration = getSafeFiniteDuration(duration, 0);
        return Math.min(0.1, safeDuration > 0 ? safeDuration / 2 : 0);
      };

      expect(clampSeek(0.04)).toBe(0.02);
      expect(clampSeek(0.08)).toBe(0.04);
      expect(clampSeek(0.2)).toBe(0.1);
      expect(clampSeek(10)).toBe(0.1);
      expect(clampSeek(0)).toBe(0);
      expect(clampSeek(Infinity)).toBe(0);
    });
  });

  describe('Anti-Slop (Rule R-02): Zero Em Dash (—) in UI Copy & Metadata', () => {
    const filesToCheck = [
      'src/app/manifest.ts',
      'src/components/studio/inspector-panel.tsx',
      'src/dictionaries/id.json',
      'src/dictionaries/en.json',
      'src/lib/seo.ts',
      'src/app/layout.tsx',
      'src/app/page.tsx',
    ];

    it('should contain zero em dashes (\u2014) in audited files', () => {
      const emDashRegex = /\u2014/g;
      const rootDir = process.cwd();

      for (const relPath of filesToCheck) {
        const fullPath = path.join(rootDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(emDashRegex);
        expect(matches).toBeNull();
      }
    });
  });
});
