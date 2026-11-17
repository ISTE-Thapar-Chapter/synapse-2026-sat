import React from 'react';
import { FolderX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-mist-dark my-4">
      <div className="p-3 bg-paper rounded-full text-ink-muted mb-3">
        {icon || <FolderX className="w-8 h-8 text-ink-muted" />}
      </div>
      <h3 className="text-base font-semibold text-ink mb-1">{title}</h3>
      <p className="text-xs text-ink-muted max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
