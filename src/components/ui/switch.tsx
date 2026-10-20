'use client';

import React from 'react';

export interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  className = '',
}: SwitchProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between gap-3 cursor-pointer select-none py-1.5 ${className}`}
    >
      <div className="flex flex-col">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {description ? (
          <span className="text-[11px] text-muted-foreground">{description}</span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          checked ? 'bg-indigo-600' : 'bg-secondary'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
