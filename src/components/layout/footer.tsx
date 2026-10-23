import { FOOTER_LINKS } from '@/data/navigation';

export interface FooterProps {
  appName?: string;
}

export function Footer({ appName = 'MarkIt Studio' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-card/60 backdrop-blur-xs text-foreground/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <span className="font-bold text-foreground tracking-tight text-lg">
                {appName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Platform watermarking foto dan video modern, cepat, dan 100% privat langsung dari memori browser Anda tanpa unggah ke server.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Client-Side Aktif (Zero Cloud Storage)
            </div>
          </div>

          {/* Links Cols */}
          {FOOTER_LINKS.map((section) => (
            <div key={section.category} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {section.category}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} {appName}. Seluruh hak cipta dilindungi undang-undang.</p>
          <p className="flex items-center gap-1.5">
            Dibuat dengan Next.js 16, React 19 & Tailwind CSS v4
          </p>
        </div>
      </div>
    </footer>
  );
}
