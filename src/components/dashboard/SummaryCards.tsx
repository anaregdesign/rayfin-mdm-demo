import { StatCard } from '@/components/shared/StatCard';
import type { MasterSummary } from '@/usecase/dashboard/selectors';

interface SummaryCardsProps {
  title: string;
  summary: MasterSummary;
}

/** KPI row for one master: total, active, duplicates, average quality. */
export function SummaryCards({ title, summary }: SummaryCardsProps) {
  const active =
    summary.statusCounts.find((s) => s.status === 'active')?.count ?? 0;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="総レコード数" value={summary.total} />
        <StatCard label="有効" value={active} accent="positive" />
        <StatCard
          label="重複候補"
          value={summary.duplicateCount}
          accent={summary.duplicateCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="平均品質スコア"
          value={summary.quality.average}
          hint="0〜100"
          accent={
            summary.quality.average >= 80
              ? 'positive'
              : summary.quality.average >= 50
                ? 'warning'
                : 'danger'
          }
        />
      </div>
    </section>
  );
}
