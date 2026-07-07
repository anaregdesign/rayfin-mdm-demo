import { QUALITY_BAND_LABELS } from '@/domain/models/quality';
import type { QualityDistribution } from '@/usecase/dashboard/selectors';
import { qualityBarClasses } from '@/components/shared/tone';

interface QualityOverviewProps {
  title: string;
  quality: QualityDistribution;
  total: number;
}

/** High/medium/low quality-band distribution for one master. */
export function QualityOverview({
  title,
  quality,
  total,
}: QualityOverviewProps) {
  const rows = [
    { band: 'high' as const, count: quality.high },
    { band: 'medium' as const, count: quality.medium },
    { band: 'low' as const, count: quality.low },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="text-xs text-slate-400">
          平均 <span className="tabular-nums font-semibold">{quality.average}</span>
          /100
        </span>
      </div>
      <ul className="space-y-3">
        {rows.map(({ band, count }) => {
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          return (
            <li key={band}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {QUALITY_BAND_LABELS[band]}
                </span>
                <span className="tabular-nums text-slate-600">
                  {count}
                  <span className="ml-1 text-xs text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${qualityBarClasses(band)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
