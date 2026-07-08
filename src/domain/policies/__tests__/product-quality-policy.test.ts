import { describe, expect, it } from 'vitest';

import type { Product } from '@/domain/models/product';
import { evaluateProductQuality } from '@/domain/policies/product-quality-policy';

/**
 * Product quality scoring: 7 profile fields drive completeness; two issues
 * (unit price ≤ 0, active-without-steward) each deduct 10 points, clamped to
 * 0..100. Note the price check is an *issue*, not a completeness field.
 */
const base = new Date('2024-01-01T00:00:00.000Z');

/** A fully populated, issue-free product (all 7 scored fields filled). */
function fullProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prd-1',
    sku: 'SKU-001',
    name: 'サンプル製品',
    nameKana: 'サンプルセイヒン',
    category: 'other',
    brand: 'ACME',
    description: '説明文',
    unitPrice: 1000,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    barcode: '4901234567894',
    supplierName: '仕入先商事',
    status: 'active',
    steward: 'yamada',
    notes: undefined,
    createdAt: base,
    updatedAt: base,
    ...overrides,
  };
}

describe('evaluateProductQuality — perfect record', () => {
  it('scores 100 / high band with no missing fields or issues', () => {
    const q = evaluateProductQuality(fullProduct());
    expect(q.score).toBe(100);
    expect(q.completeness).toBe(100);
    expect(q.band).toBe('high');
    expect(q.filledCount).toBe(7);
    expect(q.scoredCount).toBe(7);
    expect(q.missingFields).toEqual([]);
    expect(q.issues).toEqual([]);
  });

  it('emits 7 factors, each weighted round(100/7)=14', () => {
    const q = evaluateProductQuality(fullProduct());
    expect(q.factors).toHaveLength(7);
    expect(q.factors.every((f) => f.weight === 14)).toBe(true);
  });
});

describe('evaluateProductQuality — issue penalties', () => {
  it('deducts 10 for a non-positive unit price (price is an issue, not a field)', () => {
    const q = evaluateProductQuality(fullProduct({ unitPrice: 0 }));
    // all 7 profile fields still filled → completeness 100, minus the price issue.
    expect(q.completeness).toBe(100);
    expect(q.score).toBe(90);
    expect(q.issues).toContain('単価が0以下です');
  });

  it('deducts 10 for an active product with no steward', () => {
    const q = evaluateProductQuality(
      fullProduct({ steward: undefined, status: 'active' }),
    );
    expect(q.filledCount).toBe(6);
    expect(q.completeness).toBe(86);
    expect(q.score).toBe(76);
    expect(q.band).toBe('medium');
    expect(q.issues).toContain('有効な製品にデータ管理者が設定されていません');
  });

  it('stacks both issues (−20)', () => {
    const q = evaluateProductQuality(
      fullProduct({ unitPrice: 0, steward: undefined, status: 'active' }),
    );
    expect(q.completeness).toBe(86);
    expect(q.issues).toHaveLength(2);
    expect(q.score).toBe(66);
  });

  it('does not raise the steward issue for a draft product', () => {
    const q = evaluateProductQuality(
      fullProduct({ steward: undefined, status: 'draft' }),
    );
    expect(q.issues).toEqual([]);
  });

  it('clamps the score to 0 when penalties exceed completeness', () => {
    const q = evaluateProductQuality(
      fullProduct({
        nameKana: undefined,
        brand: undefined,
        description: undefined,
        barcode: undefined,
        supplierName: undefined,
        steward: undefined,
        unitPrice: 0, // price issue
        status: 'active', // active + no steward → second issue
      }),
    );
    // filled: name only = 1 → completeness 14; two issues (−20) → clamp to 0.
    expect(q.completeness).toBe(14);
    expect(q.issues).toHaveLength(2);
    expect(q.score).toBe(0);
    expect(q.band).toBe('low');
  });
});
