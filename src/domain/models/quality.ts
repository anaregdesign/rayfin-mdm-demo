/**
 * Data-quality scoring model. The band thresholds are a business rule and
 * live here so every view maps a score to the same band (and, through a
 * shared presentation helper, the same tone).
 */

export type QualityBand = 'high' | 'medium' | 'low';

/**
 * Per-field completeness contribution (Issue #11 breakdown). Each scored profile
 * field contributes an equal share of the completeness component; the UI lists
 * them so a steward sees exactly which fields earn or lose points.
 */
export interface QualityFactor {
  /** Field key (matches the input shape where possible). */
  key: string;
  /** Localised field label. */
  label: string;
  /** Whether the field counts as filled. */
  filled: boolean;
  /** Weight this field carries toward completeness (percentage points). */
  weight: number;
}

/** A scored deduction with its human-readable reason (Issue #11 breakdown). */
export interface QualityIssueDetail {
  /** Localised description of the problem. */
  message: string;
  /** Points deducted from the score. */
  penalty: number;
}

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
  /** Per-field completeness contribution, for the detail-view breakdown (#11). */
  factors: QualityFactor[];
  /** Scored deductions with reasons, parallel to `issues` (#11). */
  issueDetails: QualityIssueDetail[];
}

/**
 * A proposed normalization for a single field (Issue #11 cleansing). The queue
 * shows `current → suggested`; applying it writes `suggested` back through the
 * normal update path (no new persistence).
 */
export interface CleansingSuggestion {
  /** Input-shape field key the suggestion targets. */
  field: string;
  /** Localised field label. */
  label: string;
  /** Current stored value. */
  current: string;
  /** Normalized replacement value. */
  suggested: string;
  /** Localised reason describing the normalization rule. */
  reason: string;
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
