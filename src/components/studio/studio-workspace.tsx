'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  MediaItem,
  WatermarkFullConfig,
  ExportSettings,
  WatermarkPreset,
  SocialFrameType,
} from '@/types/watermark';
import { DEFAULT_WATERMARK_CONFIG } from '@/data/presets';
import {
  drawWatermarkOnCanvas,
  loadImageAsync,
  exportCanvasToBlob,
  triggerFileDownload,
  exportWatermarkedVideoAsync,
  captureNativeVideoFrameAsync,
} from '@/lib/watermark-engine';
import { BatchTray } from './batch-tray';
import { CanvasViewer } from './canvas-viewer';
import { InspectorPanel } from './inspector-panel';
import { ExportBar, type VideoProgressInfo } from './export-bar';
import { Button } from '@/components/ui/button';

export function StudioWorkspace() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [config, setConfig] = useState<WatermarkFullConfig>(DEFAULT_WATERMARK_CONFIG);
  const [socialFrame, setSocialFrame] = useState<SocialFrameType>('none');
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'image/png',
    videoFormat: 'video/mp4',
    videoMode: 'full_video',
    quality: 0.95,
    videoQuality: 'maximum',
    videoQualityProfile: 'maximum',
    customPrefix: 'watermarked_',
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [videoProgress, setVideoProgress] = useState<VideoProgressInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeItem = items[activeIndex] || null;

  const itemsRef = useRef<MediaItem[]>([]);
  const logoUrlRef = useRef<string | null>(config.logo.logoUrl);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    logoUrlRef.current = config.logo.logoUrl;
  }, [config.logo.logoUrl]);

  // Cleanup object URLs and active exports strictly on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      itemsRef.current.forEach((item) => {
        if (item.objectUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.objectUrl);
        }
      });
      if (logoUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(logoUrlRef.current);
      }
    };
  }, []);

  // Process files from input or drag-and-drop
  const handleAddFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newItems: MediaItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const mime = file.type.toLowerCase();
      const isVideo = mime.startsWith('video/');
      const isImage = mime.startsWith('image/');

      if (!isVideo && !isImage) continue;

      const objectUrl = URL.createObjectURL(file);
      const id = `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (isImage) {
        try {
          const img = await loadImageAsync(objectUrl);
          newItems.push({
            id,
            file,
            name: file.name,
            size: file.size,
            type: 'image',
            mimeType: file.type,
            objectUrl,
            width: img.width,
            height: img.height,
            status: 'ready',
          });
        } catch {
          // If image decode fails, fallback to default dimensions
          newItems.push({
            id,
            file,
            name: file.name,
            size: file.size,
            type: 'image',
            mimeType: file.type,
            objectUrl,
            width: 1920,
            height: 1080,
            status: 'ready',
          });
        }
      } else if (isVideo) {
        await new Promise<void>((resolve) => {
          let settled = false;
          const tempVideo = document.createElement('video');
          tempVideo.preload = 'metadata';
          const releaseTemp = () => {
            tempVideo.onloadedmetadata = null;
            tempVideo.onerror = null;
            tempVideo.removeAttribute('src');
            try {
              tempVideo.load();
            } catch {
              // Ignore in mock environments
            }
          };
          const fallbackTimer = setTimeout(() => {
            if (settled) return;
            settled = true;
            newItems.push({
              id,
              file,
              name: file.name,
              size: file.size,
              type: 'video',
              mimeType: file.type,
              objectUrl,
              width: 1280,
              height: 720,
              status: 'ready',
            });
            releaseTemp();
            resolve();
          }, 5000);

          tempVideo.onloadedmetadata = () => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            newItems.push({
              id,
              file,
              name: file.name,
              size: file.size,
              type: 'video',
              mimeType: file.type,
              objectUrl,
              width: tempVideo.videoWidth || 1280,
              height: tempVideo.videoHeight || 720,
              duration:
                Number.isFinite(tempVideo.duration) && tempVideo.duration > 0
                  ? tempVideo.duration
                  : 0,
              status: 'ready',
            });
            releaseTemp();
            resolve();
          };
          tempVideo.onerror = () => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            newItems.push({
              id,
              file,
              name: file.name,
              size: file.size,
              type: 'video',
              mimeType: file.type,
              objectUrl,
              width: 1280,
              height: 720,
              status: 'ready',
            });
            releaseTemp();
            resolve();
          };
          tempVideo.src = objectUrl;
        });
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => {
        const next = [...prev, ...newItems];
        return next;
      });
    }
  }, []);

  // Remove single media with accurate active index clamping
  const handleRemoveItem = (id: string) => {
    if (isProcessing) return;
    const removeIndex = items.findIndex((item) => item.id === id);
    if (removeIndex === -1) return;

    const item = items[removeIndex];
    if (item && item.objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.objectUrl);
    }

    const next = items.filter((_, idx) => idx !== removeIndex);
    setItems(next);
    setActiveIndex((curr) => {
      if (next.length === 0) return 0;
      if (removeIndex < curr) return curr - 1;
      if (removeIndex === curr) return Math.min(curr, next.length - 1);
      return curr;
    });
  };

  // Clear all media
  const handleClearAll = () => {
    if (isProcessing) return;
    items.forEach((item) => {
      if (item.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.objectUrl);
      }
    });
    setItems([]);
    setActiveIndex(0);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Apply preset
  const handleApplyPreset = useCallback((preset: WatermarkPreset) => {
    setConfig((prev) => {
      if (
        preset.config.logo &&
        preset.config.logo.logoUrl !== prev.logo.logoUrl &&
        prev.logo.logoUrl &&
        prev.logo.logoUrl.startsWith('blob:')
      ) {
        URL.revokeObjectURL(prev.logo.logoUrl);
      }
      return {
        ...prev,
        text: preset.config.text ? { ...prev.text, ...preset.config.text } : prev.text,
        logo: preset.config.logo ? { ...prev.logo, ...preset.config.logo } : prev.logo,
        frame: preset.config.frame ? { ...prev.frame, ...preset.config.frame } : prev.frame,
      };
    });
  }, []);

  useEffect(() => {
    const onExternalPreset = (e: Event) => {
      const customEvent = e as CustomEvent<WatermarkPreset>;
      if (customEvent.detail) {
        handleApplyPreset(customEvent.detail);
      }
    };
    window.addEventListener('markit:apply-preset', onExternalPreset);
    return () => {
      window.removeEventListener('markit:apply-preset', onExternalPreset);
    };
  }, [handleApplyPreset]);

  const formatSeconds = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setProgressText('');
    setVideoProgress(null);
  };

  // Download active file
  const handleDownloadActive = async () => {
    if (!activeItem) return;
    if (activeVideoElementRef.current && !activeVideoElementRef.current.paused) {
      activeVideoElementRef.current.pause();
    }
    setExportError(null);
    setIsProcessing(true);
    setProgressText('Menyiapkan file...');
    setVideoProgress(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const startTime = Date.now();

    try {
      let logoImg: HTMLImageElement | null = null;
      if (config.logo.enabled && config.logo.logoUrl) {
        logoImg = await loadImageAsync(config.logo.logoUrl).catch(() => null);
      }

      if (activeItem.type === 'image') {
        setProgressText('Merender gambar...');
        const offscreenCanvas = document.createElement('canvas');
        const img = await loadImageAsync(activeItem.objectUrl);
        drawWatermarkOnCanvas(
          offscreenCanvas,
          img,
          activeItem.width,
          activeItem.height,
          config,
          logoImg
        );
        const blob = await exportCanvasToBlob(
          offscreenCanvas,
          exportSettings.format,
          exportSettings.quality
        );
        const extension =
          exportSettings.format === 'image/png'
            ? '.png'
            : exportSettings.format === 'image/jpeg'
            ? '.jpg'
            : '.webp';
        const cleanName = activeItem.name.replace(/\.[^/.]+$/, '');
        triggerFileDownload(blob, `${exportSettings.customPrefix}${cleanName}${extension}`);
      } else if (activeItem.type === 'video') {
        if (exportSettings.videoMode === 'single_frame') {
          // Single frame image capture directly from native video buffer
          setProgressText('Menyimpan frame video kualitas native...');
          const videoEl = activeVideoElementRef.current;
          if (!videoEl) {
            throw new Error('Elemen pemutar video belum siap.');
          }
          const blob = await captureNativeVideoFrameAsync(
            videoEl,
            config,
            logoImg,
            exportSettings.format,
            exportSettings.quality,
            activeItem.width,
            activeItem.height
          );
          const extension =
            exportSettings.format === 'image/png'
              ? '.png'
              : exportSettings.format === 'image/jpeg'
              ? '.jpg'
              : '.webp';
          const cleanName = activeItem.name.replace(/\.[^/.]+$/, '');
          triggerFileDownload(blob, `${exportSettings.customPrefix}${cleanName}_frame${extension}`);
        } else {
          // Full video export with watermark & audio
          setProgressText('Memulai rendering video...');
          const videoEl = activeVideoElementRef.current;
          if (!videoEl) {
            throw new Error('Elemen pemutar video belum siap.');
          }

          const blob = await exportWatermarkedVideoAsync({
            videoElement: videoEl,
            sourceWidth: activeItem.width,
            sourceHeight: activeItem.height,
            duration: activeItem.duration || videoEl.duration || 0,
            config,
            logoImg,
            mimeType: exportSettings.videoFormat,
            qualityPreset:
              exportSettings.videoQuality || exportSettings.videoQualityProfile || 'maximum',
            signal: abortController.signal,
            onProgress: (p) => {
              const elapsedSec = (Date.now() - startTime) / 1000;
              let estRemaining = 0;
              if (p.percent > 0) {
                const totalEstimatedSec = elapsedSec / (p.percent / 100);
                estRemaining = Math.max(0, totalEstimatedSec - elapsedSec);
              }
              setVideoProgress({
                percent: p.percent,
                currentTime: p.currentTime,
                totalTime: p.totalTime,
                elapsedFormatted: formatSeconds(elapsedSec),
                remainingFormatted: formatSeconds(estRemaining),
              });
              setProgressText(
                `Memproses frame (${formatSeconds(p.currentTime)} / ${formatSeconds(p.totalTime)})`
              );
            },
          });

          const ext =
            exportSettings.videoFormat === 'video/mp4' || blob.type.includes('mp4')
              ? '.mp4'
              : '.webm';
          const cleanName = activeItem.name.replace(/\.[^/.]+$/, '');
          triggerFileDownload(blob, `${exportSettings.customPrefix}${cleanName}${ext}`);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Video export aborted by user');
      } else {
        console.error('Download active failed:', err);
        setExportError(
          `Terjadi kesalahan saat mengekspor: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } finally {
      setIsProcessing(false);
      setProgressText('');
      setVideoProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Download all files in batch sequentially
  const handleDownloadAll = async () => {
    if (items.length === 0) return;
    if (activeVideoElementRef.current && !activeVideoElementRef.current.paused) {
      activeVideoElementRef.current.pause();
    }
    setExportError(null);
    setIsProcessing(true);
    setProgressText(`Menyiapkan 1 dari ${items.length} file...`);
    setVideoProgress(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let logoImg: HTMLImageElement | null = null;
    if (config.logo.enabled && config.logo.logoUrl) {
      logoImg = await loadImageAsync(config.logo.logoUrl).catch(() => null);
    }

    try {
      for (let i = 0; i < items.length; i++) {
        if (abortController.signal.aborted) break;

        const item = items[i];
        const cleanName = item.name.replace(/\.[^/.]+$/, '');
        const itemStartTime = Date.now();

        if (item.type === 'image') {
          setProgressText(`Merender gambar ${i + 1}/${items.length}: ${item.name}`);
          const offscreenCanvas = document.createElement('canvas');
          const img = await loadImageAsync(item.objectUrl);
          drawWatermarkOnCanvas(
            offscreenCanvas,
            img,
            item.width,
            item.height,
            config,
            logoImg
          );
          const blob = await exportCanvasToBlob(
            offscreenCanvas,
            exportSettings.format,
            exportSettings.quality
          );
          const extension =
            exportSettings.format === 'image/png'
              ? '.png'
              : exportSettings.format === 'image/jpeg'
              ? '.jpg'
              : '.webp';
          triggerFileDownload(blob, `${exportSettings.customPrefix}${cleanName}${extension}`);
        } else if (item.type === 'video') {
          const batchVideoUrl = item.file ? URL.createObjectURL(item.file) : item.objectUrl;

          if (exportSettings.videoMode === 'single_frame') {
            setProgressText(`Menyimpan frame video ${i + 1}/${items.length}: ${item.name}`);
            const v = document.createElement('video');
            if (!batchVideoUrl.startsWith('blob:') && !batchVideoUrl.startsWith('data:')) {
              v.crossOrigin = 'anonymous';
            }
            v.preload = 'auto';
            v.playsInline = true;
            v.style.position = 'fixed';
            v.style.bottom = '0px';
            v.style.right = '0px';
            v.style.width = '64px';
            v.style.height = '64px';
            v.style.opacity = '0.05';
            v.style.pointerEvents = 'none';
            v.style.zIndex = '50';
            document.body.appendChild(v);

            try {
              await new Promise<void>((resolve, reject) => {
                let isSettled = false;
                const timeout = setTimeout(() => {
                  if (!isSettled) {
                    isSettled = true;
                    reject(new Error(`Batas waktu (timeout) memuat frame video: ${item.name}`));
                  }
                }, 12000);

                const onAbort = () => {
                  if (!isSettled) {
                    isSettled = true;
                    clearTimeout(timeout);
                    reject(new DOMException('Batch ekspor dibatalkan.', 'AbortError'));
                  }
                };
                if (abortController.signal.aborted) {
                  clearTimeout(timeout);
                  reject(new DOMException('Batch ekspor dibatalkan.', 'AbortError'));
                  return;
                }
                abortController.signal.addEventListener('abort', onAbort, { once: true });

                v.onloadeddata = () => {
                  if (isSettled) return;
                  const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 1;
                  const targetTime = Math.min(0.5, dur / 2);
                  if (Math.abs(v.currentTime - targetTime) < 0.01) {
                    v.dispatchEvent(new Event('seeked'));
                  } else {
                    v.currentTime = targetTime;
                  }
                };

                v.onseeked = async () => {
                  if (isSettled) return;
                  try {
                    const blob = await captureNativeVideoFrameAsync(
                      v,
                      config,
                      logoImg,
                      exportSettings.format,
                      exportSettings.quality,
                      v.videoWidth || item.width,
                      v.videoHeight || item.height
                    );
                    const extension =
                      exportSettings.format === 'image/png'
                        ? '.png'
                        : exportSettings.format === 'image/jpeg'
                        ? '.jpg'
                        : '.webp';
                    triggerFileDownload(
                      blob,
                      `${exportSettings.customPrefix}${cleanName}_frame${extension}`
                    );
                    isSettled = true;
                    clearTimeout(timeout);
                    abortController.signal.removeEventListener('abort', onAbort);
                    resolve();
                  } catch (e) {
                    isSettled = true;
                    clearTimeout(timeout);
                    abortController.signal.removeEventListener('abort', onAbort);
                    reject(e);
                  }
                };

                v.onerror = (e) => {
                  if (isSettled) return;
                  isSettled = true;
                  clearTimeout(timeout);
                  abortController.signal.removeEventListener('abort', onAbort);
                  reject(new Error(`Gagal memuat video batch: ${String(e)}`));
                };

                v.src = batchVideoUrl;
                v.load();
              });
            } finally {
              v.pause();
              v.removeAttribute('src');
              v.load();
              v.remove();
              if (batchVideoUrl !== item.objectUrl && batchVideoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(batchVideoUrl);
              }
            }
          } else {
            // Full video export for batch
            setProgressText(`Merender video ${i + 1}/${items.length}: ${item.name}`);
            const tempVideo = document.createElement('video');
            if (!batchVideoUrl.startsWith('blob:') && !batchVideoUrl.startsWith('data:')) {
              tempVideo.crossOrigin = 'anonymous';
            }
            tempVideo.preload = 'auto';
            tempVideo.playsInline = true;
            tempVideo.style.position = 'fixed';
            tempVideo.style.bottom = '0px';
            tempVideo.style.right = '0px';
            tempVideo.style.width = '64px';
            tempVideo.style.height = '64px';
            tempVideo.style.opacity = '0.05';
            tempVideo.style.pointerEvents = 'none';
            tempVideo.style.zIndex = '50';
            document.body.appendChild(tempVideo);

            try {
              await new Promise<void>((resolve, reject) => {
                let isSettled = false;
                const timeout = setTimeout(() => {
                  if (!isSettled) {
                    isSettled = true;
                    reject(new Error(`Batas waktu (timeout) memuat data video: ${item.name}`));
                  }
                }, 12000);

                const finishReady = () => {
                  if (isSettled) return;
                  isSettled = true;
                  clearTimeout(timeout);
                  abortController.signal.removeEventListener('abort', onAbort);
                  resolve();
                };

                const onAbort = () => {
                  if (!isSettled) {
                    isSettled = true;
                    clearTimeout(timeout);
                    reject(new DOMException('Batch ekspor dibatalkan.', 'AbortError'));
                  }
                };
                if (abortController.signal.aborted) {
                  clearTimeout(timeout);
                  reject(new DOMException('Batch ekspor dibatalkan.', 'AbortError'));
                  return;
                }
                abortController.signal.addEventListener('abort', onAbort, { once: true });

                // Tunggu hingga data frame video siap (loadeddata) lalu lakukan prime seek singkat
                // agar hardware video decoder mem-buffer frame ke GPU sebelum perekaman dimulai
                tempVideo.onloadeddata = () => {
                  if (isSettled) return;
                  const dur =
                    Number.isFinite(tempVideo.duration) && tempVideo.duration > 0
                      ? tempVideo.duration
                      : 1;
                  const primeTime = Math.min(0.05, dur * 0.1);
                  if (primeTime > 0) {
                    const seekFallback = setTimeout(finishReady, 800);
                    tempVideo.onseeked = () => {
                      clearTimeout(seekFallback);
                      tempVideo.onseeked = null;
                      finishReady();
                    };
                    tempVideo.currentTime = primeTime;
                  } else {
                    finishReady();
                  }
                };
                tempVideo.onerror = (e) => {
                  if (isSettled) return;
                  isSettled = true;
                  clearTimeout(timeout);
                  abortController.signal.removeEventListener('abort', onAbort);
                  reject(new Error(`Gagal memuat data video: ${String(e)}`));
                };
                tempVideo.src = batchVideoUrl;
                tempVideo.load();
              });

              const blob = await exportWatermarkedVideoAsync({
                videoElement: tempVideo,
                sourceWidth: tempVideo.videoWidth || item.width,
                sourceHeight: tempVideo.videoHeight || item.height,
                duration: item.duration || tempVideo.duration || 0,
                config,
                logoImg,
                mimeType: exportSettings.videoFormat,
                qualityPreset:
                  exportSettings.videoQuality || exportSettings.videoQualityProfile || 'maximum',
                signal: abortController.signal,
                onProgress: (p) => {
                  const elapsedSec = (Date.now() - itemStartTime) / 1000;
                  let estRemaining = 0;
                  if (p.percent > 0) {
                    const totalEst = elapsedSec / (p.percent / 100);
                    estRemaining = Math.max(0, totalEst - elapsedSec);
                  }
                  setVideoProgress({
                    percent: p.percent,
                    currentTime: p.currentTime,
                    totalTime: p.totalTime,
                    elapsedFormatted: formatSeconds(elapsedSec),
                    remainingFormatted: formatSeconds(estRemaining),
                  });
                  setProgressText(
                    `Video ${i + 1}/${items.length} (${p.percent}%): ${formatSeconds(
                      p.currentTime
                    )}/${formatSeconds(p.totalTime)}`
                  );
                },
              });

              const ext =
                exportSettings.videoFormat === 'video/mp4' || blob.type.includes('mp4')
                  ? '.mp4'
                  : '.webm';
              triggerFileDownload(blob, `${exportSettings.customPrefix}${cleanName}${ext}`);
            } finally {
              tempVideo.pause();
              tempVideo.removeAttribute('src');
              tempVideo.load();
              tempVideo.remove();
              if (batchVideoUrl !== item.objectUrl && batchVideoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(batchVideoUrl);
              }
            }
          }
        }

        // Small pause between browser download requests to prevent browser throttle
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Batch export aborted');
      } else {
        console.error('Download all failed:', err);
        setExportError(
          `Terjadi kesalahan saat batch ekspor: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } finally {
      setIsProcessing(false);
      setProgressText('');
      setVideoProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Helper to load sample test images directly (720x1280 px vertical for social media)
  const loadSampleImage = useCallback(
    async (aspect: 'vertical' | 'landscape' = 'vertical') => {
      const isVertical = aspect === 'vertical';
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = isVertical ? 720 : 1600;
      sampleCanvas.height = isVertical ? 1280 : 1000;
      const ctx = sampleCanvas.getContext('2d');
      if (!ctx) return;

      // Stylish camera/studio darkroom gradient
      const grad = ctx.createLinearGradient(0, 0, sampleCanvas.width, sampleCanvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.3, '#1e1b4b');
      grad.addColorStop(0.7, '#312e81');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, sampleCanvas.width, sampleCanvas.height);

      // Decorative geometric aperture rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        sampleCanvas.width / 2,
        sampleCanvas.height / 2,
        isVertical ? 240 : 320,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        sampleCanvas.width / 2,
        sampleCanvas.height / 2,
        isVertical ? 160 : 220,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Central label
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(
        isVertical ? 'Sample Media Vertikal 9:16' : 'MarkIt Studio Sample Media',
        sampleCanvas.width / 2,
        sampleCanvas.height / 2 - 20
      );
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(
        isVertical
          ? '720 × 1280 • TikTok / Reels / Shorts Ready'
          : '1600 × 1000 • Studio Testing Landscape',
        sampleCanvas.width / 2,
        sampleCanvas.height / 2 + 30
      );

      sampleCanvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File(
          [blob],
          isVertical ? 'contoh_vertikal_9-16.png' : 'contoh_foto_studio.png',
          { type: 'image/png' }
        );
        if (isVertical && socialFrame === 'none') {
          setSocialFrame('tiktok');
        }
        await handleAddFiles([file]);
      });
    },
    [handleAddFiles, socialFrame]
  );

  return (
    <section
      id="studio"
      className="scroll-mt-20 py-5 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Studio Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Studio Editor Watermark
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              Client-Side Active
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unggah foto/video, atur watermark teks, logo, atau bingkai, dan unduh hasilnya secara instan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSampleImage('vertical')}
            className="text-xs border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            title="Muat media vertikal 9:16 untuk simulasi TikTok, Reels, atau Shorts"
          >
            ✦ Contoh 9:16 Sosmed
          </Button>

          <Button
            variant="brand"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs shadow-xs"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Unggah File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4,video/webm"
            onChange={(e) => {
              if (e.target.files) {
                handleAddFiles(e.target.files);
              }
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* Dismissible Export Error Banner */}
      {exportError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm"
        >
          <span className="font-medium">{exportError}</span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            aria-label="Tutup pesan kesalahan"
            className="px-2 py-1 rounded-md hover:bg-destructive/20 font-semibold cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      ) : null}

      {/* Drag & Drop Overlay Indicator */}
      {isDragOver ? (
        <div className="fixed inset-0 z-50 bg-indigo-950/80 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-indigo-400 text-white p-8">
          <svg
            className="w-16 h-16 mb-4 animate-bounce text-indigo-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <h3 className="text-2xl font-bold">Lepaskan File di Sini</h3>
          <p className="text-sm text-indigo-200 mt-1">
            Mendukung batch foto (PNG, JPG, WebP) dan video (MP4, WebM)
          </p>
        </div>
      ) : null}

      {/* Batch Tray (Horizontal Carousel) */}
      <BatchTray
        items={items}
        activeIndex={activeIndex}
        onSelect={(idx) => setActiveIndex(idx)}
        onRemove={handleRemoveItem}
        onClearAll={handleClearAll}
        onAddFilesClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
      />

      {/* Main Studio Workspace: Left = Live Canvas, Right = Inspector Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Canvas Preview Viewport (6 Cols on desktop) */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col h-full">
          <CanvasViewer
            activeItem={activeItem}
            config={config}
            socialFrame={socialFrame}
            onSocialFrameChange={setSocialFrame}
            onVideoElementReady={(v) => {
              activeVideoElementRef.current = v;
            }}
            onLoadSampleClick={() => loadSampleImage('vertical')}
            isProcessing={isProcessing}
          />
        </div>

        {/* Right Column: Watermark Controls Inspector (6 Cols on desktop) */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col h-full">
          <InspectorPanel
            config={config}
            onChange={(updated) => setConfig(updated)}
            onApplyPreset={handleApplyPreset}
            socialFrame={socialFrame}
            onSocialFrameChange={setSocialFrame}
          />
        </div>
      </div>

      {/* Bottom Export Bar */}
      <ExportBar
        settings={exportSettings}
        onSettingsChange={setExportSettings}
        onDownloadActive={handleDownloadActive}
        onDownloadAll={handleDownloadAll}
        hasActiveItem={activeItem !== null}
        activeItemType={activeItem?.type}
        sourceWidth={activeItem?.width}
        sourceHeight={activeItem?.height}
        totalItems={items.length}
        isProcessing={isProcessing}
        progressText={progressText}
        videoProgress={videoProgress}
        onCancelExport={handleCancelExport}
      />
    </section>
  );
}
