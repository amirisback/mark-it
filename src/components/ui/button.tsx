import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'brand';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export function Button({
  type = 'button',
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none rounded-lg active:scale-[0.98]';

  const variants = {
    primary: 'bg-primary text-primary-foreground shadow-sm hover:opacity-90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50',
    outline: 'border border-border bg-background/50 hover:bg-secondary text-foreground backdrop-blur-xs',
    ghost: 'hover:bg-secondary text-foreground hover:text-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-xs',
    brand: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-indigo-500/20',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2.5',
    icon: 'h-9 w-9 p-0 text-sm',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
