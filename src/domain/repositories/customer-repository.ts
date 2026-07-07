import type { Customer, CustomerInput } from '@/domain/models/customer';
import type { CustomerStatus } from '@/domain/models/master-status';

/**
 * Outbound port for customer persistence. The domain speaks only in domain
 * models; the infrastructure adapter maps to/from the Rayfin entity.
 */
export interface CustomerRepository {
  list(): Promise<Customer[]>;
  findById(id: string): Promise<Customer | null>;
  create(input: CustomerInput): Promise<Customer>;
  update(id: string, input: CustomerInput): Promise<Customer>;
  setStatus(id: string, status: CustomerStatus): Promise<Customer>;
  remove(id: string): Promise<void>;
  /** Mark a loser as merged into a winner (sets status/mergedInto/mergedAt). */
  markMerged(loserId: string, winnerId: string): Promise<void>;
  /** Reverse a merge: restore the loser's prior status and clear the xref. */
  restoreMerged(loserId: string, status: CustomerStatus): Promise<void>;
}
