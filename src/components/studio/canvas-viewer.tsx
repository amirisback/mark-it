'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { MediaItem, WatermarkFullConfig } from '@/types/watermark';
import {
  drawWatermarkOnCanvas,
  loadImageAsync,
  applyPristineCanvasSmoothing,
} from '@/lib/watermark-engine';
import { Button } from '@/components/ui/button';

export interface CanvasViewerProps {
  activeItem: MediaItem | null;
  config: WatermarkFullConfig;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onVideoElementReady?: (video: HTMLVideoElement | null) => void;
}

export function CanvasViewer({
  activeItem,
  config,
  onCanvasReady,
  onVideoElementReady,
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

  // Render loop for static image
  const renderImage = useCallback(
    async (item: MediaItem) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const img = await loadImageAsync(item.objectUrl);
        if (showOriginal) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            applyPristineCanvasSmoothing(ctx);
            ctx.drawImage(img, 0, 0);
          }
        } else {
          drawWatermarkOnCanvas(canvas, img, img.width, img.height, config, logoImageElement);
        }
        if (onCanvasReady) onCanvasReady(canvas);
      } catch (err) {
        console.error('Error rendering image to canvas:', err);
      }
    },
    [config, logoImageElement, showOriginal, onCanvasReady]
  );

  // Render frame for video
  const renderVideoFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;

    if (showOriginal) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = width;
        canvas.height = height;
        applyPristineCanvasSmoothing(ctx);
        ctx.drawImage(video, 0, 0, width, height);
      }
    } else {
      drawWatermarkOnCanvas(canvas, video, width, height, config, logoImageElement);
    }

    if (onCanvasReady) onCanvasReady(canvas);
  }, [config, logoImageElement, showOriginal, onCanvasReady]);

  // Continuous animation frame loop during video playback
  useEffect(() => {
    if (activeItem?.type === 'video' && isPlayingVideo) {
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
  }, [activeItem?.type, isPlayingVideo, renderVideoFrame]);

  // Trigger render when active item or config changes, pausing and cleaning previous media
  const prevItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeItem) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      return;
    }

    if (prevItemIdRef.current !== activeItem.id) {
      prevItemIdRef.current = activeItem.id;
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
      setVideoDuration(video.duration || 0);
      video.currentTime = 0.1; // Seek slightly forward to grab poster frame
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
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-secondary/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Pratinjau Studio
          </span>
          {activeItem ? (
            <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/50">
              {activeItem.width} × {activeItem.height} px
            </span>
          ) : null}
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowOriginal(!showOriginal)}
            className={`px-2.5 py-1 text-xs rounded-md border font-medium cursor-pointer transition-colors ${
              showOriginal
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-background hover:bg-secondary text-muted-foreground border-border/60'
            }`}
            title="Tahan untuk melihat file asli tanpa watermark"
          >
            {showOriginal ? 'Mode Asli' : 'Bandingkan Asli'}
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel((z) => Math.max(25, z - 15))}
            title="Perkecil"
            className="h-7 px-2 text-xs"
          >
            -
          </Button>
          <span className="text-[11px] font-mono text-muted-foreground w-12 text-center">
            {zoomLevel}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
            title="Perbesar"
            className="h-7 px-2 text-xs"
          >
            +
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel(100)}
            title="Reset ke 100%"
            className="h-7 px-2 text-xs"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] max-h-[640px] overflow-auto canvas-checkerboard flex items-center justify-center p-4">
        {/* Hidden video decoder element */}
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          playsInline
          muted={isMuted}
          className="hidden"
          onLoadedMetadata={handleLoadedVideoMetadata}
          onSeeked={handleVideoSeeked}
          onEnded={() => setIsPlayingVideo(false)}
          onPause={() => setIsPlayingVideo(false)}
          onPlay={() => setIsPlayingVideo(true)}
        />

        {activeItem ? (
          <div
            className="transition-transform duration-100 ease-out shadow-2xl rounded-sm overflow-hidden"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas ref={canvasRef} className="block max-w-full h-auto bg-transparent" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm text-muted-foreground">
            <div className="w-16 h-16 mb-3 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Kanvas Kosong</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pilih salah satu file di antrean batch atau unggah media baru untuk melihat pratinjau watermark.
            </p>
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
              min={0}
              max={100}
              step={1}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              aria-label="Volume audio video"
              className="w-14 sm:w-16 h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
