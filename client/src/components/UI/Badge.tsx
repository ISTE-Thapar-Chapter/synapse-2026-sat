import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'ink' | 'signal' | 'saffron' | 'mist' | 'success' | 'outline' | 'navy';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'mist',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  const variantClasses = {
    ink: 'bg-ink text-white',
    signal: 'bg-signal-light text-signal border border-signal/20',
    saffron: 'bg-saffron-light text-ink border border-saffron/30',
    mist: 'bg-mist text-ink-muted border border-mist-dark',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    outline: 'bg-transparent text-ink border border-mist-dark',
    navy: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  }[variant];

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${variantClasses}`}>
      {children}
    </span>
  );
};
