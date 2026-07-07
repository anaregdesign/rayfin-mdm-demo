import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  deliveryStatusLabel,
  deliveryStatusTone,
  distributionEntityLabel,
  outboxEventTypeLabel,
  outboxEventTypeTone,
  type OutboxEvent,
} from '@/domain/models/distribution';

interface OutboxEventFeedProps {
  events: OutboxEvent[];
  canManage: boolean;
  updatingId: string | null;
  onMarkDelivered: (id: string) => void;
  onMarkFailed: (id: string) => void;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function payloadSummary(payload: Record<string, unknown>): string {
  const name = payload.name ?? payload.productName ?? payload.companyName;
  const code = payload.code ?? payload.sku ?? payload.customerCode;
  const parts = [code, name].filter((v) => typeof v === 'string' && v.length > 0);
  if (parts.length > 0) return parts.join(' / ');
  const keys = Object.keys(payload);
  return keys.length > 0 ? `${keys.length}項目のスナップショット` : '（ペイロードなし）';
}

/**
 * Render-only outbox event feed (Issue #12). Shows each business event with
 * its domain/kind/delivery badges, a compact payload summary, and — when the
 * viewer may manage delivery — 配信済み/失敗 buttons wired via props. All
 * labels and tones come from the distribution model; no logic here.
 */
export function OutboxEventFeed({
  events,
  canManage,
  updatingId,
  onMarkDelivered,
  onMarkFailed,
}: OutboxEventFeedProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="配信イベントはありません"
        description="マスタの新規登録・更新・統合・ステータス変更を行うと、ここに配信イベント（アウトボックス）が記録されます。"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => {
        const busy = updatingId === event.id;
        return (
          <li
            key={event.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="muted">
                    {distributionEntityLabel(event.entityType)}
                  </Badge>
                  <Badge tone={outboxEventTypeTone(event.eventType)}>
                    {outboxEventTypeLabel(event.eventType)}
                  </Badge>
                  <Badge tone={deliveryStatusTone(event.status)}>
                    {deliveryStatusLabel(event.status)}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-slate-800">
                  {payloadSummary(event.payload)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatTimestamp(event.occurredAt)}
                  {event.deliveredAt &&
                    ` → 配信 ${formatTimestamp(event.deliveredAt)}`}
                  {event.actorId && ` ／ 実行: ${event.actorId}`}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || event.status === 'delivered'}
                    onClick={() => onMarkDelivered(event.id)}
                  >
                    {busy ? '更新中…' : '配信済みにする'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || event.status === 'failed'}
                    onClick={() => onMarkFailed(event.id)}
                  >
                    失敗にする
                  </Button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
