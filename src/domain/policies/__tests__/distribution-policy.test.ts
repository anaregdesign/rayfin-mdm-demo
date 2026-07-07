import { describe, expect, it } from 'vitest';

import type { Customer } from '@/domain/models/customer';
import type { OutboxEvent } from '@/domain/models/distribution';
import type { Product } from '@/domain/models/product';
import {
  buildCustomerJsonExport,
  buildProductJsonExport,
  customerEventPayload,
  customerExportMatrix,
  filterEvents,
  isDistributable,
  productEventPayload,
  productExportMatrix,
  selectDistributable,
  signPayload,
} from '@/domain/policies/distribution-policy';
import { CUSTOMER_CSV_HEADERS, PRODUCT_CSV_HEADERS } from '@/domain/policies/import-policy';

const NOW = new Date('2024-06-01T00:00:00Z');

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c-1',
    code: 'C-0001',
    name: 'Acme KK',
    nameKana: 'アクメ',
    customerType: 'corporate',
    industry: 'IT',
    email: 'info@acme.example.com',
    phone: '0312345678',
    postalCode: '100-0001',
    prefecture: '東京都',
    city: '千代田区',
    addressLine: '1-1-1',
    country: 'JP',
    website: 'https://acme.example.com',
    taxId: 'T-0001',
    annualRevenue: 1_000_000,
    status: 'active',
    steward: 'Dana',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-1',
    sku: 'P-0001',
    name: 'Widget',
    nameKana: 'ウィジェット',
    category: 'electronics',
    brand: 'BrandX',
    description: 'A widget.',
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

function event(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
  return {
    id: 'e-1',
    entityType: 'customer',
    entityId: 'c-1',
    eventType: 'created',
    payload: {},
    status: 'pending',
    occurredAt: NOW,
    ...overrides,
  };
}

describe('isDistributable / selectDistributable', () => {
  it('treats only active records as distributable', () => {
    expect(isDistributable('active')).toBe(true);
    for (const s of ['draft', 'inactive', 'archived', 'merged']) {
      expect(isDistributable(s)).toBe(false);
    }
  });

  it('selects only the active subset', () => {
    const records = [
      customer({ id: 'a', status: 'active' }),
      customer({ id: 'b', status: 'draft' }),
      customer({ id: 'c', status: 'archived' }),
      customer({ id: 'd', status: 'active' }),
    ];
    expect(selectDistributable(records).map((r) => r.id)).toEqual(['a', 'd']);
  });
});

describe('event payloads', () => {
  it('customer payload carries identity + ISO updatedAt', () => {
    const payload = customerEventPayload(customer());
    expect(payload).toMatchObject({
      id: 'c-1',
      code: 'C-0001',
      name: 'Acme KK',
      customerType: 'corporate',
      email: 'info@acme.example.com',
      status: 'active',
      updatedAt: NOW.toISOString(),
    });
  });

  it('product payload carries identity + price/currency + ISO updatedAt', () => {
    const payload = productEventPayload(product());
    expect(payload).toMatchObject({
      id: 'p-1',
      sku: 'P-0001',
      name: 'Widget',
      unitPrice: 1000,
      currency: 'JPY',
      status: 'active',
      updatedAt: NOW.toISOString(),
    });
  });
});

describe('filterEvents', () => {
  const events = [
    event({ id: 'e1', entityType: 'customer', eventType: 'created', status: 'pending', occurredAt: new Date('2024-06-01T00:00:00Z') }),
    event({ id: 'e2', entityType: 'product', eventType: 'updated', status: 'delivered', occurredAt: new Date('2024-06-05T00:00:00Z') }),
    event({ id: 'e3', entityType: 'customer', eventType: 'status_changed', status: 'failed', occurredAt: new Date('2024-06-10T00:00:00Z') }),
  ];

  it('returns everything with an empty filter', () => {
    expect(filterEvents(events)).toHaveLength(3);
  });

  it('filters by entityType', () => {
    expect(filterEvents(events, { entityType: 'customer' }).map((e) => e.id)).toEqual(['e1', 'e3']);
  });

  it('filters by eventType', () => {
    expect(filterEvents(events, { eventType: 'updated' }).map((e) => e.id)).toEqual(['e2']);
  });

  it('filters by delivery status', () => {
    expect(filterEvents(events, { status: 'failed' }).map((e) => e.id)).toEqual(['e3']);
  });

  it('filters by since (inclusive at the boundary)', () => {
    expect(
      filterEvents(events, { since: new Date('2024-06-05T00:00:00Z') }).map((e) => e.id)
    ).toEqual(['e2', 'e3']);
  });

  it('AND-combines multiple criteria', () => {
    expect(
      filterEvents(events, { entityType: 'customer', status: 'pending' }).map((e) => e.id)
    ).toEqual(['e1']);
  });

  it('does not mutate the input array', () => {
    const input = [...events];
    filterEvents(input, { entityType: 'product' });
    expect(input).toHaveLength(3);
  });
});

describe('export matrices (active-only)', () => {
  it('customer matrix has the header then only active rows', () => {
    const matrix = customerExportMatrix([
      customer({ id: 'a', status: 'active' }),
      customer({ id: 'b', status: 'draft' }),
    ]);
    expect(matrix[0]).toEqual(CUSTOMER_CSV_HEADERS);
    expect(matrix).toHaveLength(2); // header + 1 active
  });

  it('product matrix has the header then only active rows', () => {
    const matrix = productExportMatrix([
      product({ id: 'a', status: 'active' }),
      product({ id: 'b', status: 'archived' }),
      product({ id: 'c', status: 'active' }),
    ]);
    expect(matrix[0]).toEqual(PRODUCT_CSV_HEADERS);
    expect(matrix).toHaveLength(3); // header + 2 active
  });
});

describe('JSON export envelopes', () => {
  it('wraps active customers with count + ISO timestamp', () => {
    const envelope = buildCustomerJsonExport(
      [customer({ id: 'a', status: 'active' }), customer({ id: 'b', status: 'draft' })],
      NOW
    );
    expect(envelope.entityType).toBe('customer');
    expect(envelope.exportedAt).toBe(NOW.toISOString());
    expect(envelope.count).toBe(1);
    expect(envelope.records).toHaveLength(1);
    expect(envelope.records[0]).toMatchObject({ id: 'a' });
  });

  it('wraps active products with count + ISO timestamp', () => {
    const envelope = buildProductJsonExport(
      [product({ id: 'a', status: 'active' }), product({ id: 'b', status: 'active' })],
      NOW
    );
    expect(envelope.entityType).toBe('product');
    expect(envelope.count).toBe(2);
    expect(envelope.records).toHaveLength(2);
  });
});

describe('signPayload', () => {
  it('is deterministic for the same secret + payload', () => {
    const json = JSON.stringify({ a: 1 });
    expect(signPayload('secret', json)).toBe(signPayload('secret', json));
  });

  it('changes when the secret changes', () => {
    const json = JSON.stringify({ a: 1 });
    expect(signPayload('secret-a', json)).not.toBe(signPayload('secret-b', json));
  });

  it('changes when the payload changes', () => {
    expect(signPayload('secret', JSON.stringify({ a: 1 }))).not.toBe(
      signPayload('secret', JSON.stringify({ a: 2 }))
    );
  });

  it('is formatted as a v1 hex digest', () => {
    expect(signPayload('secret', '{}')).toMatch(/^v1=[0-9a-f]{8}$/);
  });
});
