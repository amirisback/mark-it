'use client';

import React from 'react';

export interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  className = '',
  disabled = false,
}: SwitchProps) {
  const switchId = React.useId();

  return (
    <div
      className={`flex items-center justify-between gap-3 select-none py-1.5 ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
    >
      <label
        htmlFor={switchId}
        className="flex flex-col cursor-pointer flex-1 mr-2"
      >
        <span className="text-xs font-medium text-foreground">{label}</span>
        {description ? (
          <span className="text-[11px] text-muted-foreground">{description}</span>
        ) : null}
      </label>

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background before:absolute before:-inset-2 before:content-[''] ${
          checked ? 'bg-indigo-600' : 'bg-secondary dark:bg-slate-700'
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
