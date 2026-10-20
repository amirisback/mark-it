import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { resetRateLimitStore } from "@/lib/rate-limiter";
import { encrypt, decrypt } from "@/lib/crypto";
import { obfuscateId, deobfuscateId } from "@/lib/obfuscator";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { generateMetadata } from "@/app/layout";
import {
  computeCoordinates,
  computeFontSizePixels,
  resolveCanvasFontFamily,
  exportWatermarkedVideoAsync,
} from "@/lib/watermark-engine";
import { DEFAULT_WATERMARK_CONFIG, WATERMARK_PRESETS } from "@/data/presets";
import { CURATED_FONTS, FONT_SIZE_PRESETS } from "@/data/fonts";
import { getDictionary } from "@/lib/dictionaries";
import type { WatermarkFullConfig } from "@/types/watermark";

describe("E2E Application Workflow Test Suite", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  describe("E2E Security & Proxy Middleware Gateways", () => {
    it("should intercept and block path traversal / sensitive probe requests with HTTP 403", () => {
      const maliciousPaths = [
        "http://localhost:3000/.env",
        "http://localhost:3000/.git/config",
        "http://localhost:3000/wp-admin",
        "http://localhost:3000/phpmyadmin",
        "http://localhost:3000/cgi-bin/test",
        "http://localhost:3000/exploit.php",
      ];

      for (const path of maliciousPaths) {
        const req = new NextRequest(path, {
          headers: { "x-forwarded-for": "192.168.1.100" },
        });
        const res = proxy(req);
        expect(res.status).toBe(403);
      }
    });

    it("should block automated vulnerability scanners with HTTP 403", () => {
      const scannerAgents = [
        "sqlmap/1.5#stable",
        "Nikto/2.1.6",
        "masscan/1.0",
        "WPScan v3.8.20",
        "Acunetix-Product",
      ];

      for (const userAgent of scannerAgents) {
        const req = new NextRequest("http://localhost:3000/about", {
          headers: {
            "x-forwarded-for": "192.168.1.101",
            "user-agent": userAgent,
          },
        });
        const res = proxy(req);
        expect(res.status).toBe(403);
      }
    });

    it("should allow legitimate traffic with rate limit tracking headers attached", () => {
      const req = new NextRequest("http://localhost:3000/", {
        headers: {
          "x-forwarded-for": "192.168.1.102",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
      const res = proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-RateLimit-Limit")).toBe("120");
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("119");
      expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    it("should throttle requests exceeding strict tier limit with HTTP 429", () => {
      const ip = "192.168.1.103";
      let lastRes;
      for (let i = 0; i < 11; i++) {
        const req = new NextRequest("http://localhost:3000/api/auth/login", {
          headers: {
            "x-forwarded-for": ip,
            "user-agent": "Mozilla/5.0",
          },
        });
        lastRes = proxy(req);
      }
      expect(lastRes?.status).toBe(429);
      expect(lastRes?.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("E2E Cryptographic Security Utilities", () => {
    it("should execute encryption and decryption roundtrip cleanly", async () => {
      const plaintext = "user-profile-data-with-pii-998877";
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should safely return null on tampered ciphertext", async () => {
      const encrypted = encrypt("important-financial-record");
      const tampered = encrypted.slice(0, -4) + "abcd";
      const decrypted = decrypt(tampered);

      expect(decrypted).toBeNull();
    });

    it("should throw error on empty plaintext encryption", async () => {
      expect(() => encrypt("")).toThrow();
    });
  });

  describe("E2E ID Obfuscation (Sqids)", () => {
    it("should execute obfuscate and deobfuscate roundtrip cleanly", async () => {
      const rawId = 10492;
      const obfuscated = obfuscateId(rawId);

      expect(obfuscated).toBeDefined();
      expect(typeof obfuscated).toBe("string");
      expect(obfuscated.length).toBeGreaterThanOrEqual(6);

      const deobfuscated = deobfuscateId(obfuscated);
      expect(deobfuscated).toBe(rawId);
    });

    it("should reject negative or invalid numbers", async () => {
      expect(() => obfuscateId(-5)).toThrow();
      expect(() => obfuscateId(12.34)).toThrow();
    });

    it("should return null on invalid hashes", async () => {
      const corrupt = deobfuscateId("invalid-sqids-***");
      expect(corrupt).toBeNull();
    });
  });

  describe("E2E Next.js Core Routes & Metadata", () => {
    it("should generate compliant PWA Web Manifest", () => {
      const manifestData = manifest();
      expect(manifestData.name).toContain("MarkIt Studio");
      expect(manifestData.display).toBe("standalone");
      expect(manifestData.start_url).toBe("/");
      expect(manifestData.icons?.length).toBeGreaterThanOrEqual(2);
    });

    it("should generate compliant robots.txt route structure", () => {
      const robotsData = robots();
      expect(robotsData.rules).toBeDefined();
      expect(robotsData.sitemap).toContain("/sitemap.xml");
      expect(robotsData.host).toBeDefined();
    });

    it("should generate compliant sitemap.xml entries", () => {
      const sitemapData = sitemap();
      expect(Array.isArray(sitemapData)).toBe(true);
      expect(sitemapData.length).toBeGreaterThan(0);
      expect(sitemapData[0]?.url).toBeDefined();
      expect(sitemapData[0]?.lastModified).toBeInstanceOf(Date);
    });

    it("should generate comprehensive root layout metadata", async () => {
      const meta = await generateMetadata();
      expect(meta.title).toBeDefined();
      expect(meta.description).toBeDefined();
      expect(meta.openGraph).toBeDefined();
      expect(meta.twitter).toBeDefined();
    });
  });

  describe("E2E Watermark Studio Engine & Coordinate Pipeline", () => {
    it("should calculate correct 9-grid coordinates for portrait and landscape media", () => {
      // 1920x1080 landscape
      const landscapeW = 1920;
      const landscapeH = 1080;
      const contentW = 300;
      const contentH = 60;
      const padX = landscapeW * 0.03; // 57.6
      const padY = landscapeH * 0.03; // 32.4

      const tl = computeCoordinates(landscapeW, landscapeH, contentW, contentH, {
        grid: "top-left",
        offsetX: 0,
        offsetY: 0,
      });
      expect(tl.x).toBe(Math.round(padX));
      expect(tl.y).toBe(Math.round(padY));

      const br = computeCoordinates(landscapeW, landscapeH, contentW, contentH, {
        grid: "bottom-right",
        offsetX: 0,
        offsetY: 0,
      });
      expect(br.x).toBe(Math.round(landscapeW - contentW - padX));
      expect(br.y).toBe(Math.round(landscapeH - contentH - padY));

      const center = computeCoordinates(landscapeW, landscapeH, contentW, contentH, {
        grid: "center",
        offsetX: 0,
        offsetY: 0,
      });
      expect(center.x).toBe(Math.round((landscapeW - contentW) / 2));
      expect(center.y).toBe(Math.round((landscapeH - contentH) / 2));
    });

    it("should compute linear font size in pixels and respect the 10px minimum boundary", () => {
      expect(computeFontSizePixels(4.5, 1000)).toBe(45);
      expect(computeFontSizePixels(2.0, 1080)).toBe(22);
      expect(computeFontSizePixels(0.1, 100)).toBe(10);
      expect(computeFontSizePixels(-5, 500)).toBe(10);
    });

    it("should sanitize font families and ensure multi-word font names are quoted for Canvas 2D", () => {
      expect(resolveCanvasFontFamily(undefined)).toBe('"Inter", sans-serif');
      expect(resolveCanvasFontFamily("var(--font-sans)")).toBe('"Inter", sans-serif');
      expect(resolveCanvasFontFamily("Playfair Display")).toBe('"Playfair Display"');
      expect(resolveCanvasFontFamily('"Inter", sans-serif')).toBe('"Inter", sans-serif');
    });

    it("should verify that all curated fonts have non-CSS variable definitions", () => {
      expect(CURATED_FONTS.length).toBeGreaterThanOrEqual(10);
      for (const font of CURATED_FONTS) {
        expect(font.family).not.toContain("var(");
        expect(font.name.length).toBeGreaterThan(0);
        expect(font.category.length).toBeGreaterThan(0);
      }
      expect(FONT_SIZE_PRESETS.length).toBe(5);
    });

    it("should safely reject video export immediately if AbortSignal is already triggered", async () => {
      const abortCtrl = new AbortController();
      abortCtrl.abort();

      const fakeVideo = {} as HTMLVideoElement;
      await expect(
        exportWatermarkedVideoAsync({
          videoElement: fakeVideo,
          sourceWidth: 640,
          sourceHeight: 360,
          duration: 5,
          config: DEFAULT_WATERMARK_CONFIG,
          signal: abortCtrl.signal,
        })
      ).rejects.toThrow();
    });
  });

  describe("E2E Studio Workspace Presets & Batch Lifecycle Workflow", () => {
    it("should verify that all presets have valid badge, description, and applicable configs", () => {
      expect(WATERMARK_PRESETS.length).toBeGreaterThanOrEqual(6);

      for (const preset of WATERMARK_PRESETS) {
        expect(preset.id).toBeDefined();
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.badge.length).toBeGreaterThan(0);
        expect(preset.description.length).toBeGreaterThan(0);

        // Apply preset to default config
        const merged: WatermarkFullConfig = {
          ...DEFAULT_WATERMARK_CONFIG,
          text: preset.config.text
            ? { ...DEFAULT_WATERMARK_CONFIG.text, ...preset.config.text }
            : DEFAULT_WATERMARK_CONFIG.text,
          logo: preset.config.logo
            ? { ...DEFAULT_WATERMARK_CONFIG.logo, ...preset.config.logo }
            : DEFAULT_WATERMARK_CONFIG.logo,
          frame: preset.config.frame
            ? { ...DEFAULT_WATERMARK_CONFIG.frame, ...preset.config.frame }
            : DEFAULT_WATERMARK_CONFIG.frame,
        };

        expect(merged.text.fontSize).toBeGreaterThan(0);
        expect(merged.text.opacity).toBeGreaterThan(0);
        expect(merged.text.position.grid).toBeDefined();
      }
    });

    it("should verify correct batch queue activeIndex clamping logic on item removal", () => {
      const testItems = [
        { id: "item-0", name: "photo1.jpg" },
        { id: "item-1", name: "photo2.jpg" },
        { id: "item-2", name: "photo3.jpg" },
        { id: "item-3", name: "photo4.jpg" },
      ];

      // Helper simulating the fixed handleRemoveItem activeIndex calculator
      const calcNewActiveIndex = (
        prevList: typeof testItems,
        removeId: string,
        currentActive: number
      ) => {
        const removeIndex = prevList.findIndex((item) => item.id === removeId);
        if (removeIndex === -1) return currentActive;
        const nextLength = prevList.length - 1;
        if (nextLength === 0) return 0;
        if (removeIndex < currentActive) return currentActive - 1;
        if (removeIndex === currentActive) return Math.min(currentActive, nextLength - 1);
        return currentActive;
      };

      // Scenario A: User is viewing item-2 (idx 2) and removes item-0 (before current)
      expect(calcNewActiveIndex(testItems, "item-0", 2)).toBe(1);

      // Scenario B: User is viewing item-1 (idx 1) and removes item-3 (after current)
      expect(calcNewActiveIndex(testItems, "item-3", 1)).toBe(1);

      // Scenario C: User is viewing last item-3 (idx 3) and removes item-3 (current active)
      expect(calcNewActiveIndex(testItems, "item-3", 3)).toBe(2);

      // Scenario D: User is viewing single remaining item and removes it
      expect(calcNewActiveIndex([{ id: "only", name: "1.jpg" }], "only", 0)).toBe(0);
    });
  });

  describe("E2E Studio Dictionary & Localization Parity", () => {
    it("should ensure identical structural parity for studio translations between id and en", async () => {
      const idDict = await getDictionary("id");
      const enDict = await getDictionary("en");

      expect(idDict.common.appName).toBe(enDict.common.appName);
      expect(idDict.studio.title).toBeDefined();
      expect(enDict.studio.title).toBeDefined();

      // Verify studio tab translations exist in both locales
      const tabs = ["text", "logo", "frame", "presets"] as const;
      for (const tab of tabs) {
        expect(idDict.studio.tabs[tab]).toBeDefined();
        expect(enDict.studio.tabs[tab]).toBeDefined();
      }

      // Verify 9-grid position labels exist in both locales
      const gridKeys = [
        "topLeft",
        "topCenter",
        "topRight",
        "middleLeft",
        "center",
        "middleRight",
        "bottomLeft",
        "bottomCenter",
        "bottomRight",
      ] as const;
      for (const key of gridKeys) {
        expect(idDict.studio.position[key]).toBeDefined();
        expect(enDict.studio.position[key]).toBeDefined();
      }
    });
  });
});
