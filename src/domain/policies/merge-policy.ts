import type {
  FieldResolution,
  MergeFieldSource,
  SurvivorshipStrategy,
} from '@/domain/models/merge';

/**
 * Survivorship / golden-record policy — pure functions that decide, field by
 * field, which of two duplicate records supplies the surviving value. Kept free
 * of any SDK, entity, or React dependency so it is trivially unit-testable and
 * reused by both the customer and product merge flows.
 *
 * All functions operate on the editable *input* shape of a record
 * (`CustomerInput` / `ProductInput`). Params are typed as `object` (and cast
 * internally) because those interfaces have no implicit index signature.
 */

/** Fields never resolved by survivorship (the winner always keeps its own). */
const NON_MERGEABLE_FIELDS = new Set(['status']);

type Record_ = Record<string, unknown>;

/** A value counts as empty when it is null/undefined or a blank string. */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

/** Union of the resolvable field keys of two records (excludes status/audit). */
export function mergeableFields(winner: object, loser: object): string[] {
  const keys = new Set<string>([
    ...Object.keys(winner as Record_),
    ...Object.keys(loser as Record_),
  ]);
  return [...keys].filter((k) => !NON_MERGEABLE_FIELDS.has(k)).sort();
}

/**
 * Seed the default source for every mergeable field from a survivorship
 * strategy. Stewards can then override individual fields in the UI.
 */
export function defaultFieldSources(
  winner: object,
  loser: object,
  options: { strategy: SurvivorshipStrategy; winnerNewer: boolean }
): Record<string, MergeFieldSource> {
  const w = winner as Record_;
  const l = loser as Record_;
  const sources: Record<string, MergeFieldSource> = {};
  for (const field of mergeableFields(winner, loser)) {
    sources[field] = pickDefaultSource(w[field], l[field], options);
  }
  return sources;
}

function pickDefaultSource(
  winnerValue: unknown,
  loserValue: unknown,
  options: { strategy: SurvivorshipStrategy; winnerNewer: boolean }
): MergeFieldSource {
  switch (options.strategy) {
    case 'winner':
      return 'winner';
    case 'newer':
      return options.winnerNewer ? 'winner' : 'loser';
    case 'nonEmpty':
      // Keep the winner unless it is empty and the loser can fill the gap.
      return isEmptyValue(winnerValue) && !isEmptyValue(loserValue)
        ? 'loser'
        : 'winner';
    default:
      return 'winner';
  }
}

/** Build the per-field comparison rows for the merge UI. */
export function buildResolutions(
  winner: object,
  loser: object,
  sources: Record<string, MergeFieldSource>
): FieldResolution[] {
  const w = winner as Record_;
  const l = loser as Record_;
  return mergeableFields(winner, loser).map((field) => {
    const source = sources[field] ?? 'winner';
    return {
      field,
      winnerValue: w[field],
      loserValue: l[field],
      source,
      chosenValue: source === 'loser' ? l[field] : w[field],
    };
  });
}

/**
 * Compose the golden record: start from the winner, then overwrite each field
 * whose resolved source is the loser. Non-mergeable fields (status, and any
 * key the winner owns exclusively) are preserved from the winner.
 */
export function applyResolutions<T extends object>(
  winner: T,
  loser: T,
  sources: Record<string, MergeFieldSource>
): T {
  const w = winner as Record_;
  const l = loser as Record_;
  const golden: Record_ = { ...w };
  for (const field of mergeableFields(winner, loser)) {
    golden[field] = sources[field] === 'loser' ? l[field] : w[field];
  }
  return golden as T;
}

/**
 * Guard: a merge is only valid between two distinct, non-empty ids. Prevents
 * self-merge and empty selections before any write happens.
 */
export function canMerge(winnerId: string, loserId: string): boolean {
  return (
    winnerId.trim().length > 0 &&
    loserId.trim().length > 0 &&
    winnerId !== loserId
  );
}
