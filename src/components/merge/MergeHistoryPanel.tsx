import { Button } from '@/components/shared/Button';
import { formatDateTime } from '@/lib/format';
import type { MergeHistoryItem } from '@/usecase/merge/merge-plan';

interface MergeHistoryPanelProps {
  items: MergeHistoryItem[];
  loading: boolean;
  error: string | null;
  busy?: boolean;
  /** When provided, active merges offer a one-click undo. */
  onUndo?: (recordId: string) => void;
}

/**
 * Render-only merge-history panel for the 360° detail screen. Lists past
 * survivorship merges (winner ← losers) with their timestamp and offers an undo
 * for still-active records. All behavior is delegated to the page via `onUndo`.
 */
export function MergeHistoryPanel({
  items,
  loading,
  error,
  busy = false,
  onUndo,
}: MergeHistoryPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">統合履歴</h2>
        <span className="text-xs text-slate-400">{items.length} 件</span>
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      {loading && items.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">読み込み中…</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">
          統合履歴はまだありません。
        </p>
      )}

      <ol className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 border-l-2 border-slate-100 pl-4"
          >
            <div className="min-w-0">
              <p className="text-sm text-slate-700">
                <span className="font-medium text-emerald-700">
                  {item.winnerLabel}
                </span>
                <span className="mx-1 text-slate-400">←</span>
                <span className="text-slate-500">
                  {item.loserLabels.join('、')}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {formatDateTime(item.performedAt)}
                {item.performedBy ? `・${item.performedBy}` : ''}
                {item.active ? '' : '・取り消し済み'}
              </p>
            </div>
            {item.active && onUndo && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => onUndo(item.id)}
              >
                元に戻す
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
