import { describe, expect, it } from 'vitest';

import type { Customer } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import type { StewardTask, TaskReason } from '@/domain/models/steward-task';
import {
  TASK_REASON_LABELS,
  TASK_REASON_TONE,
  TASK_REASON_VALUES,
  UNASSIGNED_LABEL,
} from '@/domain/models/steward-task';
import {
  deriveCustomerTasks,
  deriveProductTasks,
  deriveStewardTasks,
  reasonCounts,
  stewardWorkloads,
} from '@/domain/policies/steward-task-policy';

const NOW = new Date('2024-06-01T00:00:00Z');

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * A fully-populated, valid, active customer that produces NO task by default.
 * All 13 scored quality fields are filled (score 100), required keys present,
 * status active with a steward, and updated "now".
 */
function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c-base',
    code: 'C-BASE',
    name: 'Base Customer KK',
    nameKana: 'ベースカスタマー',
    customerType: 'corporate',
    industry: 'IT',
    email: 'info@base.example.com',
    phone: '03-1234-5678',
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

/** A valid, active, high-quality product that produces NO task by default. */
function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-base',
    sku: 'P-BASE',
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

/** Hand-built task for workload/reason-count grouping tests. */
function task(overrides: Partial<StewardTask> = {}): StewardTask {
  return {
    id: 'customer:x',
    entityType: 'customer',
    recordId: 'x',
    code: 'X',
    recordLabel: 'X',
    steward: 'Dana',
    statusLabel: '有効',
    reasons: ['low_quality'],
    qualityScore: 20,
    severity: 180,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('deriveCustomerTasks — reason rules', () => {
  it('produces no task for a complete, valid, active, fresh record', () => {
    expect(deriveCustomerTasks([customer()], { now: NOW })).toEqual([]);
  });

  it('flags low_quality when the score is below the threshold', () => {
    const sparse = customer({
      id: 'c-lq',
      code: 'C-LQ',
      name: 'Sparse Only Co',
      nameKana: undefined,
      industry: undefined,
      email: undefined,
      phone: undefined,
      postalCode: undefined,
      prefecture: undefined,
      city: undefined,
      addressLine: undefined,
      website: undefined,
      taxId: undefined,
      annualRevenue: undefined,
    });
    const [t] = deriveCustomerTasks([sparse], { now: NOW });
    expect(t.reasons).toEqual(['low_quality']);
    expect(t.qualityScore).toBeLessThan(50);
    expect(t.id).toBe('customer:c-lq');
    expect(t.entityType).toBe('customer');
  });

  it('respects a custom qualityThreshold', () => {
    // Score 92 (12/13 fields): clean at the default 50, flagged at 100.
    const c = customer({
      id: 'c-th',
      code: 'C-TH',
      name: 'Threshold Co',
      taxId: undefined,
    });
    expect(deriveCustomerTasks([c], { now: NOW })).toEqual([]);
    const [t] = deriveCustomerTasks([c], { now: NOW, qualityThreshold: 100 });
    expect(t.reasons).toContain('low_quality');
  });

  it('flags missing_required without low_quality when key fields are absent', () => {
    const invalid = customer({
      id: 'c-mr',
      code: 'C-MR',
      name: 'Missing Country Co',
      country: '',
    });
    const [t] = deriveCustomerTasks([invalid], { now: NOW });
    expect(t.reasons).toEqual(['missing_required']);
  });

  it('flags stale_draft for drafts older than the window', () => {
    const stale = customer({
      id: 'c-sd',
      code: 'C-SD',
      name: 'Stale Draft Co',
      status: 'draft',
      updatedAt: daysBefore(20),
    });
    const [t] = deriveCustomerTasks([stale], { now: NOW });
    expect(t.reasons).toEqual(['stale_draft']);
  });

  it('does not flag a fresh draft as stale', () => {
    const fresh = customer({
      id: 'c-fd',
      code: 'C-FD',
      name: 'Fresh Draft Co',
      status: 'draft',
      updatedAt: daysBefore(3),
    });
    expect(deriveCustomerTasks([fresh], { now: NOW })).toEqual([]);
  });

  it('honours a custom staleDraftDays window', () => {
    const draft = customer({
      id: 'c-sw',
      code: 'C-SW',
      name: 'Short Window Co',
      status: 'draft',
      updatedAt: daysBefore(10),
    });
    expect(deriveCustomerTasks([draft], { now: NOW })).toEqual([]);
    const [t] = deriveCustomerTasks([draft], { now: NOW, staleDraftDays: 7 });
    expect(t.reasons).toEqual(['stale_draft']);
  });

  it('flags both duplicate members of a near-identical pair', () => {
    const a = customer({ id: 'c-d1', code: 'C-D1', name: 'Twin Trading KK' });
    const b = customer({ id: 'c-d2', code: 'C-D2', name: 'Twin Trading KK' });
    const tasks = deriveCustomerTasks([a, b], { now: NOW });
    expect(tasks).toHaveLength(2);
    for (const t of tasks) expect(t.reasons).toContain('duplicate');
  });
});

describe('deriveCustomerTasks — exclusions & ordering', () => {
  it('excludes merged and archived records', () => {
    const merged = customer({
      id: 'c-m',
      code: 'C-M',
      name: 'Merged Co',
      status: 'merged',
      country: '',
    });
    const archived = customer({
      id: 'c-a',
      code: 'C-A',
      name: 'Archived Co',
      status: 'archived',
      country: '',
    });
    expect(deriveCustomerTasks([merged, archived], { now: NOW })).toEqual([]);
  });

  it('sorts by severity (more reasons first), then oldest updatedAt', () => {
    // Two reasons: invalid (country empty) AND low quality (sparse).
    const twoReason = customer({
      id: 'c-two',
      code: 'C-TWO',
      name: 'Two Reasons Co',
      country: '',
      nameKana: undefined,
      industry: undefined,
      email: undefined,
      phone: undefined,
      postalCode: undefined,
      prefecture: undefined,
      city: undefined,
      addressLine: undefined,
      website: undefined,
      taxId: undefined,
      annualRevenue: undefined,
    });
    // One reason: low quality only.
    const oneReason = customer({
      id: 'c-one',
      code: 'C-ONE',
      name: 'One Reason Co',
      nameKana: undefined,
      industry: undefined,
      email: undefined,
      phone: undefined,
      postalCode: undefined,
      prefecture: undefined,
      city: undefined,
      addressLine: undefined,
      website: undefined,
      taxId: undefined,
      annualRevenue: undefined,
    });
    const tasks = deriveCustomerTasks([oneReason, twoReason], { now: NOW });
    expect(tasks.map((t) => t.id)).toEqual(['customer:c-two', 'customer:c-one']);
    expect(tasks[0].severity).toBeGreaterThan(tasks[1].severity);
  });

  it('breaks severity ties by oldest updatedAt first', () => {
    const older = customer({
      id: 'c-old',
      code: 'C-OLD',
      name: 'Older Co',
      country: '',
      updatedAt: daysBefore(30),
    });
    const newer = customer({
      id: 'c-new',
      code: 'C-NEW',
      name: 'Newer Co',
      country: '',
      updatedAt: daysBefore(1),
    });
    const tasks = deriveCustomerTasks([newer, older], { now: NOW });
    expect(tasks.map((t) => t.id)).toEqual(['customer:c-old', 'customer:c-new']);
  });
});

describe('deriveProductTasks', () => {
  it('produces no task for a clean product', () => {
    expect(deriveProductTasks([product()], { now: NOW })).toEqual([]);
  });

  it('flags missing_required when the SKU is blank', () => {
    const invalid = product({ id: 'p-mr', sku: '', name: 'No SKU' });
    const [t] = deriveProductTasks([invalid], { now: NOW });
    expect(t.entityType).toBe('product');
    expect(t.reasons).toContain('missing_required');
    expect(t.id).toBe('product:p-mr');
  });

  it('excludes archived products', () => {
    const archived = product({
      id: 'p-a',
      sku: '',
      name: 'Archived',
      status: 'archived',
    });
    expect(deriveProductTasks([archived], { now: NOW })).toEqual([]);
  });
});

describe('deriveStewardTasks (both masters)', () => {
  it('merges customer and product tasks into one severity-sorted queue', () => {
    const lowQualCustomer = customer({
      id: 'c-lq',
      code: 'C-LQ',
      name: 'Sparse Co',
      nameKana: undefined,
      industry: undefined,
      email: undefined,
      phone: undefined,
      postalCode: undefined,
      prefecture: undefined,
      city: undefined,
      addressLine: undefined,
      website: undefined,
      taxId: undefined,
      annualRevenue: undefined,
    });
    const invalidProduct = product({ id: 'p-mr', sku: '', name: 'No SKU' });
    const tasks = deriveStewardTasks([lowQualCustomer], [invalidProduct], {
      now: NOW,
    });
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.entityType).sort()).toEqual([
      'customer',
      'product',
    ]);
    // Sorted by severity descending.
    for (let i = 1; i < tasks.length; i += 1) {
      expect(tasks[i - 1].severity).toBeGreaterThanOrEqual(tasks[i].severity);
    }
  });
});

