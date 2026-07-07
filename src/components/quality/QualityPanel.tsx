import { Button } from '@/components/shared/Button';
import type { CleansingSuggestion, QualityResult } from '@/domain/models/quality';

import { CleansingSuggestionRow } from './CleansingSuggestionRow';
import { QualityBreakdownList } from './QualityBreakdownList';

interface QualityPanelProps {
  result: QualityResult;
  suggestions: CleansingSuggestion[];
  /** Actor may write the normalized values back. */
  canApply: boolean;
  busy: boolean;
  onApply: () => void;
}

/**
 * Detail-page quality panel (Issue #11): per-field completeness breakdown plus
 * any表記ゆれ standardization suggestions with a one-click "apply all". Purely
 * presentational — applying is delegated to the page via `onApply`.
 */
export function QualityPanel({
  result,
  suggestions,
  canApply,
  busy,
  onApply,
}: QualityPanelProps) {
  const hasSuggestions = suggestions.length > 0;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">品質の内訳</h2>
        {hasSuggestions && (
          <Button
            size="sm"
            variant="primary"
            disabled={!canApply || busy}
            onClick={onApply}
          >
            {busy ? '適用中…' : `標準化を適用（${suggestions.length}件）`}
          </Button>
        )}
      </div>

      <QualityBreakdownList result={result} />

      {hasSuggestions && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-500">
            表記ゆれの標準化候補
            {!canApply && '（適用には編集権限が必要です）'}
          </p>
          <div className="space-y-1.5">
            {suggestions.map((suggestion) => (
              <CleansingSuggestionRow
                key={suggestion.field}
                suggestion={suggestion}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
