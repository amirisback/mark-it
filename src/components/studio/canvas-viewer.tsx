'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { MediaItem, WatermarkFullConfig, SocialFrameType } from '@/types/watermark';
import {
  drawWatermarkOnCanvas,
  drawWatermarkOnSocialCanvas,
  loadImageAsync,
} from '@/lib/watermark-engine';
import { Button } from '@/components/ui/button';
import { SocialFrameOverlay } from './social-frame-overlay';

export interface CanvasViewerProps {
  activeItem: MediaItem | null;
  config: WatermarkFullConfig;
  socialFrame?: SocialFrameType;
  onSocialFrameChange?: (frame: SocialFrameType) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onVideoElementReady?: (video: HTMLVideoElement | null) => void;
  onLoadSampleClick?: () => void;
  isProcessing?: boolean;
}

export function CanvasViewer({
  activeItem,
  config,
  socialFrame: controlledSocialFrame,
  onSocialFrameChange,
  onCanvasReady,
  onVideoElementReady,
  onLoadSampleClick,
  isProcessing = false,
}: CanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [rawLogoImg, setRawLogoImg] = useState<HTMLImageElement | null>(null);

  // Social Media Safe Zone Frame state
  const [internalSocialFrame, setInternalSocialFrame] = useState<SocialFrameType>('none');
  const socialFrame = controlledSocialFrame !== undefined ? controlledSocialFrame : internalSocialFrame;
  const handleSocialFrameChange = (f: SocialFrameType) => {
    setInternalSocialFrame(f);
    onSocialFrameChange?.(f);
  };
  // Aspect ratio state for studio preview (default '9:16' per user request - 720x1280 px)
  const [previewRatio, setPreviewRatio] = useState<'9:16' | 'original' | '1:1' | '16:9'>('9:16');
  const [showDangerZone, setShowDangerZone] = useState<boolean>(true);
  const [showUiMockup, setShowUiMockup] = useState<boolean>(true);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.85);

  const cachedMediaImageRef = useRef<{ url: string; img: HTMLImageElement } | null>(null);

  // Load logo asynchronously when url changes
  useEffect(() => {
    let isCancelled = false;
    if (config.logo.enabled && config.logo.logoUrl) {
      loadImageAsync(config.logo.logoUrl)
        .then((img) => {
          if (!isCancelled) {
            setRawLogoImg(img);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setRawLogoImg(null);
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [config.logo.enabled, config.logo.logoUrl]);

  const logoImageElement = config.logo.enabled && config.logo.logoUrl ? rawLogoImg : null;

  const drawSourceByPreviewRatio = useCallback(
    (
      canvas: HTMLCanvasElement,
      source: HTMLImageElement | HTMLVideoElement,
      sourceWidth: number,
      sourceHeight: number
    ) => {
      const effectiveConfig: WatermarkFullConfig = showOriginal
        ? {
            ...config,
            text: { ...config.text, enabled: false },
            logo: { ...config.logo, enabled: false },
            frame: { ...config.frame, enabled: false },
          }
        : config;

      if (previewRatio === '9:16') {
        drawWatermarkOnSocialCanvas(
          canvas,
          source,
          sourceWidth,
          sourceHeight,
          effectiveConfig,
          logoImageElement,
          720,
          1280
        );
      } else if (previewRatio === '1:1') {
        drawWatermarkOnSocialCanvas(
          canvas,
          source,
          sourceWidth,
          sourceHeight,
          effectiveConfig,
          logoImageElement,
          1080,
          1080
        );
      } else if (previewRatio === '16:9') {
        drawWatermarkOnSocialCanvas(
          canvas,
          source,
          sourceWidth,
          sourceHeight,
          effectiveConfig,
          logoImageElement,
          1920,
          1080
        );
      } else {
        drawWatermarkOnCanvas(
          canvas,
          source,
          sourceWidth,
          sourceHeight,
          effectiveConfig,
          logoImageElement
        );
      }
    },
    [config, logoImageElement, showOriginal, previewRatio]
  );

  // Render loop for static image with cached image decode
  const renderImage = useCallback(
    async (item: MediaItem) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        let img: HTMLImageElement;
        if (cachedMediaImageRef.current && cachedMediaImageRef.current.url === item.objectUrl) {
          img = cachedMediaImageRef.current.img;
        } else {
          img = await loadImageAsync(item.objectUrl);
          cachedMediaImageRef.current = { url: item.objectUrl, img };
        }

        drawSourceByPreviewRatio(canvas, img, img.width, img.height);
        if (onCanvasReady) onCanvasReady(canvas);
      } catch (err) {
        console.error('Error rendering image to canvas:', err);
      }
    },
    [drawSourceByPreviewRatio, onCanvasReady]
  );

  // Render frame for video
  const renderVideoFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;

    drawSourceByPreviewRatio(canvas, video, width, height);

    if (onCanvasReady) onCanvasReady(canvas);
  }, [drawSourceByPreviewRatio, onCanvasReady]);

  // Continuous animation frame loop during video playback (dimatikan saat export agar tidak membebani GPU/CPU)
  useEffect(() => {
    if (activeItem?.type === 'video' && isPlayingVideo && !isProcessing) {
      const loop = () => {
        renderVideoFrame();
        if (videoRef.current) {
          setVideoCurrentTime(videoRef.current.currentTime);
        }
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeItem?.type, isPlayingVideo, isProcessing, renderVideoFrame]);

  // Trigger render when active item or config changes, pausing and cleaning previous media
  const prevItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeItem) {
      prevItemIdRef.current = null;
      cachedMediaImageRef.current = null;
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      return;
    }

    if (prevItemIdRef.current !== activeItem.id) {
      prevItemIdRef.current = activeItem.id;
      cachedMediaImageRef.current = null;
      if (videoRef.current) {
        if (!videoRef.current.paused) {
          videoRef.current.pause();
        }
        videoRef.current.currentTime = 0;
      }
    }

    if (activeItem.type === 'image') {
      renderImage(activeItem);
    } else if (activeItem.type === 'video') {
      const video = videoRef.current;
      if (video) {
        if (video.src !== activeItem.objectUrl) {
          if (
            !activeItem.objectUrl.startsWith('blob:') &&
            !activeItem.objectUrl.startsWith('data:')
          ) {
            video.crossOrigin = 'anonymous';
          } else {
            video.removeAttribute('crossorigin');
          }
          video.src = activeItem.objectUrl;
          video.load();
        } else {
          renderVideoFrame();
        }
      }
    }
  }, [activeItem, config, logoImageElement, showOriginal, renderImage, renderVideoFrame]);

  // Expose video element to parent when ready
  useEffect(() => {
    if (activeItem?.type === 'video' && videoRef.current) {
      onVideoElementReady?.(videoRef.current);
    } else {
      onVideoElementReady?.(null);
    }
  }, [activeItem?.type, onVideoElementReady]);

  // Video metadata and seek handlers
  const handleLoadedVideoMetadata = () => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume / 100;
      const safeDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      setVideoDuration(safeDuration);
      setVideoCurrentTime(0);
      video.currentTime = Math.min(0.1, safeDuration > 0 ? safeDuration / 2 : 0); // Seek slightly forward to grab poster frame
    }
  };

  const handleVideoSeeked = () => {
    renderVideoFrame();
  };

  const togglePlayVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlayingVideo(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlayingVideo(false);
    }
  }, []);

  const handleSliderSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setVideoCurrentTime(time);
    renderVideoFrame();
  }, [renderVideoFrame]);

  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol);
    const video = videoRef.current;
    if (video) {
      video.volume = newVol / 100;
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        video.muted = false;
      }
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    video.muted = nextMuted;
  }, [isMuted]);

  const stepFrame = useCallback((frames: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, Math.min(videoDuration, video.currentTime + frames * 0.0333));
    video.currentTime = newTime;
    setVideoCurrentTime(newTime);
    renderVideoFrame();
  }, [videoDuration, renderVideoFrame]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (activeItem?.type !== 'video') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayVideo();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        const video = videoRef.current;
        if (video) {
          const nextTime = Math.max(0, video.currentTime - delta);
          handleSliderSeek(nextTime);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        const video = videoRef.current;
        if (video) {
          const nextTime = Math.min(videoDuration, video.currentTime + delta);
          handleSliderSeek(nextTime);
        }
      } else if (e.key === ',' || e.key === '<') {
        e.preventDefault();
        stepFrame(-1);
      } else if (e.key === '.' || e.key === '>') {
        e.preventDefault();
        stepFrame(1);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(100, volume + 5));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    activeItem?.type,
    handleSliderSeek,
    handleVolumeChange,
    stepFrame,
    toggleMute,
    togglePlayVideo,
    videoDuration,
    volume,
  ]);

  const formatTime = (secs: number): string => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-border/60 bg-secondary/30">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-pulse" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              Pratinjau Studio
            </span>
            <span className="text-xs text-muted-foreground/60 font-mono">:</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 tabular-nums">
              {previewRatio === '9:16'
                ? '720 × 1280 px'
                : previewRatio === '1:1'
                ? '1080 × 1080 px'
                : previewRatio === '16:9'
                ? '1920 × 1080 px'
                : activeItem
                ? `${activeItem.width} × ${activeItem.height} px`
                : '720 × 1280 px'}
            </span>
          </div>

          {previewRatio !== 'original' ? (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Disesuaikan dengan format sosmed
            </span>
          ) : null}

          {activeItem &&
          previewRatio !== 'original' &&
          ((previewRatio === '9:16' && (activeItem.width !== 720 || activeItem.height !== 1280)) ||
            (previewRatio === '1:1' && (activeItem.width !== 1080 || activeItem.height !== 1080)) ||
            (previewRatio === '16:9' && (activeItem.width !== 1920 || activeItem.height !== 1080))) ? (
            <span
              className="text-[10px] font-mono text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded border border-border/50 hidden sm:inline-block tabular-nums"
              title={`Dimensi asli media sebelum disesuaikan ke format ${previewRatio}`}
            >
              Media Asli: {activeItem.width} × {activeItem.height} px
            </span>
          ) : null}

          {/* Aspect Ratio Selector Pill */}
          <div className="flex items-center bg-background/90 dark:bg-card/90 p-0.5 rounded-lg border border-border/70 text-[11px] font-medium shadow-2xs">
            <button
              type="button"
              onClick={() => setPreviewRatio('9:16')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                previewRatio === '9:16'
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Kunci Rasio Pratinjau 720 × 1280 px (Format Vertikal Sosmed TikTok / Reels / Shorts)"
            >
              <span>720×1280</span>
              <span className="text-[9px] opacity-90 font-bold hidden sm:inline">9:16 Sosmed</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewRatio('original')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                previewRatio === 'original'
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Gunakan rasio asli dari media yang diunggah"
            >
              Asli
            </button>
            <button
              type="button"
              onClick={() => setPreviewRatio('1:1')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                previewRatio === '1:1'
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Rasio 1:1 Persegi (Post Instagram)"
            >
              1:1
            </button>
            <button
              type="button"
              onClick={() => setPreviewRatio('16:9')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                previewRatio === '16:9'
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Rasio 16:9 Lanskap (YouTube Standar)"
            >
              16:9
            </button>
          </div>
        </div>

        {/* Right side: Frame Sosmed & Zoom & Bandingkan Asli */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Social Frame / Safe Zone Selector */}
          <div className="flex items-center gap-1 bg-background/90 dark:bg-card/90 p-1 rounded-lg border border-border/70 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground px-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="5" y="2" width="14" height="20" rx="3" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={3} strokeLinecap="round" />
              </svg>
              <span className="hidden xl:inline">Frame:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSocialFrameChange('none')}
              className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                socialFrame === 'none'
                  ? 'bg-secondary text-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Matikan panduan frame sosmed"
            >
              Mati
            </button>
            <button
              type="button"
              onClick={() => handleSocialFrameChange('tiktok')}
              className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                socialFrame === 'tiktok'
                  ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 font-semibold border border-rose-500/30 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Tampilkan Safe Zone & Mockup Tombol TikTok"
            >
              TikTok
            </button>
            <button
              type="button"
              onClick={() => handleSocialFrameChange('reels')}
              className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                socialFrame === 'reels'
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold border border-purple-500/30 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Tampilkan Safe Zone & Mockup Tombol Instagram Reels"
            >
              IG Reels
            </button>
            <button
              type="button"
              onClick={() => handleSocialFrameChange('shorts')}
              className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                socialFrame === 'shorts'
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-semibold border border-red-500/30 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Tampilkan Safe Zone & Mockup Tombol YouTube Shorts"
            >
              YT Shorts
            </button>
          </div>

          {/* Zoom & View Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              className={`px-2 py-1 text-xs rounded-md border font-medium cursor-pointer transition-colors ${
                showOriginal
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-background hover:bg-secondary text-muted-foreground border-border/60'
              }`}
              title="Tahan untuk melihat file asli tanpa watermark"
            >
              {showOriginal ? 'Asli' : 'Bandingkan'}
            </button>

            <div className="h-4 w-px bg-border mx-0.5" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
              title="Perkecil"
              className="h-7 px-1.5 text-xs"
            >
              -
            </Button>
            <span className="text-[11px] font-mono text-muted-foreground w-11 text-center font-medium">
              {zoomLevel}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
              title="Perbesar"
              className="h-7 px-1.5 text-xs"
            >
              +
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(100)}
              title="Reset ke 100% (Fit tanpa scroll)"
              className="h-7 px-1.5 text-xs text-indigo-500 hover:text-indigo-400 font-medium"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Social Safe Zone Sub-Bar (Active when a frame is chosen) */}
      {socialFrame !== 'none' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-1.5 bg-background/60 border-b border-border/50 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Panduan Safe Zone:{' '}
              <span className="capitalize text-indigo-600 dark:text-indigo-400 font-bold">
                {socialFrame === 'reels' ? 'Instagram Reels' : socialFrame === 'shorts' ? 'YouTube Shorts' : 'TikTok'}
              </span>
            </span>
            <span className="text-muted-foreground hidden lg:inline">|</span>
            <span className="text-muted-foreground hidden lg:inline">
              Pastikan watermark berada di dalam garis hijau agar bebas dari tombol & teks sosmed.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Danger Zone toggle */}
            <button
              type="button"
              onClick={() => setShowDangerZone(!showDangerZone)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                showDangerZone
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  : 'bg-background text-muted-foreground border-border/60 hover:text-foreground'
              }`}
              title="Tampilkan / sembunyikan area bahaya (merah) & aman (hijau)"
            >
              Zona Bahaya: {showDangerZone ? 'ON' : 'OFF'}
            </button>

            {/* UI Mockup toggle */}
            <button
              type="button"
              onClick={() => setShowUiMockup(!showUiMockup)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                showUiMockup
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                  : 'bg-background text-muted-foreground border-border/60 hover:text-foreground'
              }`}
              title="Tampilkan / sembunyikan mockup tombol & avatar sosmed"
            >
              Tombol UI: {showUiMockup ? 'ON' : 'OFF'}
            </button>

            {/* Opacity Cycle Button */}
            <button
              type="button"
              onClick={() => {
                setOverlayOpacity((prev) => (prev >= 0.9 ? 0.45 : prev >= 0.65 ? 0.95 : 0.7));
              }}
              className="px-2 py-0.5 rounded text-[11px] font-mono text-muted-foreground hover:text-foreground bg-secondary/60 hover:bg-secondary border border-border/60 cursor-pointer"
              title="Ubah opasitas panduan overlay"
            >
              Opasitas: {Math.round(overlayOpacity * 100)}%
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Viewport - 9:16 Adaptive Frame with Zero Scroll at 100% */}
      <div
        className={`relative flex-1 min-h-[380px] sm:min-h-[420px] max-h-[580px] lg:max-h-[calc(100dvh-260px)] ${
          zoomLevel > 100 ? 'overflow-auto' : 'overflow-hidden'
        } canvas-checkerboard flex items-center justify-center p-3 sm:p-4`}
      >
        {/* Active offscreen video decoder element (kept at opacity 1 & 2x2px fixed to prevent Chromium compositor occlusion culling) */}
        <video
          ref={videoRef}
          preload="auto"
          playsInline
          muted={isMuted}
          className="pointer-events-none select-none"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '2px',
            height: '2px',
            opacity: 1,
            zIndex: 1,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
          tabIndex={-1}
          onLoadedMetadata={handleLoadedVideoMetadata}
          onLoadedData={renderVideoFrame}
          onSeeked={handleVideoSeeked}
          onEnded={() => setIsPlayingVideo(false)}
          onPause={() => setIsPlayingVideo(false)}
          onPlay={() => {
            if (!isProcessing) {
              setIsPlayingVideo(true);
            }
          }}
        />

        {activeItem ? (
          <div className="relative flex items-center justify-center w-full h-full max-h-full max-w-full">
            {/* Phone-like 9:16 Frame */}
            <div
              className={`relative flex items-center justify-center shadow-2xl transition-all duration-150 overflow-hidden ${
                previewRatio === '9:16'
                  ? 'rounded-3xl border-[3px] border-slate-700/80 dark:border-slate-800 bg-black'
                  : 'rounded-lg border border-border/70 bg-black/80'
              }`}
              style={{
                aspectRatio:
                  previewRatio === '9:16'
                    ? '9 / 16'
                    : previewRatio === '1:1'
                    ? '1 / 1'
                    : previewRatio === '16:9'
                    ? '16 / 9'
                    : activeItem
                    ? `${activeItem.width} / ${activeItem.height}`
                    : '9 / 16',
                height: '100%',
                maxHeight: '100%',
                maxWidth: '100%',
                width: 'auto',
                transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                transformOrigin: 'center center',
              }}
            >
              {/* Dynamic Island / Camera Notch Accent for 9:16 smartphone preview */}
              {previewRatio === '9:16' && (
                <div className="absolute top-2 inset-x-0 flex justify-center pointer-events-none z-30">
                  <div className="w-16 h-3 bg-black/85 rounded-full border border-white/10 flex items-center justify-end px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/70" />
                  </div>
                </div>
              )}

              {/* The high-res watermark canvas */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block bg-transparent"
              />

              {/* Safe zone overlay */}
              <SocialFrameOverlay
                frame={socialFrame}
                showDangerZone={showDangerZone}
                showUiElements={showUiMockup}
                opacity={overlayOpacity}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4 max-w-sm text-muted-foreground w-full h-full">
            <div
              className="relative w-48 sm:w-56 shadow-2xl rounded-3xl border-2 border-dashed border-indigo-500/40 bg-secondary/30 flex flex-col items-center justify-between p-4 transition-all overflow-hidden"
              style={{ aspectRatio: '9 / 16' }}
            >
              {/* Dynamic island accent */}
              <div className="w-16 h-3 bg-black/70 rounded-full border border-white/10 flex items-center justify-end px-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/70" />
              </div>

              <div className="flex flex-col items-center my-auto">
                <div className="w-12 h-12 mb-2.5 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/30 shadow-xs">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="5" y="2" width="14" height="20" rx="3" strokeWidth={1.5} />
                    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={2.5} strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-foreground">Pratinjau Studio 720 × 1280 px</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  Format Vertikal Sosmed 9:16
                </p>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed px-1">
                  Kanvas siap untuk konten TikTok, Reels, dan YouTube Shorts.
                </p>
              </div>

              {onLoadSampleClick ? (
                <Button
                  variant="brand"
                  size="sm"
                  onClick={onLoadSampleClick}
                  className="w-full text-xs h-8 shadow-xs mt-2"
                >
                  ✦ Muat Contoh Sosmed
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>


      {/* Video Scrubber Controls (Shown only when media is video) */}
      {activeItem?.type === 'video' ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-t border-border/60 bg-secondary/40">
          {/* 1. Play / Pause Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayVideo}
            title="Spasi untuk Putar/Jeda"
            className="h-8 min-w-[82px] px-2.5 text-xs font-semibold rounded-lg shrink-0 flex items-center justify-center gap-1.5 shadow-2xs border-border/80"
          >
            {isPlayingVideo ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="3.5" height="16" rx="1" />
                  <rect x="14.5" y="4" width="3.5" height="16" rx="1" />
                </svg>
                <span>Jeda</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4l14 8-14 8V4z" />
                </svg>
                <span>Putar</span>
              </>
            )}
          </Button>

          {/* 2. Timecode Badge */}
          <div className="px-2 py-1 bg-background/80 dark:bg-card/80 border border-border/60 rounded-md shadow-2xs font-mono text-xs tabular-nums tracking-tight shrink-0 flex items-center">
            <span className="text-foreground font-semibold">{formatTime(videoCurrentTime)}</span>
            <span className="text-muted-foreground/60 mx-1">/</span>
            <span className="text-muted-foreground">{formatTime(videoDuration)}</span>
          </div>

          {/* 3. Interactive Scrubber Track */}
          <div className="flex-1 min-w-[120px] flex items-center relative h-6">
            <input
              type="range"
              role="slider"
              aria-label="Posisi waktu video"
              aria-valuemin={0}
              aria-valuemax={videoDuration || 100}
              aria-valuenow={videoCurrentTime}
              aria-valuetext={`${formatTime(videoCurrentTime)} dari ${formatTime(videoDuration)}`}
              min={0}
              max={videoDuration || 100}
              step={0.033}
              value={videoCurrentTime}
              onChange={(e) => handleSliderSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-secondary dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              style={{
                background: `linear-gradient(to right, #4f46e5 ${
                  videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0
                }%, var(--secondary) ${
                  videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0
                }%)`,
              }}
            />
          </div>

          {/* 4. Frame Steppers (±1f) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => stepFrame(-1)}
              title="Mundur 1 frame (-0.033s) [Koma]"
              className="h-7 px-2 text-[11px] font-mono rounded border border-border/70 hover:bg-secondary text-foreground/80 hover:text-foreground cursor-pointer transition-colors"
            >
              ◂ 1f
            </button>
            <button
              type="button"
              onClick={() => stepFrame(1)}
              title="Maju 1 frame (+0.033s) [Titik]"
              className="h-7 px-2 text-[11px] font-mono rounded border border-border/70 hover:bg-secondary text-foreground/80 hover:text-foreground cursor-pointer transition-colors"
            >
              1f ▸
            </button>
          </div>

          {/* 5. Volume & Mute */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-border/60">
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Batal Bisukan (M)' : 'Bisukan Suara (M)'}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
            >
              {isMuted || volume === 0 ? (
                <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l4-4m0 4l-4-4" />
                </svg>
              ) : volume < 50 ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            <input
              type="range"
              role="slider"
              min={0}
              max={100}
              step={1}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              aria-label="Volume audio video"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={isMuted ? 0 : volume}
              aria-valuetext={`${isMuted ? 0 : volume} persen`}
              className="w-14 sm:w-16 h-1.5 bg-secondary dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              style={{
                background: `linear-gradient(to right, #4f46e5 ${isMuted ? 0 : volume}%, var(--secondary) ${
                  isMuted ? 0 : volume
                }%)`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
