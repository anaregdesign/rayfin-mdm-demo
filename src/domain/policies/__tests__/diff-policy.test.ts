import { describe, expect, it } from 'vitest';

import {
  diffRecords,
  IGNORED_DIFF_FIELDS,
  revertChanges,
  valuesEqual,
} from '@/domain/policies/diff-policy';

describe('diffRecords', () => {
  it('emits a diff for a changed primitive field', () => {
    const diffs = diffRecords({ name: 'A' }, { name: 'B' });
    expect(diffs).toEqual([{ field: 'name', before: 'A', after: 'B' }]);
  });

  it('returns no diff when values are unchanged', () => {
    expect(diffRecords({ name: 'A', qty: 1 }, { name: 'A', qty: 1 })).toEqual([]);
  });

  it('ignores audit/identity fields by default', () => {
    const before = { name: 'A', updatedAt: new Date('2024-01-01') };
    const after = { name: 'A', updatedAt: new Date('2025-06-01') };
    expect(diffRecords(before, after)).toEqual([]);
    // sanity: the ignore list is the one applied
    expect(IGNORED_DIFF_FIELDS).toContain('updatedAt');
  });

  it('treats empty string, null, and undefined as equivalent (no diff)', () => {
    expect(diffRecords({ notes: '' }, { notes: undefined })).toEqual([]);
    expect(diffRecords({ notes: null }, { notes: '' })).toEqual([]);
    expect(diffRecords({ notes: undefined }, { notes: null })).toEqual([]);
  });

  it('normalizes cleared values to null in the emitted diff', () => {
    const diffs = diffRecords({ notes: 'hello' }, { notes: '' });
    expect(diffs).toEqual([{ field: 'notes', before: 'hello', after: null }]);
  });

  it('trims surrounding whitespace before comparing', () => {
    expect(diffRecords({ code: 'C1' }, { code: '  C1  ' })).toEqual([]);
    expect(diffRecords({ code: ' A ' }, { code: 'B' })).toEqual([
      { field: 'code', before: 'A', after: 'B' },
    ]);
  });

  it('detects numeric changes and preserves numbers', () => {
    expect(diffRecords({ price: 100 }, { price: 120 })).toEqual([
      { field: 'price', before: 100, after: 120 },
    ]);
  });

  it('captures fields present on only one side', () => {
    expect(diffRecords({ a: '1' }, { b: '2' })).toEqual([
      { field: 'a', before: '1', after: null },
      { field: 'b', before: null, after: '2' },
    ]);
  });

  it('honors an explicit ignore list', () => {
    const diffs = diffRecords({ a: '1', b: 'x' }, { a: '2', b: 'y' }, ['b']);
    expect(diffs).toEqual([{ field: 'a', before: '1', after: '2' }]);
  });

  it('produces deterministic order following before-keys then new keys', () => {
    const diffs = diffRecords(
      { first: '1', second: '2' },
      { second: '2b', first: '1b', third: '3' }
    );
    expect(diffs.map((d) => d.field)).toEqual(['first', 'second', 'third']);
  });
});

describe('valuesEqual', () => {
  it('equates empties and trims', () => {
    expect(valuesEqual('', undefined)).toBe(true);
    expect(valuesEqual(' a ', 'a')).toBe(true);
    expect(valuesEqual('a', 'b')).toBe(false);
    expect(valuesEqual(0, 0)).toBe(true);
    expect(valuesEqual(false, false)).toBe(true);
  });
});

describe('revertChanges', () => {
  it('applies the before side of each change (undo)', () => {
    const current = { name: 'B', notes: 'new' };
    const reverted = revertChanges(current, [
      { field: 'name', before: 'A', after: 'B' },
    ]);
    expect(reverted).toEqual({ name: 'A', notes: 'new' });
  });

  it('maps a cleared (null) before back to undefined', () => {
    const reverted = revertChanges({ notes: 'x' }, [
      { field: 'notes', before: null, after: 'x' },
    ]);
    expect(reverted.notes).toBeUndefined();
  });

  it('preserves falsy but meaningful values like 0 and false', () => {
    const reverted = revertChanges({ price: 100, active: true }, [
      { field: 'price', before: 0, after: 100 },
      { field: 'active', before: false, after: true },
    ]);
    expect(reverted).toEqual({ price: 0, active: false });
  });

  it('does not mutate the input record', () => {
    const current = { name: 'B' };
    revertChanges(current, [{ field: 'name', before: 'A', after: 'B' }]);
    expect(current).toEqual({ name: 'B' });
  });
});
