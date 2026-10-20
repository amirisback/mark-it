import React from 'react';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: '100% Privat & Aman',
    desc: 'File Anda tidak pernah dikirim ke cloud atau server pihak ketiga. Seluruh perenderan canvas berlangsung lokal di browser Anda.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Batch Processing Super Cepat',
    desc: 'Beri watermark ke puluhan foto secara berurutan hanya dalam sekali atur. Hemat waktu berjam-jam dari editing manual.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Dukungan Foto & Video',
    desc: 'Mendukung format gambar JPEG, PNG, WebP, SVG, serta video MP4 dan WebM dengan playback scrubber interaktif.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: 'Komposisi Berlapis 3-in-1',
    desc: 'Gabungkan teks watermark, logo transparan, dan bingkai polaroid/banner dalam satu layer komposisi yang harmonis.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    title: 'Pola Ubin Anti-Pencurian (Tile)',
    desc: 'Cegah cropping gambar dan software AI removal dengan pola ubin diagonal berulang yang rapi dan konsisten.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    title: 'Preset Siap Pakai 1-Klik',
    desc: 'Gunakan gaya tata letak yang dirancang desainer profesional untuk fotografi, hak cipta bisnis, dan media sosial.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 py-16 md:py-24 border-b border-border/40 bg-secondary/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Fitur Canggih Untuk Kreator Modern
          </h2>
          <p className="text-base text-muted-foreground mt-3">
            Performa setara aplikasi desktop profesional, namun dapat diakses kapan saja langsung dari browser perangkat Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-2xl border border-border/80 bg-card hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
