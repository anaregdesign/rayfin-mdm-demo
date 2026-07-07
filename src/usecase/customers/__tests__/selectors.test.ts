import { describe, expect, it } from 'vitest';

import type { Customer } from '@/domain/models/customer';
import {
  DEFAULT_CUSTOMER_FILTERS,
  buildCustomerListView,
} from '@/usecase/customers/selectors';

const NOW = new Date('2024-06-01T00:00:00Z');

/** A fully-populated, high-quality customer (quality band NOT low). */
function highQualityCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c-high',
    code: 'C-HIGH',
    name: 'High Quality KK',
    nameKana: 'ハイクオリティ',
    customerType: 'corporate',
    industry: 'IT',
    email: 'info@high.example.com',
    phone: '03-1234-5678',
    postalCode: '100-0001',
    prefecture: '東京都',
    city: '千代田区',
    addressLine: '1-1-1',
    country: 'JP',
    website: 'https://high.example.com',
    taxId: 'T-0001',
    annualRevenue: 1_000_000,
    status: 'active',
    steward: 'Dana',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** A sparse customer with only required fields → low quality band. */
function lowQualityCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c-low',
    code: 'C-LOW',
    name: 'Low Quality',
    customerType: 'corporate',
    country: 'JP',
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('buildCustomerListView — quality filter (Issue #13 drill-down)', () => {
  it("keeps every record when quality filter is 'all'", () => {
    const view = buildCustomerListView(
      [highQualityCustomer(), lowQualityCustomer()],
      { ...DEFAULT_CUSTOMER_FILTERS, quality: 'all' }
    );

    expect(view.items).toHaveLength(2);
  });

  it("keeps only low-band records when quality filter is 'low'", () => {
    const view = buildCustomerListView(
      [highQualityCustomer(), lowQualityCustomer()],
      { ...DEFAULT_CUSTOMER_FILTERS, quality: 'low' }
    );

    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.customer.id).toBe('c-low');
    expect(view.items[0]?.quality.band).toBe('low');
  });

  it('reports the unfiltered total even when the quality filter narrows the rows', () => {
    const view = buildCustomerListView(
      [highQualityCustomer(), lowQualityCustomer()],
      { ...DEFAULT_CUSTOMER_FILTERS, quality: 'low' }
    );

    expect(view.total).toBe(2);
    expect(view.filteredCount).toBe(1);
  });

  it("returns no rows for 'low' when every record is high quality", () => {
    const view = buildCustomerListView(
      [
        highQualityCustomer({ id: 'c-1', code: 'C-1' }),
        highQualityCustomer({ id: 'c-2', code: 'C-2' }),
      ],
      { ...DEFAULT_CUSTOMER_FILTERS, quality: 'low' }
    );

    expect(view.items).toHaveLength(0);
  });
});
