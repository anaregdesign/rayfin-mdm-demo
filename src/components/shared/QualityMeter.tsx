import { qualityBand, type QualityBand } from '@/domain/models/quality';

import { qualityBarClasses, qualityTextClasses } from './tone';

interface QualityMeterProps {
  score: number;
  /** Optional pre-computed band; falls back to deriving from the score. */
  band?: QualityBand;
  label?: string;
  showValue?: boolean;
}

/** Horizontal quality bar colored by band; width reflects the 0..100 score. */
export function QualityMeter({
  score,
  band,
  label,
  showValue = true,
}: QualityMeterProps) {
  const resolved = band ?? qualityBand(score);
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-xs">
          {label && <span className="text-slate-500">{label}</span>}
          {showValue && (
            <span className={`font-semibold tabular-nums ${qualityTextClasses(resolved)}`}>
              {score}
              <span className="font-normal text-slate-400">/100</span>
            </span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${qualityBarClasses(resolved)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
