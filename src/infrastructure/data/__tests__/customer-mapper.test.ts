import { describe, expect, it } from 'vitest';

import type { CustomerInput } from '@/domain/models/customer';
import {
  customerInputToFields,
  toCustomer,
  type CustomerRow,
} from '@/infrastructure/data/customer-mapper';

/**
 * Hierarchy/relationship round-trip coverage for the Customer infra mapper
 * (Issue #7). The `parentId` + `relationType` columns join a customer to its
 * organizational parent; these tests lock the row↔domain mapping and the
 * blank→undefined normalization for those two optional fields.
 */

const createdAt = new Date('2024-01-01T00:00:00.000Z');
const updatedAt = new Date('2024-01-02T00:00:00.000Z');

function row(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: 'cus-1',
    code: 'C-001',
    name: '株式会社サンプル',
    customerType: 'corporate',
    country: 'Japan',
    status: 'active',
    parentId: 'cus-hq',
    relationType: 'subsidiary',
    createdAt,
    updatedAt,
    ...overrides,
  } as CustomerRow;
}

function baseInput(overrides: Partial<CustomerInput> = {}): CustomerInput {
  return {
    code: 'C-001',
    name: '株式会社サンプル',
    customerType: 'corporate',
    country: 'Japan',
    status: 'active',
    ...overrides,
  } as CustomerInput;
}

describe('toCustomer — hierarchy fields', () => {
  it('maps parentId and relationType into the domain shape', () => {
    const mapped = toCustomer(row());
    expect(mapped.parentId).toBe('cus-hq');
    expect(mapped.relationType).toBe('subsidiary');
  });

  it('treats null parentId/relationType as undefined (a root org)', () => {
    const mapped = toCustomer(
      row({
        parentId: null as unknown as string,
        relationType: null as unknown as CustomerRow['relationType'],
      }),
    );
    expect(mapped.parentId).toBeUndefined();
    expect(mapped.relationType).toBeUndefined();
  });
});

describe('customerInputToFields — hierarchy fields', () => {
  it('trims a real parentId and passes relationType through', () => {
    const fields = customerInputToFields(
      baseInput({ parentId: '  cus-hq  ', relationType: 'branch' }),
    );
    expect(fields.parentId).toBe('cus-hq');
    expect(fields.relationType).toBe('branch');
  });

  it('normalizes a blank parentId to undefined', () => {
    const fields = customerInputToFields(
      baseInput({ parentId: '   ', relationType: undefined }),
    );
    expect(fields.parentId).toBeUndefined();
    expect(fields.relationType).toBeUndefined();
  });
});

describe('input → fields → row → domain round-trip', () => {
  it('preserves parentId and relationType across the boundary', () => {
    const input = baseInput({ parentId: 'cus-hq', relationType: 'group' });
    const fields = customerInputToFields(input);
    const back = toCustomer(
      row({ parentId: fields.parentId, relationType: fields.relationType }),
    );
    expect(back.parentId).toBe('cus-hq');
    expect(back.relationType).toBe('group');
  });
});
