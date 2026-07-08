import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Regression guard for deployed-schema drift.
 *
 * Rayfin's MSSQL/DAB backend rejects the ENTIRE schema `db apply` when any
 * `@text` field declares a `max` above the NVARCHAR sized-string limit (4000).
 * A single offending field silently freezes every pending migration (new
 * tables + columns), so the deployed GraphQL type drifts from the entities and
 * the app loses its data. That failure only surfaces during a cloud `rayfin up`,
 * never in the client-side test suite — so we assert the invariant statically
 * here, where it fails fast in CI without any cloud credentials.
 */
const MSSQL_MAX_TEXT = 4000;
const ENTITY_DIR = resolve(process.cwd(), 'rayfin/data');

/** Matches `@text({ ... max: <n> ... })` and captures the numeric max. */
const TEXT_MAX_RE = /@text\(\{[^}]*\bmax:\s*(\d+)/g;

function entityFiles(): string[] {
  return readdirSync(ENTITY_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .sort();
}

describe('entity @text limits (MSSQL/DAB schema guard)', () => {
  it('finds entity source files to scan', () => {
    expect(entityFiles().length).toBeGreaterThan(0);
  });

  it.each(entityFiles())(
    '%s declares no @text max above the MSSQL limit',
    (file) => {
      const source = readFileSync(resolve(ENTITY_DIR, file), 'utf8');
      const offenders: number[] = [];
      for (const match of source.matchAll(TEXT_MAX_RE)) {
        const max = Number(match[1]);
        if (max > MSSQL_MAX_TEXT) offenders.push(max);
      }
      expect(
        offenders,
        `${file} has @text max values exceeding ${MSSQL_MAX_TEXT} ` +
          `(MSSQL NVARCHAR limit): ${offenders.join(', ')}. ` +
          `Bound the field to <= ${MSSQL_MAX_TEXT} — an oversized max makes ` +
          `'rayfin up db apply' reject the whole schema and freeze migrations.`
      ).toEqual([]);
    }
  );
});
