export interface NavItem {
  id: string;
  labelId: string;
  href: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { id: 'home', labelId: 'home', href: '/' },
  { id: 'studio', labelId: 'studio', href: '#studio' },
  { id: 'features', labelId: 'features', href: '#features' },
  { id: 'presets', labelId: 'presets', href: '#presets' },
  { id: 'faq', labelId: 'faq', href: '#faq' },
];

export const FOOTER_LINKS = [
  {
    category: 'Produk',
    links: [
      { label: 'Studio Editor', href: '#studio' },
      { label: 'Watermark Gambar', href: '#studio' },
      { label: 'Watermark Video', href: '#studio' },
      { label: 'Koleksi Preset', href: '#presets' },
    ],
  },
  {
    category: 'Teknologi',
    links: [
      { label: 'HTML5 Canvas API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API' },
      { label: 'Next.js 16 App Router', href: 'https://nextjs.org' },
      { label: 'Tailwind CSS v4', href: 'https://tailwindcss.com' },
      { label: 'Progressive Web App', href: '/manifest.webmanifest' },
    ],
  },
  {
    category: 'Keamanan & Privasi',
    links: [
      { label: '100% Client-Side Engine', href: '#features' },
      { label: 'Tanpa Server Upload', href: '#features' },
      { label: 'Lisensi & Hak Cipta', href: '#faq' },
    ],
  },
];
