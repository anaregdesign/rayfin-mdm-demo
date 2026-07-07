import { describe, expect, it } from 'vitest';

import type { GroupItem, ReportSection } from '@/domain/policies/analytics-policy';
import {
  buildQualityTrend,
  dayKey,
  dayLabel,
  groupBreakdown,
  reportToMatrix,
  startOfDay,
} from '@/domain/policies/analytics-policy';
import type { TrendRecord } from '@/domain/models/analytics';

function at(iso: string): Date {
  return new Date(iso);
}

function rec(
  createdAt: string,
  qualityScore: number,
  isActive: boolean,
  isDuplicate = false
): TrendRecord {
  return { createdAt: at(createdAt), qualityScore, isActive, isDuplicate };
}

describe('date helpers', () => {
  it('startOfDay zeroes the time component', () => {
    const d = startOfDay(at('2024-01-15T13:45:30.500'));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it('dayKey formats YYYY-MM-DD zero-padded', () => {
    expect(dayKey(at('2024-03-05T23:59:59'))).toBe('2024-03-05');
    expect(dayKey(at('2024-11-20T00:00:00'))).toBe('2024-11-20');
  });

  it('dayLabel formats M/D without padding', () => {
    expect(dayLabel(at('2024-03-05T10:00:00'))).toBe('3/5');
    expect(dayLabel(at('2024-11-20T10:00:00'))).toBe('11/20');
  });
});

describe('buildQualityTrend', () => {
  const now = at('2024-01-10T12:00:00');

  it('produces one point per day in the fixed window', () => {
    const points = buildQualityTrend([], [], { now, days: 7 });
    expect(points).toHaveLength(7);
    expect(points[0].date).toBe('2024-01-04');
    expect(points[6].date).toBe('2024-01-10');
  });

  it('cohort grows as records are created (createdAt <= end of day)', () => {
    const records = [
      rec('2024-01-04T09:00:00', 80, true),
      rec('2024-01-07T09:00:00', 60, false),
      rec('2024-01-10T09:00:00', 40, true, true),
    ];
    const points = buildQualityTrend(records, [], { now, days: 7 });
    expect(points[0].total).toBe(1); // only the 1/4 record
    expect(points[0].avgQuality).toBe(80);
    expect(points[3].total).toBe(2); // 1/7 adds the second
    expect(points[3].avgQuality).toBe(70); // (80+60)/2
    expect(points[6].total).toBe(3); // 1/10 adds the third
    expect(points[6].avgQuality).toBe(60); // (80+60+40)/3
  });

  it('computes activeRatio and duplicateCount over the cohort', () => {
    const records = [
      rec('2024-01-04T09:00:00', 80, true),
      rec('2024-01-04T10:00:00', 50, false, true),
    ];
    const points = buildQualityTrend(records, [], { now, days: 7 });
    expect(points[0].total).toBe(2);
    expect(points[0].activeRatio).toBe(0.5);
    expect(points[0].duplicateCount).toBe(1);
  });

  it('empty cohort day has zero avgQuality and activeRatio', () => {
    const records = [rec('2024-01-10T09:00:00', 90, true)];
    const points = buildQualityTrend(records, [], { now, days: 7 });
    expect(points[0].total).toBe(0);
    expect(points[0].avgQuality).toBe(0);
    expect(points[0].activeRatio).toBe(0);
  });

  it('buckets change events by day', () => {
    const changes = [
      { occurredAt: at('2024-01-04T08:00:00') },
      { occurredAt: at('2024-01-04T20:00:00') },
      { occurredAt: at('2024-01-10T01:00:00') },
    ];
    const points = buildQualityTrend([], changes, { now, days: 7 });
    expect(points[0].changeCount).toBe(2); // 1/4
    expect(points[6].changeCount).toBe(1); // 1/10
    expect(points[3].changeCount).toBe(0); // 1/7
  });

  it('all-mode (days=0) spans from the earliest signal to now', () => {
    const records = [rec('2024-01-08T09:00:00', 70, true)];
    const changes = [{ occurredAt: at('2024-01-06T09:00:00') }];
    const points = buildQualityTrend(records, changes, { now, days: 0 });
    // earliest signal = 1/6 → 1/6..1/10 inclusive = 5 days
    expect(points).toHaveLength(5);
    expect(points[0].date).toBe('2024-01-06');
    expect(points[4].date).toBe('2024-01-10');
  });

  it('all-mode with no data yields a single point at now', () => {
    const points = buildQualityTrend([], [], { now, days: 0 });
    expect(points).toHaveLength(1);
    expect(points[0].date).toBe('2024-01-10');
  });

  it('does not mutate the inputs', () => {
    const records = [rec('2024-01-04T09:00:00', 80, true)];
    const changes = [{ occurredAt: at('2024-01-04T08:00:00') }];
    const snapshotR = records[0].createdAt.getTime();
    const snapshotC = changes[0].occurredAt.getTime();
    buildQualityTrend(records, changes, { now, days: 7 });
    expect(records[0].createdAt.getTime()).toBe(snapshotR);
    expect(changes[0].occurredAt.getTime()).toBe(snapshotC);
    expect(now.getTime()).toBe(at('2024-01-10T12:00:00').getTime());
  });
});

describe('groupBreakdown', () => {
  const items: GroupItem[] = [
    { key: 'a', label: 'Alice', qualityScore: 80, isActive: true },
    { key: 'a', label: 'Alice', qualityScore: 60, isActive: false },
    { key: 'b', label: 'Bob', qualityScore: 90, isActive: true },
  ];

  it('tallies count, mean quality, active count and ratio', () => {
    const groups = groupBreakdown(items);
    const alice = groups.find((g) => g.key === 'a')!;
    expect(alice.total).toBe(2);
    expect(alice.avgQuality).toBe(70);
    expect(alice.activeCount).toBe(1);
    expect(alice.activeRatio).toBe(0.5);
  });

  it('sorts by total desc then label asc', () => {
    const tie: GroupItem[] = [
      { key: 'z', label: 'Zed', qualityScore: 50, isActive: true },
      { key: 'm', label: 'Mia', qualityScore: 50, isActive: true },
      { key: 'z2', label: 'Zoe', qualityScore: 50, isActive: false },
      { key: 'm', label: 'Mia', qualityScore: 70, isActive: true },
    ];
    const groups = groupBreakdown(tie);
    // Mia has 2, others 1 → Mia first; then Zed vs Zoe by label asc
    expect(groups.map((g) => g.key)).toEqual(['m', 'z', 'z2']);
  });

  it('returns an empty array for no items', () => {
    expect(groupBreakdown([])).toEqual([]);
  });
});

describe('reportToMatrix', () => {
  it('emits title, header, rows and a blank spacer between sections', () => {
    const sections: ReportSection[] = [
      { title: '顧客サマリ', headers: ['指標', '値'], rows: [['総数', '3']] },
      { title: '製品サマリ', headers: ['指標', '値'], rows: [['総数', '5']] },
    ];
    const matrix = reportToMatrix(sections);
    expect(matrix[0]).toEqual(['顧客サマリ']);
    expect(matrix[1]).toEqual(['指標', '値']);
    expect(matrix[2]).toEqual(['総数', '3']);
    expect(matrix[3]).toEqual([]); // spacer before section 2
    expect(matrix[4]).toEqual(['製品サマリ']);
  });

  it('does not prepend a spacer before the first section', () => {
    const matrix = reportToMatrix([
      { title: 'A', headers: ['h'], rows: [] },
    ]);
    expect(matrix[0]).toEqual(['A']);
  });
});
