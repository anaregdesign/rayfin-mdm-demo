import {
  changeFieldLabel,
  changeValueLabel,
  type ChangeValue,
} from '@/domain/models/change-log';
import type {
  MergeEntityType,
  MergeFieldSource,
  SurvivorshipStrategy,
} from '@/domain/models/merge';
import {
  defaultFieldSources,
  mergeableFields,
} from '@/domain/policies/merge-policy';

/** One field of the merge comparison, pre-formatted for display. */
export interface MergeFieldRow {
  key: string;
  label: string;
  winnerValue: string;
  loserValue: string;
  /** True when the two records disagree on this field (worth reviewing). */
  differs: boolean;
}

/** One side of a merge as passed to {@link buildMergePlan}. */
export interface MergeSide {
  id: string;
  label: string;
  input: Record<string, unknown>;
  updatedAt?: Date;
}

/** A merge-history row resolved to display labels for the history panel. */
export interface MergeHistoryItem {
  id: string;
  winnerLabel: string;
  loserLabels: string[];
  performedBy?: string;
  performedAt: Date;
  /** True while still in effect (offers an undo); false once reversed. */
  active: boolean;
}

/**
 * The view-ready plan for a pairwise merge: pre-formatted comparison rows plus
 * an injected `computeDefaults` closure so the dialog can re-seed field sources
 * from a survivorship strategy without importing any policy itself.
 */
export interface MergePlan {
  entityType: MergeEntityType;
  winnerId: string;
  loserId: string;
  winnerLabel: string;
  loserLabel: string;
  fields: MergeFieldRow[];
  winnerNewer: boolean;
  computeDefaults: (
    strategy: SurvivorshipStrategy
  ) => Record<string, MergeFieldSource>;
}

function normalizedEqual(a: unknown, b: unknown): boolean {
  const na = a === null || a === undefined || a === '' ? '' : a;
  const nb = b === null || b === undefined || b === '' ? '' : b;
  return na === nb;
}

/**
 * Build the display plan for merging `loser` into `winner`. Pure: no hooks, no
 * SDK — turns two record inputs into labelled, formatted comparison rows and a
 * strategy→sources closure for the dialog.
 */
export function buildMergePlan(
  entityType: MergeEntityType,
  winner: MergeSide,
  loser: MergeSide
): MergePlan {
  const winnerNewer =
    (winner.updatedAt?.getTime() ?? 0) >= (loser.updatedAt?.getTime() ?? 0);

  const fields: MergeFieldRow[] = mergeableFields(
    winner.input,
    loser.input
  ).map((key) => {
    const w = winner.input[key];
    const l = loser.input[key];
    return {
      key,
      label: changeFieldLabel(entityType, key),
      winnerValue: changeValueLabel(entityType, key, w as ChangeValue),
      loserValue: changeValueLabel(entityType, key, l as ChangeValue),
      differs: !normalizedEqual(w, l),
    };
  });

  return {
    entityType,
    winnerId: winner.id,
    loserId: loser.id,
    winnerLabel: winner.label,
    loserLabel: loser.label,
    fields,
    winnerNewer,
    computeDefaults: (strategy) =>
      defaultFieldSources(winner.input, loser.input, {
        strategy,
        winnerNewer,
      }),
  };
}
