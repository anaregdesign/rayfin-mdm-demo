import { authenticated, date, entity, set, text, uuid } from '@microsoft/rayfin-core';

/**
 * Outbox event (配信イベント) — the persistence backing for #12
 * (distribution / integration).
 *
 * Append-only feed of business events emitted whenever a master record is
 * created, updated, merged, or changes status. Downstream systems consume this
 * feed (or an export of it) to stay in sync — the transactional-outbox pattern.
 * Persistence shape owned by the Rayfin platform; the app maps this to
 * `domain/models/distribution` inside the infrastructure repository. Keep
 * business rules out of this file.
 *
 * `payload` holds a JSON-serialized snapshot of the changed record. Master data
 * is shared org-wide, so any authenticated user may read the feed.
 */
@entity()
@authenticated('*')
export class OutboxEvent {
  @uuid() id!: string;

  /** Which master domain the event concerns. */
  @set('customer', 'product')
  entityType!: 'customer' | 'product';

  /** Id of the master record the event concerns. */
  @uuid() entityId!: string;

  /** What kind of business event occurred. */
  @set('created', 'updated', 'merged', 'status_changed')
  eventType!: 'created' | 'updated' | 'merged' | 'status_changed';

  /** JSON-serialized snapshot of the record at emit time. */
  @text({ max: 4000, optional: true }) payload?: string;

  /** Actor (email or id) whose mutation produced the event. */
  @text({ max: 200, optional: true }) actorId?: string;

  /** Delivery lifecycle of the event to downstream consumers. */
  @set('pending', 'delivered', 'failed')
  status!: 'pending' | 'delivered' | 'failed';

  /** When the business event occurred. */
  @date() occurredAt!: Date;

  /** When the event was (manually, in the PoC) marked delivered. */
  @date({ optional: true }) deliveredAt?: Date;
}
