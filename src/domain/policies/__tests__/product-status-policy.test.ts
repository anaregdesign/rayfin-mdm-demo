import { describe, expect, it } from 'vitest';

import type { ProductStatus } from '@/domain/models/master-status';
import {
  allowedProductTransitions,
  canDeleteProduct,
  canEditProduct,
  canTransitionProduct,
} from '@/domain/policies/product-status-policy';

/**
 * Product lifecycle state machine. Mirrors the customer machine but the active
 * branch leads to `discontinued` instead of `inactive`; `merged` stays terminal
 * and system-only. The whole machine is pinned here.
 */
describe('allowedProductTransitions', () => {
  const cases: Array<[ProductStatus, ProductStatus[]]> = [
    ['draft', ['active', 'archived']],
    ['active', ['discontinued', 'archived']],
    ['discontinued', ['active', 'archived']],
    ['archived', ['draft']],
    ['merged', []],
  ];

  it.each(cases)('from %s yields the expected targets', (from, expected) => {
    expect(allowedProductTransitions(from)).toEqual(expected);
  });
});

describe('canTransitionProduct', () => {
  it('allows a listed transition', () => {
    expect(canTransitionProduct('draft', 'active')).toBe(true);
    expect(canTransitionProduct('active', 'discontinued')).toBe(true);
    expect(canTransitionProduct('discontinued', 'active')).toBe(true);
  });

  it('rejects an unlisted transition', () => {
    expect(canTransitionProduct('draft', 'discontinued')).toBe(false);
    expect(canTransitionProduct('active', 'draft')).toBe(false);
  });

  it('never allows leaving the terminal merged state', () => {
    const all: ProductStatus[] = [
      'draft',
      'active',
      'discontinued',
      'archived',
      'merged',
    ];
    for (const to of all) {
      expect(canTransitionProduct('merged', to)).toBe(false);
    }
  });
});

describe('canEditProduct', () => {
  it('permits editing draft/active/discontinued', () => {
    expect(canEditProduct({ status: 'draft' })).toBe(true);
    expect(canEditProduct({ status: 'active' })).toBe(true);
    expect(canEditProduct({ status: 'discontinued' })).toBe(true);
  });

  it('forbids editing archived or merged', () => {
    expect(canEditProduct({ status: 'archived' })).toBe(false);
    expect(canEditProduct({ status: 'merged' })).toBe(false);
  });
});

describe('canDeleteProduct', () => {
  it('permits deleting only draft or archived', () => {
    expect(canDeleteProduct({ status: 'draft' })).toBe(true);
    expect(canDeleteProduct({ status: 'archived' })).toBe(true);
  });

  it('forbids deleting active/discontinued/merged', () => {
    expect(canDeleteProduct({ status: 'active' })).toBe(false);
    expect(canDeleteProduct({ status: 'discontinued' })).toBe(false);
    expect(canDeleteProduct({ status: 'merged' })).toBe(false);
  });
});
