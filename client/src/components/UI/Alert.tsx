import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  className = '',
}) => {
  const config = {
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-saffron-light border-saffron/40 text-ink',
      icon: <AlertTriangle className="w-5 h-5 text-saffron flex-shrink-0" />,
    },
    error: {
      bg: 'bg-signal-light border-signal/30 text-ink',
      icon: <AlertCircle className="w-5 h-5 text-signal flex-shrink-0" />,
    },
  }[type];

  return (
    <div className={`p-4 rounded-md border flex items-start gap-3 ${config.bg} ${className}`}>
      {config.icon}
      <div className="text-sm">
        {title && <h4 className="font-semibold mb-0.5">{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
