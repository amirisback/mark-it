# TASK-003: Comprehensive Code Audit, Bug Fixes, Crash Prevention, and Quality Enhancements - Product Requirement Document (PRD)

> **Author:** Faisal (Product Manager & Business Analyst)  
> **Status:** FROZEN  
> **Date:** 2026-10-23  
> **Feature Slug:** `code-audit-bugfix-enhancement`  
> **Registry:** [workflow/INDEX.md](file:///d:/Project/mark-it/workflow/INDEX.md)

---

## 1. Executive Summary & Audit Scope

MarkIt Studio has reached core feature completeness across video watermark sizing, font typography, theme switching, and asset quality preservation (TASK-001 and TASK-002). A deep technical code audit across all studio components, canvas engines, and UI primitives identified several critical reliability bottlenecks, potential browser tab crashes, accessibility compliance gaps, and anti-slop copy violations.

This document sets the binding requirements for **TASK-003**, targeting zero-regression fixes, crash immunization, memory leak elimination, accessibility compliance, and strict code hygiene.

### 1.1 Audit Findings & Scope Breakdown

1. **Potential Bug: `Switch` Double-Trigger via Nested `<label htmlFor>` + `<button>`**
   - **Location:** `src/components/ui/switch.tsx` (Lines 22-49).
   - **Root Cause:** The component wraps an interactive `<button id={switchId}>` inside an outer `<label htmlFor={switchId}>`. In standard HTML event propagation, clicking the button triggers its own `onClick`, and then the event bubbles to the `<label>`, which synthesizes a second click event to the associated control (`switchId`). This causes double-firing of `onChange(!checked)` or instant reversal of toggle state.
   - **Impact:** Erroneous toggle states, flickering UI, or inability to toggle settings with a single click.

2. **Potential Bug: `CanvasViewer` Aspect Ratio Badge & Rendered Buffer Mismatch**
   - **Location:** `src/components/studio/canvas-viewer.tsx` (Lines 416-428 vs 102-145).
   - **Root Cause:** When `previewRatio === '1:1'`, `drawSourceByPreviewRatio` renders the canvas buffer to exactly `1080 × 1080 px`. However, the header badge calculates `${Math.min(activeItem.width, activeItem.height)} × ${Math.min(activeItem.width, activeItem.height)} px`. For `16:9`, `drawSourceByPreviewRatio` renders `1920 × 1080 px`, but the badge displays `${activeItem.width} × ${Math.round((activeItem.width * 9) / 16)} px`.
   - **Impact:** Misleading user indicators where the badge advertises source crop dimensions while the actual rendered output buffer is calibrated to fixed standard canvas dimensions (1080x1080 or 1920x1080).

3. **Potential Bug: Blob URL Memory Leak on Watermark Preset Changes**
   - **Location:** `src/components/studio/studio-workspace.tsx` (Lines 265-272) and `src/components/studio/inspector-panel.tsx`.
   - **Root Cause:** When a user uploads a custom logo, `URL.createObjectURL` generates a persistent object URL. When the user subsequently applies a preset (`handleApplyPreset`), `config.logo` is replaced by the preset's logo configuration without releasing the previous `prev.logo.logoUrl`.
   - **Impact:** Prolonged studio sessions accumulate uncollected Blob buffers in browser heap memory, causing memory bloat and potential mobile browser tab crashes.

4. **Potential Crash: Unhandled `NaN` / `Infinity` Video Durations**
   - **Location:** `src/components/studio/canvas-viewer.tsx`, `src/components/studio/studio-workspace.tsx`, and `src/lib/watermark-engine.ts`.
   - **Root Cause:** HTML5 video elements loading live streams, partially encoded WebM files, or recorded clips lacking duration headers return `Infinity` or `NaN` for `video.duration`. 
     - In `canvas-viewer.tsx`, `formatTime` returns `NaN:NaN`, and `<input max={Infinity}>` corrupts the scrubber track background gradient.
     - In `watermark-engine.ts` (Line 1039), `duration > 0 ? duration : videoElement.duration || 1` evaluates to `Infinity` when duration is `Infinity`. This results in `safetyLimitMs = Infinity`, breaking timeout limits and stalling progress calculations (`curTime / Infinity = 0`).
   - **Impact:** Infinite loading spinners, unhandled DOM exceptions, and frozen export bars.

5. **Potential Crash: Sub-0.1s Video Seek Crash on Poster Frame Initialization**
   - **Location:** `src/components/studio/canvas-viewer.tsx` (Line 272).
   - **Root Cause:** `handleLoadedVideoMetadata` executes hardcoded `video.currentTime = 0.1` to grab a poster frame. If a user uploads an ultra-short video or animated clip with total duration < 0.1s (e.g., 0.04s - 0.08s micro-clips), seeking to 0.1 exceeds the media duration, causing index errors or stalled decoding pipelines in Chromium/WebKit.
   - **Impact:** Failure to render initial video frame, broken scrubber controls, and uncaught browser media errors.

6. **Code Smell: Inline IIFE Regex in `ColorPicker`**
   - **Location:** `src/components/ui/color-picker.tsx` (Lines 53-75).
   - **Root Cause:** An inline IIFE executes inside the JSX render loop, recompiling `hex6` and `hex3` regular expressions on every single component render.
   - **Impact:** Unnecessary garbage collection churn, redundant string parsing, and poor code readability.

7. **Code Smell: Missing Slider Accessibility ARIA Tags on Volume Input**
   - **Location:** `src/components/studio/canvas-viewer.tsx` (Lines 912-921).
   - **Root Cause:** The volume `<input type="range">` provides an `aria-label`, but lacks `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext`.
   - **Impact:** Screen reader users receive incomplete state telemetry when navigating audio volume.

8. **Antislop / Rules Compliance: Ban on Em Dash (`—`) in UI Copy (Rule R-02)**
   - **Locations:** `src/app/manifest.ts`, `src/components/studio/inspector-panel.tsx`, `src/dictionaries/id.json`, `src/dictionaries/en.json`, and `src/lib/seo.ts`.
   - **Root Cause:** UI strings, SEO descriptions, and select options utilize em dashes (`—`), which violate the project's strict antislop editorial rules.
   - **Impact:** Inconsistent typography and failure of automated antislop linting gates.

---

## 2. User Stories & Edge Case Personas

### 2.1 User Personas
- **P-01: Micro-Content Creator (Sarah, Motion Graphic Artist)**
  - Uploads short 0.05-second looping animations and animated branding clips.
  - *Expectation:* The video loads immediately without freezing the player or crashing when seeking the initial frame.
- **P-02: High-Volume E-Commerce Photographer (Rian, Catalog Manager)**
  - Uploads hundreds of assets and experiments with 10+ watermark presets across multiple custom logo uploads.
  - *Expectation:* Memory usage remains stable without browser tab crashing or memory leaks from discarded logo blobs.
- **P-03: Screen Reader & Assistive Tech User (Alex, Accessibility Specialist)**
  - Operates MarkIt Studio using keyboard navigation and screen readers (NVDA / VoiceOver).
  - *Expectation:* Every slider, switch, and audio control communicates exact values, minimums, maximums, and current states unambiguously.
- **P-04: Brand & Localization Compliance Editor (Diana, Content Specialist)**
  - Ensures all localized copy (Indonesian & English) and application metadata adhere to pristine modern typography without generic AI-slop punctuation (no em dashes).

### 2.2 Edge Cases Handled
1. Video with duration of `0.02s` (sub-0.1s micro-media).
2. Video with duration of `Infinity` (WebM recording without duration header).
3. Video with duration of `NaN` or 0.
4. Fast consecutive switching of 5+ watermark presets while a custom logo Blob URL is active.
5. Clicking directly on the text label vs clicking directly on the switch thumb button in `Switch`.
6. Negative or out-of-range color values passed to `ColorPicker`.
7. Volume slider adjusted while muted or unmuted.

---

## 3. Scope & Boundaries (Ponytail & YAGNI)

### 3.1 In Scope
1. **Switch Component Refactoring:**
   - Decouple outer wrapper from `<label htmlFor>` to prevent duplicate synthetic clicks.
   - Separate text label and button control semantically while preserving keyboard and click ergonomics.
2. **CanvasViewer Aspect Ratio Badge Parity:**
   - Synchronize badge dimension strings with exact rendered buffer dimensions across all modes:
     - `9:16` -> `720 × 1280 px`
     - `1:1` -> `1080 × 1080 px`
     - `16:9` -> `1920 × 1080 px`
     - `original` -> `${activeItem.width} × ${activeItem.height} px` (or fallback if empty).
   - Display "Media Asli: {width} × {height} px" helper badge consistently whenever native media differs from social target dimensions.
3. **Blob URL Memory Cleanup Engine:**
   - Explicitly revoke previous `config.logo.logoUrl` if it starts with `blob:` whenever a new preset is applied in `studio-workspace.tsx`.
   - Ensure logo removal, replacement, media clearing, and component unmount clean up all Blob references.
4. **Finite Video Duration Guards:**
   - Create centralized helper `getSafeFiniteDuration(duration, fallback)`.
   - Guard `canvas-viewer.tsx`, `studio-workspace.tsx`, and `watermark-engine.ts` against `NaN`, `Infinity`, and negative values.
   - Prevent `formatTime` from returning `NaN:NaN`.
5. **Sub-0.1s Video Seek Clamp:**
   - Clamp poster seek to `Math.min(safeDuration > 0 ? safeDuration * 0.5 : 0, 0.1)`.
   - Clamp frame stepping to safe bounds: `Math.max(0, Math.min(safeDuration, currentTime + frames * 0.0333))`.
6. **ColorPicker Code Cleanliness:**
   - Hoist hex regex constants to module level.
   - Extract `normalizeHexColor(value, fallback)` utility function outside of JSX render.
7. **Volume Control Accessibility:**
   - Add `role="slider"`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-valuenow`, and `aria-valuetext` to the volume input in `canvas-viewer.tsx`.
8. **Anti-Slop Copy Purge (Em Dash Elimination):**
   - Replace all `—` occurrences with colon (`:`), pipe (`|`), hyphen (`-`), or clean punctuation across:
     - `src/app/manifest.ts`
     - `src/components/studio/inspector-panel.tsx`
     - `src/dictionaries/id.json`
     - `src/dictionaries/en.json`
     - `src/lib/seo.ts`

### 3.2 Out of Scope (Ponytail / YAGNI)
- Implementing complete WebAudio graph audio visualizers.
- Adding arbitrary custom resolution crop inputs in `CanvasViewer`.
- Rewriting `MediaRecorder` pipeline with WebAssembly ffmpeg transcoding.
- Changing color picker UI to full HSV/HSL canvas color wheels.

---

## 4. Detailed Technical Specifications

### 4.1 Component Refactor: `src/components/ui/switch.tsx`

```tsx
'use client';

import React from 'react';

export interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  className = '',
}: SwitchProps) {
  const switchId = React.useId();

  return (
    <div
      className={`flex items-center justify-between gap-3 select-none py-1.5 ${className}`}
    >
      <label
        htmlFor={switchId}
        className="flex flex-col cursor-pointer flex-1 mr-2"
      >
        <span className="text-xs font-medium text-foreground">{label}</span>
        {description ? (
          <span className="text-[11px] text-muted-foreground">{description}</span>
        ) : null}
      </label>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          checked ? 'bg-indigo-600' : 'bg-secondary'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
```

### 4.2 Utility: Finite Duration & Math Guards (`src/lib/watermark-engine.ts`)

```typescript
/**
 * Returns a finite positive number, or fallback if NaN, Infinity, or non-positive
 */
export function getSafeFiniteDuration(duration: unknown, fallback = 0): number {
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return duration;
  }
  return fallback;
}
```

### 4.3 Clean Color Normalization (`src/components/ui/color-picker.tsx`)

```typescript
const HEX6_REGEX = /^#([A-Fa-f0-9]{6})$/;
const HEX3_REGEX = /^#([A-Fa-f0-9]{3})$/;

export function normalizeHexColor(value: string, fallback = '#4f46e5'): string {
  if (HEX6_REGEX.test(value)) return value;
  if (HEX3_REGEX.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return fallback;
}
```

### 4.4 Anti-Slop Typography Mapping (Zero Em Dash)

| File | Line | Previous Value (with `—`) | Updated Clean Value |
|---|---|---|---|
| `src/app/manifest.ts` | 5 | `'MarkIt Studio — Photo & Video Watermark'` | `'MarkIt Studio: Photo & Video Watermark'` |
| `src/components/studio/inspector-panel.tsx` | 224 | `{font.name} — {font.sampleText}` | `{font.name} - {font.sampleText}` |
| `src/dictionaries/id.json` | 51 | `"MarkIt — Tambahkan Watermark pada Foto & Video Secara Instan"` | `"MarkIt: Tambahkan Watermark pada Foto & Video Secara Instan"` |
| `src/dictionaries/id.json` | 253 | `"MarkIt Studio — Platform watermarking foto dan video..."` | `"MarkIt Studio: Platform watermarking foto dan video..."` |
| `src/dictionaries/en.json` | 51 | `"MarkIt — Add Watermark to Photos & Videos Instantly"` | `"MarkIt: Add Watermark to Photos & Videos Instantly"` |
| `src/dictionaries/en.json` | 253 | `"MarkIt Studio — Modern, lightning-fast..."` | `"MarkIt Studio: Modern, lightning-fast..."` |
| `src/lib/seo.ts` | 8 | `// Base URL for the site — update in .env for production...` | `// Base URL for the site: update in .env for production...` |
| `src/lib/seo.ts` | 145 | `${title} — ${seoConfig.siteName}` | `${title} | ${seoConfig.siteName}` |

---

## 5. Acceptance Criteria Matrix (AC-1 to AC-8)

### AC-01: Switch Single-Trigger & Semantic Accessibility
```gherkin
Scenario: Clicking the switch button triggers onChange exactly once
  Given a Switch component rendered with checked=false
  When the user clicks directly on the switch button element
  Then onChange is invoked exactly once with value true
  And no secondary synthetic click event is fired

Scenario: Clicking the switch label triggers onChange exactly once
  Given a Switch component rendered with checked=true
  When the user clicks on the text label
  Then onChange is invoked exactly once with value false
```

### AC-02: CanvasViewer Aspect Ratio Badge & Dimension Parity
```gherkin
Scenario: Displaying dimension badge for 1:1 Instagram Square preset
  Given an active media item with dimensions 4000x3000 px
  When the user selects the "1:1" aspect ratio in CanvasViewer
  Then the primary dimension badge displays exactly "1080 × 1080 px"
  And the rendered canvas buffer dimensions are set to 1080x1080
  And the secondary badge displays "Media Asli: 4000 × 3000 px"

Scenario: Displaying dimension badge for 16:9 Landscape preset
  Given an active media item with dimensions 1080x1920 px (vertical)
  When the user selects the "16:9" aspect ratio in CanvasViewer
  Then the primary dimension badge displays exactly "1920 × 1080 px"
  And the rendered canvas buffer dimensions are set to 1920x1080
  And the secondary badge displays "Media Asli: 1080 × 1920 px"
```

### AC-03: Blob URL Memory Reclamation on Watermark Preset Changes
```gherkin
Scenario: Applying a watermark preset after uploading a custom logo
  Given a user has uploaded a custom logo generating Blob URL "blob:http://localhost/logo-123"
  When the user applies a preset from the Presets tab or external event
  Then URL.revokeObjectURL is invoked with "blob:http://localhost/logo-123"
  And the newly applied logo configuration takes effect
  And no orphaned Blob references remain in memory
```

### AC-04: Finite Video Duration Protection & Crash Prevention
```gherkin
Scenario: Loading a video with Infinity duration
  Given a video stream or WebM file with duration Infinity loaded into CanvasViewer
  When loadedmetadata event fires
  Then videoDuration state is initialized to 0
  And formatTime(videoDuration) returns "0:00" without rendering "NaN:NaN"
  And the scrubber slider aria-valuemax is safely set to a finite number

Scenario: Exporting video with duration Infinity or NaN
  Given a video export initiated with duration Infinity
  When watermark-engine processes exportWatermarkedVideoAsync
  Then totalDuration falls back to a safe finite duration (videoElement.duration or 1)
  And safetyLimitMs is calculated as a finite integer without overflow
  And export progress advances cleanly without NaN percent
```

### AC-05: Sub-0.1s Video Seek & Poster Frame Stabilization
```gherkin
Scenario: Loading an ultra-short video with duration 0.05 seconds
  Given an animated clip with duration 0.05 seconds loaded into CanvasViewer
  When handleLoadedVideoMetadata executes
  Then video.currentTime is clamped to Math.min(0.05 * 0.5, 0.1) = 0.025s
  And video.currentTime does not exceed media duration
  And no MediaError or pipeline stall occurs
```

### AC-06: ColorPicker Code Hygiene & Regex Hoisting
```gherkin
Scenario: ColorPicker renders without inline IIFE regex execution
  Given ColorPicker component rendering color "#3b82f6"
  When the component executes its render cycle
  Then hex normalization uses top-level compiled regex constants
  And the custom color input receives a valid 6-character hex string
```

### AC-07: Volume Input Full ARIA Slider Specification
```gherkin
Scenario: Inspecting volume slider accessibility attributes
  Given CanvasViewer displaying video controls with volume=80 and isMuted=false
  When inspecting the volume range input element
  Then the element has role="slider"
  And aria-valuemin is set to 0
  And aria-valuemax is set to 100
  And aria-valuenow is set to 80
  And aria-valuetext is set to "80%"

Scenario: Inspecting volume slider accessibility when muted
  Given CanvasViewer displaying video controls with isMuted=true
  When inspecting the volume range input element
  Then aria-valuenow is set to 0
  And aria-valuetext is set to "0%"
```

### AC-08: Zero Em Dash Compliance Across UI Copy & Metadata
```gherkin
Scenario: Verifying UI copy and metadata for zero em dash characters
  Given the codebase files manifest.ts, inspector-panel.tsx, id.json, en.json, and seo.ts
  When scanned for the em dash unicode character "\u2014" ("—")
  Then exactly zero occurrences are found
  And all titles and descriptions use colon, pipe, or hyphen delimiters cleanly
```

---

## 6. Cross-Role Alignment Log

| Role | Domain / Concern | Binding Decision |
|---|---|---|
| **Faisal (PM)** | Antislop rule compliance and YAGNI discipline. | Enforce strict ban on em dash (`—`). Restrict code cleanup to exact audited components without rewriting working architecture. |
| **Angel (UI/UX)** | Dimension badge typography and Switch focus outlines. | Keep the exact visual badge style (`bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20`), but ensure badge numbers exactly reflect canvas output. Retain smooth focus-visible rings on Switch. |
| **Bryan (Backend / Engine)** | Video duration fallback in `watermark-engine.ts`. | Safe duration guard `getSafeFiniteDuration` must be exported and tested. `safetyLimitMs` must be clamped between 3,000ms and 3,600,000ms (1 hour max) to prevent timer overflow. |
| **Fiqry (Frontend Web)** | Switch click bubbling and Blob URL tracking. | Decouple `<label>` from `<button>` in `Switch`. In `studio-workspace.tsx`, intercept `handleApplyPreset` to call `URL.revokeObjectURL(prev.logo.logoUrl)` when replacing blobs. |
| **Sandra (QA)** | Automated test harness & regression prevention. | Add unit tests in `src/lib/__tests__/` covering: `getSafeFiniteDuration`, `normalizeHexColor`, sub-0.1s video seek clamp, and an automated regex check preventing `—` in dictionary and metadata files. |

---

## 7. Execution Tracks (Fork-Join Concurrency)

- **Track A (UI Primitives & Accessibility - Angel / Fiqry):**
  - Refactor `src/components/ui/switch.tsx` to fix the double-trigger bug.
  - Refactor `src/components/ui/color-picker.tsx` (hoist regex, remove inline IIFE).
  - Add full ARIA slider attributes to volume input in `src/components/studio/canvas-viewer.tsx`.
- **Track B (Canvas Buffer & Memory Lifecycle - Fiqry / Bryan):**
  - Fix aspect ratio badge parity in `src/components/studio/canvas-viewer.tsx` (`1:1` -> 1080x1080, `16:9` -> 1920x1080).
  - Implement Blob URL revocation in `handleApplyPreset` in `src/components/studio/studio-workspace.tsx`.
  - Add finite video duration guards and sub-0.1s seek protection in `canvas-viewer.tsx`, `studio-workspace.tsx`, and `watermark-engine.ts`.
- **Track C (Antislop & Copy Compliance - Faisal / Fiqry):**
  - Replace all em dashes (`—`) in `manifest.ts`, `inspector-panel.tsx`, `id.json`, `en.json`, and `seo.ts`.
- **Track D (QA & Test Harness - Sandra):**
  - Implement automated test suite in `src/lib/__tests__/audit-enhancements.test.ts` to verify AC-01 through AC-08.
  - Deliver `workflow/TASK-003-code-audit-bugfix-enhancement/04_qa_sandra.md`.
