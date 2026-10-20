'use client';

import React, { useSyncExternalStore, useRef } from 'react';
import { useTheme } from 'next-themes';

export type ThemeSwitcherVariant = 'compact' | 'expanded' | 'full';

export interface ThemeSwitcherProps {
  className?: string;
  variant?: ThemeSwitcherVariant;
  labels?: {
    light: string;
    dark: string;
    system: string;
  };
}

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeSwitcher({
  className = '',
  variant = 'compact',
  labels = { light: 'Terang', dark: 'Gelap', system: 'Sistem' },
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const isMounted = useIsMounted();
  const containerRef = useRef<HTMLDivElement>(null);

  const isExpanded = variant === 'expanded' || variant === 'full';

  // Keyboard Roving Tabindex & Arrow Navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf((theme as 'light' | 'dark' | 'system') || 'system');

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % modes.length;
      setTheme(modes[nextIndex]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + modes.length) % modes.length;
      setTheme(modes[prevIndex]);
    }
  };

  if (!isMounted) {
    return (
      <div
        className={
          isExpanded
            ? `h-11 w-full bg-secondary/60 rounded-xl border border-border/50 animate-pulse ${className}`
            : `h-8.5 w-[148px] bg-secondary/60 rounded-full border border-border/50 animate-pulse ${className}`
        }
        aria-hidden="true"
      />
    );
  }

  const items = [
    {
      id: 'light',
      label: labels.light,
      icon: (
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 'dark',
      label: labels.dark,
      icon: (
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path
            d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 'system',
      label: labels.system,
      icon: (
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 21h8m-4-4v4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  if (isExpanded) {
    return (
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Pilihan tema tampilan"
        onKeyDown={handleKeyDown}
        className={`grid grid-cols-3 gap-1.5 p-1 bg-secondary/80 dark:bg-secondary/60 rounded-xl border border-border/80 ${className}`}
      >
        {items.map((item) => {
          const isSelected = theme === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setTheme(item.id)}
              className={`min-h-[44px] h-11 px-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400 focus-visible:ring-offset-2 ${
                isSelected
                  ? 'bg-card text-foreground shadow-xs border border-border/80 font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Pilihan tema tampilan"
      onKeyDown={handleKeyDown}
      className={`h-8.5 p-0.5 bg-secondary/80 dark:bg-secondary/60 rounded-full border border-border/80 flex items-center shadow-2xs ${className}`}
    >
      {items.map((item) => {
        const isSelected = theme === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => setTheme(item.id)}
            title={item.label}
            aria-label={`Ganti tema ke ${item.label}`}
            className={`h-7 px-2.5 rounded-full flex items-center gap-1.5 text-xs transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400 focus-visible:ring-offset-1 ${
              isSelected
                ? 'bg-card text-foreground font-semibold shadow-xs border border-border/60 scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
            }`}
          >
            {item.icon}
            <span className="hidden lg:inline text-[11px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
