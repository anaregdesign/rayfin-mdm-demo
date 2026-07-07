import { describe, expect, it } from 'vitest';

import type { Customer } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import {
  CUSTOMER_CSV_HEADERS,
  PRODUCT_CSV_HEADERS,
  customerToCsvRow,
  evaluateCustomerImport,
  evaluateProductImport,
  productToCsvRow,
} from '@/domain/policies/import-policy';
import { recordsFromMatrix } from '@/lib/csv';

/**
 * Regression coverage for the bulk-import policy — the heart of Issue #6.
 * A single ordered field spec drives BOTH export and import, so these tests
 * guard the round-trip, the per-row validation/dedup verdicts, and the
 * insert/upsert/skip semantics against future drift.
 */

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  const now = new Date('2024-01-01T00:00:00Z');
  return {
    id: 'id-1',
    code: 'C-001',
    name: 'Acme 株式会社',
    customerType: 'corporate',
    country: 'Japan',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  const now = new Date('2024-01-01T00:00:00Z');
  return {
    id: 'p-1',
    sku: 'SKU-001',
    name: '標準製品',
    category: 'other',
    unitPrice: 1000,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Build header-keyed records from partial rows using the given headers. */
function recordsFrom(
  headers: string[],
  rows: Record<string, string>[]
): Record<string, string>[] {
  const matrix = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))];
  return recordsFromMatrix(matrix).records;
}

describe('export schema', () => {
  it('customer header count matches the exported row width', () => {
    expect(customerToCsvRow(makeCustomer())).toHaveLength(
      CUSTOMER_CSV_HEADERS.length
    );
  });

  it('product header count matches the exported row width', () => {
    expect(productToCsvRow(makeProduct())).toHaveLength(
      PRODUCT_CSV_HEADERS.length
    );
  });
});

describe('export → import round-trip', () => {
  it('re-imports an exported customer back to the same key fields', () => {
    const customer = makeCustomer({
      code: 'C-777',
      name: '往復商事',
      email: 'a@example.com',
      annualRevenue: 5000000,
      status: 'active',
    });
    const records = recordsFromMatrix([
      CUSTOMER_CSV_HEADERS,
      customerToCsvRow(customer),
    ]).records;

    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.rows).toHaveLength(1);
    const input = preview.rows[0].input;
    expect(input).toMatchObject({
      code: 'C-777',
      name: '往復商事',
      customerType: 'corporate',
      email: 'a@example.com',
      annualRevenue: 5000000,
      status: 'active',
    });
    expect(preview.rows[0].status).toBe('ok');
    expect(preview.rows[0].action).toBe('insert');
  });

  it('re-imports an exported product back to the same key fields', () => {
    const product = makeProduct({
      sku: 'SKU-777',
      name: '往復製品',
      unitPrice: 2480,
      currency: 'JPY',
      status: 'active',
    });
    const records = recordsFromMatrix([
      PRODUCT_CSV_HEADERS,
      productToCsvRow(product),
    ]).records;

    const preview = evaluateProductImport(records, [], 'insert');
    expect(preview.rows[0].input).toMatchObject({
      sku: 'SKU-777',
      name: '往復製品',
      unitPrice: 2480,
      currency: 'JPY',
      status: 'active',
    });
    expect(preview.rows[0].action).toBe('insert');
  });
});

describe('enum parsing', () => {
  it('accepts a canonical value or a Japanese label', () => {
    const records = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-1', 名称: '法人A', 顧客区分: 'corporate' },
      { 顧客コード: 'C-2', 名称: '個人B', 顧客区分: '個人' },
    ]);
    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.rows[0].input?.customerType).toBe('corporate');
    expect(preview.rows[1].input?.customerType).toBe('individual');
  });

  it('rejects an unknown customer type', () => {
    const records = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-1', 名称: '団体X', 顧客区分: '団体' },
    ]);
    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.rows[0].status).toBe('error');
    expect(preview.rows[0].messages.join()).toContain('顧客区分が不正です');
  });

  it('rejects the system-only "merged" status (not hand-importable)', () => {
    const byLabel = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-1', 名称: '統合A', ステータス: '統合済み' },
    ]);
    const byValue = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-1', 名称: '統合A', ステータス: 'merged' },
    ]);
    expect(evaluateCustomerImport(byLabel, [], 'insert').rows[0].status).toBe(
      'error'
    );
    expect(evaluateCustomerImport(byValue, [], 'insert').rows[0].status).toBe(
      'error'
    );
  });
});

