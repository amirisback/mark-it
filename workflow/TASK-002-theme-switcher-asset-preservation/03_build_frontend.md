# TASK-002: Theme Switcher and Asset Quality Preservation — Frontend Build Document

> **Author:** Fiqry (Senior Frontend Web Developer, Tim FE)  
> **Status:** COMPLETED / READY FOR QA  
> **Date:** 2026-10-21  
> **Feature Slug:** `theme-switcher-asset-preservation`  
> **PRD Source:** [01_prd_faisal.md](file:///d:/Project/mark-it/workflow/TASK-002-theme-switcher-asset-preservation/01_prd_faisal.md)  
> **Design Spec:** [02_design_angel.md](file:///d:/Project/mark-it/workflow/TASK-002-theme-switcher-asset-preservation/02_design_angel.md)  
> **Registry:** [workflow/INDEX.md](file:///d:/Project/mark-it/workflow/INDEX.md)

---

## 1. Executive Summary

TASK-002 addresses two high-impact functional and perceptual gaps in MarkIt Studio:
1. **Accessible Theme Switcher Integration:** Replaces legacy emojis (`☀️`, `🌙`, `💻`) with geometric SVG icons (`strokeWidth={1.8}`), adds full WAI-ARIA `radiogroup` compliance with keyboard arrow traversal, eliminates FOUC/CLS via `useSyncExternalStore`, and exposes compact and expanded variants in desktop header and mobile drawer.
2. **Asset Quality Preservation (Image & Video):**
   - **Canvas 2D Smoothing:** Fixes Canvas context resets by applying `ctx.imageSmoothingEnabled = true` and `ctx.imageSmoothingQuality = 'high'` immediately after every canvas dimension resize.
   - **Adaptive Video Bitrate:** Replaces the fixed 8 Mbps choke with an adaptive bitrate calculator scaling from 8 Mbps (720p) up to 45 Mbps (4K UHD) with studio-grade 256kbps audio.
   - **Frame-Accurate Recording:** Upgrades the video export loop to utilize `HTMLVideoElement.requestVideoFrameCallback` when available with `requestAnimationFrame` fallback.
   - **Pristine Single Frame Capture:** Extracts native-resolution video frames directly from offscreen canvas at full `videoWidth` x `videoHeight`, eliminating preview canvas downscaling.

---

## 2. Modified & Created Files

| File | Type | Changes Implemented |
|---|---|---|
| [`src/app/_components/theme-switcher.tsx`](file:///d:/Project/mark-it/src/app/_components/theme-switcher.tsx) | Component | Added modern SVG icons, `variant?: 'compact' \| 'expanded'`, WAI-ARIA `radiogroup`/`radio` attributes, keyboard navigation, and zero-FOUC skeleton placeholders. |
| [`src/components/layout/header.tsx`](file:///d:/Project/mark-it/src/components/layout/header.tsx) | Component | Mounted `<ThemeSwitcher variant="compact" />` in desktop header and `<ThemeSwitcher variant="expanded" />` in mobile drawer with 44px touch targets. |
| [`src/types/watermark.ts`](file:///d:/Project/mark-it/src/types/watermark.ts) | Types | Added `VideoQualityPreset`, `VideoQualityProfile`, `VideoBitrateConfig`, and updated `ExportSettings` with `videoQuality` and `videoQualityProfile`. |
| [`src/lib/watermark-engine.ts`](file:///d:/Project/mark-it/src/lib/watermark-engine.ts) | Core Engine | Implemented `applyPristineCanvasSmoothing`, `computeAdaptiveVideoBitrate`, `calculateAdaptiveVideoBitrate`, `captureNativeVideoFrameAsync`, `exportNativeVideoSnapshotAsync`, and upgraded `exportWatermarkedVideoAsync` with RVFC and 256kbps audio. |
| [`src/components/studio/export-bar.tsx`](file:///d:/Project/mark-it/src/components/studio/export-bar.tsx) | Component | Added Video Quality Profile selector, real-time Dynamic Bitrate & Resolution badge, PNG Lossless badge, updated 4-level image quality selector, and native snapshot badge. |
| [`src/components/studio/studio-workspace.tsx`](file:///d:/Project/mark-it/src/components/studio/studio-workspace.tsx) | Component | Updated default `exportSettings` (quality `0.95`, videoQuality `'maximum'`), wired native video frame capture in single & batch exports, and passed source dimensions to `ExportBar`. |
| [`src/components/studio/canvas-viewer.tsx`](file:///d:/Project/mark-it/src/components/studio/canvas-viewer.tsx) | Component | Applied `applyPristineCanvasSmoothing` on original media toggle viewports. |

---

## 3. Technical Implementation Details

### 3.1 Theme Switcher (`src/app/_components/theme-switcher.tsx`)
- **Modern SVG Icons:** Clean vector strokes (`strokeWidth={1.8}`) using `currentColor`:
  - `Sun`: Light mode indicator.
  - `Moon`: Dark mode indicator.
  - `Monitor`: System preference indicator.
- **WAI-ARIA Accessibility:**
  - Container has `role="radiogroup"` with descriptive `aria-label="Pilihan tema tampilan"`.
  - Buttons have `role="radio"`, `aria-checked={isSelected}`, and dynamic `tabIndex={isSelected ? 0 : -1}`.
  - Keyboard roving navigation implemented via `onKeyDown` supporting <kbd>→</kbd> / <kbd>↓</kbd> (next) and <kbd>←</kbd> / <kbd>↑</kbd> (prev).
- **Zero FOUC / Zero CLS:**
  - `useSyncExternalStore` detects client mount without triggering layout shift or hydration mismatch.
  - Skeletons pre-allocated matching exact variant dimensions (`h-8.5 w-[148px]` for compact, `h-11 w-full` for expanded).
- **Responsive Variants:**
  - `compact`: Inline pill for desktop header (`h-8.5`, label visible on `lg:`).
  - `expanded`: Grid layout for mobile drawer with minimum 44px touch height (`min-h-[44px] h-11`).

### 3.2 Header Integration (`src/components/layout/header.tsx`)
- Desktop header displays `ThemeSwitcher` right before the "Buka Studio" CTA button.
- Mobile drawer displays a dedicated "Pilih Tema Tampilan" section header above the primary watermark CTA button.

### 3.3 Canvas 2D Smoothing Preservation (`src/lib/watermark-engine.ts`)
- Whenever `canvas.width` and `canvas.height` are set, the browser canvas automatically resets context properties to defaults.
- Added `applyPristineCanvasSmoothing(ctx: CanvasRenderingContext2D)`:
  ```typescript
  export function applyPristineCanvasSmoothing(ctx: CanvasRenderingContext2D): void {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  ```
- Called immediately after every canvas dimension change in `drawWatermarkOnCanvas` and `canvas-viewer.tsx`.
- Downscaled logos render with high-quality bicubic filtering without jagged artifacts.

### 3.4 Adaptive Video Bitrate Engine (`src/lib/watermark-engine.ts`)
- Added `computeAdaptiveVideoBitrate(width, height, fps, preset)` and `calculateAdaptiveVideoBitrate`:
  - **720p HD ($\le 1280 \times 720$):** 8 Mbps (Standard), 12 Mbps (High), 18 Mbps (Maximum).
  - **1080p FHD ($\le 1920 \times 1080$):** 12 Mbps (Standard), 16 Mbps (High), 28 Mbps (Maximum).
  - **1440p 2K ($\le 2560 \times 1440$):** 18 Mbps (Standard), 24 Mbps (High), 36 Mbps (Maximum).
  - **4K UHD ($> 2560 \times 1440$):** 24 Mbps (Standard), 35 Mbps (High), 45 Mbps (Maximum).
- Frame rate multiplier: scales up to 1.5x when `fps > 30` (capped at 50 Mbps browser limit).
- Studio Audio Bitrate: sets explicit `audioBitsPerSecond: 256_000` on `MediaRecorder`.

### 3.5 Video Frame Precision via `requestVideoFrameCallback`
- In `exportWatermarkedVideoAsync`:
  - Detects if `typeof videoElement.requestVideoFrameCallback === 'function'`.
  - When supported, schedules canvas drawing via `videoElement.requestVideoFrameCallback(renderLoop)`, eliminating frame duplication or jitter caused by `requestAnimationFrame` timing drift.
  - Seamlessly falls back to `requestAnimationFrame` on browsers without RVFC support.
  - Proper cancellation handles abort signals and video end events safely.

### 3.6 Pristine Native Video Frame Capture
- Added `captureNativeVideoFrameAsync(videoElement, config, logoImg, format, quality, sourceWidth, sourceHeight)`:
  - Allocates dedicated offscreen canvas at full `videoWidth` x `videoHeight`.
  - Preloads Google fonts if text watermark is enabled.
  - Draws frame and exports directly via `toBlob`, bypassing preview canvas downscaling.
  - Also exported as `exportNativeVideoSnapshotAsync` matching PRD contract.

### 3.7 UI Controls in `ExportBar` (`src/components/studio/export-bar.tsx`)
- **Video Full Mode:**
  - Added Video Quality Profile selector (`maximum`, `high`, `standard`).
  - Added real-time badge displaying resolution category, dimensions, computed Mbps, and 256kbps audio.
- **Single Frame Mode:**
  - Added "Snapshot Native" badge confirming unscaled resolution.
- **Image Mode:**
  - Displays "PNG Lossless (24-bit RGBA)" badge when PNG format is selected.
  - Displays 4-level quality selector (100% Maksimal, 95% Studio, 85% Web, 70% Kecil) for JPEG/WebP.

---

## 4. Verification & Validation Evidence

### 4.1 Lint Verification
Command executed:
```bash
bun run lint
```
Result:
```text
$ eslint
(exited with code 0, 0 errors, 0 warnings)
```

### 4.2 Production Build Verification
Command executed:
```bash
bun run build
```
Result:
```text
$ next build --webpack
▲ Next.js 16.3.6 (webpack)
- Environments: .env
✓ Running next.config.ts took 412ms
  Creating an optimized production build ...
✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'...
✓ Compiled successfully in 2.2s
  Running TypeScript ...
  Finished TypeScript in 2.2s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
✓ Generating static pages using 8 workers (7/7) in 680ms
  Finalizing page optimization ...
  Collecting build traces ...

Route (app)
┌ ƒ /
├ ƒ /_not-found
├ ○ /manifest.webmanifest
├ ○ /robots.txt
└ ○ /sitemap.xml

(exited with code 0)
```

### 4.3 Acceptance Criteria Alignment Matrix

| Criterion | Requirement | Verification Method | Status |
|---|---|---|---|
| **AC-01** | Theme Switcher in Header & Drawer with zero FOUC & WAI-ARIA | Verified `useSyncExternalStore`, SVGs, and radiogroup attributes. | PASS |
| **AC-02** | Canvas 2D imageSmoothingQuality = 'high' | Verified in `drawWatermarkOnCanvas` and `canvas-viewer.tsx`. | PASS |
| **AC-03** | Adaptive video bitrate & 256kbps audio | Verified `computeAdaptiveVideoBitrate` calculation & `MediaRecorder` options. | PASS |
| **AC-04** | Frame precision via `requestVideoFrameCallback` with rAF fallback | Implemented dual-path scheduling with robust cleanup. | PASS |
| **AC-05** | Lossless PNG defaults & native video frame snapshot | Wired offscreen canvas extraction at `videoWidth` x `videoHeight`. | PASS |

---

## 5. Next Steps

Hand off to **Sandra (QA)** for end-to-end browser verification:
- Test theme switcher in Chromium, Firefox, and Safari viewports.
- Validate video export bitrate on 1080p and 4K media.
- Deliver `workflow/TASK-002-theme-switcher-asset-preservation/04_qa_sandra.md`.
