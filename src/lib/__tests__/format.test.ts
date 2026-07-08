import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

/**
 * ja-JP formatters. Dates are built from LOCAL components (new Date(y, m, d, …))
 * so assertions are timezone-stable regardless of where the suite runs.
 */
const EM_DASH = '—';

describe('formatDate', () => {
  it('formats a Date as zero-padded ja-JP yyyy/MM/dd', () => {
    expect(formatDate(new Date(2024, 0, 5, 12, 0))).toBe('2024/01/05');
  });

  it('accepts a parseable date string', () => {
    expect(formatDate('2024-01-15T09:05:00')).toBe('2024/01/15');
  });

  it('returns an em dash for null/undefined', () => {
    expect(formatDate(null)).toBe(EM_DASH);
    expect(formatDate(undefined)).toBe(EM_DASH);
  });

  it('returns an em dash for an invalid date', () => {
    expect(formatDate('not-a-date')).toBe(EM_DASH);
    expect(formatDate(new Date('invalid'))).toBe(EM_DASH);
  });
});

describe('formatDateTime', () => {
  it('includes the zero-padded date and 24h time', () => {
    const s = formatDateTime(new Date(2024, 0, 15, 9, 5));
    expect(s.startsWith('2024/01/15')).toBe(true);
    expect(s).toMatch(/09:05/);
  });

  it('returns an em dash for nullish/invalid input', () => {
    expect(formatDateTime(null)).toBe(EM_DASH);
    expect(formatDateTime('nope')).toBe(EM_DASH);
  });
});

describe('formatNumber', () => {
  it('groups thousands with the ja-JP separator', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats zero and negatives', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-1500)).toBe('-1,500');
  });

  it('returns an em dash for null/undefined/NaN', () => {
    expect(formatNumber(null)).toBe(EM_DASH);
    expect(formatNumber(undefined)).toBe(EM_DASH);
    expect(formatNumber(Number.NaN)).toBe(EM_DASH);
  });
});
