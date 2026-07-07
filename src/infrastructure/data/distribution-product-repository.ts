import type { ProductStatus } from '@/domain/models/master-status';
import type { Product, ProductInput } from '@/domain/models/product';
import { productToInput } from '@/domain/models/product';
import type { ProductRepository } from '@/domain/repositories/product-repository';
import type { EventPublisher } from '@/domain/repositories/outbox-event-repository';
import type { OutboxEventType } from '@/domain/models/distribution';
import { productEventPayload } from '@/domain/policies/distribution-policy';
import { diffRecords } from '@/domain/policies/diff-policy';

/**
 * Decorator that emits distribution (outbox) events around a base product
 * repository — the transactional-outbox write hook (#12). Mirrors the
 * change-logging decorator (#5): same port, single responsibility, and event
 * emission never fails the user's mutation (`safePublish`). Composed OUTSIDE
 * the change-logging decorator so an update produces both an audit entry and a
 * distribution event.
 */
export class DistributionProductRepository implements ProductRepository {
  constructor(
    private readonly inner: ProductRepository,
    private readonly publisher: EventPublisher,
    private readonly actor: () => string | undefined
  ) {}

  list(): Promise<Product[]> {
    return this.inner.list();
  }

  findById(id: string): Promise<Product | null> {
    return this.inner.findById(id);
  }

  async create(input: ProductInput): Promise<Product> {
    const created = await this.inner.create(input);
    await this.safePublish('created', created);
    return created;
  }

  async update(id: string, input: ProductInput): Promise<Product> {
    const before = await this.inner.findById(id);
    const updated = await this.inner.update(id, input);
    const changed =
      !before ||
      diffRecords(productToInput(before), productToInput(updated)).length > 0;
    if (changed) {
      await this.safePublish('updated', updated);
    }
    return updated;
  }

  async setStatus(id: string, status: ProductStatus): Promise<Product> {
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

  async restoreMerged(loserId: string, status: ProductStatus): Promise<void> {
    await this.inner.restoreMerged(loserId, status);
    const restored = await this.inner.findById(loserId);
    if (restored) {
      await this.safePublish('status_changed', restored);
    }
  }

  private async safePublish(
    eventType: OutboxEventType,
    product: Product
  ): Promise<void> {
    try {
      await this.publisher.publish({
        entityType: 'product',
        entityId: product.id,
        eventType,
        payload: productEventPayload(product),
        actorId: this.actor(),
      });
    } catch (err) {
      // Distribution failures must not break the user's mutation.
      console.error('[outbox] publish failed for product', product.id, err);
    }
  }
}
