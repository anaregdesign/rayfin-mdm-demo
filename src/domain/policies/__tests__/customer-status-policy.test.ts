import { describe, expect, it } from 'vitest';

import type { CustomerStatus } from '@/domain/models/master-status';
import {
  allowedCustomerTransitions,
  canDeleteCustomer,
  canEditCustomer,
  canTransitionCustomer,
} from '@/domain/policies/customer-status-policy';

/**
 * Customer lifecycle state machine. The allowed transitions and the edit/delete
 * predicates the UI gates on live here; these tests pin the whole machine
 * including the terminal, system-only `merged` state.
 */
describe('allowedCustomerTransitions', () => {
  const cases: Array<[CustomerStatus, CustomerStatus[]]> = [
    ['draft', ['active', 'archived']],
    ['active', ['inactive', 'archived']],
    ['inactive', ['active', 'archived']],
    ['archived', ['draft']],
    ['merged', []],
  ];

  it.each(cases)('from %s yields the expected targets', (from, expected) => {
    expect(allowedCustomerTransitions(from)).toEqual(expected);
  });
});

describe('canTransitionCustomer', () => {
  it('allows a listed transition', () => {
    expect(canTransitionCustomer('draft', 'active')).toBe(true);
    expect(canTransitionCustomer('active', 'archived')).toBe(true);
    expect(canTransitionCustomer('archived', 'draft')).toBe(true);
  });

  it('rejects an unlisted transition', () => {
    expect(canTransitionCustomer('draft', 'inactive')).toBe(false);
    expect(canTransitionCustomer('active', 'draft')).toBe(false);
  });

  it('never allows leaving the terminal merged state', () => {
    const all: CustomerStatus[] = [
      'draft',
      'active',
      'inactive',
      'archived',
      'merged',
    ];
    for (const to of all) {
      expect(canTransitionCustomer('merged', to)).toBe(false);
    }
  });
});

describe('canEditCustomer', () => {
  it('permits editing draft/active/inactive', () => {
    expect(canEditCustomer({ status: 'draft' })).toBe(true);
    expect(canEditCustomer({ status: 'active' })).toBe(true);
    expect(canEditCustomer({ status: 'inactive' })).toBe(true);
  });

  it('forbids editing archived or merged', () => {
    expect(canEditCustomer({ status: 'archived' })).toBe(false);
    expect(canEditCustomer({ status: 'merged' })).toBe(false);
  });
});

describe('canDeleteCustomer', () => {
  it('permits deleting only draft or archived', () => {
    expect(canDeleteCustomer({ status: 'draft' })).toBe(true);
    expect(canDeleteCustomer({ status: 'archived' })).toBe(true);
  });

  it('forbids deleting active/inactive/merged', () => {
    expect(canDeleteCustomer({ status: 'active' })).toBe(false);
    expect(canDeleteCustomer({ status: 'inactive' })).toBe(false);
    expect(canDeleteCustomer({ status: 'merged' })).toBe(false);
  });
});
