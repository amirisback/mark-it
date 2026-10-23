'use client';

import { useState } from 'react';

const FAQ_ITEMS = [
  {
    q: 'Apakah foto atau video saya diunggah ke internet atau disimpan di cloud?',
    a: 'Sama sekali tidak! MarkIt Studio bekerja 100% secara client-side menggunakan HTML5 Canvas dan Web APIs modern di dalam peramban Anda. Media tidak pernah dikirim keluar dari memori lokal perangkat Anda, sehingga privasi Anda terjamin aman.',
  },
  {
    q: 'Berapa banyak foto yang bisa saya watermark sekaligus (Batch)?',
    a: 'Anda dapat memproses puluhan foto dalam satu antrean batch sekaligus. Karena proses render terjadi langsung di perangkat Anda, batasannya hanya bergantung pada kapasitas memori RAM perangkat yang Anda gunakan.',
  },
  {
    q: 'Format file apa saja yang didukung oleh MarkIt Studio?',
    a: 'Untuk foto/gambar: PNG, JPEG, WebP, dan SVG. Untuk video: MP4 dan WebM yang didukung secara native oleh browser.',
  },
  {
    q: 'Apakah ketajaman dan resolusi asli gambar akan berkurang saat diekspor?',
    a: 'Tidak. Watermark digambar langsung pada dimensi piksel asli dari gambar sumber, sehingga resolusi tinggi dan ketajaman foto tetap terjaga secara penuh. Anda juga dapat memilih format ekspor PNG (lossless) atau JPEG/WebP dengan kualitas hingga 100%.',
  },
  {
    q: 'Apakah MarkIt Studio dapat digunakan di perangkat smartphone/tablet?',
    a: 'Tentu saja! Antarmuka MarkIt didesain mobile-first responsif, mendukung sentuhan drag-and-drop, dan dapat diinstal ke layar beranda ponsel Anda sebagai Progressive Web App (PWA).',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">
            Pusat Informasi
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mt-1">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="text-base text-muted-foreground mt-2">
            Segala informasi teknis tentang privasi, format file, dan cara kerja MarkIt Studio.
          </p>
        </div>

        <div className="space-y-3.5">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.q}
                className="rounded-xl border border-border/70 bg-card overflow-hidden transition-all"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm sm:text-base font-semibold text-foreground hover:bg-secondary/40 cursor-pointer transition-colors"
                >
                  <span>{item.q}</span>
                  <span className="ml-4 shrink-0 text-muted-foreground">
                    <svg
                      className={`w-5 h-5 transform transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </button>

                {isOpen ? (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-secondary/10">
                    <p className="pt-3">{item.a}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
