import { describe, expect, it } from 'vitest';

import {
  applyResolutions,
  buildResolutions,
  canMerge,
  defaultFieldSources,
  isEmptyValue,
  mergeableFields,
} from '@/domain/policies/merge-policy';

/**
 * Regression coverage for the survivorship / golden-record policy. These pure
 * functions decide which duplicate supplies each surviving field value, so they
 * are the core of Issue #4 and must stay deterministic across refactors.
 */

const winner = {
  name: 'Acme 株式会社',
  code: 'C-001',
  email: '', // empty on winner
  phone: '03-1111-1111',
  status: 'active',
};

const loser = {
  name: 'ACME株式会社',
  code: 'C-002',
  email: 'info@acme.example', // filled on loser
  phone: '', // empty on loser
  status: 'draft',
};

describe('isEmptyValue', () => {
  it('treats null, undefined and blank strings as empty', () => {
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue('')).toBe(true);
    expect(isEmptyValue('   ')).toBe(true);
  });

  it('does NOT treat 0 or false as empty', () => {
    expect(isEmptyValue(0)).toBe(false);
    expect(isEmptyValue(false)).toBe(false);
  });

  it('treats non-blank strings and objects as non-empty', () => {
    expect(isEmptyValue('a')).toBe(false);
    expect(isEmptyValue({})).toBe(false);
  });
});

describe('mergeableFields', () => {
  it('returns the sorted union of keys excluding status', () => {
    expect(mergeableFields(winner, loser)).toEqual([
      'code',
      'email',
      'name',
      'phone',
    ]);
  });

  it('includes keys present on only one side', () => {
    expect(mergeableFields({ a: 1 }, { b: 2 })).toEqual(['a', 'b']);
  });
});

describe('defaultFieldSources', () => {
  it('winner strategy keeps every field from the winner', () => {
    const sources = defaultFieldSources(winner, loser, {
      strategy: 'winner',
      winnerNewer: false,
    });
    expect(sources).toEqual({
      code: 'winner',
      email: 'winner',
      name: 'winner',
      phone: 'winner',
    });
  });

  it('newer strategy honors winnerNewer', () => {
    expect(
      defaultFieldSources(winner, loser, { strategy: 'newer', winnerNewer: true })
    ).toEqual({
      code: 'winner',
      email: 'winner',
      name: 'winner',
      phone: 'winner',
    });
    expect(
      defaultFieldSources(winner, loser, {
        strategy: 'newer',
        winnerNewer: false,
      })
    ).toEqual({
      code: 'loser',
      email: 'loser',
      name: 'loser',
      phone: 'loser',
    });
  });

  it('nonEmpty strategy fills only the winner gaps from the loser', () => {
    const sources = defaultFieldSources(winner, loser, {
      strategy: 'nonEmpty',
      winnerNewer: false,
    });
    // winner.email is empty and loser has one -> loser; everything else winner.
    expect(sources).toEqual({
      code: 'winner',
      email: 'loser',
      name: 'winner',
      phone: 'winner',
    });
  });

  it('nonEmpty keeps winner when both sides are empty', () => {
    const sources = defaultFieldSources(
      { note: '' },
      { note: '   ' },
      { strategy: 'nonEmpty', winnerNewer: false }
    );
    expect(sources.note).toBe('winner');
  });
});

describe('buildResolutions', () => {
  it('produces one row per mergeable field with the chosen value', () => {
    const rows = buildResolutions(winner, loser, {
      email: 'loser',
      name: 'winner',
    });
    const email = rows.find((r) => r.field === 'email');
    const name = rows.find((r) => r.field === 'name');
    expect(email).toMatchObject({
      field: 'email',
      winnerValue: '',
      loserValue: 'info@acme.example',
      source: 'loser',
      chosenValue: 'info@acme.example',
    });
    expect(name).toMatchObject({ source: 'winner', chosenValue: 'Acme 株式会社' });
  });

  it('defaults an unspecified field source to winner', () => {
    const rows = buildResolutions(winner, loser, {});
    expect(rows.every((r) => r.source === 'winner')).toBe(true);
  });
});

describe('applyResolutions', () => {
  it('overwrites only loser-sourced fields and preserves status', () => {
    const golden = applyResolutions(winner, loser, {
      email: 'loser',
      code: 'winner',
      name: 'winner',
      phone: 'winner',
    });
    expect(golden).toEqual({
      name: 'Acme 株式会社',
      code: 'C-001',
      email: 'info@acme.example',
      phone: '03-1111-1111',
      status: 'active', // never taken from the loser
    });
  });

  it('honors a full manual override to the loser', () => {
    const golden = applyResolutions(winner, loser, {
      name: 'loser',
      code: 'loser',
      email: 'loser',
      phone: 'loser',
    });
    expect(golden).toMatchObject({
      name: 'ACME株式会社',
      code: 'C-002',
      email: 'info@acme.example',
      phone: '', // loser's empty phone still wins when explicitly chosen
      status: 'active',
    });
  });

  it('does not mutate the winner input', () => {
    const snapshot = { ...winner };
    applyResolutions(winner, loser, { email: 'loser' });
    expect(winner).toEqual(snapshot);
  });
});

describe('canMerge', () => {
  it('accepts two distinct non-empty ids', () => {
    expect(canMerge('a', 'b')).toBe(true);
  });

  it('rejects self-merge and empty ids', () => {
    expect(canMerge('a', 'a')).toBe(false);
    expect(canMerge('', 'b')).toBe(false);
    expect(canMerge('a', '   ')).toBe(false);
  });
});
