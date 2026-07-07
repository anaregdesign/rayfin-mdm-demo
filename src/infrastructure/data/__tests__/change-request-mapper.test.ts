import { describe, expect, it } from 'vitest';

import {
  parsePayload,
  serializePayload,
  toChangeRequest,
  type ChangeRequestRow,
} from '@/infrastructure/data/change-request-mapper';

describe('change-request-mapper payload codec', () => {
  it('round-trips a payload object through JSON', () => {
    const payload = { name: '山田商事', code: 'C-001', annualRevenue: 1200 };
    const json = serializePayload(payload);
    expect(json).toBeTypeOf('string');
    expect(parsePayload(json)).toEqual(payload);
  });

  it('serializes an absent payload to undefined', () => {
    expect(serializePayload(undefined)).toBeUndefined();
  });

  it('drops an oversized payload to protect the DB write', () => {
    const huge = { notes: 'x'.repeat(9000) };
    expect(serializePayload(huge)).toBeUndefined();
  });

  it('parses empty, null, or invalid JSON to undefined', () => {
    expect(parsePayload(undefined)).toBeUndefined();
    expect(parsePayload(null)).toBeUndefined();
    expect(parsePayload('')).toBeUndefined();
    expect(parsePayload('not json')).toBeUndefined();
  });

  it('rejects non-object JSON (arrays and primitives)', () => {
    expect(parsePayload('[1,2,3]')).toBeUndefined();
    expect(parsePayload('42')).toBeUndefined();
    expect(parsePayload('"text"')).toBeUndefined();
  });
});

describe('toChangeRequest', () => {
  it('maps a full row to the domain request', () => {
    const row = {
      id: 'cr-1',
      entityType: 'customer',
      entityId: 'e-1',
      operation: 'update',
      payload: JSON.stringify({ name: '新社名' }),
      status: 'approved',
      requestedBy: 'maker@contoso.com',
      reviewedBy: 'checker@contoso.com',
      reason: '妥当',
      summary: '新社名',
      requestedAt: '2025-01-02T03:04:05.000Z',
      reviewedAt: '2025-01-03T04:05:06.000Z',
    } as unknown as ChangeRequestRow;

    const result = toChangeRequest(row);
    expect(result).toMatchObject({
      id: 'cr-1',
      entityType: 'customer',
      entityId: 'e-1',
      operation: 'update',
      payload: { name: '新社名' },
      status: 'approved',
      requestedBy: 'maker@contoso.com',
      reviewedBy: 'checker@contoso.com',
      reason: '妥当',
      summary: '新社名',
    });
    expect(result.requestedAt).toBeInstanceOf(Date);
    expect(result.reviewedAt).toBeInstanceOf(Date);
    expect(result.requestedAt.toISOString()).toBe('2025-01-02T03:04:05.000Z');
  });

  it('normalizes absent optional columns to undefined', () => {
    const row = {
      id: 'cr-2',
      entityType: 'product',
      entityId: null,
      operation: 'create',
      payload: null,
      status: 'pending',
      requestedBy: null,
      reviewedBy: null,
      reason: null,
      summary: null,
      requestedAt: '2025-01-02T03:04:05.000Z',
      reviewedAt: null,
    } as unknown as ChangeRequestRow;

    const result = toChangeRequest(row);
    expect(result.entityId).toBeUndefined();
    expect(result.payload).toBeUndefined();
    expect(result.requestedBy).toBeUndefined();
    expect(result.reviewedBy).toBeUndefined();
    expect(result.reason).toBeUndefined();
    expect(result.summary).toBeUndefined();
    expect(result.reviewedAt).toBeUndefined();
    expect(result.status).toBe('pending');
  });
});
