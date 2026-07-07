import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: 'default' | 'positive' | 'warning' | 'danger';
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'text-slate-900',
  positive: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
};

/** KPI tile used across the dashboard. */
export function StatCard({
  label,
  value,
  hint,
  accent = 'default',
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${ACCENT_CLASSES[accent]}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
