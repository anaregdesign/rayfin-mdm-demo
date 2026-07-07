import { Link } from 'react-router-dom';

import { Badge } from '@/components/shared/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { masterKindLabel } from '@/domain/models/steward-task';
import type { WorkQueueRow } from '@/usecase/workqueue/use-steward-workqueue';

import { TaskReasonBadge } from './TaskReasonBadge';

interface WorkQueueListProps {
  rows: WorkQueueRow[];
  /** Whether selection checkboxes render (bulk-assign capable roles). */
  canManage: boolean;
  onToggleSelect: (id: string) => void;
}

/** Render-only prioritized task table with per-row detail/edit shortcuts. */
export function WorkQueueList({
  rows,
  canManage,
  onToggleSelect,
}: WorkQueueListProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="対応が必要なタスクはありません"
        description="現在のフィルタ条件に一致する未対応レコードはありません。"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            {canManage && (
              <th className="px-4 py-3">
                <span className="sr-only">選択</span>
              </th>
            )}
            <th className="px-4 py-3">レコード</th>
            <th className="px-4 py-3">種別</th>
            <th className="px-4 py-3">検出理由</th>
            <th className="px-4 py-3">品質</th>
            <th className="px-4 py-3">担当</th>
            <th className="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.task.id} className="hover:bg-slate-50">
              {canManage && (
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={!row.canEdit}
                    onChange={() => onToggleSelect(row.task.id)}
                    aria-label={`${row.task.recordLabel} を選択`}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                  />
                </td>
              )}
              <td className="px-4 py-3 align-top">
                <Link
                  to={row.detailPath}
                  className="font-medium text-indigo-700 hover:underline"
                >
                  {row.task.recordLabel}
                </Link>
                <p className="text-xs text-slate-400">{row.task.statusLabel}</p>
              </td>
              <td className="px-4 py-3 align-top">
                <Badge tone="muted">{masterKindLabel(row.task.entityType)}</Badge>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap gap-1">
                  {row.task.reasons.map((reason) => (
                    <TaskReasonBadge key={reason} reason={reason} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 align-top tabular-nums text-slate-600">
                {row.task.qualityScore}
              </td>
              <td className="px-4 py-3 align-top text-slate-600">
                {row.task.steward?.trim() ? (
                  row.task.steward
                ) : (
                  <span className="text-slate-400">未割当</span>
                )}
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex gap-3">
                  <Link
                    to={row.detailPath}
                    className="text-xs font-medium text-slate-600 hover:text-indigo-700 hover:underline"
                  >
                    詳細
                  </Link>
                  {row.canEdit && (
                    <Link
                      to={row.editPath}
                      className="text-xs font-medium text-slate-600 hover:text-indigo-700 hover:underline"
                    >
                      編集
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
