import type { CleansingSuggestion } from '@/domain/models/quality';

interface CleansingSuggestionRowProps {
  suggestion: CleansingSuggestion;
}

/**
 * Render-only single cleansing suggestion (Issue #11): field label, the
 * `current → suggested` normalization, and the rule reason. Applying is handled
 * by the containing view (remediation queue / detail page).
 */
export function CleansingSuggestionRow({
  suggestion,
}: CleansingSuggestionRowProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-700">{suggestion.label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-inset ring-slate-200">
          {suggestion.reason}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 line-through decoration-rose-300">
          {suggestion.current}
        </span>
        <span aria-hidden className="text-slate-400">
          →
        </span>
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800">
          {suggestion.suggested}
        </span>
      </div>
    </div>
  );
}
