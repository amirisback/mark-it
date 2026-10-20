'use client';

import React from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  className?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  className = '',
}: SliderProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const inputId = React.useId();
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center text-xs font-medium">
        <label htmlFor={inputId} className="text-foreground/80 cursor-pointer">
          {label}
        </label>
        <span className="font-mono text-muted-foreground tabular-nums bg-secondary/80 px-1.5 py-0.5 rounded text-[11px]">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative flex items-center select-none touch-none w-full h-5">
        <input
          id={inputId}
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          style={{
            background: `linear-gradient(to right, #4f46e5 ${percentage}%, var(--secondary) ${percentage}%)`,
          }}
        />
      </div>
    </div>
  );
}
