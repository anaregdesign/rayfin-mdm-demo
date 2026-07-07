import type { ReactNode } from 'react';

interface FieldRowProps {
  label: string;
  children: ReactNode;
}

/** Label/value row used by the 360° detail cards. */
export function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-900">{children}</dd>
    </div>
  );
}
