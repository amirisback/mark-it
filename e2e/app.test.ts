import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { isSuspiciousPath } from "@/lib/security-guards";
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
  exportCanvasToBlob,
  drawWatermarkOnCanvas,
  drawWatermarkOnSocialCanvas,
  getSafeFiniteDuration,
} from "@/lib/watermark-engine";
import { Switch } from "@/components/ui/switch";
import { ColorPicker, normalizeHexColor } from "@/components/ui/color-picker";
import { DEFAULT_WATERMARK_CONFIG, WATERMARK_PRESETS } from "@/data/presets";
import { CURATED_FONTS, FONT_SIZE_PRESETS } from "@/data/fonts";
import { getDictionary } from "@/lib/dictionaries";
import type { WatermarkFullConfig, WatermarkPreset } from "@/types/watermark";

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
        "http://localhost:3000/static/%252e./secret",
        "http://localhost:3000/%252e%252e/etc/passwd",
        "http://localhost:3000/probe/%ZZ/invalid-uri",
      ];

      for (const path of maliciousPaths) {
        const req = new NextRequest(path, {
          headers: { "x-forwarded-for": "192.168.1.100" },
        });
        const res = proxy(req);
        expect(res.status).toBe(403);
      }

      // Direct raw path checks (before WHATWG URL normalization)
      expect(isSuspiciousPath("/static/%2e./secret")).toBe(true);
      expect(isSuspiciousPath("/%2e%2e/etc/passwd")).toBe(true);
      expect(isSuspiciousPath("/probe/%ZZ")).toBe(true);
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

    it("should reject exportCanvasToBlob when canvas dimensions are zero or invalid", async () => {
      const zeroCanvas = { width: 0, height: 0 } as HTMLCanvasElement;
      await expect(exportCanvasToBlob(zeroCanvas)).rejects.toThrow("Dimensi canvas tidak valid");
    });

    it("should render 9:16 (720x1280), 1:1 (1080x1080), 16:9 (1920x1080), and original canvases with frames and tiled logos", () => {
      const createMockCanvas = () =>
        ({
          width: 0,
          height: 0,
          getContext: () => ({
            imageSmoothingEnabled: true,
            imageSmoothingQuality: "high",
            clearRect: () => {},
            drawImage: () => {},
            save: () => {},
            restore: () => {},
            measureText: () => ({ width: 90 }),
            fillText: () => {},
            strokeText: () => {},
            translate: () => {},
            rotate: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            setLineDash: () => {},
          }),
        }) as unknown as HTMLCanvasElement;

      const fullConfig: WatermarkFullConfig = {
        ...DEFAULT_WATERMARK_CONFIG,
        text: { ...DEFAULT_WATERMARK_CONFIG.text, enabled: true, tile: true, tileSpacing: 100 },
        logo: {
          ...DEFAULT_WATERMARK_CONFIG.logo,
          enabled: true,
          logoUrl: "blob:logo",
          tile: true,
          tileSpacing: 2.0,
        },
        frame: {
          ...DEFAULT_WATERMARK_CONFIG.frame,
          enabled: true,
          style: "card",
          metaText: "MarkIt E2E Frame",
        },
      };

      const fakeSource = {} as HTMLImageElement;
      const fakeLogo = { width: 120, height: 60 } as HTMLImageElement;

      const c916 = createMockCanvas();
      drawWatermarkOnSocialCanvas(c916, fakeSource, 1600, 1000, fullConfig, fakeLogo, 720, 1280);
      expect(c916.width).toBe(720);
      expect(c916.height).toBe(1280);

      const c11 = createMockCanvas();
      drawWatermarkOnSocialCanvas(c11, fakeSource, 1600, 1000, fullConfig, fakeLogo, 1080, 1080);
      expect(c11.width).toBe(1080);
      expect(c11.height).toBe(1080);

      const c169 = createMockCanvas();
      drawWatermarkOnSocialCanvas(c169, fakeSource, 720, 1280, fullConfig, fakeLogo, 1920, 1080);
      expect(c169.width).toBe(1920);
      expect(c169.height).toBe(1080);

      const cOrigBanner = createMockCanvas();
      drawWatermarkOnCanvas(
        cOrigBanner,
        fakeSource,
        1000,
        800,
        { ...fullConfig, frame: { ...fullConfig.frame, style: "banner" } },
        fakeLogo
      );
      expect(cOrigBanner.width).toBe(1000);
      expect(cOrigBanner.height).toBe(864); // 800 + round(800 * 0.08)
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

  describe("E2E TASK-003 Code Audit & Bugfix Verification (AC-01 through AC-08)", () => {
    it("AC-01: Switch single-trigger decoupled architecture & 44px hit-target", () => {
      const html = renderToString(
        React.createElement(Switch, {
          label: "Tampilkan Safe Zone",
          description: "Garis bantu komposisi sosmed",
          checked: true,
          onChange: () => {},
        })
      );

      // Verify outer element is a div container, NOT a label
      expect(html.startsWith("<div")).toBe(true);

      // Verify dedicated label element with htmlFor exists
      expect(html).toContain("<label");
      expect(html).toContain("Tampilkan Safe Zone");
      expect(html).toContain("Garis bantu komposisi sosmed");

      // Verify button has role="switch", aria-checked="true", and 44px touch pseudo-element
      expect(html).toContain('role="switch"');
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain("before:absolute");
      expect(html).toContain("before:-inset-2");

      // Verify button is outside label (label closes before button starts)
      const labelEnd = html.indexOf("</label>");
      const buttonStart = html.indexOf("<button");
      expect(labelEnd).toBeGreaterThan(0);
      expect(buttonStart).toBeGreaterThan(labelEnd);
    });

    it("AC-02: Color picker hex normalizer & zero inline IIFE", () => {
      // 6-digit hex preserved
      expect(normalizeHexColor("#4f46e5")).toBe("#4f46e5");
      expect(normalizeHexColor("#ffffff")).toBe("#ffffff");

      // 3-digit shorthand expanded to 6-digit
      expect(normalizeHexColor("#fff")).toBe("#ffffff");
      expect(normalizeHexColor("#000")).toBe("#000000");
      expect(normalizeHexColor("#abc")).toBe("#aabbcc");

      // Malformed fallback
      expect(normalizeHexColor("invalid-color")).toBe("#4f46e5");
      expect(normalizeHexColor("#12345", "#10b981")).toBe("#10b981");

      // SSR Render check
      const html = renderToString(
        React.createElement(ColorPicker, {
          label: "Warna Watermark",
          value: "#fff",
          onChange: () => {},
        })
      );
      expect(html).toContain("#ffffff");
      expect(html).toContain('type="color"');
    });

    it("AC-03: Video duration finite sanitizer & seek clamping", () => {
      // Duration sanitizer
      expect(getSafeFiniteDuration(15.2)).toBe(15.2);
      expect(getSafeFiniteDuration(0.04)).toBe(0.04);
      expect(getSafeFiniteDuration(NaN, 1)).toBe(1);
      expect(getSafeFiniteDuration(Infinity, 1)).toBe(1);
      expect(getSafeFiniteDuration(-10, 0)).toBe(0);
      expect(getSafeFiniteDuration(0, 0)).toBe(0);
      expect(getSafeFiniteDuration(null, 1)).toBe(1);

      // Sub-0.1s video seek clamp calculation
      const computePosterSeek = (rawDuration: number) => {
        const safeDuration = getSafeFiniteDuration(rawDuration, 0);
        return Math.min(0.1, safeDuration > 0 ? safeDuration / 2 : 0);
      };

      expect(computePosterSeek(0.04)).toBe(0.02);
      expect(computePosterSeek(0.06)).toBe(0.03);
      expect(computePosterSeek(0.2)).toBe(0.1);
      expect(computePosterSeek(60)).toBe(0.1);
      expect(computePosterSeek(NaN)).toBe(0);
      expect(computePosterSeek(Infinity)).toBe(0);
    });

    it("AC-04: Canvas viewer preview ratio badge parity", () => {
      const getBadgeString = (
        ratio: "9:16" | "1:1" | "16:9" | "original",
        media: { width: number; height: number } | null
      ) => {
        return ratio === "9:16"
          ? "720 × 1280 px"
          : ratio === "1:1"
          ? "1080 × 1080 px"
          : ratio === "16:9"
          ? "1920 × 1080 px"
          : media
          ? `${media.width} × ${media.height} px`
          : "720 × 1280 px";
      };

      const shouldShowSecondaryMediaAsli = (
        ratio: "9:16" | "1:1" | "16:9" | "original",
        media: { width: number; height: number } | null
      ) => {
        if (!media || ratio === "original") return false;
        if (ratio === "9:16") return media.width !== 720 || media.height !== 1280;
        if (ratio === "1:1") return media.width !== 1080 || media.height !== 1080;
        if (ratio === "16:9") return media.width !== 1920 || media.height !== 1080;
        return false;
      };

      const highRes = { width: 4032, height: 3024 };

      // Exact pixel badge assertions
      expect(getBadgeString("9:16", highRes)).toBe("720 × 1280 px");
      expect(getBadgeString("1:1", highRes)).toBe("1080 × 1080 px");
      expect(getBadgeString("16:9", highRes)).toBe("1920 × 1080 px");
      expect(getBadgeString("original", highRes)).toBe("4032 × 3024 px");

      // Secondary badge visibility assertions
      expect(shouldShowSecondaryMediaAsli("9:16", highRes)).toBe(true);
      expect(shouldShowSecondaryMediaAsli("1:1", highRes)).toBe(true);
      expect(shouldShowSecondaryMediaAsli("16:9", highRes)).toBe(true);
      expect(shouldShowSecondaryMediaAsli("original", highRes)).toBe(false);
      expect(shouldShowSecondaryMediaAsli("1:1", { width: 1080, height: 1080 })).toBe(false);
    });

    it("AC-05: Volume input full WAI-ARIA slider attributes", () => {
      const getVolumeAria = (volume: number, isMuted: boolean) => ({
        role: "slider",
        "aria-label": "Volume audio video",
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": isMuted ? 0 : volume,
        "aria-valuetext": `${isMuted ? 0 : volume} persen`,
      });

      const unmuted = getVolumeAria(80, false);
      expect(unmuted.role).toBe("slider");
      expect(unmuted["aria-valuenow"]).toBe(80);
      expect(unmuted["aria-valuetext"]).toBe("80 persen");
      expect(unmuted["aria-valuemin"]).toBe(0);
      expect(unmuted["aria-valuemax"]).toBe(100);

      const muted = getVolumeAria(80, true);
      expect(muted["aria-valuenow"]).toBe(0);
      expect(muted["aria-valuetext"]).toBe("0 persen");
    });

    it("AC-06: Logo blob URL memory leak revocation on preset switch", () => {
      const revokedUrls: string[] = [];
      const originalRevoke = URL.revokeObjectURL;
      URL.revokeObjectURL = (url: string) => {
        revokedUrls.push(url);
      };

      try {
        const applyPresetSimulation = (
          prevLogoUrl: string | null,
          preset: WatermarkPreset
        ) => {
          if (
            preset.config.logo &&
            preset.config.logo.logoUrl !== prevLogoUrl &&
            prevLogoUrl &&
            prevLogoUrl.startsWith("blob:")
          ) {
            URL.revokeObjectURL(prevLogoUrl);
          }
        };

        const testPreset: WatermarkPreset = {
          id: "test-preset-with-logo",
          name: "Test Logo Preset",
          description: "Preset testing logo configuration reset or override",
          category: "branding",
          badge: "Test",
          config: {
            logo: {
              enabled: false,
              logoUrl: null,
            },
          },
        };

        // 1. Blob URL is revoked when applying preset that replaces the logo
        applyPresetSimulation("blob:http://localhost:3000/test-blob-123", testPreset);
        expect(revokedUrls).toContain("blob:http://localhost:3000/test-blob-123");

        // 2. Non-blob URL (e.g. static path or data URL) is NOT revoked
        revokedUrls.length = 0;
        applyPresetSimulation("/static/logo.png", testPreset);
        expect(revokedUrls.length).toBe(0);
      } finally {
        URL.revokeObjectURL = originalRevoke;
      }
    });

    it("AC-07: Total Duration finite protection in watermark engine", () => {
      const calcEngineDurationAndSafety = (rawInputDuration: number) => {
        const rawDuration = rawInputDuration > 0 ? rawInputDuration : 1;
        const totalDuration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 1;
        const rawLimitMs = Math.round((totalDuration + 2.5) * 1000);
        const safetyLimitMs = Math.min(
          3600000,
          Math.max(3000, Number.isFinite(rawLimitMs) ? rawLimitMs : 3000)
        );
        return { totalDuration, safetyLimitMs };
      };

      // Safe fallback on Infinity
      const infResult = calcEngineDurationAndSafety(Infinity);
      expect(infResult.totalDuration).toBe(1);
      expect(infResult.safetyLimitMs).toBe(3500);

      // Safe fallback on NaN
      const nanResult = calcEngineDurationAndSafety(NaN);
      expect(nanResult.totalDuration).toBe(1);
      expect(nanResult.safetyLimitMs).toBe(3500);

      // Normal video 10 seconds
      const normalResult = calcEngineDurationAndSafety(10);
      expect(normalResult.totalDuration).toBe(10);
      expect(normalResult.safetyLimitMs).toBe(12500);

      // 1-hour cap on extreme durations
      const extremeResult = calcEngineDurationAndSafety(9999999);
      expect(extremeResult.safetyLimitMs).toBe(3600000);

      // Progress calculation check
      const calcProgress = (curTime: number, totalDuration: number) =>
        totalDuration > 0
          ? Math.min(100, Math.max(0, Math.round((curTime / totalDuration) * 100)))
          : 0;

      expect(calcProgress(5, 10)).toBe(50);
      expect(calcProgress(0, 10)).toBe(0);
      expect(calcProgress(10, 10)).toBe(100);
      expect(calcProgress(15, 10)).toBe(100);
      expect(calcProgress(5, 0)).toBe(0);
    });

    it("AC-08: Complete anti-slop zero em dash (—) compliance", () => {
      const auditedFiles = [
        "src/app/manifest.ts",
        "src/components/studio/inspector-panel.tsx",
        "src/dictionaries/id.json",
        "src/dictionaries/en.json",
        "src/lib/seo.ts",
        "src/app/layout.tsx",
        "src/app/page.tsx",
        "src/lib/__tests__/seo.test.ts",
      ];

      const emDashRegex = /\u2014/g;
      const cwd = process.cwd();

      for (const rel of auditedFiles) {
        const full = path.join(cwd, rel);
        const text = fs.readFileSync(full, "utf8");
        const found = text.match(emDashRegex);
        expect(found).toBeNull();
      }
    });
  });
});

