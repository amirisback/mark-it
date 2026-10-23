'use client';

import Image from 'next/image';
import type { MediaItem } from '@/types/watermark';
import { Badge } from '@/components/ui/badge';

export interface BatchTrayProps {
  items: MediaItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onAddFilesClick: () => void;
  disabled?: boolean;
}

export function BatchTray({
  items,
  activeIndex,
  onSelect,
  onRemove,
  onClearAll,
  onAddFilesClick,
  disabled = false,
}: BatchTrayProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full bg-card border border-border/80 rounded-xl p-3 shadow-xs">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Antrean Batch
          </span>
          <Badge variant="secondary" className="text-[11px] font-mono">
            {items.length} Media
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onAddFilesClick}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
          >
            <span className="text-base font-bold leading-none">+</span> Tambah Media
          </button>
          {items.length > 0 ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onClearAll}
              className="text-xs text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Hapus Semua
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onAddFilesClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onAddFilesClick();
            }
          }}
          className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground cursor-pointer hover:border-indigo-500/60 hover:bg-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
        >
          Belum ada media. Klik di sini untuk mengunggah foto atau video.
        </div>
      ) : (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5">
          {items.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`Pilih media ${item.name}`}
                aria-pressed={isActive}
                onClick={() => onSelect(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(idx);
                  }
                }}
                className={`relative group shrink-0 w-28 rounded-lg border p-1.5 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-500/5'
                    : 'border-border/60 hover:border-border bg-secondary/30 hover:bg-secondary/60'
                }`}
              >
                {/* Thumbnail Preview */}
                <div className="relative w-full h-16 rounded overflow-hidden bg-black/10 flex items-center justify-center">
                  {item.type === 'image' ? (
                    <Image
                      src={item.objectUrl}
                      alt={item.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-[10px] font-mono mt-0.5">VIDEO</span>
                    </div>
                  )}

                  {/* Type Badge */}
                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-white font-mono text-[9px] uppercase">
                    {item.type}
                  </span>
                </div>

                {/* Info & Close */}
                <div className="mt-1 flex items-center justify-between">
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-medium truncate text-foreground leading-tight" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {formatFileSize(item.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Hapus ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:pointer-events-none transition-opacity"
                    title="Hapus media"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
