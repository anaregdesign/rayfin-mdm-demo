import type { StatusTone } from './master-status';

/**
 * Distribution / integration domain models (#12).
 *
 * The app records business events into an outbox as master records change,
 * then distributes them to downstream systems (event feed + CSV/JSON export,
 * and — in production — webhooks). These are plain view-facing models; the
 * Rayfin `OutboxEvent` entity is mapped to `OutboxEvent` here in the
 * infrastructure layer. No SDK or persistence concerns leak in.
 */

/** Which master domain an event concerns. */
export type DistributionEntityType = 'customer' | 'product';

/** The kind of business event emitted onto the outbox. */
export type OutboxEventType =
  | 'created'
  | 'updated'
  | 'merged'
  | 'status_changed';

/** Delivery lifecycle of an outbox event to downstream consumers. */
export type DeliveryStatus = 'pending' | 'delivered' | 'failed';

/**
 * A single business event on the outbox. `payload` is the decoded snapshot of
 * the record at emit time (the infrastructure mapper parses the JSON column).
 */
export interface OutboxEvent {
  id: string;
  entityType: DistributionEntityType;
  entityId: string;
  eventType: OutboxEventType;
  payload: Record<string, unknown>;
  actorId?: string;
  status: DeliveryStatus;
  occurredAt: Date;
  deliveredAt?: Date;
}

/** Payload for appending a new outbox event (id/occurredAt/status set by repo). */
export interface AppendOutboxEvent {
  entityType: DistributionEntityType;
  entityId: string;
  eventType: OutboxEventType;
  payload: Record<string, unknown>;
  actorId?: string;
}

/**
 * A downstream webhook target. In the PoC this is a display/config-only value
 * object (no real HTTP is sent from the live demo); production wiring is
 * documented in AGENTS.md.
 */
export interface WebhookTarget {
  /** Destination URL events would be POSTed to. */
  url: string;
  /** Shared secret used to sign payloads (never rendered in full). */
  secret?: string;
  /** Whether delivery is enabled. */
  active: boolean;
}

const ENTITY_TYPE_LABELS: Record<DistributionEntityType, string> = {
  customer: '顧客',
  product: '製品',
};

const EVENT_TYPE_LABELS: Record<OutboxEventType, string> = {
  created: '新規登録',
  updated: '更新',
  merged: '統合',
  status_changed: 'ステータス変更',
};

const EVENT_TYPE_TONES: Record<OutboxEventType, StatusTone> = {
  created: 'positive',
  updated: 'neutral',
  merged: 'warning',
  status_changed: 'muted',
};

const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: '未配信',
  delivered: '配信済み',
  failed: '失敗',
};

const DELIVERY_STATUS_TONES: Record<DeliveryStatus, StatusTone> = {
  pending: 'warning',
  delivered: 'positive',
  failed: 'danger',
};

/** JP label for a master domain. */
export function distributionEntityLabel(type: DistributionEntityType): string {
  return ENTITY_TYPE_LABELS[type];
}

/** JP label for a business event kind. */
export function outboxEventTypeLabel(type: OutboxEventType): string {
  return EVENT_TYPE_LABELS[type];
}

/** Badge tone for a business event kind. */
export function outboxEventTypeTone(type: OutboxEventType): StatusTone {
  return EVENT_TYPE_TONES[type];
}

/** JP label for a delivery status. */
export function deliveryStatusLabel(status: DeliveryStatus): string {
  return DELIVERY_STATUS_LABELS[status];
}

/** Badge tone for a delivery status. */
export function deliveryStatusTone(status: DeliveryStatus): StatusTone {
  return DELIVERY_STATUS_TONES[status];
}

/** All selectable delivery statuses (for filters). */
export const DELIVERY_STATUS_VALUES: DeliveryStatus[] = [
  'pending',
  'delivered',
  'failed',
];

/** All event types (for filters). */
export const OUTBOX_EVENT_TYPE_VALUES: OutboxEventType[] = [
  'created',
  'updated',
  'merged',
  'status_changed',
];
