import type { ReactNode } from 'react';

import type { StatusTone } from '@/domain/models/master-status';

import { statusToneClasses } from './tone';

interface BadgeProps {
  tone: StatusTone;
  children: ReactNode;
}

/** Small pill styled by semantic tone. Callers resolve the label/tone. */
export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusToneClasses(
        tone
      )}`}
    >
      {children}
    </span>
  );
}