describe('stewardWorkloads', () => {
  it('groups tasks per steward with an unassigned bucket, busiest first', () => {
    const tasks = [
      task({ id: 'customer:a', steward: 'Dana', reasons: ['low_quality'] }),
      task({ id: 'customer:b', steward: 'Dana', reasons: ['duplicate'] }),
      task({ id: 'customer:c', steward: 'Evan', reasons: ['low_quality'] }),
      task({ id: 'customer:d', steward: undefined, reasons: ['missing_required'] }),
    ];
    const loads = stewardWorkloads(tasks);
    expect(loads).toHaveLength(3);
    expect(loads[0].steward).toBe('Dana');
    expect(loads[0].taskCount).toBe(2);
    expect(loads[0].reasonCounts.low_quality).toBe(1);
    expect(loads[0].reasonCounts.duplicate).toBe(1);
  });

  it('places the unassigned bucket last and labels it', () => {
    const tasks = [
      task({ id: 'customer:a', steward: 'Evan' }),
      task({ id: 'customer:b', steward: undefined }),
    ];
    const loads = stewardWorkloads(tasks);
    const last = loads[loads.length - 1];
    expect(last.steward).toBeNull();
    expect(last.label).toBe(UNASSIGNED_LABEL);
  });

  it('treats blank/whitespace stewards as unassigned', () => {
    const loads = stewardWorkloads([
      task({ id: 'customer:a', steward: '   ' }),
    ]);
    expect(loads).toHaveLength(1);
    expect(loads[0].steward).toBeNull();
    expect(loads[0].label).toBe(UNASSIGNED_LABEL);
  });

  it('sorts named stewards before the unassigned bucket on a count tie', () => {
    const loads = stewardWorkloads([
      task({ id: 'customer:a', steward: undefined }),
      task({ id: 'customer:b', steward: 'Zoe' }),
    ]);
    expect(loads.map((l) => l.steward)).toEqual(['Zoe', null]);
  });
});

describe('reasonCounts', () => {
  it('tallies each reason and preserves the canonical order/labels/tones', () => {
    const tasks = [
      task({ id: 'customer:a', reasons: ['low_quality', 'duplicate'] }),
      task({ id: 'customer:b', reasons: ['low_quality'] }),
      task({ id: 'customer:c', reasons: ['missing_required'] }),
    ];
    const counts = reasonCounts(tasks);
    expect(counts.map((c) => c.reason)).toEqual(TASK_REASON_VALUES);
    const byReason = Object.fromEntries(
      counts.map((c) => [c.reason, c.count])
    ) as Record<TaskReason, number>;
    expect(byReason.low_quality).toBe(2);
    expect(byReason.duplicate).toBe(1);
    expect(byReason.missing_required).toBe(1);
    expect(byReason.stale_draft).toBe(0);
    const lowQual = counts.find((c) => c.reason === 'low_quality');
    expect(lowQual?.label).toBe(TASK_REASON_LABELS.low_quality);
    expect(lowQual?.tone).toBe(TASK_REASON_TONE.low_quality);
  });
});
