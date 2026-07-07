import type {
  AppendOutboxEvent,
  DeliveryStatus,
  OutboxEvent,
} from '@/domain/models/distribution';

/**
 * Narrow outbound port for *emitting* events. The distribution decorator repos
 * depend on this (not the full repository) so they can be unit-tested with a
 * trivial fake and never reach for read/mark operations they don't need.
 */
export interface EventPublisher {
  /** Append one immutable business event to the outbox. */
  publish(event: AppendOutboxEvent): Promise<void>;
}

/**
 * Outbound port for the append-only distribution outbox. The domain speaks in
 * `OutboxEvent`/`AppendOutboxEvent`; the infrastructure adapter maps to/from
 * the Rayfin `OutboxEvent` entity. Extends `EventPublisher` so a single
 * concrete adapter satisfies both the emit and the read/mark sides.
 */
export interface OutboxEventRepository extends EventPublisher {
  /** All events, newest first. */
  list(): Promise<OutboxEvent[]>;
  /** Update the delivery status of a single event (returns the updated event). */
  setDeliveryStatus(id: string, status: DeliveryStatus): Promise<OutboxEvent>;
}
