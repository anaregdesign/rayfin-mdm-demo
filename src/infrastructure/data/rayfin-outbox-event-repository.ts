import type {
  AppendOutboxEvent,
  DeliveryStatus,
  OutboxEvent,
} from '@/domain/models/distribution';
import type { Clock } from '@/domain/ports/clock';
import type { OutboxEventRepository } from '@/domain/repositories/outbox-event-repository';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import { serializePayload, toOutboxEvent } from './outbox-event-mapper';

/** All OutboxEvent columns. Reads MUST select fields explicitly. */
const OUTBOX_EVENT_FIELDS = [
  'id',
  'entityType',
  'entityId',
  'eventType',
  'payload',
  'actorId',
  'status',
  'occurredAt',
  'deliveredAt',
] as const;

/** Rayfin-backed append-only distribution outbox repository. */
export class RayfinOutboxEventRepository implements OutboxEventRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly clock: Clock
  ) {}

  async publish(event: AppendOutboxEvent): Promise<void> {
    await this.client.data.OutboxEvent.create({
      entityType: event.entityType,
      entityId: event.entityId,
      eventType: event.eventType,
      payload: serializePayload(event.payload),
      actorId: event.actorId,
      status: 'pending',
      occurredAt: this.clock.now(),
    });
  }

  async list(): Promise<OutboxEvent[]> {
    const rows = await this.client.data.OutboxEvent.select(OUTBOX_EVENT_FIELDS)
      .orderBy({ occurredAt: 'desc' })
      .execute();
    return rows.map(toOutboxEvent);
  }

  async setDeliveryStatus(
    id: string,
    status: DeliveryStatus
  ): Promise<OutboxEvent> {
    await this.client.data.OutboxEvent.update(
      { id },
      {
        status,
        deliveredAt: status === 'delivered' ? this.clock.now() : undefined,
      }
    );
    const rows = await this.client.data.OutboxEvent.select(OUTBOX_EVENT_FIELDS)
      .where({ id: { eq: id } })
      .execute();
    const row = rows[0];
    if (!row) {
      throw new Error(`OutboxEvent ${id} not found after update`);
    }
    return toOutboxEvent(row);
  }
}
