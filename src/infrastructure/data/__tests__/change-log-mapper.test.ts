import { describe, expect, it } from 'vitest';

import type { FieldChange } from '@/domain/models/change-log';

import {
  parseChangedFields,
  serializeChangedFields,
  toChangeEntry,
  type ChangeLogRow,
} from '@/infrastructure/data/change-log-mapper';

describe('change-log-mapper serialization', () => {
  it('round-trips field changes through JSON', () => {
    const changes: FieldChange[] = [
      { field: 'name', before: 'A', after: 'B' },
      { field: 'unitPrice', before: 100, after: 120 },
      { field: 'notes', before: null, after: '追記' },
    ];
    const json = serializeChangedFields(changes);
    expect(json).toBeTypeOf('string');
    expect(parseChangedFields(json)).toEqual(changes);
  });

  it('serializes an empty change list to undefined', () => {
    expect(serializeChangedFields([])).toBeUndefined();
  });

  it('parses empty/invalid input to an empty array', () => {
    expect(parseChangedFields(undefined)).toEqual([]);
    expect(parseChangedFields(null)).toEqual([]);
    expect(parseChangedFields('')).toEqual([]);
    expect(parseChangedFields('not json')).toEqual([]);
    expect(parseChangedFields('{"not":"array"}')).toEqual([]);
  });

  it('truncates oversized diffs but keeps field names', () => {
    const huge = 'x'.repeat(9000);
    const json = serializeChangedFields([
      { field: 'notes', before: huge, after: huge },
    ]);
    expect(json).toBeDefined();
    expect(json!.length).toBeLessThanOrEqual(8000);
    const parsed = parseChangedFields(json);
    expect(parsed[0].field).toBe('notes');
  });
});

describe('toChangeEntry', () => {
  it('maps a row to the domain entry, parsing changes and dates', () => {
    const row = {
      id: 'c1',
      entityType: 'customer',
      entityId: 'e1',
      action: 'update',
      changedFields: JSON.stringify([{ field: 'name', before: 'A', after: 'B' }]),
      actorId: 'dev@contoso.com',
      summary: '1項目を更新',
      occurredAt: '2025-01-02T03:04:05.000Z',
    } as unknown as ChangeLogRow;

    const entry = toChangeEntry(row);
    expect(entry.id).toBe('c1');
    expect(entry.entityType).toBe('customer');
    expect(entry.action).toBe('update');
    expect(entry.changes).toEqual([{ field: 'name', before: 'A', after: 'B' }]);
    expect(entry.actorId).toBe('dev@contoso.com');
    expect(entry.occurredAt).toBeInstanceOf(Date);
    expect(entry.occurredAt.toISOString()).toBe('2025-01-02T03:04:05.000Z');
  });

  it('maps missing optional columns to undefined and empty changes', () => {
    const row = {
      id: 'c2',
      entityType: 'product',
      entityId: 'e2',
      action: 'create',
      changedFields: undefined,
      actorId: null,
      summary: null,
      occurredAt: new Date('2025-03-04T00:00:00.000Z'),
    } as unknown as ChangeLogRow;

    const entry = toChangeEntry(row);
    expect(entry.changes).toEqual([]);
    expect(entry.actorId).toBeUndefined();
    expect(entry.summary).toBeUndefined();
  });
});
