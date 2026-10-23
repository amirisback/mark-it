'use client';

import type { SocialFrameType } from '@/types/watermark';

export interface SocialFrameOverlayProps {
  frame: SocialFrameType;
  showDangerZone?: boolean;
  showUiElements?: boolean;
  opacity?: number;
}

export function SocialFrameOverlay({
  frame,
  showDangerZone = true,
  showUiElements = true,
  opacity = 0.85,
}: SocialFrameOverlayProps) {
  if (frame === 'none') return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between overflow-hidden font-sans transition-opacity duration-200"
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* 1. DANGER ZONE MASKS & SAFE ZONE BOX */}
      {showDangerZone && (
        <>
          {/* Top Header Danger Zone */}
          <div className="absolute top-0 inset-x-0 h-[14%] bg-rose-500/15 border-b border-rose-500/35 flex items-start justify-between px-3 pt-2">
            <span className="text-[9px] sm:text-[10px] font-mono tracking-wider font-semibold text-rose-300 bg-rose-950/70 border border-rose-500/40 px-1.5 py-0.5 rounded shadow-xs">
              {`ZONE BAHAYA: HEADER (${frame === 'tiktok' ? 'TIKTOK' : frame === 'reels' ? 'REELS' : 'SHORTS'})`}
            </span>
          </div>

          {/* Right Rail Interaction Buttons Danger Zone */}
          <div className="absolute top-[14%] right-0 w-[24%] sm:w-[22%] bottom-[25%] bg-rose-500/15 border-l border-rose-500/35 flex flex-col items-center justify-center p-1 text-center">
            <div className="bg-rose-950/70 border border-rose-500/40 px-1.5 py-1 rounded shadow-xs">
              <span className="text-[8px] sm:text-[9px] font-mono leading-tight font-semibold text-rose-300 block">
                ZONE BAHAYA
              </span>
              <span className="text-[7px] sm:text-[8px] font-mono text-rose-200/90 leading-tight block mt-0.5">
                Tombol Interaksi
              </span>
            </div>
          </div>

          {/* Bottom Caption & Footer Danger Zone */}
          <div className="absolute bottom-0 inset-x-0 h-[25%] bg-rose-500/15 border-t border-rose-500/35 flex items-end justify-between px-3 pb-2">
            <span className="text-[9px] sm:text-[10px] font-mono tracking-wider font-semibold text-rose-300 bg-rose-950/70 border border-rose-500/40 px-1.5 py-0.5 rounded shadow-xs">
              ZONE BAHAYA: CAPTION, PROFIL & AUDIO
            </span>
          </div>

          {/* Safe Zone Inner Boundary */}
          <div className="absolute top-[15%] left-[3%] right-[25%] sm:right-[23%] bottom-[26%] border-2 border-dashed border-emerald-400/80 rounded-lg pointer-events-none shadow-[0_0_15px_rgba(52,211,153,0.15)] flex flex-col justify-between p-2">
            <div className="flex justify-between items-start">
              <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wide text-emerald-300 bg-emerald-950/80 border border-emerald-400/50 px-1.5 py-0.5 rounded shadow-xs">
                ✓ AREA AMAN WATERMARK
              </span>
              <span className="text-[8px] font-mono text-emerald-300/80 hidden sm:inline">
                9:16 SAFE
              </span>
            </div>
            <div className="flex justify-end items-end">
              <span className="text-[7px] sm:text-[8px] font-mono text-emerald-300/80 bg-emerald-950/60 px-1 rounded">
                Bebas Halangan UI
              </span>
            </div>
          </div>
        </>
      )}

      {/* 2. REALISTIC UI OVERLAYS */}
      {showUiElements && (
        <div className="relative w-full h-full flex flex-col justify-between text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {/* ================= TIKTOK UI ================= */}
          {frame === 'tiktok' && (
            <>
              {/* Top Header */}
              <div className="pt-3 px-4 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1 opacity-90">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
                  </svg>
                  <span className="text-[11px] font-medium tracking-tight">LIVE</span>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold drop-shadow-md">
                  <span className="opacity-70 font-normal">Mengikuti</span>
                  <div className="relative flex flex-col items-center">
                    <span className="opacity-100 font-bold">Untuk Anda</span>
                    <span className="w-4 h-0.5 bg-white rounded-full mt-0.5" />
                  </div>
                </div>

                <div className="opacity-90">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Right Interaction Column */}
              <div className="absolute right-2 sm:right-3 bottom-[23%] flex flex-col items-center gap-3.5 z-10">
                {/* Avatar with Plus */}
                <div className="relative flex flex-col items-center mb-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white bg-gradient-to-tr from-cyan-400 via-rose-500 to-amber-400 flex items-center justify-center text-xs font-bold text-white shadow-md overflow-hidden">
                    <span>M</span>
                  </div>
                  <div className="absolute -bottom-1.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                    +
                  </div>
                </div>

                {/* Like */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">842.5K</span>
                </div>

                {/* Comment */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">12.3K</span>
                </div>

                {/* Bookmark */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">45.1K</span>
                </div>

                {/* Share */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">28.9K</span>
                </div>

                {/* Spinning Vinyl Record Disc */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-900 border-2 border-stone-700/80 flex items-center justify-center p-1 shadow-md">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-rose-500 border border-black flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>
              </div>

              {/* Bottom Caption & Audio */}
              <div className="pb-3 px-3 sm:px-4 max-w-[76%] space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold tracking-tight">@studio.markit</span>
                  <svg className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <p className="text-[11px] sm:text-xs leading-snug line-clamp-2 text-white/95">
                  Simulasi posisi watermark aman di TikTok tanpa terhalang UI tombol dan teks caption #watermark #editing #fyp
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <svg className="w-3 h-3 text-white fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  <span className="text-[10px] text-white/90 truncate font-medium">
                    ♫ Suara Asli - MarkIt Official Audio
                  </span>
                </div>
                {/* Thin timeline indicator */}
                <div className="w-full h-0.5 bg-white/30 rounded-full mt-1 overflow-hidden">
                  <div className="w-1/3 h-full bg-white rounded-full" />
                </div>
              </div>
            </>
          )}

          {/* ================= INSTAGRAM REELS UI ================= */}
          {frame === 'reels' && (
            <>
              {/* Top Header */}
              <div className="pt-3 px-4 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight">Reels</span>
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div className="opacity-90">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </div>

              {/* Right Interaction Column */}
              <div className="absolute right-2 sm:right-3 bottom-[23%] flex flex-col items-center gap-3.5 z-10">
                {/* Like Heart */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white fill-none stroke-white drop-shadow-md" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">120K</span>
                </div>

                {/* Comment Bubble */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white fill-none stroke-white drop-shadow-md" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">1.5K</span>
                </div>

                {/* Share Airplane */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white fill-none stroke-white drop-shadow-md" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">4.8K</span>
                </div>

                {/* Three Dots Menu */}
                <div className="w-8 h-8 flex items-center justify-center text-white font-bold text-lg">
                  •••
                </div>

                {/* Audio Square Artwork */}
                <div className="w-7 h-7 rounded border border-white/80 bg-neutral-800 flex items-center justify-center shadow-md">
                  <div className="w-3.5 h-3.5 rounded-full bg-white/80 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-neutral-900" />
                  </div>
                </div>
              </div>

              {/* Bottom Caption & Audio */}
              <div className="pb-3 px-3 sm:px-4 max-w-[76%] space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600">
                    <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-[10px] font-bold">
                      M
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-bold tracking-tight">studio.markit</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-white/60 bg-white/10">
                    Ikuti
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs leading-snug line-clamp-2 text-white/95">
                  Pastikan logo atau teks watermark berada di zona aman Instagram Reels agar tidak tertutup tombol... <span className="opacity-70">selengkapnya</span>
                </p>
                <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-white/90">
                  <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  <span className="font-medium truncate">Original audio • studio.markit</span>
                </div>
              </div>
            </>
          )}

          {/* ================= YOUTUBE SHORTS UI ================= */}
          {frame === 'shorts' && (
            <>
              {/* Top Header */}
              <div className="pt-3 px-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5 text-red-600 fill-red-600" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                  <span className="text-xs font-bold tracking-tight">Shorts</span>
                </div>

                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </div>
              </div>

              {/* Right Interaction Column */}
              <div className="absolute right-2 sm:right-3 bottom-[23%] flex flex-col items-center gap-3.5 z-10">
                {/* Thumbs Up Like */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">350K</span>
                </div>

                {/* Thumbs Down Dislike */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold mt-0.5">Tidak suka</span>
                </div>

                {/* Comments */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">2.4K</span>
                </div>

                {/* Share */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold mt-0.5">Bagikan</span>
                </div>

                {/* Remix */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold mt-0.5">Remix</span>
                </div>

                {/* Sound Box */}
                <div className="w-7 h-7 rounded border border-white/60 bg-red-950/70 flex items-center justify-center shadow-md">
                  <div className="w-2.5 h-2.5 rounded-sm bg-white" />
                </div>
              </div>

              {/* Bottom Caption & Channel */}
              <div className="pb-3 px-3 sm:px-4 max-w-[76%] space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-neutral-800 border border-white/80 flex items-center justify-center text-[10px] font-bold">
                    M
                  </div>
                  <span className="text-xs sm:text-sm font-bold tracking-tight">@MarkItStudio</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-600 text-white shadow-xs">
                    Subscribe
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs leading-snug line-clamp-2 text-white/95">
                  Posisi watermark di YouTube Shorts tanpa kehalang tombol interaksi jempol dan tombol subscribe!
                </p>
                <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-white/90">
                  <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  <span className="font-medium truncate">MarkIt - Audio Library Official</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
