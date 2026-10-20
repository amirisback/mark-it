'use client';

import React from 'react';

export interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#ffffff',
  '#000000',
  '#4f46e5',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#94a3b8',
];

export function ColorPicker({ label, value, onChange, className = '' }: ColorPickerProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center text-xs font-medium">
        <label className="text-foreground/80">{label}</label>
        <span className="font-mono text-muted-foreground uppercase text-[11px] bg-secondary/80 px-1.5 py-0.5 rounded">
          {value}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESET_COLORS.map((c) => {
          const isSelected = value.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`w-6 h-6 rounded-md border transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-indigo-500 scale-110 shadow-xs'
                  : 'border-border/60 hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
              title={c}
              aria-label={`Pilih warna ${c}`}
            />
          );
        })}

        {/* Custom Native Color Picker */}
        {(() => {
          const hex6 = /^#([A-Fa-f0-9]{6})$/;
          const safeHex = hex6.test(value)
            ? value
            : value.startsWith('#') && value.length === 4
            ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
            : '#4f46e5';

          return (
            <label className="relative flex items-center justify-center w-6 h-6 rounded-md border border-dashed border-border hover:border-indigo-500 cursor-pointer overflow-hidden bg-secondary">
              <input
                type="color"
                value={safeHex}
                aria-label="Pilih warna kustom"
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Warna kustom"
              />
              <span className="text-[10px] font-bold text-muted-foreground">+</span>
            </label>
          );
        })()}
      </div>
    </div>
  );
}
