import React from 'react';
import { cn } from './index';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 shadow-sm',
      secondary: 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 active:bg-neutral-900 border border-neutral-700',
      outline: 'border border-neutral-700 text-neutral-300 hover:bg-neutral-800/80 hover:text-white',
      ghost: 'text-neutral-300 hover:bg-neutral-800 hover:text-white',
      danger: 'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-sm',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-11 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

