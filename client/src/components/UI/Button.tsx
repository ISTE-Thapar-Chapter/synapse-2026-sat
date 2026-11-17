import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'saffron' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[size];

  const variantClasses = {
    primary: 'bg-signal text-white hover:bg-signal-hover shadow-sm',
    secondary: 'bg-white text-ink border border-mist-dark hover:bg-mist-light shadow-sm',
    saffron: 'bg-saffron text-ink hover:bg-saffron-hover shadow-sm font-semibold',
    danger: 'bg-red-700 text-white hover:bg-red-800 shadow-sm',
    ghost: 'bg-transparent text-ink hover:bg-mist/50',
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : icon ? (
        <span className="mr-2 inline-flex">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
