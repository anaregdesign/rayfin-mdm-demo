import type { Customer } from '@/domain/models/customer';
import type { CustomerStatus } from '@/domain/models/master-status';

/**
 * Customer lifecycle state machine (governance workflow). The allowed
 * transitions and the action predicates the UI asks about live here so the
 * view never re-derives them from status literals.
 */
const CUSTOMER_TRANSITIONS: Record<CustomerStatus, CustomerStatus[]> = {
  draft: ['active', 'archived'],
  active: ['inactive', 'archived'],
  inactive: ['active', 'archived'],
  archived: ['draft'],
};

export function allowedCustomerTransitions(
  from: CustomerStatus
): CustomerStatus[] {
  return CUSTOMER_TRANSITIONS[from];
}

export function canTransitionCustomer(
  from: CustomerStatus,
  to: CustomerStatus
): boolean {
  return CUSTOMER_TRANSITIONS[from].includes(to);
}

export function canEditCustomer(c: Pick<Customer, 'status'>): boolean {
  return c.status !== 'archived';
}

export function canDeleteCustomer(c: Pick<Customer, 'status'>): boolean {
  return c.status === 'draft' || c.status === 'archived';
}
