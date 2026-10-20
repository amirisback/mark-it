'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MAIN_NAV_ITEMS } from '@/data/navigation';
import { Button } from '@/components/ui/button';

export interface HeaderProps {
  appName?: string;
}

export function Header({ appName = 'MarkIt Studio' }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground flex items-center gap-1.5">
              {appName}
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                v1.0
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {MAIN_NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.id === 'home'
                ? 'Beranda'
                : item.id === 'studio'
                ? 'Studio Editor'
                : item.id === 'features'
                ? 'Keunggulan'
                : item.id === 'presets'
                ? 'Preset'
                : 'FAQ'}
            </a>
          ))}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Note: LanguageSwitcher & ThemeSwitcher sengaja disiapkan namun default di-hide per GUIDELINE.md aturan 14 */}

          <a href="#studio">
            <Button variant="brand" size="sm" className="hidden sm:inline-flex">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Buka Studio
            </Button>
          </a>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen ? (
        <div className="md:hidden border-b border-border/60 bg-background/95 px-4 pt-3 pb-5 space-y-2">
          {MAIN_NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-secondary"
            >
              {item.id === 'home'
                ? 'Beranda'
                : item.id === 'studio'
                ? 'Studio Editor'
                : item.id === 'features'
                ? 'Keunggulan'
                : item.id === 'presets'
                ? 'Preset'
                : 'FAQ'}
            </a>
          ))}
          <div className="pt-2">
            <a href="#studio" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="brand" className="w-full justify-center">
                Mulai Beri Watermark
              </Button>
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
