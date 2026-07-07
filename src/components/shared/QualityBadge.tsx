import { QUALITY_BAND_LABELS, type QualityBand } from '@/domain/models/quality';

import { qualityBadgeClasses } from './tone';

interface QualityBadgeProps {
  score: number;
  band: QualityBand;
}

/** Compact quality indicator: band label plus the numeric score. */
export function QualityBadge({ score, band }: QualityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${qualityBadgeClasses(
        band
      )}`}
    >
      {QUALITY_BAND_LABELS[band]}
      <span className="tabular-nums opacity-70">{score}</span>
    </span>
  );
}
