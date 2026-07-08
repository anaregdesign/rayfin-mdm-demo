import type { Customer, CustomerInput } from '@/domain/models/customer';
import type { CustomerStatus } from '@/domain/models/master-status';
import type { Clock } from '@/domain/ports/clock';
import type { CustomerRepository } from '@/domain/repositories/customer-repository';

import { clone } from './clone';

/**
 * In-memory customer repository for demo mode. Implements the same
 * `CustomerRepository` port as the Rayfin adapter and mirrors its audit
 * semantics (createdAt/By on create, updatedAt/By on every mutation,
 * status/mergedInto/mergedAt on merge) so the whole app — including the
 * change-logging and distribution decorators wrapped around it — behaves
 * identically without any backend. State lives in a plain array; returns are
 * cloned so callers cannot mutate it.
 */
export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly rows: Customer[];

  constructor(
    private readonly clock: Clock,
    private readonly actor: () => string | undefined,
    seed: Customer[] = []
  ) {
    this.rows = seed.map(clone);
  }

  async list(): Promise<Customer[]> {
    return this.rows
      .slice()
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(clone);
  }

  async findById(id: string): Promise<Customer | null> {
    const row = this.rows.find((r) => r.id === id);
    return row ? clone(row) : null;
  }

  async create(input: CustomerInput): Promise<Customer> {
    const now = this.clock.now();
    const actor = this.actor();
    const row: Customer = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
      updatedBy: actor,
    };
    this.rows.push(clone(row));
    return clone(row);
  }

  async update(id: string, input: CustomerInput): Promise<Customer> {
    const row = this.require(id, 'update');
    Object.assign(row, input, {
      updatedAt: this.clock.now(),
      updatedBy: this.actor(),
    });
    return clone(row);
  }

  async setStatus(id: string, status: CustomerStatus): Promise<Customer> {
    const row = this.require(id, 'status change');
    row.status = status;
    row.updatedAt = this.clock.now();
    row.updatedBy = this.actor();
    return clone(row);
  }

  async remove(id: string): Promise<void> {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index >= 0) this.rows.splice(index, 1);
  }

  async markMerged(loserId: string, winnerId: string): Promise<void> {
    const row = this.rows.find((r) => r.id === loserId);
    if (!row) return;
    const now = this.clock.now();
    row.status = 'merged';
    row.mergedInto = winnerId;
    row.mergedAt = now;
    row.updatedAt = now;
    row.updatedBy = this.actor();
  }

  async restoreMerged(loserId: string, status: CustomerStatus): Promise<void> {
    const row = this.rows.find((r) => r.id === loserId);
    if (!row) return;
    row.status = status;
    row.mergedInto = undefined;
    row.mergedAt = undefined;
    row.updatedAt = this.clock.now();
    row.updatedBy = this.actor();
  }

  private require(id: string, op: string): Customer {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(`Customer ${id} not found after ${op}`);
    return row;
  }
}
