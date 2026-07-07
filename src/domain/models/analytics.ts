/**
 * Analytics domain model (Issue #13). View-facing shapes for the dashboard's
 * quality **trend** (time-series), the KPI **drill-down** navigation contract,
 * and the per-group **breakdown** tables. No persistence decorators and no SDK
 * dependency — the usecase layer maps master records + change history into these
 * pure structures via `analytics-policy`.
 */

import type { ChangeEntityType } from './change-log';

/** Selectable trend windows (days). `0` = 全期間 (all history). */
export type TrendWindowDays = 7 | 30 | 90 | 0;

export const TREND_WINDOW_VALUES: readonly TrendWindowDays[] = [
  7, 30, 90, 0,
] as const;

export function trendWindowLabel(days: TrendWindowDays): string {
  switch (days) {
    case 7:
      return '直近7日';
    case 30:
      return '直近30日';
    case 90:
      return '直近90日';
    case 0:
      return '全期間';
  }
}

/**
 * One master record projected into the fields the trend needs. The usecase
 * computes `qualityScore`/`isActive`/`isDuplicate` from the existing quality +
 * duplicate policies so this stays a plain, easily-tested value.
 */
export interface TrendRecord {
  /** When the record first appeared — anchors the daily cohort. */
  createdAt: Date;
  /** Current completeness/quality score 0..100. */
  qualityScore: number;
  /** Whether the record's current status is `active`. */
  isActive: boolean;
  /** Whether the record is currently flagged as a duplicate candidate. */
  isDuplicate: boolean;
}

/**
 * One point on the quality trend. Aggregates the cohort of records that existed
 * on `date` (createdAt ≤ that day) using their **current** values, plus the raw
 * count of change-history events recorded that day.
 */
export interface QualityTrendPoint {
  /** ISO day key `YYYY-MM-DD`. */
  date: string;
  /** Short axis label, e.g. `1/23`. */
  label: string;
  /** Records that existed on this day. */
  total: number;
  /** Mean quality score 0..100 across the cohort (0 when empty). */
  avgQuality: number;
  /** Share 0..1 of the cohort whose current status is active. */
  activeRatio: number;
  /** Duplicate-flagged records within the cohort. */
  duplicateCount: number;
  /** Change-history events recorded on this day (from the audit log, #5). */
  changeCount: number;
}

/** Aggregated counts + mean quality for one grouping key. */
export interface GroupBreakdown {
  key: string;
  label: string;
  total: number;
  avgQuality: number;
  activeCount: number;
  /** Share 0..1 of the group that is active. */
  activeRatio: number;
}

/**
 * Drill-down contract passed from a dashboard KPI card to a list page (via the
 * router `state`). The list page seeds its own filters from this — it "rides on"
 * the existing search/status filters (plus the low-quality quick filter).
 */
export interface DrilldownFilter {
  entity: ChangeEntityType;
  /** Seed the status filter (canonical status value; omit for すべて). */
  status?: string;
  /** Restrict to low-quality records only. */
  quality?: 'low';
}

/** Human description of a drill-down, used for the list page's active-filter chip. */
export function describeDrilldown(filter: DrilldownFilter): string {
  const parts: string[] = [];
  if (filter.quality === 'low') parts.push('低品質のみ');
  if (filter.status) parts.push(`ステータス: ${filter.status}`);
  return parts.length > 0 ? parts.join(' / ') : 'すべて';
}
