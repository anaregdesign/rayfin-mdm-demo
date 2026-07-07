import type { QualityResult } from '@/domain/models/quality';

interface QualityBreakdownListProps {
  result: QualityResult;
}

/**
 * Render-only per-field quality breakdown (Issue #11). Shows which profile
 * fields are filled vs. missing and lists the scored deductions with reasons,
 * so a steward understands exactly how the quality score was derived.
 */
export function QualityBreakdownList({ result }: QualityBreakdownListProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>項目充足状況</span>
          <span className="tabular-nums">
            {result.filledCount}/{result.scoredCount} 項目（充足率 {result.completeness}%）
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {result.factors.map((factor) => (
            <li
              key={factor.key}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                factor.filled
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-slate-50 text-slate-400'
              }`}
            >
              <span aria-hidden className="text-sm leading-none">
                {factor.filled ? '✓' : '—'}
              </span>
              <span className="truncate">{factor.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {result.issueDetails.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-slate-500">品質上の課題（減点）</p>
          <ul className="space-y-1">
            {result.issueDetails.map((issue) => (
              <li
                key={issue.message}
                className="flex items-center justify-between gap-2 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-800"
              >
                <span>{issue.message}</span>
                <span className="tabular-nums font-medium">-{issue.penalty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
