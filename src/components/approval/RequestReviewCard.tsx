import { useState } from 'react';

import type { ApprovalItem } from '@/usecase/approval/use-approval-page';

import { FieldDiffRow } from '@/components/history/FieldDiffRow';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { TextAreaField } from '@/components/shared/TextAreaField';

interface RequestReviewCardProps {
  item: ApprovalItem;
  /** True when the current actor is a checker (admin). */
  isApprover: boolean;
  /** True while this card's request is being processed. */
  reviewing: boolean;
  onReview: (decision: 'approved' | 'rejected', reason: string) => void;
}

/**
 * Render-only review card for a single change request (#8). Shows the proposed
 * change as a field-level diff and, for pending requests an approver may act
 * on, an inline 承認/却下 control with an optional reason. All gating is decided
 * upstream and passed in via `canReview`/`blockReason`.
 */
export function RequestReviewCard({
  item,
  isApprover,
  reviewing,
  onReview,
}: RequestReviewCardProps) {
  const [reason, setReason] = useState('');
  const { request } = item;
  const isPending = request.status === 'pending';

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">
          {item.entityLabel}
        </span>
        <Badge tone="neutral">{item.operationLabel}</Badge>
        <Badge tone={item.statusTone}>{item.statusLabel}</Badge>
        <span className="ml-auto text-xs text-slate-400">
          {item.requestedAtLabel}
        </span>
      </div>

      <dl className="mt-2 space-y-0.5 text-xs text-slate-500">
        <div className="flex gap-1">
          <dt>申請者:</dt>
          <dd className="text-slate-700">{request.requestedBy ?? '不明'}</dd>
        </div>
        {request.summary && (
          <div className="flex gap-1">
            <dt>対象:</dt>
            <dd className="text-slate-700">{request.summary}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-3">
        <p className="mb-1 text-xs font-medium text-slate-500">変更内容</p>
        {request.operation === 'delete' ? (
          <p className="text-xs text-rose-600">このレコードを削除します。</p>
        ) : item.changes.length === 0 ? (
          <p className="text-xs text-slate-400">差分はありません。</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {item.changes.map((change) => (
              <FieldDiffRow
                key={change.field}
                entityType={request.entityType}
                change={change}
              />
            ))}
          </div>
        )}
      </div>

      {!isPending && (
        <p className="mt-3 text-xs text-slate-500">
          {request.reviewedBy ?? '担当者'} が
          {item.reviewedAtLabel ? ` ${item.reviewedAtLabel} に` : ''}
          {request.status === 'approved' ? '承認' : '却下'}しました。
          {request.reason && (
            <span className="mt-0.5 block text-slate-400">
              理由: {request.reason}
            </span>
          )}
        </p>
      )}

      {isPending && isApprover && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {item.canReview ? (
            <div className="space-y-2">
              <TextAreaField
                label="コメント（任意）"
                value={reason}
                onChange={setReason}
                rows={2}
                placeholder="承認・却下の理由を残せます"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={reviewing}
                  onClick={() => onReview('approved', reason)}
                >
                  承認
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={reviewing}
                  onClick={() => onReview('rejected', reason)}
                >
                  却下
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-600">{item.blockReason}</p>
          )}
        </div>
      )}
    </li>
  );
}
