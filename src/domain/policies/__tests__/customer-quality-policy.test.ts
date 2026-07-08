import { describe, expect, it } from 'vitest';

import type { Customer } from '@/domain/models/customer';
import { evaluateCustomerQuality } from '@/domain/policies/customer-quality-policy';

/**
 * Customer quality scoring: 13 profile fields drive completeness; two
 * governance/format issues (invalid email, active-without-steward) each deduct
 * 10 points, and the score is clamped to 0..100. The exact arithmetic is a
 * business rule the dashboard and detail view both read, so it is pinned here.
 */
const base = new Date('2024-01-01T00:00:00.000Z');

/** A fully populated, issue-free customer (all 13 scored fields filled). */
function fullCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cus-1',
    code: 'C-001',
    name: '株式会社サンプル',
    nameKana: 'カブシキガイシャサンプル',
    customerType: 'corporate',
    industry: '製造',
    email: 'info@example.com',
    phone: '03-1234-5678',
    postalCode: '100-0001',
    prefecture: '東京都',
    city: '千代田区',
    addressLine: '1-1-1',
    country: 'Japan',
    website: 'https://example.com',
    taxId: 'T1234567890123',
    annualRevenue: 100000000,
    status: 'active',
    steward: 'yamada',
    notes: undefined,
    createdAt: base,
    updatedAt: base,
    ...overrides,
  };
}

describe('evaluateCustomerQuality — perfect record', () => {
  it('scores 100 / high band with no missing fields or issues', () => {
    const q = evaluateCustomerQuality(fullCustomer());
    expect(q.score).toBe(100);
    expect(q.completeness).toBe(100);
    expect(q.band).toBe('high');
    expect(q.filledCount).toBe(13);
    expect(q.scoredCount).toBe(13);
    expect(q.missingFields).toEqual([]);
    expect(q.issues).toEqual([]);
  });

  it('emits 13 factors, each weighted round(100/13)=8', () => {
    const q = evaluateCustomerQuality(fullCustomer());
    expect(q.factors).toHaveLength(13);
    expect(q.factors.every((f) => f.weight === 8)).toBe(true);
    expect(q.factors.every((f) => f.filled)).toBe(true);
  });
});

describe('evaluateCustomerQuality — completeness math', () => {
  it('rounds a single-field record to 8% (1/13)', () => {
    const q = evaluateCustomerQuality(
      fullCustomer({
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
        steward: undefined,
        status: 'draft',
      }),
    );
    expect(q.filledCount).toBe(1);
    expect(q.completeness).toBe(8);
    expect(q.score).toBe(8);
    expect(q.band).toBe('low');
    expect(q.missingFields).toHaveLength(12);
  });
});

describe('evaluateCustomerQuality — issue penalties', () => {
  it('deducts 10 for an invalid email format', () => {
    const q = evaluateCustomerQuality(fullCustomer({ email: 'not-an-email' }));
    // still 13 filled (email is non-empty), completeness 100, minus one issue.
    expect(q.completeness).toBe(100);
    expect(q.score).toBe(90);
    expect(q.issues).toContain('メールアドレスの形式が不正です');
  });

  it('deducts 10 for an active customer with no steward', () => {
    const q = evaluateCustomerQuality(
      fullCustomer({ steward: undefined, status: 'active' }),
    );
    expect(q.filledCount).toBe(12);
    expect(q.completeness).toBe(92);
    expect(q.score).toBe(82);
    expect(q.issues).toContain('有効な顧客にデータ管理者が設定されていません');
  });

  it('does not raise the steward issue for a draft customer', () => {
    const q = evaluateCustomerQuality(
      fullCustomer({ steward: undefined, status: 'draft' }),
    );
    expect(q.issues).toEqual([]);
  });

  it('clamps the score to 0 when penalties exceed completeness', () => {
    const q = evaluateCustomerQuality(
      fullCustomer({
        nameKana: undefined,
        industry: undefined,
        phone: undefined,
        postalCode: undefined,
        prefecture: undefined,
        city: undefined,
        addressLine: undefined,
        website: undefined,
        taxId: undefined,
        annualRevenue: undefined,
        steward: undefined,
        email: 'bad', // filled but invalid → email issue
        status: 'active', // active + no steward → second issue
      }),
    );
    // filled: name + email = 2 → completeness 15; two issues (−20) → clamp to 0.
    expect(q.completeness).toBe(15);
    expect(q.issues).toHaveLength(2);
    expect(q.score).toBe(0);
    expect(q.band).toBe('low');
  });
});
