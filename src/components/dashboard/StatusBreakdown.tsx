import { Badge } from '@/components/shared/Badge';
import type { StatusCount } from '@/usecase/dashboard/selectors';

interface StatusBreakdownProps {
  title: string;
  statusCounts: StatusCount[];
  total: number;
}

/** Per-status distribution with proportional bars. */
export function StatusBreakdown({
  title,
  statusCounts,
  total,
}: StatusBreakdownProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      <ul className="space-y-3">
        {statusCounts.map((s) => {
          const pct = total === 0 ? 0 : Math.round((s.count / total) * 100);
          return (
            <li key={s.status}>
              <div className="mb-1 flex items-center justify-between">
                <Badge tone={s.tone}>{s.label}</Badge>
                <span className="text-sm tabular-nums text-slate-600">
                  {s.count}
                  <span className="ml-1 text-xs text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
