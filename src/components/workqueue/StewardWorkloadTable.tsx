import type { StewardWorkload } from '@/domain/models/steward-task';
import { TASK_REASON_LABELS, TASK_REASON_VALUES } from '@/domain/models/steward-task';

interface StewardWorkloadTableProps {
  title: string;
  workloads: StewardWorkload[];
  description?: string;
}

/**
 * Render-only per-steward open-task load, shown on the dashboard and the work
 * queue. `steward === null` renders as the 未割当 (unassigned) bucket.
 */
export function StewardWorkloadTable({
  title,
  workloads,
  description,
}: StewardWorkloadTableProps) {
  const max = workloads.reduce((m, w) => Math.max(m, w.taskCount), 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      )}
      {workloads.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          未対応タスクはありません。
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {workloads.map((w) => {
            const pct = max === 0 ? 0 : Math.round((w.taskCount / max) * 100);
            const reasons = TASK_REASON_VALUES.filter(
              (r) => w.reasonCounts[r] > 0
            );
            return (
              <li key={w.steward ?? '__unassigned__'}>
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      w.steward === null
                        ? 'italic text-slate-500'
                        : 'font-medium text-slate-700'
                    }`}
                  >
                    {w.label}
                  </span>
                  <span className="text-sm tabular-nums text-slate-600">
                    {w.taskCount}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      w.steward === null ? 'bg-slate-300' : 'bg-indigo-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {reasons.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    {reasons
                      .map((r) => `${TASK_REASON_LABELS[r]} ${w.reasonCounts[r]}`)
                      .join(' ・ ')}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
