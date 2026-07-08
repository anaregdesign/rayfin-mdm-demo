import { describe, expect, it } from 'vitest';

import {
  CUSTOMER_CODE_MAX,
  isValidCustomerCode,
  normalizeCustomerCode,
} from '@/domain/value-objects/customer-code';

/**
 * Customer code value object — the unique business key. `normalizeCustomerCode`
 * is the canonical form used for duplicate detection (case/width-insensitive),
 * and `isValidCustomerCode` is the form-time format gate. Both must agree on
 * what a "code" is, so they are pinned together here.
 */
describe('normalizeCustomerCode', () => {
  it('upper-cases and trims', () => {
    expect(normalizeCustomerCode('  gt-001  ')).toBe('GT-001');
  });

  it('folds full-width characters via NFKC', () => {
    // Full-width "ＧＴ－００１" collapses to the ASCII canonical form.
    expect(normalizeCustomerCode('ＧＴ－００１')).toBe('GT-001');
  });

  it('is idempotent', () => {
    const once = normalizeCustomerCode('gt-001');
    expect(normalizeCustomerCode(once)).toBe(once);
  });

  it('makes case/width variants collide (duplicate-detection contract)', () => {
    expect(normalizeCustomerCode('gt-001')).toBe(normalizeCustomerCode('ＧＴ-001'));
  });
});

describe('isValidCustomerCode', () => {
  it('accepts alphanumerics with hyphen and underscore', () => {
    expect(isValidCustomerCode('GT-001')).toBe(true);
    expect(isValidCustomerCode('cust_01')).toBe(true);
    expect(isValidCustomerCode('A')).toBe(true);
  });

  it('trims before validating', () => {
    expect(isValidCustomerCode('  GT-001  ')).toBe(true);
  });

  it('rejects the empty string', () => {
    expect(isValidCustomerCode('')).toBe(false);
    expect(isValidCustomerCode('   ')).toBe(false);
  });

  it('rejects a leading hyphen or underscore', () => {
    expect(isValidCustomerCode('-001')).toBe(false);
    expect(isValidCustomerCode('_001')).toBe(false);
  });

  it('rejects spaces and disallowed punctuation', () => {
    expect(isValidCustomerCode('GT 001')).toBe(false);
    expect(isValidCustomerCode('GT.001')).toBe(false);
    expect(isValidCustomerCode('GT/001')).toBe(false);
  });

  it('accepts exactly the max length', () => {
    expect(isValidCustomerCode('A'.repeat(CUSTOMER_CODE_MAX))).toBe(true);
  });

  it('rejects one over the max length', () => {
    expect(isValidCustomerCode('A'.repeat(CUSTOMER_CODE_MAX + 1))).toBe(false);
  });
});
