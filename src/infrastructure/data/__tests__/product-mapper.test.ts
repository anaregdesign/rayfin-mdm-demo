import { describe, expect, it } from 'vitest';

import type { ProductInput } from '@/domain/models/product';
import {
  productInputToFields,
  toProduct,
  type ProductRow,
} from '@/infrastructure/data/product-mapper';

/**
 * Round-trip + normalization coverage for the Product infra mapper. Locks the
 * row↔domain conversion (null→undefined, date strings→Date) and the
 * blank→undefined + trim normalization applied to form input.
 */
const createdAt = new Date('2024-01-01T00:00:00.000Z');
const updatedAt = new Date('2024-01-02T00:00:00.000Z');

function row(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: 'prd-1',
    sku: 'SKU-001',
    name: 'サンプル製品',
    category: 'electronics',
    unitPrice: 1980,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    status: 'active',
    createdAt,
    updatedAt,
    ...overrides,
  } as ProductRow;
}

function baseInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    sku: 'SKU-001',
    name: 'サンプル製品',
    category: 'electronics',
    unitPrice: 1980,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    status: 'active',
    ...overrides,
  } as ProductInput;
}

describe('toProduct', () => {
  it('maps the core scalar fields straight through', () => {
    const mapped = toProduct(row());
    expect(mapped.id).toBe('prd-1');
    expect(mapped.sku).toBe('SKU-001');
    expect(mapped.name).toBe('サンプル製品');
    expect(mapped.category).toBe('electronics');
    expect(mapped.unitPrice).toBe(1980);
    expect(mapped.currency).toBe('JPY');
    expect(mapped.unitOfMeasure).toBe('piece');
    expect(mapped.status).toBe('active');
  });

  it('converts createdAt/updatedAt into Date instances', () => {
    const mapped = toProduct(
      row({
        createdAt: '2024-03-04T05:06:07.000Z' as unknown as Date,
        updatedAt: '2024-03-05T05:06:07.000Z' as unknown as Date,
      }),
    );
    expect(mapped.createdAt).toBeInstanceOf(Date);
    expect(mapped.updatedAt).toBeInstanceOf(Date);
    expect(mapped.createdAt.toISOString()).toBe('2024-03-04T05:06:07.000Z');
  });

  it('normalizes null optional columns to undefined', () => {
    const mapped = toProduct(
      row({
        nameKana: null as unknown as string,
        brand: null as unknown as string,
        description: null as unknown as string,
        categoryId: null as unknown as string,
        barcode: null as unknown as string,
        supplierName: null as unknown as string,
        steward: null as unknown as string,
        notes: null as unknown as string,
        mergedInto: null as unknown as string,
        mergedAt: null as unknown as Date,
        createdBy: null as unknown as string,
        updatedBy: null as unknown as string,
      }),
    );
    expect(mapped.nameKana).toBeUndefined();
    expect(mapped.brand).toBeUndefined();
    expect(mapped.description).toBeUndefined();
    expect(mapped.categoryId).toBeUndefined();
    expect(mapped.barcode).toBeUndefined();
    expect(mapped.supplierName).toBeUndefined();
    expect(mapped.steward).toBeUndefined();
    expect(mapped.notes).toBeUndefined();
    expect(mapped.mergedInto).toBeUndefined();
    expect(mapped.mergedAt).toBeUndefined();
  });

  it('converts mergedAt to a Date when present', () => {
    const mapped = toProduct(
      row({ mergedAt: '2024-06-01T00:00:00.000Z' as unknown as Date }),
    );
    expect(mapped.mergedAt).toBeInstanceOf(Date);
    expect(mapped.mergedAt?.toISOString()).toBe('2024-06-01T00:00:00.000Z');
  });
});

describe('productInputToFields', () => {
  it('trims the required sku and name', () => {
    const fields = productInputToFields(
      baseInput({ sku: '  SKU-9  ', name: '  余白製品  ' }),
    );
    expect(fields.sku).toBe('SKU-9');
    expect(fields.name).toBe('余白製品');
  });

  it('passes required non-string fields through unchanged', () => {
    const fields = productInputToFields(
      baseInput({ unitPrice: 0, currency: 'USD', unitOfMeasure: 'box' }),
    );
    expect(fields.unitPrice).toBe(0);
    expect(fields.currency).toBe('USD');
    expect(fields.unitOfMeasure).toBe('box');
  });

  it('normalizes blank optional fields to undefined', () => {
    const fields = productInputToFields(
      baseInput({
        nameKana: '   ',
        brand: '',
        description: '   ',
        categoryId: '',
        barcode: '   ',
        supplierName: '',
        steward: '   ',
        notes: '',
      }),
    );
    expect(fields.nameKana).toBeUndefined();
    expect(fields.brand).toBeUndefined();
    expect(fields.description).toBeUndefined();
    expect(fields.categoryId).toBeUndefined();
    expect(fields.barcode).toBeUndefined();
    expect(fields.supplierName).toBeUndefined();
    expect(fields.steward).toBeUndefined();
    expect(fields.notes).toBeUndefined();
  });

  it('trims real optional values', () => {
    const fields = productInputToFields(
      baseInput({ brand: '  Acme  ', categoryId: '  cat-1  ' }),
    );
    expect(fields.brand).toBe('Acme');
    expect(fields.categoryId).toBe('cat-1');
  });
});

describe('input → fields → row → domain round-trip', () => {
  it('preserves values across the mapper boundary', () => {
    const input = baseInput({
      sku: '  SKU-77  ',
      name: '  往復製品  ',
      brand: '  Globex  ',
      categoryId: '  cat-9  ',
      unitPrice: 250,
      currency: 'EUR',
    });
    const fields = productInputToFields(input);
    const back = toProduct(row({ ...fields }));
    expect(back.sku).toBe('SKU-77');
    expect(back.name).toBe('往復製品');
    expect(back.brand).toBe('Globex');
    expect(back.categoryId).toBe('cat-9');
    expect(back.unitPrice).toBe(250);
    expect(back.currency).toBe('EUR');
  });
});
