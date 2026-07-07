import type { Customer, CustomerInput } from '@/domain/models/customer';
import { customerToInput } from '@/domain/models/customer';
import type { CustomerStatus } from '@/domain/models/master-status';
import type { CustomerRepository } from '@/domain/repositories/customer-repository';
import type { EventPublisher } from '@/domain/repositories/outbox-event-repository';
import type { OutboxEventType } from '@/domain/models/distribution';
import { customerEventPayload } from '@/domain/policies/distribution-policy';
import { diffRecords } from '@/domain/policies/diff-policy';

/**
 * Decorator that emits distribution (outbox) events around a base customer
 * repository — the transactional-outbox write hook (#12). Mirrors the
 * change-logging decorator (#5): same port, single responsibility, and event
 * emission never fails the user's mutation (`safePublish`). Composed OUTSIDE
 * the change-logging decorator so an update produces both an audit entry and a
 * distribution event.
 */
export class DistributionCustomerRepository implements CustomerRepository {
  constructor(
    private readonly inner: CustomerRepository,
    private readonly publisher: EventPublisher,
    private readonly actor: () => string | undefined
  ) {}

  list(): Promise<Customer[]> {
    return this.inner.list();
  }

  findById(id: string): Promise<Customer | null> {
    return this.inner.findById(id);
  }

  async create(input: CustomerInput): Promise<Customer> {
    const created = await this.inner.create(input);
    await this.safePublish('created', created);
    return created;
  }

  async update(id: string, input: CustomerInput): Promise<Customer> {
    const before = await this.inner.findById(id);
    const updated = await this.inner.update(id, input);
    const changed =
      !before ||
      diffRecords(customerToInput(before), customerToInput(updated)).length > 0;
    if (changed) {
      await this.safePublish('updated', updated);
    }
    return updated;
  }

  async setStatus(id: string, status: CustomerStatus): Promise<Customer> {
    const before = await this.inner.findById(id);
    const updated = await this.inner.setStatus(id, status);
    if (!before || before.status !== updated.status) {
      await this.safePublish('status_changed', updated);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.inner.remove(id);
  }

  async markMerged(loserId: string, winnerId: string): Promise<void> {
    await this.inner.markMerged(loserId, winnerId);
    const loser = await this.inner.findById(loserId);
    if (loser) {
      await this.safePublish('merged', loser);
    }
  }

  async restoreMerged(loserId: string, status: CustomerStatus): Promise<void> {
    await this.inner.restoreMerged(loserId, status);
    const restored = await this.inner.findById(loserId);
    if (restored) {
      await this.safePublish('status_changed', restored);
    }
  }

  private async safePublish(
    eventType: OutboxEventType,
    customer: Customer
  ): Promise<void> {
    try {
      await this.publisher.publish({
        entityType: 'customer',
        entityId: customer.id,
        eventType,
        payload: customerEventPayload(customer),
        actorId: this.actor(),
      });
    } catch (err) {
      // Distribution failures must not break the user's mutation.
      console.error('[outbox] publish failed for customer', customer.id, err);
    }
  }
}
