import { describe, expect, it } from 'vitest';

import type { Product } from '@/domain/models/product';
import {
  DEFAULT_PRODUCT_FILTERS,
  buildProductListView,
} from '@/usecase/products/selectors';

const NOW = new Date('2024-06-01T00:00:00Z');

/** A fully-populated, high-quality product (quality band NOT low). */
function highQualityProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-high',
    sku: 'P-HIGH',
    name: 'High Quality Product',
    nameKana: 'ハイクオリティ',
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

/** A sparse product with only required fields → low quality band. */
function lowQualityProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-low',
    sku: 'P-LOW',
    name: 'Low Quality Product',
    category: 'other',
    unitPrice: 0,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('buildProductListView — quality filter (Issue #13 drill-down)', () => {
  it("keeps every record when quality filter is 'all'", () => {
    const view = buildProductListView(
      [highQualityProduct(), lowQualityProduct()],
      { ...DEFAULT_PRODUCT_FILTERS, quality: 'all' }
    );

    expect(view.items).toHaveLength(2);
  });

  it("keeps only low-band records when quality filter is 'low'", () => {
    const view = buildProductListView(
      [highQualityProduct(), lowQualityProduct()],
      { ...DEFAULT_PRODUCT_FILTERS, quality: 'low' }
    );

    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.product.id).toBe('p-low');
    expect(view.items[0]?.quality.band).toBe('low');
  });

  it('reports the unfiltered total even when the quality filter narrows the rows', () => {
    const view = buildProductListView(
      [highQualityProduct(), lowQualityProduct()],
      { ...DEFAULT_PRODUCT_FILTERS, quality: 'low' }
    );

    expect(view.total).toBe(2);
    expect(view.filteredCount).toBe(1);
  });

  it("returns no rows for 'low' when every record is high quality", () => {
    const view = buildProductListView(
      [
        highQualityProduct({ id: 'p-1', sku: 'P-1' }),
        highQualityProduct({ id: 'p-2', sku: 'P-2' }),
      ],
      { ...DEFAULT_PRODUCT_FILTERS, quality: 'low' }
    );

    expect(view.items).toHaveLength(0);
  });
});
