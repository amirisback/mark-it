'use client';

import type {
  ExportFormat,
  ExportSettings,
  VideoExportMode,
  VideoContainerFormat,
  VideoQualityPreset,
  VideoEngineMode,
  ImageMetadataConfig,
} from '@/types/watermark';
import { Button } from '@/components/ui/button';
import { computeAdaptiveVideoBitrate, isWebCodecsSupported } from '@/lib/watermark-engine';

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
  sourceWidth?: number;
  sourceHeight?: number;
  totalItems: number;
  isProcessing: boolean;
  progressText?: string;
  videoProgress?: VideoProgressInfo | null;
  onCancelExport?: () => void;
}

function getResolutionCategory(width: number, height: number): string {
  const pixels = width * height;
  if (pixels <= 1280 * 720) return '720p HD';
  if (pixels <= 1920 * 1080) return '1080p FHD';
  if (pixels <= 2560 * 1440) return '1440p 2K';
  return '4K UHD';
}

export function ExportBar({
  settings,
  onSettingsChange,
  onDownloadActive,
  onDownloadAll,
  hasActiveItem,
  activeItemType,
  sourceWidth,
  sourceHeight,
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

  const videoQuality: VideoQualityPreset =
    settings.videoQuality || settings.videoQualityProfile || 'maximum';

  const bitrateBps =
    sourceWidth && sourceHeight
      ? computeAdaptiveVideoBitrate(sourceWidth, sourceHeight, 30, videoQuality)
      : 16_000_000;
  const bitrateMbps = Math.round(bitrateBps / 1_000_000);
  const resCategory =
    sourceWidth && sourceHeight ? getResolutionCategory(sourceWidth, sourceHeight) : 'FHD';

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
          {/* Left: Mode Toggles & Quality Settings */}
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
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground/90 text-xs">Format:</span>
                  <select
                    value={settings.videoFormat || 'video/mp4'}
                    onChange={(e) => handleVideoFormatChange(e.target.value as VideoContainerFormat)}
                    className="h-8 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="video/mp4">MP4 (AVC1/AAC - Kompatibilitas Universal)</option>
                    <option value="video/webm">WebM (VP9/Opus - Efisiensi Tinggi)</option>
                  </select>
                </div>

                {/* Video Quality Profile Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground/90 text-xs">Profil Kualitas:</span>
                  <select
                    value={videoQuality}
                    onChange={(e) => {
                      const q = e.target.value as VideoQualityPreset;
                      onSettingsChange({
                        ...settings,
                        videoQuality: q,
                        videoQualityProfile: q,
                      });
                    }}
                    aria-label="Pilih profil kualitas bitrate video"
                    className="h-8 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="maximum">Maksimal (45 Mbps • Lossless & 4K)</option>
                    <option value="high">Tinggi (16-28 Mbps • Studio & Reels)</option>
                    <option value="standard">Standar (8-12 Mbps • Web & Mobile)</option>
                  </select>
                </div>

                {/* Video Frame Rate Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground/90 text-xs">FPS:</span>
                  <select
                    value={settings.videoFps || 60}
                    onChange={(e) => {
                      const f = Number(e.target.value) as 30 | 60;
                      onSettingsChange({
                        ...settings,
                        videoFps: f,
                      });
                    }}
                    aria-label="Pilih frame rate video ekspor"
                    className="h-8 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value={60}>60 FPS (Sangat Mulus & Cepat)</option>
                    <option value={30}>30 FPS (Standar)</option>
                  </select>
                </div>

                {/* Video Engine Selection */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground/90 text-xs">Engine:</span>
                  <select
                    value={settings.videoEngine || 'auto'}
                    onChange={(e) => {
                      onSettingsChange({
                        ...settings,
                        videoEngine: e.target.value as VideoEngineMode,
                      });
                    }}
                    aria-label="Pilih engine rendering video"
                    className="h-8 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="auto">⚡ WebCodecs (Akselerasi Otomatis)</option>
                    <option value="realtime">🎞️ MediaRecorder (Realtime Native)</option>
                  </select>
                </div>

                {/* Dynamic Bitrate & Resolution Indicator Badge */}
                {sourceWidth && sourceHeight ? (
                  <div
                    role="status"
                    aria-label={`Resolusi ${resCategory}, frame rate ${settings.videoFps || 60} FPS, bitrate ${bitrateMbps} megabit per detik, audio 256 kilobit per detik`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-mono text-[11px] font-medium tracking-tight shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                    <span>
                      {resCategory} ({sourceWidth}×{sourceHeight})
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{settings.videoFps || 60} FPS</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="font-bold">{bitrateMbps} Mbps</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span>256kbps Audio</span>
                    {typeof window !== 'undefined' && isWebCodecsSupported() ? (
                      <>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">⚡ WebCodecs Ready</span>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                    🔊 256kbps Audio
                  </span>
                )}
              </>
            ) : (
              /* Image Format Selection (Images or Video Frame Snapshot) */
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground/90 text-xs">Format Gambar:</span>
                  <select
                    value={settings.format}
                    onChange={(e) =>
                      onSettingsChange({
                        ...settings,
                        format: e.target.value as ExportFormat,
                      })
                    }
                    className="h-8 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="image/png">PNG (Transparan & Lossless)</option>
                    <option value="image/jpeg">JPEG (Kualitas Foto)</option>
                    <option value="image/webp">WebP (Ukuran Ringkas)</option>
                  </select>
                </div>

                {/* Video Single-Frame Snapshot Badge */}
                {isVideo && settings.videoMode === 'single_frame' ? (
                  <div
                    role="status"
                    aria-label={`Snapshot frame native tanpa kompresi viewport ${sourceWidth || ''} ${
                      sourceHeight ? `kali ${sourceHeight}` : ''
                    } piksel`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-[11px] font-medium shadow-2xs"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-semibold">Snapshot Native</span>
                    {sourceWidth && sourceHeight ? (
                      <>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="font-mono text-[10px]">
                          {sourceWidth}×{sourceHeight}px Unscaled
                        </span>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {/* PNG Lossless Badge OR Image Quality Selector */}
                {settings.format === 'image/png' ? (
                  <div
                    role="status"
                    aria-label="Format PNG Lossless 24-bit RGBA dengan transparansi penuh"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium shadow-2xs"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="font-semibold">PNG Lossless</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="font-mono text-[10px]">24-bit RGBA</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground/90 text-xs">Kualitas:</span>
                    <select
                      value={String(settings.quality)}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          quality: parseFloat(e.target.value),
                        })
                      }
                      aria-label="Pilih preset kualitas gambar kompresi"
                      className="h-8 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="1">100% (Maksimal • Pristine Fidelity)</option>
                      <option value="0.95">95% (Studio • Master Export)</option>
                      <option value="0.85">85% (Optimal Web • Balanced Size)</option>
                      <option value="0.7">70% (Kecil • Compact Sharing)</option>
                    </select>
                  </div>
                )}

                {/* EXIF Metadata Stamp Toggle for Photos */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const prevMeta: ImageMetadataConfig = settings.metadata || {
                        enabled: false,
                        artist: '',
                        copyright: '© 2026 MarkIt Studio',
                        description: 'Watermarked with MarkIt Studio',
                      };
                      onSettingsChange({
                        ...settings,
                        metadata: {
                          ...prevMeta,
                          enabled: !prevMeta.enabled,
                        },
                      });
                    }}
                    className={`h-8 px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                      settings.metadata?.enabled
                        ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-semibold shadow-2xs'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    <span>📝 EXIF Hak Cipta</span>
                    <span
                      className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                        settings.metadata?.enabled
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {settings.metadata?.enabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* Custom Prefix Field */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground/90 text-xs">Prefix File:</span>
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
                className="w-28 h-8 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      {/* Collapsible EXIF Metadata Customizer for Photos */}
      {!isProcessing && settings.metadata?.enabled && (!isVideo || settings.videoMode === 'single_frame') ? (
        <div className="w-full mt-3 pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-secondary/10 p-2.5 rounded-lg text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground/80">Fotografer / Author (0x013B):</label>
            <input
              type="text"
              value={settings.metadata.artist}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  metadata: {
                    ...settings.metadata!,
                    artist: e.target.value,
                  },
                })
              }
              placeholder="Nama Fotografer / Studio"
              className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground/80">Pernyataan Hak Cipta (0x8298):</label>
            <input
              type="text"
              value={settings.metadata.copyright}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  metadata: {
                    ...settings.metadata!,
                    copyright: e.target.value,
                  },
                })
              }
              placeholder="© 2026 Hak Cipta Dilindungi"
              className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground/80">Deskripsi Media (0x010E):</label>
            <input
              type="text"
              value={settings.metadata.description}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  metadata: {
                    ...settings.metadata!,
                    description: e.target.value,
                  },
                })
              }
              placeholder="Deskripsi foto / seri portofolio"
              className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
