import type { ChangeValue, FieldChange } from '@/domain/models/change-log';

/**
 * Pure change-detection policy. Given two snapshots of a record, compute the
 * field-level diffs that should be written to the change history. No React, no
 * SDK, no browser APIs — this is the testable heart of #5 (versioning).
 */

/** Audit/identity fields that never count as a business change. */
export const IGNORED_DIFF_FIELDS: readonly string[] = [
  'id',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
];

/** Normalize a value for comparison: undefined and '' are both "empty". */
function normalizeValue(value: unknown): ChangeValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  // Dates and other objects are compared by their ISO/string form.
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** True when two field values are equivalent for audit purposes. */
export function valuesEqual(a: unknown, b: unknown): boolean {
  return normalizeValue(a) === normalizeValue(b);
}

/**
 * Diff two records into a stable, ordered list of field changes. Keys are the
 * union of both records' own keys, minus the ignored audit fields; the order
 * follows `before` first (for deterministic output), then any new keys.
 */
export function diffRecords(
  before: object,
  after: object,
  ignore: readonly string[] = IGNORED_DIFF_FIELDS
): FieldChange[] {
  const beforeRec = before as Record<string, unknown>;
  const afterRec = after as Record<string, unknown>;
  const ignoreSet = new Set(ignore);
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const key of [...Object.keys(beforeRec), ...Object.keys(afterRec)]) {
    if (ignoreSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }

  const diffs: FieldChange[] = [];
  for (const field of keys) {
    const beforeValue = beforeRec[field];
    const afterValue = afterRec[field];
    if (valuesEqual(beforeValue, afterValue)) continue;
    diffs.push({
      field,
      before: normalizeValue(beforeValue),
      after: normalizeValue(afterValue),
    });
  }
  return diffs;
}

/**
 * Rebuild a record by applying the `before` side of each change — i.e. undo the
 * captured edit. `null` (a cleared field) becomes `undefined` so it maps back to
 * the empty form value. Untouched fields are preserved. Pure and total.
 */
export function revertChanges<T extends object>(
  current: T,
  changes: FieldChange[]
): T {
  const next: Record<string, unknown> = { ...(current as Record<string, unknown>) };
  for (const change of changes) {
    next[change.field] = change.before === null ? undefined : change.before;
  }
  return next as T;
}
