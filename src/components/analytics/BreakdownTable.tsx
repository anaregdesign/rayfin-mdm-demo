import type { GroupBreakdown } from '@/domain/models/analytics';

interface BreakdownTableProps {
  title: string;
  /** Column header for the grouping key (e.g. マスタ / 担当 / カテゴリ). */
  keyLabel: string;
  groups: GroupBreakdown[];
}

function qualityTone(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

/** Compact composition table for a per-group breakdown (Issue #13). */
export function BreakdownTable({ title, keyLabel, groups }: BreakdownTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">データがありません。</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="pb-2 font-medium">{keyLabel}</th>
              <th className="pb-2 text-right font-medium">総数</th>
              <th className="pb-2 text-right font-medium">有効</th>
              <th className="pb-2 text-right font-medium">平均品質</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key} className="border-b border-slate-100 last:border-0">
                <td className="py-2 text-slate-700">{g.label}</td>
                <td className="py-2 text-right tabular-nums text-slate-700">
                  {g.total}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-500">
                  {g.activeCount}
                  <span className="ml-1 text-xs text-slate-400">
                    ({Math.round(g.activeRatio * 100)}%)
                  </span>
                </td>
                <td
                  className={`py-2 text-right font-semibold tabular-nums ${qualityTone(
                    g.avgQuality
                  )}`}
                >
                  {g.avgQuality}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