describe('number parsing', () => {
  it('tolerates thousands separators and currency marks', () => {
    const records = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-1', 名称: 'A', 年間売上: '1,000,000' },
      { 顧客コード: 'C-2', 名称: 'B', 年間売上: '￥500' },
    ]);
    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.rows[0].input?.annualRevenue).toBe(1000000);
    expect(preview.rows[1].input?.annualRevenue).toBe(500);
  });

  it('flags a non-numeric amount as an error', () => {
    const records = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-1', 名称: 'A', 年間売上: 'abc' },
    ]);
    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.rows[0].status).toBe('error');
    expect(preview.rows[0].messages.join()).toContain('年間売上が数値ではありません');
  });
});

describe('validation', () => {
  it('turns a missing required field into an error row', () => {
    const records = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-1', 名称: '' },
    ]);
    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.rows[0].status).toBe('error');
    expect(preview.rows[0].action).toBe('error');
    expect(preview.rows[0].messages.join()).toContain('名称は必須です');
  });

  it('flags a malformed email', () => {
    const records = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-1', 名称: 'A', メールアドレス: 'not-an-email' },
    ]);
    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.rows[0].status).toBe('error');
  });
});

describe('within-file duplicate keys', () => {
  it('marks the second occurrence of a key as an error', () => {
    const records = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-9', 名称: '一件目' },
      { 顧客コード: 'C-9', 名称: '二件目' },
    ]);
    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.rows[0].action).toBe('insert');
    expect(preview.rows[1].status).toBe('error');
    expect(preview.rows[1].messages.join()).toContain('ファイル内で顧客コードが重複');
  });
});

describe('existing-key handling by mode', () => {
  const existing = [makeCustomer({ id: 'x1', code: 'C-001', name: '既存商事' })];
  const records = recordsFrom(CUSTOMER_CSV_HEADERS, [
    { 顧客コード: 'C-001', 名称: '更新後商事' },
  ]);

  it('insert mode: existing key is an error', () => {
    const row = evaluateCustomerImport(records, existing, 'insert').rows[0];
    expect(row.status).toBe('error');
    expect(row.action).toBe('error');
  });

  it('skip mode: existing key is skipped', () => {
    const row = evaluateCustomerImport(records, existing, 'skip').rows[0];
    expect(row.action).toBe('skip');
    expect(row.status).toBe('warning');
    expect(row.existingId).toBe('x1');
  });

  it('upsert mode: existing key becomes an update', () => {
    const row = evaluateCustomerImport(records, existing, 'upsert').rows[0];
    expect(row.action).toBe('update');
    expect(row.status).toBe('warning');
    expect(row.existingId).toBe('x1');
  });
});

describe('new-row soft duplicate detection', () => {
  it('warns when a new row resembles an existing record', () => {
    const existing = [makeCustomer({ id: 'x1', code: 'C-001', name: '名寄せ商事' })];
    const records = recordsFrom(CUSTOMER_CSV_HEADERS, [
      { 顧客コード: 'C-999', 名称: '名寄せ商事' },
    ]);
    const row = evaluateCustomerImport(records, existing, 'insert').rows[0];
    expect(row.action).toBe('insert');
    expect(row.status).toBe('warning');
    expect(row.messages.join()).toContain('重複候補');
  });
});

describe('header aliases and unknown columns', () => {
  it('accepts English alias headers', () => {
    const records = recordsFrom(['code', 'name', 'type'], [
      { code: 'C-1', name: 'Alias社', type: 'corporate' },
    ]);
    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.rows[0].input).toMatchObject({
      code: 'C-1',
      name: 'Alias社',
      customerType: 'corporate',
    });
    expect(preview.rows[0].status).toBe('ok');
  });

  it('reports unrecognized headers without failing the row', () => {
    const records = recordsFrom(['顧客コード', '名称', '追加列'], [
      { 顧客コード: 'C-1', 名称: 'A', 追加列: '無視される' },
    ]);
    const preview = evaluateCustomerImport(records, [], 'insert');
    expect(preview.unknownHeaders).toContain('追加列');
    expect(preview.rows[0].status).toBe('ok');
  });
});

describe('preview summary', () => {
  it('tallies row verdicts and writable rows', () => {
    const existing = [makeProduct({ id: 'x1', sku: 'SKU-001', name: '既存' })];
    const records = recordsFrom(PRODUCT_CSV_HEADERS, [
      { SKU: 'SKU-100', 名称: '新規A' }, // insert
      { SKU: 'SKU-001', 名称: '更新A' }, // update (upsert)
      { SKU: '', 名称: 'キー無し' }, // error (SKU required)
    ]);
    const preview = evaluateProductImport(records, existing, 'upsert');
    expect(preview.summary.total).toBe(3);
    expect(preview.summary.toInsert).toBe(1);
    expect(preview.summary.toUpdate).toBe(1);
    expect(preview.summary.error).toBe(1);
    expect(preview.hasWritableRows).toBe(true);
  });
});
