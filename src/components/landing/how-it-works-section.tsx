const STEPS = [
  {
    step: '01',
    title: 'Unggah Foto atau Video',
    desc: 'Tarik file dari komputer atau ponsel Anda. Anda dapat memasukkan puluhan file sekaligus untuk antrean batch.',
  },
  {
    step: '02',
    title: 'Sesuaikan Pengaturan',
    desc: 'Ketik nama hak cipta, unggah logo transparan, atau pilih preset instan. Atur transparansi dan posisi di pratinjau real-time.',
  },
  {
    step: '03',
    title: 'Unduh Hasil Instan',
    desc: 'Klik unduh untuk menyimpan file beresolusi tinggi langsung ke perangkat Anda tanpa kehilangan ketajaman.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <span className="text-xs uppercase font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">
            Alur Kerja Sederhana
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mt-1">
            Cara Kerja Dalam 3 Langkah Cepat
          </h2>
          <p className="text-base text-muted-foreground mt-2">
            Tidak ada konfigurasi rumit. Mulai dalam hitungan detik.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="relative p-6 rounded-2xl border border-border/60 bg-card/60 space-y-3"
            >
              <div className="text-3xl font-black font-mono text-indigo-600/30 dark:text-indigo-400/30">
                {item.step}
              </div>
              <h3 className="text-lg font-bold text-foreground">
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
