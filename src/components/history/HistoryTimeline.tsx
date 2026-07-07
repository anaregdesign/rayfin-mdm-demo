import {
  changeActionLabel,
  changeActionTone,
  type ChangeEntityType,
  type ChangeEntry,
} from '@/domain/models/change-log';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { formatDateTime } from '@/lib/format';

import { FieldDiffRow } from './FieldDiffRow';

interface HistoryTimelineProps {
  entityType: ChangeEntityType;
  entries: ChangeEntry[];
  loading: boolean;
  error: string | null;
  busy?: boolean;
  /** When provided, update entries offer a one-click rollback. */
  onRestore?: (entry: ChangeEntry) => void;
}

/**
 * Render-only change-history timeline for the 360° detail screen. All labels,
 * tones, and formatting come from domain/lib helpers; behavior (rollback) is
 * delegated to the page via `onRestore`.
 */
export function HistoryTimeline({
  entityType,
  entries,
  loading,
  error,
  busy = false,
  onRestore,
}: HistoryTimelineProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">変更履歴</h2>
        <span className="text-xs text-slate-400">{entries.length} 件</span>
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      )}

      {loading && entries.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">読み込み中…</p>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">
          変更履歴はまだありません。
        </p>
      )}

      <ol className="space-y-4">
        {entries.map((entry) => (
          <li key={entry.id} className="relative border-l-2 border-slate-100 pl-4">
            <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-slate-300" />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={changeActionTone(entry.action)}>
                {changeActionLabel(entry.action)}
              </Badge>
              {entry.summary && (
                <span className="text-sm text-slate-700">{entry.summary}</span>
              )}
              {onRestore && entry.action === 'update' && entry.changes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => onRestore(entry)}
                >
                  この変更を取り消す
                </Button>
              )}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {formatDateTime(entry.occurredAt)}
              {entry.actorId ? ` ・ ${entry.actorId}` : ''}
            </div>
            {entry.changes.length > 0 && (
              <div className="mt-2 divide-y divide-slate-50">
                {entry.changes.map((change) => (
                  <FieldDiffRow
                    key={change.field}
                    entityType={entityType}
                    change={change}
                  />
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
