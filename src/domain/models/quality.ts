/**
 * Data-quality scoring model. The band thresholds are a business rule and
 * live here so every view maps a score to the same band (and, through a
 * shared presentation helper, the same tone).
 */

export type QualityBand = 'high' | 'medium' | 'low';

export interface QualityResult {
  /** Overall 0..100 quality score (completeness minus issue penalties). */
  score: number;
  /** 0..100 field completeness across the scored profile fields. */
  completeness: number;
  band: QualityBand;
  filledCount: number;
  scoredCount: number;
  /** Human-readable labels of the profile fields that are empty. */
  missingFields: string[];
  /** Human-readable data-quality issues (format errors, governance gaps). */
  issues: string[];
}

const HIGH_THRESHOLD = 80;
const MEDIUM_THRESHOLD = 50;

export function qualityBand(score: number): QualityBand {
  if (score >= HIGH_THRESHOLD) return 'high';
  if (score >= MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}

export const QUALITY_BAND_LABELS: Record<QualityBand, string> = {
  high: '良好',
  medium: '要改善',
  low: '不足',
};

export function qualityBandLabel(score: number): string {
  return QUALITY_BAND_LABELS[qualityBand(score)];
}
