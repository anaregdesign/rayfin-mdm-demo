import { describe, expect, it } from 'vitest';

import {
  toMergeRecord,
  type MergeRecordRow,
} from '@/infrastructure/data/merge-record-mapper';

/**
 * Round-trip / robustness coverage for the MergeRecord infra mapper. The JSON
 * `@text` columns are parsed defensively so a malformed row never crashes the
 * merge-history UI; these tests lock that behavior in.
 */

const performedAt = new Date('2024-05-01T09:00:00.000Z');

function row(overrides: Partial<MergeRecordRow> = {}): MergeRecordRow {
  return {
    id: 'm-1',
    entityType: 'customer',
    winnerId: 'w-1',
    loserIds: JSON.stringify(['l-1', 'l-2']),
    fieldSources: JSON.stringify({ email: 'loser', name: 'winner' }),
    winnerBefore: JSON.stringify({ name: 'Acme', email: '' }),
    loserStatuses: JSON.stringify({ 'l-1': 'active', 'l-2': 'draft' }),
    performedBy: 'steward@example.com',
    performedAt,
    undoneAt: undefined,
    ...overrides,
  } as MergeRecordRow;
}

describe('toMergeRecord', () => {
  it('parses all JSON columns into the domain shape', () => {
    const record = toMergeRecord(row());
    expect(record).toEqual({
      id: 'm-1',
      entityType: 'customer',
      winnerId: 'w-1',
      loserIds: ['l-1', 'l-2'],
      fieldSources: { email: 'loser', name: 'winner' },
      winnerBefore: { name: 'Acme', email: '' },
      loserStatuses: { 'l-1': 'active', 'l-2': 'draft' },
      performedBy: 'steward@example.com',
      performedAt,
      undoneAt: undefined,
    });
  });

  it('maps undoneAt to a Date only when present', () => {
    expect(toMergeRecord(row()).undoneAt).toBeUndefined();
    const undoneAt = new Date('2024-05-02T10:00:00.000Z');
    expect(toMergeRecord(row({ undoneAt })).undoneAt).toEqual(undoneAt);
  });

  it('coerces an unknown field source to winner', () => {
    const record = toMergeRecord(
      row({ fieldSources: JSON.stringify({ email: 'bogus' }) })
    );
    expect(record.fieldSources.email).toBe('winner');
  });

  it('falls back to safe defaults on malformed JSON', () => {
    const record = toMergeRecord(
      row({
        loserIds: 'not-json',
        fieldSources: '{oops',
        winnerBefore: '[]', // array is not an object snapshot
        loserStatuses: 'null',
      })
    );
    expect(record.loserIds).toEqual([]);
    expect(record.fieldSources).toEqual({});
    expect(record.winnerBefore).toEqual({});
    expect(record.loserStatuses).toEqual({});
  });

  it('stringifies non-string status values', () => {
    const record = toMergeRecord(
      row({ loserStatuses: JSON.stringify({ 'l-1': 3 }) })
    );
    expect(record.loserStatuses['l-1']).toBe('3');
  });

  it('treats a missing performedBy as undefined', () => {
    const record = toMergeRecord(row({ performedBy: undefined }));
    expect(record.performedBy).toBeUndefined();
  });
});
