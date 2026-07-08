import { describe, expect, it } from 'vitest';

import type { Customer, CustomerInput } from '@/domain/models/customer';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { Product, ProductInput } from '@/domain/models/product';
import {
  duplicateIdSet,
  findCustomerDuplicates,
  findCustomerMatchesForInput,
  findProductDuplicates,
  findProductMatchesForInput,
  pairsForId,
} from '@/domain/policies/duplicate-policy';

/**
 * Duplicate-detection policy — the richest domain rule (pairwise scoring +
 * thresholds + sorting + form-time matching). Scores: exact business-key = 100,
 * email/barcode = 95/98, name similarity = round(ratio*100) once ≥ 0.82, with a
 * kana fallback only when the name itself doesn't match.
 */
const base = new Date('2024-01-01T00:00:00.000Z');

function cust(overrides: Partial<Customer> & Pick<Customer, 'id' | 'code' | 'name'>): Customer {
  return {
    customerType: 'corporate',
    country: 'Japan',
    status: 'active',
    createdAt: base,
    updatedAt: base,
    ...overrides,
  };
}

function prod(overrides: Partial<Product> & Pick<Product, 'id' | 'sku' | 'name'>): Product {
  return {
    category: 'other',
    unitPrice: 1000,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    status: 'active',
    createdAt: base,
    updatedAt: base,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

describe('findCustomerDuplicates', () => {
  it('matches on a normalized customer code (case/width-insensitive) → 100', () => {
    const pairs = findCustomerDuplicates([
      cust({ id: '1', code: 'c-001', name: 'Alpha Trading' }),
      cust({ id: '2', code: 'C-001', name: 'Bravo Industries' }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].score).toBe(100);
    expect(pairs[0].reasons).toContain('顧客コードが一致');
  });

  it('matches on an identical email → 95', () => {
    const pairs = findCustomerDuplicates([
      cust({ id: '1', code: 'C-1', name: 'Alpha', email: 'dup@example.com' }),
      cust({ id: '2', code: 'C-2', name: 'Bravo', email: 'DUP@example.com' }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].score).toBe(95);
    expect(pairs[0].reasons).toContain('メールアドレスが一致');
  });

  it('matches on an identical name → 100 with a percentage reason', () => {
    const pairs = findCustomerDuplicates([
      cust({ id: '1', code: 'C-1', name: '共通ネーム株式会社' }),
      cust({ id: '2', code: 'C-2', name: '共通ネーム株式会社' }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].score).toBe(100);
    expect(pairs[0].reasons.some((r) => r.startsWith('名称が類似'))).toBe(true);
  });

  it('falls back to kana similarity only when the name does not match', () => {
    const pairs = findCustomerDuplicates([
      cust({ id: '1', code: 'C-1', name: '東京', nameKana: 'キョウツウ' }),
      cust({ id: '2', code: 'C-2', name: '大阪', nameKana: 'キョウツウ' }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].reasons.some((r) => r.startsWith('カナ名称が類似'))).toBe(true);
  });

  it('returns no pair for entirely distinct records', () => {
    const pairs = findCustomerDuplicates([
      cust({ id: '1', code: 'C-1', name: 'Alpha' }),
      cust({ id: '2', code: 'C-2', name: 'Zulu' }),
    ]);
    expect(pairs).toEqual([]);
  });

  it('sorts results by score descending', () => {
    const pairs = findCustomerDuplicates([
      cust({ id: 'A', code: 'C-1', name: 'Alpha', email: 'a@e.com' }),
      cust({ id: 'B', code: 'C-1', name: 'Bravo', email: 'b@e.com' }), // code → 100
      cust({ id: 'C', code: 'C-3', name: 'Charlie', email: 'dup@e.com' }),
      cust({ id: 'D', code: 'C-4', name: 'Delta', email: 'dup@e.com' }), // email → 95
    ]);
    expect(pairs.map((p) => p.score)).toEqual([100, 95]);
  });

  it('builds a stable, order-independent pair key', () => {
    const pairs = findCustomerDuplicates([
      cust({ id: '2', code: 'C-1', name: 'Alpha' }),
      cust({ id: '1', code: 'C-1', name: 'Bravo' }),
    ]);
    expect(pairs[0].key).toBe('1|2');
  });
});

describe('findCustomerMatchesForInput', () => {
  const existing = [
    cust({ id: 'e1', code: 'C-9', name: '既存商事', email: 'e@example.com' }),
  ];

  function input(overrides: Partial<CustomerInput> = {}): CustomerInput {
    return {
      code: 'C-9',
      name: '新規商事',
      customerType: 'corporate',
      country: 'Japan',
      status: 'draft',
      ...overrides,
    };
  }

  it('flags an existing record matching the unsaved input by code', () => {
    const pairs = findCustomerMatchesForInput(input(), existing);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].score).toBe(100);
    expect(pairs[0].left.id).toBe(''); // the unsaved input side has no id
    expect(pairs[0].left.label).toBe('新規商事（C-9）');
    expect(pairs[0].right.id).toBe('e1');
    expect(pairs[0].key).toBe('e1');
  });

  it('honours excludeId (skips the record being edited)', () => {
    expect(findCustomerMatchesForInput(input(), existing, 'e1')).toEqual([]);
  });

  it('returns nothing when the input shares no key/name/email', () => {
    expect(
      findCustomerMatchesForInput(
        input({ code: 'Z-1', name: '無関係', email: undefined }),
        existing,
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

describe('findProductDuplicates', () => {
  it('matches on a normalized SKU → 100', () => {
    const pairs = findProductDuplicates([
      prod({ id: '1', sku: 'sku-1', name: 'Widget' }),
      prod({ id: '2', sku: 'SKU-1', name: 'Gadget' }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].score).toBe(100);
    expect(pairs[0].reasons).toContain('SKUが一致');
  });

  it('matches on an identical barcode → 98', () => {
    const pairs = findProductDuplicates([
      prod({ id: '1', sku: 'S-1', name: 'Widget', barcode: '4901234567894' }),
      prod({ id: '2', sku: 'S-2', name: 'Gadget', barcode: '4901234567894' }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].score).toBe(98);
    expect(pairs[0].reasons).toContain('バーコードが一致');
  });

  it('returns no pair for distinct products', () => {
    expect(
      findProductDuplicates([
        prod({ id: '1', sku: 'S-1', name: 'Widget' }),
        prod({ id: '2', sku: 'S-2', name: 'Sprocket' }),
      ]),
    ).toEqual([]);
  });
});

describe('findProductMatchesForInput', () => {
  const existing = [
    prod({ id: 'p1', sku: 'S-9', name: '既存製品', barcode: '4900000000001' }),
  ];

  function input(overrides: Partial<ProductInput> = {}): ProductInput {
    return {
      sku: 'S-9',
      name: '新規製品',
      category: 'other',
      unitPrice: 500,
      currency: 'JPY',
      unitOfMeasure: 'piece',
      status: 'draft',
      ...overrides,
    };
  }

  it('flags an existing product matching the unsaved input by SKU', () => {
    const pairs = findProductMatchesForInput(input(), existing);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].score).toBe(100);
    expect(pairs[0].left.id).toBe('');
    expect(pairs[0].left.label).toBe('新規製品（S-9）');
    expect(pairs[0].right.id).toBe('p1');
  });

  it('honours excludeId', () => {
    expect(findProductMatchesForInput(input(), existing, 'p1')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Shared view helpers
// ---------------------------------------------------------------------------

describe('duplicateIdSet', () => {
  it('collects both ids of every pair', () => {
    const pairs = findCustomerDuplicates([
      cust({ id: '1', code: 'C-1', name: 'Alpha' }),
      cust({ id: '2', code: 'C-1', name: 'Bravo' }),
    ]);
    expect([...duplicateIdSet(pairs)].sort()).toEqual(['1', '2']);
  });

  it('skips the empty id of a form-time pair (unsaved input side)', () => {
    const pair: DuplicatePair = {
      key: 'e1',
      left: { id: '', label: 'input' },
      right: { id: 'e1', label: 'existing' },
      score: 100,
      reasons: ['顧客コードが一致'],
    };
    expect([...duplicateIdSet([pair])]).toEqual(['e1']);
  });
});

describe('pairsForId', () => {
  it('returns only pairs that involve the given id', () => {
    const pairs = findCustomerDuplicates([
      cust({ id: 'A', code: 'C-1', name: 'Alpha' }),
      cust({ id: 'B', code: 'C-1', name: 'Bravo' }),
      cust({ id: 'C', code: 'C-9', name: 'Zulu' }),
    ]);
    const forA = pairsForId(pairs, 'A');
    expect(forA).toHaveLength(1);
    expect([forA[0].left.id, forA[0].right.id]).toContain('A');
    expect(pairsForId(pairs, 'C')).toEqual([]);
  });
});
