import type { QualityTrendPoint } from '@/domain/models/analytics';

interface QualityTrendChartProps {
  points: QualityTrendPoint[];
}

const WIDTH = 640;
const HEIGHT = 180;
const PAD_X = 8;
const PAD_Y = 12;

function xAt(index: number, count: number): number {
  if (count <= 1) return WIDTH / 2;
  return PAD_X + (index * (WIDTH - PAD_X * 2)) / (count - 1);
}

/** Map a 0..100 value to a y pixel (inverted: 100 at top). */
function yAt(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return PAD_Y + ((100 - clamped) * (HEIGHT - PAD_Y * 2)) / 100;
}

/**
 * Lightweight dependency-free SVG chart of the quality trend (Issue #13):
 * an area+line for average quality and a thin line for the active ratio, both
 * on a shared 0..100 scale. Render-only.
 */
export function QualityTrendChart({ points }: QualityTrendChartProps) {
  if (points.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        トレンドを表示するデータがありません。
      </p>
    );
  }

  const last = points[points.length - 1];
  const qualityLine = points
    .map((p, i) => `${xAt(i, points.length)},${yAt(p.avgQuality)}`)
    .join(' ');
  const activeLine = points
    .map((p, i) => `${xAt(i, points.length)},${yAt(p.activeRatio * 100)}`)
    .join(' ');
  const areaPath = `${PAD_X},${yAt(0)} ${qualityLine} ${xAt(
    points.length - 1,
    points.length
  )},${yAt(0)}`;

  // Show at most ~8 axis labels to avoid crowding.
  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500" />
          平均品質
          <strong className="tabular-nums">{last.avgQuality}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          有効率
          <strong className="tabular-nums">
            {Math.round(last.activeRatio * 100)}%
          </strong>
        </span>
        <span className="flex items-center gap-1.5 text-slate-500">
          総レコード
          <strong className="tabular-nums text-slate-700">{last.total}</strong>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-44 w-full"
        role="img"
        aria-label="品質トレンドチャート"
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <line
            key={tick}
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={yAt(tick)}
            y2={yAt(tick)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}
        <polygon points={areaPath} fill="#0ea5e9" fillOpacity={0.12} />
        <polyline
          points={qualityLine}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={activeLine}
          fill="none"
          stroke="#10b981"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle
            key={p.date}
            cx={xAt(i, points.length)}
            cy={yAt(p.avgQuality)}
            r={points.length > 40 ? 0 : 2.5}
            fill="#0ea5e9"
          >
            <title>
              {`${p.date}｜品質 ${p.avgQuality}／有効率 ${Math.round(
                p.activeRatio * 100
              )}%／重複 ${p.duplicateCount}／変更 ${p.changeCount}`}
            </title>
          </circle>
        ))}
      </svg>

      <div className="flex justify-between text-xs text-slate-400">
        {points
          .filter((_, i) => i % labelStep === 0 || i === points.length - 1)
          .map((p) => (
            <span key={p.date}>{p.label}</span>
          ))}
      </div>
    </div>
  );
}
