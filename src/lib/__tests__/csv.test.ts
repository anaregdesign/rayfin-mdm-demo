import { describe, expect, it } from 'vitest';

import { parseCsv, recordsFromMatrix, toCsv } from '@/lib/csv';

/**
 * Regression coverage for the pure CSV codec shared by bulk import/export.
 * These functions parse untrusted user files, so quoting, escaping, line-ending,
 * and ragged-row behaviour must stay stable across refactors.
 */

describe('parseCsv', () => {
  it('parses simple comma-separated rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('keeps commas inside quoted fields', () => {
    expect(parseCsv('"Acme, Inc.",tokyo')).toEqual([['Acme, Inc.', 'tokyo']]);
  });

  it('unescapes doubled quotes inside quoted fields', () => {
    expect(parseCsv('"she said ""hi""",x')).toEqual([['she said "hi"', 'x']]);
  });

  it('keeps line breaks inside quoted fields', () => {
    expect(parseCsv('"line1\nline2",b')).toEqual([['line1\nline2', 'b']]);
  });

  it('accepts both CRLF and LF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('does not emit an extra row for a trailing newline', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('drops fully blank lines', () => {
    expect(parseCsv('a,b\n\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('returns an empty matrix for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });

  it('preserves empty middle cells', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
  });
});

describe('toCsv', () => {
  it('joins cells with commas and rows with CRLF', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['1', '2'],
      ])
    ).toBe('a,b\r\n1,2');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    expect(toCsv([['Acme, Inc.', 'say "hi"', 'line1\nline2']])).toBe(
      '"Acme, Inc.","say ""hi""","line1\nline2"'
    );
  });

  it('leaves plain cells unquoted', () => {
    expect(toCsv([['plain', '123']])).toBe('plain,123');
  });
});

describe('round-trip', () => {
  it('parseCsv(toCsv(x)) preserves the matrix', () => {
    const matrix = [
      ['コード', '名称', '備考'],
      ['C-001', 'Acme, Inc.', 'multi\nline "quoted"'],
      ['C-002', '', 'ok'],
    ];
    expect(parseCsv(toCsv(matrix))).toEqual(matrix);
  });
});

describe('recordsFromMatrix', () => {
  it('zips header row with data rows and trims headers', () => {
    const { headers, records } = recordsFromMatrix([
      [' code ', ' name '],
      ['C-1', 'Acme'],
    ]);
    expect(headers).toEqual(['code', 'name']);
    expect(records).toEqual([{ code: 'C-1', name: 'Acme' }]);
  });

  it('pads ragged rows with empty strings', () => {
    const { records } = recordsFromMatrix([['a', 'b', 'c'], ['1']]);
    expect(records).toEqual([{ a: '1', b: '', c: '' }]);
  });

  it('trims cell values', () => {
    const { records } = recordsFromMatrix([['name'], ['  spaced  ']]);
    expect(records).toEqual([{ name: 'spaced' }]);
  });

  it('returns empty structures for an empty matrix', () => {
    expect(recordsFromMatrix([])).toEqual({ headers: [], records: [] });
  });
});
