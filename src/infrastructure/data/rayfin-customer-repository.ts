import type { CustomerStatus } from '@/domain/models/master-status';
import type { Customer, CustomerInput } from '@/domain/models/customer';
import type { Clock } from '@/domain/ports/clock';
import type { CustomerRepository } from '@/domain/repositories/customer-repository';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import { customerInputToFields, toCustomer } from './customer-mapper';

/**
 * All Customer columns. Reads MUST select fields explicitly — the Rayfin query
 * builder otherwise returns only `id`.
 */
const CUSTOMER_FIELDS = [
  'id',
  'code',
  'name',
  'nameKana',
  'customerType',
  'industry',
  'email',
  'phone',
  'postalCode',
  'prefecture',
  'city',
  'addressLine',
  'country',
  'website',
  'taxId',
  'annualRevenue',
  'status',
  'steward',
  'notes',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
] as const;

/** Rayfin-backed customer repository (Data API Builder via the typed client). */
export class RayfinCustomerRepository implements CustomerRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly clock: Clock
  ) {}

  private actor(): string | undefined {
    const { user } = this.client.getSession();
    return user?.email ?? user?.id ?? undefined;
  }

  async list(): Promise<Customer[]> {
    const rows = await this.client.data.Customer.select(CUSTOMER_FIELDS)
      .orderBy({ updatedAt: 'desc' })
      .execute();
    return rows.map(toCustomer);
  }

  async findById(id: string): Promise<Customer | null> {
    const rows = await this.client.data.Customer.select(CUSTOMER_FIELDS)
      .where({ id: { eq: id } })
      .execute();
    const row = rows[0];
    return row ? toCustomer(row) : null;
  }

  async create(input: CustomerInput): Promise<Customer> {
    const fields = customerInputToFields(input);
    const now = this.clock.now();
    const actor = this.actor();
    const row = await this.client.data.Customer.create({
      ...fields,
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
      updatedBy: actor,
    });
    return toCustomer(row);
  }

  async update(id: string, input: CustomerInput): Promise<Customer> {
    const fields = customerInputToFields(input);
    await this.client.data.Customer.update(
      { id },
      { ...fields, updatedAt: this.clock.now(), updatedBy: this.actor() }
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Customer ${id} not found after update`);
    return updated;
  }

  async setStatus(id: string, status: CustomerStatus): Promise<Customer> {
    await this.client.data.Customer.update(
      { id },
      { status, updatedAt: this.clock.now(), updatedBy: this.actor() }
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Customer ${id} not found after status change`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.client.data.Customer.delete({ id });
  }
}
