# TASK-001: Video Watermark, Expanded Font Family, and Font Size Fix - Product Requirement Document (PRD)

> **Author:** Faisal (Product Manager & Business Analyst)  
> **Status:** ALIGNED  
> **Date:** 2026-10-20  
> **Feature Slug:** `video-watermark-fonts-sizing`  
> **Registry:** [workflow/INDEX.md](file:///d:/Project/mark-it/workflow/INDEX.md)

---

## 1. Business Objective & Context

### 1.1 Problem Statement
MarkIt Studio currently offers watermark overlays on images and single-frame video snapshots. Content creators and social media teams face three critical limitations:
1. **No Full Video Watermark Export:** Uploaded videos can only be downloaded as a single still frame (.png/.jpg). Users cannot export the entire video with a watermark applied across all frames, nor can they preserve original video audio.
2. **Broken Canvas Font Rendering:** In `src/lib/watermark-engine.ts`, font definitions pass CSS variables directly (such as `var(--font-geist-sans)`). Standard HTML5 Canvas 2D (`CanvasRenderingContext2D.font`) rejects CSS custom property strings, causing canvas to silently fallback to browser default serif/sans-serif. Available fonts are also restricted to five generic choices.
3. **Unpredictable Font Sizing:** Watermark text scaling relies on an arbitrary multiplier (`minDim * 1.6 * (fontSize / 100)`), making visual size unpredictable between small resolutions (720p) and ultra-high resolutions (4K). Users lack direct numeric inputs and quick presets for rapid editing.

### 1.2 User Persona
- **Digital Content Creators & Videographers:** Need to protect short-form video reels, promotional clips, and photography catalogs with professional watermarks before publishing.
- **Brand Managers & Marketing Agencies:** Need exact font typography matching brand guidelines (Modern Sans, Serif, Display, Script, Monospace) and consistent relative watermark sizing across multi-resolution assets.

### 1.3 Success & Impact Metrics
- **Video Export Completion Rate:** 100% of supported videos (WebM/MP4, up to 1080p 60s) render and export directly in-browser without server roundtrips.
- **Audio Integrity:** Audio tracks in source video files are captured and preserved in the exported video output.
- **Canvas Font Accuracy:** Zero silent fallbacks to browser default fonts when selecting custom font families.
- **Sizing Predictability:** Text height strictly matches specified percentage of media bounding dimension without hidden multipliers.

---

## 2. Scope & Boundaries

### 2.1 In Scope
1. **Full Video Watermark Export Engine:**
   - In-browser rendering pipeline using HTML5 Canvas, `captureStream()`, and `MediaRecorder`.
   - Audio track synchronization using `AudioContext` and `MediaStreamDestination` or stream track bridging.
   - Container support: WebM (`video/webm;codecs=vp9,opus` or `vp8,opus`) and MP4 (`video/mp4;codecs=avc1,mp4a` where supported by browser).
   - Export mode selection in `ExportBar`: "Video Utuh (.mp4/.webm)" versus "Frame Tertentu (.png/.jpg)".
2. **Video Progress & Cancellation:**
   - Real-time progress bar showing completion percentage (0% to 100%) and estimated/elapsed processing time.
   - Cancel button to abort rendering immediately, terminate `MediaRecorder`, release memory, and revoke temporary streams.
3. **Studio Player Enhancements:**
   - Media controls bar: Play/Pause toggle, interactive timeline seek scrubber, volume slider, mute toggle, and timestamp indicator (`mm:ss / mm:ss`).
4. **Font Family Expansion & Canvas 2D Fix:**
   - Removal of CSS variables in canvas font strings; direct assignment of resolved font families.
   - Integration of curated Google Fonts across five distinct categories:
     - Modern Sans: Inter, Roboto, Montserrat.
     - Serif: Playfair Display, Merriweather.
     - Display / Bold: Bebas Neue, Oswald.
     - Handwritten / Script: Caveat, Dancing Script.
     - Monospace: JetBrains Mono, Geist Mono.
   - Pre-render font readiness validation using `document.fonts.load()` to prevent layout shifts or unstyled font rendering.
5. **Linear Font Sizing System:**
   - Removal of arbitrary multipliers (`* 1.6`). Exact calculation: `fontSizePx = Math.round((fontSizePercent / 100) * minDim)`.
   - Percentage range from 0.5% to 30.0% with 0.1% step resolution.
   - Dual-input controls: smooth slider plus direct numeric input field.
   - Five one-click quick presets: Kecil (2.0%), Sedang (4.5%), Besar (8.0%), Ekstra (12.0%), Jumbo (18.0%).

### 2.2 Out of Scope (YAGNI & Ponytail)
- **Server-Side Video Transcoding:** No FFmpeg backend, cloud processing, or remote GPU instances. All operations remain 100% client-side for privacy and zero operational server costs.
- **Multi-Track Non-Linear Video Editing:** No cutting, splicing, speed ramping, transitions, or B-roll layering. The tool remains strictly a watermark stamper.
- **Custom Local Font Upload (.ttf/.woff2):** User-uploaded font files are deferred to future tasks to keep bundle complexity low.
- **Multi-Watermark Layer Timeline:** No keyframe animation or moving watermarks across video timelines. Watermarks maintain static position throughout the video duration.

---

## 3. Acceptance Criteria Matrix (BDD / Gherkin)

### AC-01: Full Video Watermark Rendering and Format Selection
```gherkin
Scenario: Exporting full video with watermark and audio preservation
  Given a user has loaded a valid video file with audio in MarkIt Studio
  And the user has configured an active text or logo watermark
  When the user selects "Video Utuh (.mp4/.webm)" in the ExportBar
  And clicks "Unduh File Ini"
  Then the system plays through the video frames onto an offscreen canvas
  And records the canvas video stream alongside original audio tracks via MediaRecorder
  And triggers a browser download with filename prefix and correct video container extension
  And the downloaded video contains both the watermark overlay and the synchronized audio track
```

```gherkin
Scenario: Fallback export for single video frame
  Given a user has paused a video at timestamp "00:04"
  When the user selects "Frame Tertentu (.png/.jpg)" in the ExportBar
  And clicks "Unduh File Ini"
  Then the system exports only the paused frame as a static image
  And does not invoke MediaRecorder
```

### AC-02: Export Progress Tracking and Graceful Cancellation
```gherkin
Scenario: Tracking real-time video export progress
  Given a video export process is currently running
  When frames are being captured and encoded sequentially
  Then the ExportBar displays an animated progress indicator with current percentage (e.g. "42%")
  And displays elapsed time and estimated remaining time
  And disables conflicting batch action buttons during processing
```

```gherkin
Scenario: Cancelling active video export
  Given a video export process is currently in progress
  When the user clicks the "Batal" button on the progress indicator
  Then the system halts the MediaRecorder stream immediately
  And pauses video frame reading
  And cleans up active stream tracks and blob references
  And restores the ExportBar to its ready state without file download or page crash
```

### AC-03: Studio Video Player Controls and Timeline Scrubbing
```gherkin
Scenario: Interactive video preview and scrubber
  Given a video media item is selected in the BatchTray
  When the user views the CanvasViewer
  Then the player shows Play/Pause button, timeline scrubber, mute toggle, volume slider, and time label (00:00 / 00:00)
  When the user drags the timeline scrubber to a new timestamp
  Then the canvas immediately updates and renders the watermark on the target video frame
  When the user plays the video
  Then the canvas updates continuously in sync with video playback
```

### AC-04: Curated Font Families and Canvas 2D Evaluation
```gherkin
Scenario: Rendering curated font family without silent fallback
  Given the user opens the InspectorPanel under the "Teks" tab
  When the user selects any curated font family (e.g., "Playfair Display", "Caveat", "Bebas Neue")
  Then the system loads the font face via document.fonts
  And passes the concrete font name string (e.g., '600 36px "Playfair Display", serif') to canvas context
  And the canvas renders the exact selected typography without falling back to system generic fonts
  And no raw CSS variable strings "var(--font-...)" are passed to ctx.font
```

### AC-05: Linear Font Sizing and Quick Preset Scale
```gherkin
Scenario: Adjusting font size via presets and direct numeric input
  Given the user has enabled text watermark on a media asset with minDim 1000px
  When the user clicks the preset button "Sedang (4.5%)"
  Then the font size input updates to 4.5%
  And the computed canvas font size is exactly 45px
  When the user enters "12.0" directly into the numeric percentage input
  Then the slider position reflects 12.0%
  And the computed canvas font size updates to 120px
  And watermark text remains proportional when switching between 720p and 4K assets
```

---

## 4. Contract Freeze Specifications

### 4.1 Data Models & Types (`src/types/watermark.ts`)

```typescript
// Extended Export Types
export type VideoExportMode = 'full_video' | 'single_frame';
export type VideoContainerFormat = 'video/webm' | 'video/mp4';
export type ExportOutputFormat = ExportFormat | VideoContainerFormat;

export interface ExportSettings {
  format: ExportFormat;
  videoFormat: VideoContainerFormat;
  videoMode: VideoExportMode;
  quality: number; // 0.1 to 1.0
  customPrefix: string;
}

// Curated Font Definition
export type FontCategory = 'modern-sans' | 'serif' | 'display' | 'script' | 'monospace';

export interface FontFamilyOption {
  id: string;
  name: string;
  category: FontCategory;
  family: string; // Concrete CSS font family string, e.g. '"Playfair Display", serif'
  googleFontName?: string;
  sampleText?: string;
}

// Font Size Preset
export interface FontSizePreset {
  id: string;
  label: string;
  value: number; // Percentage 0.5 to 30.0
}
```

### 4.2 Engine Function Signatures (`src/lib/watermark-engine.ts`)

```typescript
/**
 * Render single frame with exact linear font sizing
 */
export function computeFontSizePixels(fontSizePercent: number, minDimension: number): number;

/**
 * Ensure font family is loaded before canvas rendering
 */
export function ensureFontLoadedAsync(fontFamily: string, testText?: string): Promise<boolean>;

/**
 * Export full video with watermark and audio
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
| **Sandra (QA)** | Browser support matrix for `MediaRecorder` video codecs and memory leaks during 4K video exports. | Standardize default codec detection to VP9/VP8 WebM, with fallback to MP4 AVC1. Enforce max video duration guard (default warning at > 120s) and cancellation cleanup in test suite (`04_qa_sandra.md`). |
| **Bryan (Backend / DevOps)** | Server load and transcoding API dependencies. | Strictly zero server-side dependencies. All rendering runs in browser client threads (`MediaRecorder` + Web Audio API). Client-side rate limiting and error bounds prevent tab freezes. |
| **Angel (UI/UX)** | Player control density, font picker hierarchy, and mobile responsive controls. | Group fonts into categorical dropdown optgroups with visual typography badges. Place video scrubber neatly below canvas viewport. Implement 5 discrete pill presets for font size. |
| **Fiqry (Frontend Web)** | Font loading race conditions causing canvas to draw fallback fonts before web font loads. | Utilize `document.fonts.load()` with fallback timeout before initial canvas paint. Store concrete font family string in state instead of CSS variables. |

---

## 6. Execution Tracks (Fork-Join Concurrency)

- **Track A (UI/UX & Components - Angel / Fiqry):**
  - Update `InspectorPanel`: font selector with categories, linear font size slider + numeric input + 5 presets.
  - Update `CanvasViewer`: video audio controls, volume slider, mute button, playhead timestamp.
  - Update `ExportBar`: toggle for "Video Utuh" vs "Frame Tertentu", progress bar with percentage, time counter, and cancel button.
- **Track B (Core Engine & Processing - Bryan / Fiqry):**
  - Update `src/lib/watermark-engine.ts`:
    - Fix `drawWatermarkOnCanvas` font string resolution and remove `* 1.6` multiplier.
    - Implement `exportWatermarkedVideoAsync` with `canvas.captureStream()`, `MediaRecorder`, and audio destination merging.
    - Add font loader utility `ensureFontLoadedAsync`.
  - Update `src/data/fonts.ts` and `src/app/layout.tsx` for font imports.
- **Track C (QA & Test Harness - Sandra):**
  - Verify AC-01 through AC-05 with test cases.
  - Test browser compatibility for WebM and MP4 recordings.
  - Verify font fallback resilience and cancellation behavior under heavy workloads.
