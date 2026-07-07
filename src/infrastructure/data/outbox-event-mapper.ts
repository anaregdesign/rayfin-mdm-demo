import type {
  DeliveryStatus,
  DistributionEntityType,
  OutboxEvent,
  OutboxEventType,
} from '@/domain/models/distribution';

import type { OutboxEvent as OutboxEventEntity } from '../../../rayfin/data/OutboxEvent';

/** Rayfin row shape for the OutboxEvent entity. */
export type OutboxEventRow = OutboxEventEntity;

/** Defensive cap so an oversized payload never breaks the DB write. */
const MAX_PAYLOAD_JSON = 8000;

/** Parse the JSON `payload` column back into a plain object. */
export function parsePayload(
  raw: string | undefined | null
): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Serialize an event payload for the `payload` column (with a size guard). */
export function serializePayload(
  payload: Record<string, unknown>
): string | undefined {
  const keys = Object.keys(payload);
  if (keys.length === 0) return undefined;
  const json = JSON.stringify(payload);
  if (json.length <= MAX_PAYLOAD_JSON) return json;
  // Preserve identity fields so the feed still makes sense if a snapshot is huge.
  const trimmed = {
    id: payload.id,
    _truncated: true,
  };
  return JSON.stringify(trimmed);
}

/** Map a Rayfin row to the domain outbox event. */
export function toOutboxEvent(row: OutboxEventRow): OutboxEvent {
  return {
    id: row.id,
    entityType: row.entityType as DistributionEntityType,
    entityId: row.entityId,
    eventType: row.eventType as OutboxEventType,
    payload: parsePayload(row.payload),
    actorId: row.actorId ?? undefined,
    status: row.status as DeliveryStatus,
    occurredAt: new Date(row.occurredAt),
    deliveredAt: row.deliveredAt ? new Date(row.deliveredAt) : undefined,
  };
}
