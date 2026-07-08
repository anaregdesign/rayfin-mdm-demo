import { describe, expect, it } from 'vitest';

import {
  parsePayload,
  serializePayload,
  toOutboxEvent,
  type OutboxEventRow,
} from '@/infrastructure/data/outbox-event-mapper';

const OCCURRED = new Date('2024-06-01T00:00:00Z');
const DELIVERED = new Date('2024-06-02T00:00:00Z');

function row(overrides: Partial<OutboxEventRow> = {}): OutboxEventRow {
  return {
    id: 'e-1',
    entityType: 'customer',
    entityId: 'c-1',
    eventType: 'created',
    payload: JSON.stringify({ id: 'c-1', name: 'Acme' }),
    actorId: 'dana@example.com',
    status: 'pending',
    occurredAt: OCCURRED,
    deliveredAt: undefined,
    ...overrides,
  } as OutboxEventRow;
}

describe('parsePayload', () => {
  it('round-trips a serialized object', () => {
    expect(parsePayload(JSON.stringify({ a: 1, b: 'x' }))).toEqual({ a: 1, b: 'x' });
  });

  it('returns {} for null/undefined/empty', () => {
    expect(parsePayload(null)).toEqual({});
    expect(parsePayload(undefined)).toEqual({});
    expect(parsePayload('')).toEqual({});
  });

  it('returns {} for invalid JSON', () => {
    expect(parsePayload('{not json')).toEqual({});
  });

  it('returns {} for non-object JSON (array / scalar)', () => {
    expect(parsePayload('[1,2,3]')).toEqual({});
    expect(parsePayload('42')).toEqual({});
    expect(parsePayload('"hi"')).toEqual({});
  });
});

describe('serializePayload', () => {
  it('serializes a non-empty object', () => {
    expect(serializePayload({ a: 1 })).toBe(JSON.stringify({ a: 1 }));
  });

  it('returns undefined for an empty object', () => {
    expect(serializePayload({})).toBeUndefined();
  });

  it('truncates an oversized payload but keeps the id', () => {
    const big = { id: 'c-1', blob: 'x'.repeat(9000) };
    const serialized = serializePayload(big);
    expect(serialized).toBeDefined();
    expect(serialized!.length).toBeLessThanOrEqual(4000);
    const parsed = JSON.parse(serialized as string);
    expect(parsed).toEqual({ id: 'c-1', _truncated: true });
  });
});

describe('toOutboxEvent', () => {
  it('maps a full row including dates and delivered timestamp', () => {
    const mapped = toOutboxEvent(
      row({ status: 'delivered', deliveredAt: DELIVERED })
    );
    expect(mapped).toMatchObject({
      id: 'e-1',
      entityType: 'customer',
      entityId: 'c-1',
      eventType: 'created',
      actorId: 'dana@example.com',
      status: 'delivered',
    });
    expect(mapped.payload).toEqual({ id: 'c-1', name: 'Acme' });
    expect(mapped.occurredAt).toEqual(OCCURRED);
    expect(mapped.deliveredAt).toEqual(DELIVERED);
  });

  it('maps optional actorId/deliveredAt to undefined when absent', () => {
    const mapped = toOutboxEvent(row({ actorId: undefined, deliveredAt: undefined }));
    expect(mapped.actorId).toBeUndefined();
    expect(mapped.deliveredAt).toBeUndefined();
  });

  it('defaults an unparseable payload to {}', () => {
    const mapped = toOutboxEvent(row({ payload: 'broken' }));
    expect(mapped.payload).toEqual({});
  });
});
