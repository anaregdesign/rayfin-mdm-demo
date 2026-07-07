/**
 * Merge / survivorship domain model. A merge collapses one or more duplicate
 * "loser" master records into a surviving "winner" (golden) record. This type
 * has no persistence decorators and no SDK dependency; the infrastructure
 * adapter maps the Rayfin `MergeRecord` entity to/from it.
 */

export type MergeEntityType = 'customer' | 'product';

/** Which record a resolved golden field value was taken from. */
export type MergeFieldSource = 'winner' | 'loser';

/**
 * Survivorship strategy used to seed the default field sources before a
 * steward manually overrides individual fields:
 * - `winner`   — always keep the winner's value (last-write-wins by choice).
 * - `newer`    — take every field from whichever record was updated last.
 * - `nonEmpty` — keep the winner's value unless it is empty, then fill from the
 *                loser (completeness-maximising).
 */
export type SurvivorshipStrategy = 'winner' | 'newer' | 'nonEmpty';

export const SURVIVORSHIP_STRATEGY_VALUES: SurvivorshipStrategy[] = [
  'nonEmpty',
  'newer',
  'winner',
];

export const SURVIVORSHIP_STRATEGY_LABELS: Record<SurvivorshipStrategy, string> =
  {
    winner: '勝者を優先',
    newer: '新しい方を優先',
    nonEmpty: '空欄を補完',
  };

export function survivorshipStrategyLabel(s: SurvivorshipStrategy): string {
  return SURVIVORSHIP_STRATEGY_LABELS[s];
}

/** Per-field resolution shown in the merge comparison UI. */
export interface FieldResolution {
  field: string;
  winnerValue: unknown;
  loserValue: unknown;
  source: MergeFieldSource;
  chosenValue: unknown;
}

/**
 * A persisted, reversible record of one merge. `winnerBefore` and
 * `loserStatuses` are the snapshots the unmerge use case needs to restore the
 * pre-merge state; the display-facing fields are the rest.
 */
export interface MergeRecord {
  id: string;
  entityType: MergeEntityType;
  winnerId: string;
  loserIds: string[];
  /** field → which record its golden value came from. */
  fieldSources: Record<string, MergeFieldSource>;
  /** Winner's editable input snapshot before the merge (for unmerge). */
  winnerBefore: Record<string, unknown>;
  /** loserId → its status before being marked merged (for unmerge). */
  loserStatuses: Record<string, string>;
  performedBy?: string;
  performedAt: Date;
  /** Set when the merge has been reversed (unmerged); undefined while active. */
  undoneAt?: Date;
}

/** True while a merge record is still in effect (not yet unmerged). */
export function isMergeActive(record: Pick<MergeRecord, 'undoneAt'>): boolean {
  return record.undoneAt === undefined;
}
