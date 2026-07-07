import { Link } from 'react-router-dom';

import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { QualityBadge } from '@/components/shared/QualityBadge';
import { masterKindLabel } from '@/domain/models/steward-task';
import type { RemediationTarget } from '@/domain/policies/cleansing-policy';
import type { RemediationRow } from '@/usecase/quality/use-remediation-page';

import { CleansingSuggestionRow } from './CleansingSuggestionRow';

interface RemediationQueueProps {
  rows: RemediationRow[];
  bulkApplying: boolean;
  onApply: (target: RemediationTarget) => void;
}

/**
 * Render-only remediation queue (Issue #11). Each card shows a low-quality or
 * un-normalized record with its cleansing suggestions, missing fields, and
 * quality issues, plus a permission-guarded one-click apply. Navigation uses
 * static `Link`s; applying is delegated to the page via `onApply`.
 */
export function RemediationQueue({
  rows,
  bulkApplying,
  onApply,
}: RemediationQueueProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="是正が必要なレコードはありません"
        description="現在のフィルタ条件では、標準化候補・低品質・必須未入力のレコードは見つかりませんでした。"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const { target } = row;
        const hasSuggestions = target.suggestions.length > 0;
        return (
          <li
            key={target.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={row.detailPath}
                    className="font-medium text-indigo-700 hover:underline"
                  >
                    {target.name}
                  </Link>
                  <Badge tone="muted">{masterKindLabel(target.entityType)}</Badge>
                  <QualityBadge score={target.score} band={target.band} />
                  {target.missingRequired && (
                    <Badge tone="danger">必須未入力</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{target.code}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {hasSuggestions && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!row.canEdit || row.applying || bulkApplying}
                    onClick={() => onApply(target)}
                  >
                    {row.applying ? '適用中…' : '標準化を適用'}
                  </Button>
                )}
                <Link
                  to={row.editPath}
                  className="text-xs font-medium text-slate-500 underline decoration-dotted hover:text-slate-700"
                >
                  編集
                </Link>
              </div>
            </div>

            {!row.canEdit && hasSuggestions && (
              <p className="mt-2 text-xs text-amber-600">
                このレコードを編集する権限がないため、標準化を適用できません。
              </p>
            )}

            {hasSuggestions && (
              <div className="mt-3 space-y-1.5">
                {target.suggestions.map((suggestion) => (
                  <CleansingSuggestionRow
                    key={suggestion.field}
                    suggestion={suggestion}
                  />
                ))}
              </div>
            )}

            {target.missingFields.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs text-slate-500">未入力の項目</p>
                <div className="flex flex-wrap gap-1">
                  {target.missingFields.map((field) => (
                    <span
                      key={field}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {target.issues.length > 0 && (
              <ul className="mt-3 space-y-1">
                {target.issues.map((issue) => (
                  <li
                    key={issue}
                    className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-800"
                  >
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
