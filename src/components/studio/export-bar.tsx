'use client';

import React from 'react';
import type {
  ExportFormat,
  ExportSettings,
  VideoExportMode,
  VideoContainerFormat,
} from '@/types/watermark';
import { Button } from '@/components/ui/button';

export interface VideoProgressInfo {
  percent: number;
  currentTime: number;
  totalTime: number;
  elapsedFormatted?: string;
  remainingFormatted?: string;
}

export interface ExportBarProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  onDownloadActive: () => void;
  onDownloadAll: () => void;
  hasActiveItem: boolean;
  activeItemType?: 'image' | 'video';
  totalItems: number;
  isProcessing: boolean;
  progressText?: string;
  videoProgress?: VideoProgressInfo | null;
  onCancelExport?: () => void;
}

export function ExportBar({
  settings,
  onSettingsChange,
  onDownloadActive,
  onDownloadAll,
  hasActiveItem,
  activeItemType,
  totalItems,
  isProcessing,
  progressText,
  videoProgress,
  onCancelExport,
}: ExportBarProps) {
  const isVideo = activeItemType === 'video';

  const handleVideoModeChange = (mode: VideoExportMode) => {
    onSettingsChange({
      ...settings,
      videoMode: mode,
    });
  };

  const handleVideoFormatChange = (fmt: VideoContainerFormat) => {
    onSettingsChange({
      ...settings,
      videoFormat: fmt,
    });
  };

  return (
    <div className="w-full bg-card border border-border/80 rounded-xl p-4 shadow-xs">
      {isProcessing ? (
        /* Real-Time Processing & Progress Strip */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
              <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                {isVideo && settings.videoMode === 'full_video'
                  ? `🎬 Merender Video Watermark (${videoProgress?.percent ?? 0}%)`
                  : `⚡ Memproses Ekspor Media (${videoProgress?.percent ?? 0}%)`}
              </span>
            </div>

            {onCancelExport ? (
              <button
                type="button"
                onClick={onCancelExport}
                className="h-8 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-lg transition-colors cursor-pointer"
              >
                Batal Rendering
              </button>
            ) : null}
          </div>

          {/* Progress Bar Track with Animated Stripes */}
          <div className="h-2.5 rounded-full bg-secondary/80 overflow-hidden relative border border-border/50">
            <div
              role="progressbar"
              aria-label="Kemajuan rendering watermark"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={videoProgress?.percent ?? 0}
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-150"
              style={{
                width: `${Math.max(2, videoProgress?.percent ?? 0)}%`,
                backgroundImage:
                  'linear-gradient(45deg, rgba(255, 255, 255, 0.2) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.2) 75%, transparent 75%, transparent)',
                backgroundSize: '1rem 1rem',
                animation: 'progress-stripes 1s linear infinite',
              }}
            />
          </div>

          {/* Metrics Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-muted-foreground gap-1">
            <span>
              {progressText ||
                (videoProgress
                  ? `Waktu: ${videoProgress.currentTime.toFixed(1)}s / ${videoProgress.totalTime.toFixed(1)}s`
                  : 'Sedang memproses media...')}
            </span>
            {videoProgress?.elapsedFormatted ? (
              <span>
                Berjalan: {videoProgress.elapsedFormatted} • Estimasi sisa: ~
                {videoProgress.remainingFormatted || 'menghitung...'}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        /* Standard Export Settings and Action Bar */
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left: Mode Toggles & Format Settings */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Segmented Mode Switcher for Video Assets */}
            {isVideo ? (
              <div className="flex items-center p-0.5 bg-secondary rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => handleVideoModeChange('full_video')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                    settings.videoMode === 'full_video'
                      ? 'bg-card text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🎬 Video Utuh (.mp4/.webm)
                </button>
                <button
                  type="button"
                  onClick={() => handleVideoModeChange('single_frame')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                    settings.videoMode === 'single_frame'
                      ? 'bg-card text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📸 Frame Tertentu (.png/.jpg)
                </button>
              </div>
            ) : null}

            {/* Video Container Format Selection (Full Video Mode) */}
            {isVideo && settings.videoMode === 'full_video' ? (
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground/80">Format Video:</span>
                <select
                  value={settings.videoFormat || 'video/webm'}
                  onChange={(e) => handleVideoFormatChange(e.target.value as VideoContainerFormat)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="video/webm">WebM (VP9/Opus - Efisiensi Tinggi)</option>
                  <option value="video/mp4">MP4 (AVC1/AAC - Kompatibilitas Universal)</option>
                </select>

                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                  🔊 Audio Sumber Aktif
                </span>
              </div>
            ) : (
              /* Image Format Selection (Images or Video Frame Snapshot) */
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground/80">Format Gambar:</span>
                  <select
                    value={settings.format}
                    onChange={(e) =>
                      onSettingsChange({
                        ...settings,
                        format: e.target.value as ExportFormat,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="image/png">PNG (Transparan & Lossless)</option>
                    <option value="image/jpeg">JPEG (Kualitas Foto)</option>
                    <option value="image/webp">WebP (Ukuran Ringkas)</option>
                  </select>
                </div>

                {settings.format !== 'image/png' ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground/80">Kualitas:</span>
                    <select
                      value={String(settings.quality)}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          quality: parseFloat(e.target.value),
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="1">100% (Maksimal)</option>
                      <option value="0.92">92% (Standar Studio)</option>
                      <option value="0.8">80% (Optimal Web)</option>
                      <option value="0.65">65% (Kecil)</option>
                    </select>
                  </div>
                ) : null}
              </>
            )}

            {/* Custom Prefix Field */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground/80">Prefix File:</span>
              <input
                type="text"
                value={settings.customPrefix}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    customPrefix: e.target.value,
                  })
                }
                placeholder="watermarked_"
                className="w-28 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Right: Download Action Buttons */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadActive}
              disabled={!hasActiveItem || isProcessing}
              className="flex-1 lg:flex-none text-xs"
            >
              <svg
                className="w-4 h-4 mr-1 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Unduh File Ini
            </Button>

            <Button
              variant="brand"
              size="sm"
              onClick={onDownloadAll}
              disabled={totalItems === 0 || isProcessing}
              className="flex-1 lg:flex-none text-xs"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Unduh Semua ({totalItems})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
