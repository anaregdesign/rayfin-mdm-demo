import { describe, expect, it } from 'vitest';

import { isValidSku, normalizeSku, SKU_MAX } from '@/domain/value-objects/sku';

/**
 * SKU value object — the unique business key for a product. Mirrors the customer
 * code rules but the format additionally allows a period (e.g. "SKU.001"), so
 * that difference is asserted explicitly here.
 */
describe('normalizeSku', () => {
  it('upper-cases and trims', () => {
    expect(normalizeSku('  sku-001  ')).toBe('SKU-001');
  });

  it('folds full-width characters via NFKC', () => {
    expect(normalizeSku('ＳＫＵ－００１')).toBe('SKU-001');
  });

  it('is idempotent', () => {
    const once = normalizeSku('sku.001');
    expect(normalizeSku(once)).toBe(once);
  });

  it('makes case/width variants collide (duplicate-detection contract)', () => {
    expect(normalizeSku('sku-001')).toBe(normalizeSku('ＳＫＵ-001'));
  });
});

describe('isValidSku', () => {
  it('accepts alphanumerics with period, hyphen and underscore', () => {
    expect(isValidSku('SKU-001')).toBe(true);
    expect(isValidSku('SKU.001')).toBe(true);
    expect(isValidSku('sku_01')).toBe(true);
    expect(isValidSku('A')).toBe(true);
  });

  it('trims before validating', () => {
    expect(isValidSku('  SKU.001  ')).toBe(true);
  });

  it('rejects the empty string', () => {
    expect(isValidSku('')).toBe(false);
    expect(isValidSku('   ')).toBe(false);
  });

  it('rejects a leading period/hyphen/underscore', () => {
    expect(isValidSku('.001')).toBe(false);
    expect(isValidSku('-001')).toBe(false);
    expect(isValidSku('_001')).toBe(false);
  });

  it('rejects spaces and disallowed punctuation', () => {
    expect(isValidSku('SKU 001')).toBe(false);
    expect(isValidSku('SKU/001')).toBe(false);
  });

  it('accepts exactly the max length', () => {
    expect(isValidSku('A'.repeat(SKU_MAX))).toBe(true);
  });

  it('rejects one over the max length', () => {
    expect(isValidSku('A'.repeat(SKU_MAX + 1))).toBe(false);
  });
});
