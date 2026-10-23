'use client';

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

const HEX6_REGEX = /^#([A-Fa-f0-9]{6})$/;
const HEX3_REGEX = /^#([A-Fa-f0-9]{3})$/;

export function normalizeHexColor(value: string, fallback = '#4f46e5'): string {
  if (HEX6_REGEX.test(value)) return value;
  if (HEX3_REGEX.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return fallback;
}

export function ColorPicker({ label, value, onChange, className = '' }: ColorPickerProps) {
  const safeHex = normalizeHexColor(value);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center text-xs font-medium">
        <label className="text-foreground/80">{label}</label>
        <span className="font-mono text-muted-foreground uppercase text-[11px] bg-secondary/80 px-1.5 py-0.5 rounded tabular-nums">
          {safeHex}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESET_COLORS.map((c) => {
          const isSelected = safeHex.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`w-6 h-6 rounded-md border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? 'ring-2 ring-indigo-500 scale-110 shadow-xs border-transparent'
                  : 'border-border/60 hover:scale-105 hover:border-border'
              }`}
              style={{ backgroundColor: c }}
              title={c}
              aria-label={`Pilih warna ${c}`}
            />
          );
        })}

        {/* Custom Native Color Picker */}
        <label
          className="relative flex items-center justify-center w-6 h-6 rounded-md border border-dashed border-border/80 hover:border-indigo-500 cursor-pointer overflow-hidden bg-secondary transition-colors focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-background"
          title="Pilih warna kustom"
        >
          <input
            type="color"
            value={safeHex}
            aria-label="Pilih warna kustom"
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <span className="text-[10px] font-bold text-muted-foreground pointer-events-none select-none">
            +
          </span>
        </label>
      </div>
    </div>
  );
}
