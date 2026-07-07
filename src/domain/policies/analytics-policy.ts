/**
 * Analytics policy (Issue #13) — pure aggregation of master records + change
 * history into the dashboard's quality **trend**, per-group **breakdowns**, and
 * the **report** matrix. No IO, no SDK, no `Date.now()`: the caller injects
 * `now` so the output is deterministic and unit-testable.
 *
 * Reconstruction note: exact per-day quality would require full field-level
 * snapshots. This PoC approximates each day's point from the cohort of records
 * that **existed** on that day (createdAt ≤ day) using their *current* values,
 * and overlays the genuine per-day change-event count from the audit log (#5).
 * As history accumulates the change series becomes richer; the cohort series
 * already reflects how aggregate quality shifts as records are onboarded.
 */

import type {
  GroupBreakdown,
  QualityTrendPoint,
  TrendRecord,
} from '@/domain/models/analytics';

/** Local-time start-of-day (00:00:00.000). */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** ISO day key `YYYY-MM-DD` in local time. */
export function dayKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Short axis label `M/D`. */
export function dayLabel(date: Date): string {
  const d = startOfDay(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/** Hard cap on the number of daily points (protects the 全期間 path). */
const MAX_TREND_DAYS = 365;

export interface TrendOptions {
  /** "Today" — the last day in the series (injected for determinism). */
  now: Date;
  /** Window length in days; `0` = span from the earliest signal to `now`. */
  days: number;
}

/**
 * Build the daily quality trend. For each day in the window, aggregates the
 * cohort of `records` whose `createdAt` is on or before the end of that day, and
 * counts the `changes` recorded that day.
 */
export function buildQualityTrend(
  records: readonly TrendRecord[],
  changes: readonly { occurredAt: Date }[],
  options: TrendOptions
): QualityTrendPoint[] {
  const today = startOfDay(options.now);

  // Resolve the first day of the series.
  let start: Date;
  if (options.days > 0) {
    start = addDays(today, -(options.days - 1));
  } else {
    const earliestCreated = records.reduce<Date | null>(
      (min, r) => (min === null || r.createdAt < min ? r.createdAt : min),
      null
    );
    const earliestChange = changes.reduce<Date | null>(
      (min, c) => (min === null || c.occurredAt < min ? c.occurredAt : min),
      null
    );
    const candidates = [earliestCreated, earliestChange].filter(
      (d): d is Date => d !== null
    );
    start =
      candidates.length > 0
        ? startOfDay(
            candidates.reduce((min, d) => (d < min ? d : min), candidates[0])
          )
        : today;
  }

  // Clamp the span so a stray old date can't produce thousands of points.
  const rawSpan =
    Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1;
  const span = Math.max(1, Math.min(rawSpan, MAX_TREND_DAYS));
  const seriesStart = addDays(today, -(span - 1));

  // Bucket change events by day key once.
  const changesByDay = new Map<string, number>();
  for (const change of changes) {
    const key = dayKey(change.occurredAt);
    changesByDay.set(key, (changesByDay.get(key) ?? 0) + 1);
  }

  const points: QualityTrendPoint[] = [];
  for (let i = 0; i < span; i += 1) {
    const day = addDays(seriesStart, i);
    const endOfDay = addDays(startOfDay(day), 1).getTime() - 1;
    const cohort = records.filter((r) => r.createdAt.getTime() <= endOfDay);
    const total = cohort.length;
    const activeCount = cohort.filter((r) => r.isActive).length;
    points.push({
      date: dayKey(day),
      label: dayLabel(day),
      total,
      avgQuality: mean(cohort.map((r) => r.qualityScore)),
      activeRatio: total === 0 ? 0 : activeCount / total,
      duplicateCount: cohort.filter((r) => r.isDuplicate).length,
      changeCount: changesByDay.get(dayKey(day)) ?? 0,
    });
  }
  return points;
}

export interface GroupItem {
  key: string;
  label: string;
  qualityScore: number;
  isActive: boolean;
}

/**
 * Group `items` by `key`, tallying count / mean quality / active count. Sorted
 * by total desc, then label asc for a stable order. Pure.
 */
export function groupBreakdown(items: readonly GroupItem[]): GroupBreakdown[] {
  const groups = new Map<
    string,
    { label: string; scores: number[]; active: number }
  >();
  for (const item of items) {
    const bucket = groups.get(item.key) ?? {
      label: item.label,
      scores: [],
      active: 0,
    };
    bucket.scores.push(item.qualityScore);
    if (item.isActive) bucket.active += 1;
    groups.set(item.key, bucket);
  }

  return [...groups.entries()]
    .map<GroupBreakdown>(([key, bucket]) => {
      const total = bucket.scores.length;
      return {
        key,
        label: bucket.label,
        total,
        avgQuality: mean(bucket.scores),
        activeCount: bucket.active,
        activeRatio: total === 0 ? 0 : bucket.active / total,
      };
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'ja'));
}

/** One titled block of a CSV/print report. */
export interface ReportSection {
  title: string;
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}

/**
 * Flatten report sections into a single CSV matrix: a title row, a header row,
 * the data rows, then a blank spacer row between sections. Pure.
 */
export function reportToMatrix(
  sections: readonly ReportSection[]
): string[][] {
  const matrix: string[][] = [];
  sections.forEach((section, index) => {
    if (index > 0) matrix.push([]);
    matrix.push([section.title]);
    matrix.push([...section.headers]);
    for (const row of section.rows) matrix.push([...row]);
  });
  return matrix;
}
