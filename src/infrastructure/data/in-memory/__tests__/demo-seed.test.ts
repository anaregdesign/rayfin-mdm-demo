import { describe, expect, it } from 'vitest';

import { buildDemoSeed, SEED_USER } from '../demo-seed';

const NOW = new Date('2026-07-08T00:00:00.000Z');

describe('buildDemoSeed', () => {
  it('produces the representative master set (12 customers, 12 products, 9 categories)', () => {
    const seed = buildDemoSeed(NOW);
    expect(seed.customers).toHaveLength(12);
    expect(seed.products).toHaveLength(12);
    expect(seed.categories).toHaveLength(9);
  });

  it('is pure — identical output for the same `now`', () => {
    expect(buildDemoSeed(NOW)).toEqual(buildDemoSeed(NOW));
  });

  it('assigns stable, readable ids', () => {
    const seed = buildDemoSeed(NOW);
    expect(seed.customers.every((c) => c.id.startsWith('cust-'))).toBe(true);
    expect(seed.products.every((p) => p.id.startsWith('prod-'))).toBe(true);
    expect(seed.categories.every((c) => c.id.startsWith('cat-'))).toBe(true);
    expect(seed.customers.map((c) => c.id)).toContain('cust-GT-001');
  });

  it('keeps ids unique within each master', () => {
    const seed = buildDemoSeed(NOW);
    const ids = (arr: { id: string }[]) => new Set(arr.map((x) => x.id));
    expect(ids(seed.customers).size).toBe(12);
    expect(ids(seed.products).size).toBe(12);
    expect(ids(seed.categories).size).toBe(9);
  });

  it('includes the intentional customer duplicate pairs', () => {
    const seed = buildDemoSeed(NOW);
    const sameEmail = seed.customers.filter(
      (c) => c.email === 'info@globaltech.co.jp'
    );
    expect(sameEmail.map((c) => c.code).sort()).toEqual(['GT-001', 'GT-9001']);

    const codes = seed.customers.map((c) => c.code);
    expect(codes).toContain('YE-100');
    expect(codes).toContain('YE-205');
  });

  it('includes the intentional product duplicate pair (same barcode)', () => {
    const seed = buildDemoSeed(NOW);
    const sameBarcode = seed.products.filter(
      (p) => p.barcode === '4901234500017'
    );
    expect(sameBarcode.map((p) => p.sku).sort()).toEqual([
      'EL-WM-100',
      'EL-WM-100B',
    ]);
  });

  it('links products to categories that exist in the seed', () => {
    const seed = buildDemoSeed(NOW);
    const categoryIds = new Set(seed.categories.map((c) => c.id));
    const linked = seed.products.filter((p) => p.categoryId);
    expect(linked.length).toBeGreaterThan(0);
    for (const p of linked) {
      expect(categoryIds.has(p.categoryId!)).toBe(true);
    }
  });

  it('models the electronics category tree (root + children)', () => {
    const seed = buildDemoSeed(NOW);
    const root = seed.categories.find((c) => c.id === 'cat-EL');
    expect(root?.parentId).toBeUndefined();
    const children = seed.categories.filter((c) => c.parentId === 'cat-EL');
    expect(children.length).toBeGreaterThan(0);
  });

  it('stamps every record with the seed author and descending timestamps', () => {
    const seed = buildDemoSeed(NOW);
    expect(seed.customers.every((c) => c.createdBy === SEED_USER)).toBe(true);
    expect(seed.products.every((p) => p.updatedBy === SEED_USER)).toBe(true);

    const times = seed.customers.map((c) => c.updatedAt.getTime());
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
    expect(seed.customers[0].updatedAt.getTime()).toBeLessThanOrEqual(
      NOW.getTime()
    );
  });
});
