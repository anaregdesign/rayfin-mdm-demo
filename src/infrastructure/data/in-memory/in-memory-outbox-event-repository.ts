import type {
  AppendOutboxEvent,
  DeliveryStatus,
  OutboxEvent,
} from '@/domain/models/distribution';
import type { Clock } from '@/domain/ports/clock';
import type { OutboxEventRepository } from '@/domain/repositories/outbox-event-repository';

import { clone } from './clone';

/**
 * In-memory append-only distribution outbox for demo mode. Mirrors the Rayfin
 * adapter: `publish` appends a `pending` event stamped with `occurredAt`;
 * `setDeliveryStatus` updates the status and sets `deliveredAt` only when the
 * new status is `delivered` (clears it otherwise).
 */
export class InMemoryOutboxEventRepository implements OutboxEventRepository {
  private readonly rows: OutboxEvent[] = [];

  constructor(private readonly clock: Clock) {}

  async publish(event: AppendOutboxEvent): Promise<void> {
    this.rows.push(
      clone({
        id: crypto.randomUUID(),
        entityType: event.entityType,
        entityId: event.entityId,
        eventType: event.eventType,
        payload: event.payload,
        actorId: event.actorId,
        status: 'pending',
        occurredAt: this.clock.now(),
      })
    );
  }

  async list(): Promise<OutboxEvent[]> {
    return this.rows
      .slice()
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .map(clone);
  }

  async setDeliveryStatus(
    id: string,
    status: DeliveryStatus
  ): Promise<OutboxEvent> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) {
      throw new Error(`OutboxEvent ${id} not found after update`);
    }
    row.status = status;
    row.deliveredAt = status === 'delivered' ? this.clock.now() : undefined;
    return clone(row);
  }
}
