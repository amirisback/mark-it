import type { FontFamilyOption, FontSizePreset, FontCategory } from '@/types/watermark';

export const CURATED_FONTS: FontFamilyOption[] = [
  // 1. Modern Sans
  {
    id: 'inter',
    name: 'Inter',
    category: 'modern-sans',
    family: '"Inter", sans-serif',
    googleFontName: 'Inter',
    sampleText: 'Standard Clean UI',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    category: 'modern-sans',
    family: '"Roboto", sans-serif',
    googleFontName: 'Roboto',
    sampleText: 'Geometric Precision',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    category: 'modern-sans',
    family: '"Montserrat", sans-serif',
    googleFontName: 'Montserrat',
    sampleText: 'High Contrast Modern',
  },

  // 2. Serif & Editorial
  {
    id: 'playfair-display',
    name: 'Playfair Display',
    category: 'serif',
    family: '"Playfair Display", serif',
    googleFontName: 'Playfair Display',
    sampleText: 'Editorial Luxury',
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    category: 'serif',
    family: '"Merriweather", serif',
    googleFontName: 'Merriweather',
    sampleText: 'Warm Literary Serif',
  },

  // 3. Display & Bold
  {
    id: 'bebas-neue',
    name: 'Bebas Neue',
    category: 'display',
    family: '"Bebas Neue", sans-serif',
    googleFontName: 'Bebas Neue',
    sampleText: 'Condensed Headline',
  },
  {
    id: 'oswald',
    name: 'Oswald',
    category: 'display',
    family: '"Oswald", sans-serif',
    googleFontName: 'Oswald',
    sampleText: 'Heavy Impact Sans',
  },

  // 4. Handwritten & Signature
  {
    id: 'caveat',
    name: 'Caveat',
    category: 'script',
    family: '"Caveat", cursive',
    googleFontName: 'Caveat',
    sampleText: 'Signature Script',
  },
  {
    id: 'dancing-script',
    name: 'Dancing Script',
    category: 'script',
    family: '"Dancing Script", cursive',
    googleFontName: 'Dancing Script',
    sampleText: 'Flowing Cursive',
  },

  // 5. Monospace & Technical
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    category: 'monospace',
    family: '"JetBrains Mono", monospace',
    googleFontName: 'JetBrains Mono',
    sampleText: 'Code & Tech Mono',
  },
  {
    id: 'geist-mono',
    name: 'Geist Mono',
    category: 'monospace',
    family: '"Geist Mono", monospace',
    sampleText: 'Strict Metric Mono',
  },
];

export const FONT_CATEGORIES: { id: FontCategory; label: string }[] = [
  { id: 'modern-sans', label: 'Modern Sans' },
  { id: 'serif', label: 'Serif & Editorial' },
  { id: 'display', label: 'Display & Bold' },
  { id: 'script', label: 'Handwritten & Signature' },
  { id: 'monospace', label: 'Monospace & Technical' },
];

export const FONT_SIZE_PRESETS: FontSizePreset[] = [
  { id: 'sm', label: 'Kecil', value: 2.0 },
  { id: 'md', label: 'Sedang', value: 4.5 },
  { id: 'lg', label: 'Besar', value: 8.0 },
  { id: 'xl', label: 'Ekstra', value: 12.0 },
  { id: '2xl', label: 'Jumbo', value: 18.0 },
];
