import { describe, expect, it } from 'vitest';

import type { Customer, CustomerInput } from '@/domain/models/customer';
import { customerToInput } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import { productToInput } from '@/domain/models/product';
import {
  applyCleansing,
  deriveRemediationTargets,
  suggestCustomerCleansing,
  suggestProductCleansing,
} from '@/domain/policies/cleansing-policy';

const NOW = new Date('2024-06-01T00:00:00Z');

/**
 * A high-quality, valid, active customer whose every cleansing-target field is
 * already at its normalizer fixed point → zero suggestions by default. (Note the
 * phone/postal are pre-normalized, unlike other test factories.)
 */
function cleanCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c-clean',
    code: 'C-CLEAN',
    name: 'Base Customer KK',
    nameKana: 'ベースカスタマー',
    customerType: 'corporate',
    industry: 'IT',
    email: 'info@base.example.com',
    phone: '0312345678',
    postalCode: '100-0001',
    prefecture: '東京都',
    city: '千代田区',
    addressLine: '1-1-1',
    country: 'JP',
    website: 'https://base.example.com',
    taxId: 'T-0001',
    annualRevenue: 1_000_000,
    status: 'active',
    steward: 'Dana',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** A high-quality, valid, active product with fixed-point cleansing fields. */
function cleanProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-clean',
    sku: 'P-CLEAN',
    name: 'Base Product',
    nameKana: 'ベースプロダクト',
    category: 'electronics',
    brand: 'BrandX',
    description: 'A well described product.',
    unitPrice: 1000,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    barcode: '4900000000001',
    supplierName: 'Supplier Co',
    status: 'active',
    steward: 'Dana',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('suggestCustomerCleansing', () => {
  it('emits no suggestions for an already-normalized record', () => {
    expect(suggestCustomerCleansing(customerToInput(cleanCustomer()))).toEqual([]);
  });

  it('suggests a normalized value only when the field differs', () => {
    const input = customerToInput(
      cleanCustomer({ name: '  山田\u3000太郎  ', phone: '03-1234-5678' })
    );
    const suggestions = suggestCustomerCleansing(input);
    const byField = Object.fromEntries(suggestions.map((s) => [s.field, s]));

    expect(byField.name).toMatchObject({
      current: '  山田\u3000太郎  ',
      suggested: '山田 太郎',
    });
    expect(byField.phone).toMatchObject({
      current: '03-1234-5678',
      suggested: '0312345678',
    });
  });

  it('skips empty / whitespace-only fields', () => {
    const input = customerToInput(cleanCustomer({ industry: '   ' }));
    expect(suggestCustomerCleansing(input).some((s) => s.field === 'industry')).toBe(
      false
    );
  });
});

describe('suggestProductCleansing', () => {
  it('emits no suggestions for an already-normalized record', () => {
    expect(suggestProductCleansing(productToInput(cleanProduct()))).toEqual([]);
  });

  it('normalizes a separated barcode to digits only', () => {
    const input = productToInput(cleanProduct({ barcode: '4900-0000-0001-7' }));
    const suggestions = suggestProductCleansing(input);
    const barcode = suggestions.find((s) => s.field === 'barcode');
    expect(barcode?.suggested).toBe('4900000000017');
  });
});

describe('applyCleansing', () => {
  it('returns a non-mutating copy with suggested values written', () => {
    const input: CustomerInput = customerToInput(
      cleanCustomer({ name: '  山田\u3000太郎  ' })
    );
    const suggestions = suggestCustomerCleansing(input);
    const cleaned = applyCleansing(input, suggestions);

    expect(cleaned).not.toBe(input);
    expect(cleaned.name).toBe('山田 太郎');
    // Original untouched.
    expect(input.name).toBe('  山田\u3000太郎  ');
  });

  it('is a no-op when there are no suggestions', () => {
    const input = customerToInput(cleanCustomer());
    expect(applyCleansing(input, [])).toEqual(input);
  });
});

describe('deriveRemediationTargets', () => {
  it('surfaces a record that has cleansing suggestions', () => {
    const targets = deriveRemediationTargets(
      [cleanCustomer({ name: '  山田\u3000太郎  ' })],
      []
    );
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      id: 'customer:c-clean',
      entityType: 'customer',
    });
    expect(targets[0].suggestions.length).toBeGreaterThan(0);
  });

  it('does not surface a clean, valid, high-quality record', () => {
    expect(deriveRemediationTargets([cleanCustomer()], [cleanProduct()])).toEqual(
      []
    );
  });

  it('excludes merged and archived records', () => {
    const dirty = { name: '  山田\u3000太郎  ' };
    expect(
      deriveRemediationTargets([cleanCustomer({ ...dirty, status: 'archived' })], [])
    ).toEqual([]);
    expect(
      deriveRemediationTargets([cleanCustomer({ ...dirty, status: 'merged' })], [])
    ).toEqual([]);
  });

  it('flags missingRequired when a required field is blank', () => {
    const targets = deriveRemediationTargets(
      [cleanCustomer({ country: '' })],
      []
    );
    expect(targets).toHaveLength(1);
    expect(targets[0].missingRequired).toBe(true);
  });

  it('honours the quality threshold for records without suggestions', () => {
    // nameKana blank lowers the score but adds no suggestion and stays valid.
    const record = cleanCustomer({ nameKana: '' });
    // Default threshold (50): high score → not surfaced.
    expect(deriveRemediationTargets([record], [])).toEqual([]);
    // Threshold 100: score < 100 → surfaced with no suggestions.
    const strict = deriveRemediationTargets([record], [], {
      qualityThreshold: 100,
    });
    expect(strict).toHaveLength(1);
    expect(strict[0].suggestions).toEqual([]);
    expect(strict[0].missingRequired).toBe(false);
  });

  it('sorts worst quality score first', () => {
    const low = cleanCustomer({
      id: 'c-low',
      code: 'C-LOW',
      name: '  山田\u3000太郎  ',
      nameKana: '',
      industry: '',
      email: '',
      phone: '',
      postalCode: '',
      prefecture: '',
      city: '',
      addressLine: '',
      website: '',
    });
    const high = cleanCustomer({
      id: 'c-high',
      code: 'C-HIGH',
      name: '  山田\u3000太郎  ',
    });
    const targets = deriveRemediationTargets([high, low], []);
    expect(targets.map((t) => t.recordId)).toEqual(['c-low', 'c-high']);
    expect(targets[0].score).toBeLessThanOrEqual(targets[1].score);
  });

  it('merges customer and product targets into one queue', () => {
    const targets = deriveRemediationTargets(
      [cleanCustomer({ name: '  山田\u3000太郎  ' })],
      [cleanProduct({ barcode: '4900-0000-0001-7' })]
    );
    const types = targets.map((t) => t.entityType).sort();
    expect(types).toEqual(['customer', 'product']);
  });
});
