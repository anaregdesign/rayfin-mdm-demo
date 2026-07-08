import { describe, expect, it } from 'vitest';

import type { CustomerInput } from '@/domain/models/customer';
import { validateCustomerInput } from '@/domain/policies/customer-validation';

/**
 * Customer form-validation policy. The form only renders messages; the rules
 * (required business key + format, required name/country, optional-but-checked
 * email, non-negative revenue) live here, so they are pinned exhaustively.
 */
function valid(overrides: Partial<CustomerInput> = {}): CustomerInput {
  return {
    code: 'C-001',
    name: '株式会社サンプル',
    customerType: 'corporate',
    country: 'Japan',
    status: 'active',
    ...overrides,
  };
}

describe('validateCustomerInput — happy path', () => {
  it('passes a complete, well-formed input', () => {
    const result = validateCustomerInput(valid());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('passes when the optional email is well-formed', () => {
    expect(validateCustomerInput(valid({ email: 'a@example.com' })).valid).toBe(
      true,
    );
  });

  it('passes when annualRevenue is exactly zero', () => {
    expect(validateCustomerInput(valid({ annualRevenue: 0 })).valid).toBe(true);
  });
});

describe('validateCustomerInput — code', () => {
  it('flags a blank code as required', () => {
    const result = validateCustomerInput(valid({ code: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.errors.code).toContain('必須');
  });

  it('flags a malformed code with the format message', () => {
    const result = validateCustomerInput(valid({ code: 'has space' }));
    expect(result.valid).toBe(false);
    expect(result.errors.code).toContain('英数字');
  });
});

describe('validateCustomerInput — name', () => {
  it('flags a blank name', () => {
    expect(validateCustomerInput(valid({ name: '  ' })).errors.name).toContain(
      '必須',
    );
  });

  it('flags a name over 200 characters', () => {
    const result = validateCustomerInput(valid({ name: 'あ'.repeat(201) }));
    expect(result.errors.name).toContain('200');
  });

  it('accepts a name of exactly 200 characters', () => {
    expect(validateCustomerInput(valid({ name: 'あ'.repeat(200) })).valid).toBe(
      true,
    );
  });
});

describe('validateCustomerInput — country / email / revenue', () => {
  it('flags a blank country', () => {
    expect(
      validateCustomerInput(valid({ country: '' })).errors.country,
    ).toContain('必須');
  });

  it('flags a malformed email but ignores an empty one', () => {
    expect(validateCustomerInput(valid({ email: 'bad' })).errors.email).toBeTruthy();
    expect(validateCustomerInput(valid({ email: '' })).valid).toBe(true);
    expect(validateCustomerInput(valid({ email: undefined })).valid).toBe(true);
  });

  it('flags a negative annualRevenue', () => {
    expect(
      validateCustomerInput(valid({ annualRevenue: -1 })).errors.annualRevenue,
    ).toBeTruthy();
  });

  it('flags a NaN annualRevenue', () => {
    expect(
      validateCustomerInput(valid({ annualRevenue: Number.NaN })).errors
        .annualRevenue,
    ).toBeTruthy();
  });
});

describe('validateCustomerInput — aggregation', () => {
  it('collects multiple field errors at once', () => {
    const result = validateCustomerInput(
      valid({ code: '', name: '', country: '' }),
    );
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual([
      'code',
      'country',
      'name',
    ]);
  });
});
