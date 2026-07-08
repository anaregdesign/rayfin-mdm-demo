import { describe, expect, it } from 'vitest';

import {
  CURRENCY_LABELS,
  CURRENCY_VALUES,
  formatMoney,
} from '@/domain/value-objects/money';

/**
 * Money value object — the locale-aware currency formatter. The exact currency
 * glyph is ICU-version dependent, so these tests assert the meaningful bits
 * (grouped digits, the null/NaN em-dash guard, decimals) rather than the symbol
 * byte-for-byte, keeping them stable across Node/ICU versions.
 */
describe('formatMoney', () => {
  it('formats JPY with grouped digits (no decimals)', () => {
    const out = formatMoney(1234567, 'JPY');
    expect(out).toContain('1,234,567');
    expect(out).not.toBe('—');
  });

  it('formats USD with two decimals', () => {
    expect(formatMoney(1000, 'USD')).toContain('1,000.00');
  });

  it('formats EUR with grouped digits', () => {
    expect(formatMoney(2500.5, 'EUR')).toContain('2,500.5');
  });

  it('formats zero (a real amount, not empty)', () => {
    expect(formatMoney(0, 'JPY')).toContain('0');
    expect(formatMoney(0, 'JPY')).not.toBe('—');
  });

  it('returns an em-dash for null', () => {
    expect(formatMoney(null, 'JPY')).toBe('—');
  });

  it('returns an em-dash for undefined', () => {
    expect(formatMoney(undefined, 'JPY')).toBe('—');
  });

  it('returns an em-dash for NaN', () => {
    expect(formatMoney(Number.NaN, 'JPY')).toBe('—');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-1000, 'JPY')).toContain('1,000');
  });
});

describe('currency constants', () => {
  it('exposes the three supported currencies', () => {
    expect(CURRENCY_VALUES).toEqual(['JPY', 'USD', 'EUR']);
  });

  it('has a Japanese label for every supported currency', () => {
    for (const c of CURRENCY_VALUES) {
      expect(CURRENCY_LABELS[c]).toBeTruthy();
      expect(CURRENCY_LABELS[c]).toContain(c);
    }
  });
});
