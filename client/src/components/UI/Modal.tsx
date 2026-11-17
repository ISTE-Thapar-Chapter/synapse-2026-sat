import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-ink/60 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Modal dialog */}
        <div
          className={`relative w-full ${maxWidthClass} transform rounded-lg bg-white p-6 text-left shadow-xl transition-all border border-mist`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-mist">
            <div>
              <h3 className="text-lg font-semibold text-ink leading-6">{title}</h3>
              {description && <p className="text-xs text-ink-muted mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-ink-muted hover:bg-mist hover:text-ink focus:outline-none focus:ring-2 focus:ring-signal"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
};
