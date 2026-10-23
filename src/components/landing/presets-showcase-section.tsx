'use client';

import { WATERMARK_PRESETS } from '@/data/presets';
import { Badge } from '@/components/ui/badge';

export function PresetsShowcaseSection() {
  return (
    <section id="presets" className="scroll-mt-20 py-16 md:py-24 border-b border-border/40 bg-secondary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <span className="text-xs uppercase font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">
            Galeri Template
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mt-1">
            Preset Siap Pakai Untuk Segala Kebutuhan
          </h2>
          <p className="text-base text-muted-foreground mt-2">
            Dari tanda tangan fotografi halus hingga pola ubin anti-AI scraper, pilih gaya yang sesuai dengan tujuan Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WATERMARK_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="p-6 rounded-2xl border border-border/80 bg-card hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-foreground text-base">
                    {preset.name}
                  </h3>
                  <Badge variant="brand">{preset.badge}</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {preset.description}
                </p>
              </div>

              {/* Visual mini-mockup of the preset */}
              <div className="w-full h-24 rounded-lg bg-zinc-900 border border-zinc-800 p-3 flex flex-col justify-between overflow-hidden relative select-none">
                {preset.config.text?.tile ? (
                  <div className="absolute inset-0 flex items-center justify-center opacity-30 text-[9px] text-white font-mono rotate-[-25deg] tracking-widest whitespace-nowrap">
                    PREVIEW • DO NOT COPY • PREVIEW • DO NOT COPY
                  </div>
                ) : null}

                {preset.config.frame?.enabled ? (
                  <div className="absolute inset-1.5 border border-white/60 pointer-events-none" />
                ) : null}

                <div className="text-[10px] text-zinc-500 font-mono">Sample 1920×1080</div>

                <div
                  className={`text-[10px] font-bold ${
                    preset.config.text?.position?.grid === 'top-left'
                      ? 'self-start'
                      : preset.config.text?.position?.grid === 'center'
                      ? 'self-center my-auto'
                      : 'self-end'
                  }`}
                  style={{
                    color: preset.config.text?.color || '#ffffff',
                    opacity: preset.config.text?.opacity || 0.8,
                  }}
                >
                  {preset.config.text?.text || preset.config.frame?.metaText || 'MarkIt Watermark'}
                </div>
              </div>

              <a
                href="#studio"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('markit:apply-preset', { detail: preset })
                  );
                }}
                className="w-full inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-border bg-transparent text-foreground hover:bg-secondary/60 h-8 px-3 text-xs gap-1.5"
              >
                Gunakan di Studio Editor
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
