import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
}) => {
  return (
    <div className={`bg-white rounded-lg border border-mist shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-mist flex items-center justify-between bg-paper/30">
          <div>
            {title && <h3 className="text-base font-semibold text-ink">{title}</h3>}
            {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
