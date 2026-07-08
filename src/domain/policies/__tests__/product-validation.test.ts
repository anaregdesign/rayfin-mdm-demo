import { describe, expect, it } from 'vitest';

import type { ProductInput } from '@/domain/models/product';
import { validateProductInput } from '@/domain/policies/product-validation';

/**
 * Product form-validation policy. Required SKU + format, required name (≤200),
 * and a required non-negative unit price. Zero is a valid price (free/sample),
 * so it must pass; null/NaN means "not entered" and must be flagged.
 */
function valid(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    sku: 'SKU-001',
    name: 'サンプル製品',
    category: 'other',
    unitPrice: 1000,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    status: 'active',
    ...overrides,
  };
}

describe('validateProductInput — happy path', () => {
  it('passes a complete, well-formed input', () => {
    const result = validateProductInput(valid());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('passes when unitPrice is exactly zero', () => {
    expect(validateProductInput(valid({ unitPrice: 0 })).valid).toBe(true);
  });

  it('passes a SKU containing a period', () => {
    expect(validateProductInput(valid({ sku: 'SKU.001' })).valid).toBe(true);
  });
});

describe('validateProductInput — sku', () => {
  it('flags a blank sku as required', () => {
    const result = validateProductInput(valid({ sku: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.errors.sku).toContain('必須');
  });

  it('flags a malformed sku with the format message', () => {
    const result = validateProductInput(valid({ sku: 'has space' }));
    expect(result.errors.sku).toContain('英数字');
  });
});

describe('validateProductInput — name', () => {
  it('flags a blank name', () => {
    expect(validateProductInput(valid({ name: '  ' })).errors.name).toContain(
      '必須',
    );
  });

  it('flags a name over 200 characters', () => {
    expect(
      validateProductInput(valid({ name: 'あ'.repeat(201) })).errors.name,
    ).toContain('200');
  });

  it('accepts a name of exactly 200 characters', () => {
    expect(validateProductInput(valid({ name: 'あ'.repeat(200) })).valid).toBe(
      true,
    );
  });
});

describe('validateProductInput — unitPrice', () => {
  it('flags a null price as required', () => {
    const result = validateProductInput(
      valid({ unitPrice: null as unknown as number }),
    );
    expect(result.errors.unitPrice).toContain('必須');
  });

  it('flags a NaN price as required', () => {
    expect(
      validateProductInput(valid({ unitPrice: Number.NaN })).errors.unitPrice,
    ).toContain('必須');
  });

  it('flags a negative price', () => {
    const result = validateProductInput(valid({ unitPrice: -1 }));
    expect(result.errors.unitPrice).toContain('0以上');
  });
});

describe('validateProductInput — aggregation', () => {
  it('collects multiple field errors at once', () => {
    const result = validateProductInput(
      valid({ sku: '', name: '', unitPrice: -5 }),
    );
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual([
      'name',
      'sku',
      'unitPrice',
    ]);
  });
});
