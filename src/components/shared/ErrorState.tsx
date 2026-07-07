import type { ReactNode } from 'react';

interface ErrorStateProps {
  message: string;
  action?: ReactNode;
}

/** Inline error banner for failed loads or actions. */
export function ErrorState({ message, action }: ErrorStateProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
      <p className="text-sm text-rose-700">{message}</p>
      {action}
    </div>
  );
}
