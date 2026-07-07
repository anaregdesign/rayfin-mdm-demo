import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: 'default' | 'positive' | 'warning' | 'danger';
  /**
   * When provided the card becomes a button (used for dashboard drill-down,
   * Issue #13). Render-only: the page owns the navigation handler.
   */
  onClick?: () => void;
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'text-slate-900',
  positive: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
};

/** KPI tile used across the dashboard. Clickable when `onClick` is set. */
export function StatCard({
  label,
  value,
  hint,
  accent = 'default',
  onClick,
}: StatCardProps) {
  const body = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${ACCENT_CLASSES[accent]}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        {body}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {body}
    </div>
  );
}
