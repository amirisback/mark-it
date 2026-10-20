# TASK-002: Theme Switcher and Asset Quality Preservation (Image & Video) - Product Requirement Document (PRD)

> **Author:** Faisal (Product Manager & Business Analyst)  
> **Status:** ALIGNED  
> **Date:** 2026-10-21  
> **Feature Slug:** `theme-switcher-asset-preservation`  
> **Registry:** [workflow/INDEX.md](file:///d:/Project/mark-it/workflow/INDEX.md)

---

## 1. Business Objective & Context

### 1.1 Problem Statement
MarkIt Studio currently has two critical product gaps that hinder user experience and output professionality:
1. **Hidden Theme Switcher in Navigation:** Although `next-themes` and `ThemeSwitcher` exist in the codebase, the switcher was suppressed in `src/components/layout/header.tsx` due to initial layout guards. Users cannot toggle between Light, Dark, and System modes from the primary navigation bar or mobile drawer, leaving late-night creators stuck in default system mode.
2. **Asset Degradation on Watermarked Exports (Image & Video):** When users watermark high-resolution images or videos, the output suffers from noticeable quality loss:
   - **Canvas 2D Image Smoothing Reset:** In `src/lib/watermark-engine.ts`, resizing `canvas.width` and `canvas.height` automatically resets canvas context properties. The context omits `ctx.imageSmoothingQuality = 'high'`, resulting in default bilinear interpolation that softens high-resolution photography and pixelates scaled vector logos.
   - **Fixed Low Video Bitrate:** The video export pipeline uses a hardcoded 8 Mbps bitrate (`videoBitsPerSecond: 8_000_000`) for all video resolutions. While adequate for 720p, this causes compression artifacts and macroblocking on 1080p and 4K footage. Furthermore, `audioBitsPerSecond` is left undefined, risking low audio fidelity.
   - **Video Frame Jitter & Dropped Frames:** The video export loop relies on `requestAnimationFrame` while playing the video element. Under system load or frame drops, frames are skipped or duplicated, degrading output smoothness.
   - **Video Snapshot Resolution Loss:** Capturing a single video frame reads directly from the on-screen preview canvas, which may be scaled or constrained by client viewport dimensions rather than extracting the unscaled native video frame.

### 1.2 User Personas
- **Photographers & Visual Artists:** Exporting 24MP+ images who require pixel-perfect clarity, crisp logo rendering, and lossless preservation without downsampling or blurriness.
- **Videographers & Social Media Creators:** Exporting 1080p/4K reels who require high bitrate encoding, crystal-clear 256kbps audio, and frame-accurate watermark stamping without skipped frames.
- **Night-time & Studio Creators:** Users working in low-light environments who need an accessible, immediate theme toggle directly in the header and mobile navigation without Flash of Unstyled Content (FOUC).

### 1.3 Success & Impact Metrics
- **Zero FOUC:** 100% clean theme transitions without layout shift or hydration mismatch errors.
- **Image Pixel Fidelity:** 1:1 native resolution maintained on all exports, with `imageSmoothingQuality = 'high'` enabled across all canvas contexts.
- **Adaptive Video Bitrate:** Automatic bitrate scaling matching source media resolution (e.g. 8 Mbps for 720p, 16 Mbps for 1080p, 35+ Mbps for 1440p/4K) and high-fidelity audio encoding at 256 kbps.
- **Frame Accuracy:** Zero dropped frames during video exports when using `requestVideoFrameCallback`.
- **Snapshot Integrity:** Video frame snapshots rendered from dedicated offscreen canvas at native `videoWidth` x `videoHeight`.

---

## 2. Scope & Boundaries

### 2.1 In Scope
1. **Accessible Theme Switcher in Header & Drawer:**
   - Integrate `ThemeSwitcher` into `src/components/layout/header.tsx` for desktop viewports.
   - Integrate `ThemeSwitcher` into the mobile drawer menu with touch-friendly targets.
   - Full hydration safety using `useSyncExternalStore` to eliminate FOUC.
   - Accessible keyboard controls and ARIA labels for Light, Dark, and System modes.
2. **Canvas 2D Pristine Smoothing & 1:1 Native Resolution:**
   - Enforce `ctx.imageSmoothingEnabled = true` and `ctx.imageSmoothingQuality = 'high'` immediately following every canvas dimension assignment.
   - Maintain 1:1 native source dimensions for both image and video canvas operations.
   - Ensure logo drawing uses high-quality bicubic/lanczos scaling filters to prevent jagged edges.
3. **Adaptive Video & Audio Bitrate Preservation:**
   - Dynamic video bitrate calculation based on pixel resolution and frame rate:
     - 720p (up to 1280x720): 8 Mbps.
     - 1080p (up to 1920x1080): 16 Mbps.
     - 1440p (up to 2560x1440): 28 Mbps.
     - 4K (3840x2160 and above): 45 Mbps.
   - Explicit `audioBitsPerSecond: 256_000` to preserve source audio fidelity.
   - Configurable export quality profile in `ExportSettings` (Optimal, High-Fidelity, Maximum Pristine).
4. **Video Frame Precision via `requestVideoFrameCallback`:**
   - Utilize `videoElement.requestVideoFrameCallback` to synchronize canvas drawing strictly with newly decoded video frames.
   - Graceful fallback to `requestAnimationFrame` for browsers lacking `requestVideoFrameCallback`.
5. **Image Quality Control & Lossless Preservation:**
   - Provide explicit quality presets for JPEG and WebP: 100% (Maksimal/Pristine), 95% (Studio High-Fidelity), 85% (Optimal Web).
   - Enforce lossless PNG export defaults.
   - Isolate video single-frame snapshot generation to a dedicated offscreen canvas at full native resolution (`video.videoWidth` x `video.videoHeight`).

### 2.2 Out of Scope (YAGNI & Ponytail)
- **Arbitrary Custom Theme Color Pickers:** No user-defined hex themes or runtime theme editors. The system strictly adheres to semantic Tailwind tokens (Light / Dark / System).
- **Client-Side Heavy WebAssembly / FFmpeg Transcoding:** No external multi-megabyte WASM binaries. Video processing remains lightweight and native using `MediaRecorder` and `CanvasRenderingContext2D`.
- **Destructive Image Manipulation:** No sharpening filters, noise reduction, or color grading. The engine focuses exclusively on pristine media pass-through and watermark stamping.

---

## 3. Acceptance Criteria Matrix (BDD / Gherkin)

### AC-01: Theme Switcher in Header and Drawer with Zero FOUC & Accessibility
```gherkin
Scenario: Desktop user changes theme from Header
  Given a user visits MarkIt Studio on a desktop viewport
  When the user views the header navigation bar
  Then the ThemeSwitcher is visible with Light, Dark, and System options
  When the user clicks the "Dark" option
  Then the html document root gains the "dark" class immediately without page reload
  And all UI components update their semantic colors according to Tailwind dark tokens
  And no flash of unstyled content (FOUC) occurs

Scenario: Mobile user changes theme from Mobile Drawer
  Given a user visits MarkIt Studio on a mobile viewport
  When the user taps the mobile menu toggle button
  Then the drawer opens and displays the ThemeSwitcher
  When the user taps the "Light" option
  Then the theme switches to light mode and persists in browser localStorage
```

### AC-02: Canvas 2D Pristine Image Smoothing and 1:1 Native Resolution
```gherkin
Scenario: Rendering high-resolution photo with high-quality smoothing
  Given a user uploads an image with native dimensions 4000x3000 pixels
  When the canvas watermark engine renders the preview or export
  Then the canvas internal buffer is allocated at exactly 4000x3000 pixels
  And ctx.imageSmoothingEnabled is set to true
  And ctx.imageSmoothingQuality is explicitly set to 'high'
  And downscaled logo watermarks render without jagged edges or pixelation
```

### AC-03: Video Bitrate and Audio Quality Preservation with Adaptive Bitrates
```gherkin
Scenario: Exporting 1080p video with adaptive high-definition bitrate
  Given a user has loaded a 1080p (1920x1080) video with audio
  When the user triggers full video export
  Then the engine calculates an adaptive video bitrate of at least 16,000,000 bps (16 Mbps)
  And sets audioBitsPerSecond to 256,000 bps
  And initializes MediaRecorder with the calculated bitrate parameters
  And the exported video file preserves crisp high-frequency details and uncompressed audio fidelity
```

### AC-04: Video Frame Precision via requestVideoFrameCallback
```gherkin
Scenario: Frame-synchronized video watermark recording
  Given a user exports a full video in a modern browser supporting requestVideoFrameCallback
  When the video element begins rendering frames onto the offscreen canvas
  Then each frame draw is triggered by videoElement.requestVideoFrameCallback
  And no duplicate or skipped frames occur due to animation loop jitter
  And progress updates reflect exact video presentation timestamps

Scenario: Fallback for browsers without requestVideoFrameCallback
  Given a browser environment where requestVideoFrameCallback is undefined
  When full video export is initiated
  Then the engine gracefully falls back to requestAnimationFrame
  And completes the video export without runtime exceptions
```

### AC-05: Image Quality Control and Lossless Preservation
```gherkin
Scenario: Exporting single frame snapshot from video at full native resolution
  Given a user pauses a 4K (3840x2160) video at timestamp 00:05
  And selects "Frame Tertentu (.png/.jpg)" with PNG format
  When the user clicks "Unduh File Ini"
  Then the engine draws the frame onto a dedicated offscreen canvas at 3840x2160 pixels
  And exports a lossless PNG file without reading from downscaled on-screen preview elements
  And the downloaded image has exact dimensions of 3840x2160 pixels
```

---

## 4. Contract Freeze Specifications

### 4.1 Data Models & Types (`src/types/watermark.ts`)

```typescript
// Extended Quality Profiles
export type VideoQualityProfile = 'optimal' | 'high' | 'maximum';

export type ImageQualityPresetValue = 1.0 | 0.95 | 0.85 | 0.70;

export interface ImageQualityOption {
  label: string;
  value: ImageQualityPresetValue;
  description: string;
}

export interface VideoBitrateConfig {
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
}

// Updated ExportSettings with Bitrate & Quality controls
export interface ExportSettings {
  format: ExportFormat;
  videoFormat: VideoContainerFormat;
  videoMode: VideoExportMode;
  videoQualityProfile: VideoQualityProfile;
  quality: number; // 0.1 to 1.0 (1.0 for pristine / lossless)
  customPrefix: string;
}
```

### 4.2 Engine Function Signatures (`src/lib/watermark-engine.ts`)

```typescript
/**
 * Calculate adaptive bitrates based on source resolution, frame rate, and quality profile
 */
export function calculateAdaptiveVideoBitrate(
  width: number,
  height: number,
  fps?: number,
  profile?: VideoQualityProfile
): VideoBitrateConfig;

/**
 * Configure high-quality 2D context smoothing parameters
 */
export function applyPristineCanvasSmoothing(ctx: CanvasRenderingContext2D): void;

/**
 * Render dedicated native-resolution snapshot from video element
 */
export interface VideoSnapshotOptions {
  videoElement: HTMLVideoElement;
  sourceWidth: number;
  sourceHeight: number;
  config: WatermarkFullConfig;
  logoImg?: HTMLImageElement | null;
  format: ExportFormat;
  quality: number;
}

export function exportNativeVideoSnapshotAsync(
  options: VideoSnapshotOptions
): Promise<Blob>;

/**
 * Updated exportWatermarkedVideoAsync supporting adaptive bitrates and requestVideoFrameCallback
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
  qualityProfile?: VideoQualityProfile;
  onProgress?: (progress: { percent: number; currentTime: number; totalTime: number }) => void;
  signal?: AbortSignal;
}

export function exportWatermarkedVideoAsync(
  options: VideoExportOptions
): Promise<Blob>;
```

---

## 5. Cross-Role Alignment Log

| Role | Domain / Concern | Binding Decision |
|---|---|---|
| **Faisal (PM)** | Scope discipline, ponytail/YAGNI, and anti-slop guidelines. | Restrict quality options to 3 clear presets (100% Maksimal, 95% Studio, 85% Optimal). Strictly reject multi-pass filters or external WASM dependencies. |
| **Angel (UI/UX)** | Theme switcher placement, mobile menu ergonomics, and ExportBar quality density. | Place ThemeSwitcher in desktop header right next to "Buka Studio". In mobile drawer, place ThemeSwitcher above the primary CTA button. Update ExportBar quality dropdown with clear quality labels. |
| **Fiqry (Frontend Web)** | Canvas context state preservation and hydration safety. | Create `applyPristineCanvasSmoothing(ctx)` helper called immediately after `canvas.width = ...` to prevent context reset regressions. Use `useSyncExternalStore` in `ThemeSwitcher` to prevent FOUC. |
| **Sandra (QA)** | Bitrate compatibility and `requestVideoFrameCallback` fallback testing. | Ensure `calculateAdaptiveVideoBitrate` caps bitrate at browser-supported maximums (e.g. 50 Mbps max). Include cross-browser test scenarios for Chromium (native rVFC) and Firefox/Safari (rAF fallback). |

---

## 6. Execution Tracks (Fork-Join Concurrency)

- **Track A (UI/UX & Components - Angel / Fiqry):**
  - Expose `ThemeSwitcher` in `src/components/layout/header.tsx` for desktop and mobile drawer.
  - Update `src/components/studio/export-bar.tsx` with video quality profile selector and 100% pristine image quality preset.
  - Deliver `workflow/TASK-002-theme-switcher-asset-preservation/02_design_angel.md`.
- **Track B (Core Engine & Quality - Bryan / Fiqry):**
  - Update `src/types/watermark.ts` with `VideoQualityProfile` and updated `ExportSettings`.
  - Refactor `src/lib/watermark-engine.ts`:
    - Implement `applyPristineCanvasSmoothing` and enforce `imageSmoothingQuality = 'high'`.
    - Implement `calculateAdaptiveVideoBitrate` with resolution-based scaling and 256kbps audio.
    - Upgrade video recording loop to prioritize `requestVideoFrameCallback` with `requestAnimationFrame` fallback.
    - Implement `exportNativeVideoSnapshotAsync` for unscaled video frame downloads.
  - Update `src/components/studio/studio-workspace.tsx` to utilize native snapshot and adaptive bitrates.
  - Deliver `workflow/TASK-002-theme-switcher-asset-preservation/03_build_frontend.md`.
- **Track C (QA & Test Harness - Sandra):**
  - Verify AC-01 through AC-05.
  - Test theme switching without FOUC or console hydration errors.
  - Verify video bitrate output using browser media metrics.
  - Validate image and video snapshot dimensional accuracy (exact 1:1 pixel match).
  - Deliver `workflow/TASK-002-theme-switcher-asset-preservation/04_qa_sandra.md`.
