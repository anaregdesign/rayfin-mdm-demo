import { useCallback, useEffect, useState } from 'react';

import type {
  MergeEntityType,
  MergeFieldSource,
  MergeRecord,
} from '@/domain/models/merge';
import { applyResolutions } from '@/domain/policies/merge-policy';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';

/** One side of a pairwise merge, as seen by the merge orchestrator. */
export interface MergePartner {
  id: string;
  status: string;
  /** The record's editable input (winner/loser field values). */
  input: Record<string, unknown>;
}

/**
 * Side effects the merge orchestrator delegates back to the owning store so the
 * winner golden update stays audited and the master list reloads. Keeps the
 * hook agnostic of customer vs product wiring.
 */
export interface MergeGateways {
  /** Apply the golden record to the winner (audited + reloads the list). */
  applyGolden: (winnerId: string, golden: Record<string, unknown>) => Promise<unknown>;
  /** Mark a loser as merged into the winner. */
  markMerged: (loserId: string, winnerId: string) => Promise<void>;
  /** Restore a loser out of the merged state to a prior status (unmerge). */
  restoreMerged: (loserId: string, status: string) => Promise<void>;
  /** Reload the master list after non-reloading mutations. */
  reload: () => Promise<void>;
  onBusy?: (busy: boolean) => void;
  onError?: (message: string | null) => void;
}

export interface MergeController {
  history: MergeRecord[];
  historyLoading: boolean;
  historyError: string | null;
  reloadHistory: () => Promise<void>;
  merge: (
    winner: MergePartner,
    loser: MergePartner,
    sources: Record<string, MergeFieldSource>
  ) => Promise<boolean>;
  unmerge: (recordId: string) => Promise<boolean>;
}

/**
 * Orchestrates reversible pairwise merge/survivorship for a master type. Builds
 * the golden record from per-field sources, writes it to the winner, marks the
 * loser merged, and records a reversible {@link MergeRecord}. `unmerge` replays
 * the snapshot to restore both sides.
 */
export function useMerge(
  entityType: MergeEntityType,
  gateways: MergeGateways
): MergeController {
  const { merges } = useDependencies();
  const [history, setHistory] = useState<MergeRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const reloadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await merges.listByType(entityType));
    } catch (err) {
      setHistoryError(toMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [merges, entityType]);

  useEffect(() => {
    void reloadHistory();
  }, [reloadHistory]);

  const merge = useCallback(
    async (
      winner: MergePartner,
      loser: MergePartner,
      sources: Record<string, MergeFieldSource>
    ): Promise<boolean> => {
      gateways.onError?.(null);
      gateways.onBusy?.(true);
      try {
        const golden = applyResolutions(winner.input, loser.input, sources);
        await gateways.applyGolden(winner.id, golden);
        await gateways.markMerged(loser.id, winner.id);
        await merges.append({
          entityType,
          winnerId: winner.id,
          loserIds: [loser.id],
          fieldSources: sources,
          winnerBefore: winner.input,
          loserStatuses: { [loser.id]: loser.status },
        });
        await gateways.reload();
        await reloadHistory();
        return true;
      } catch (err) {
        gateways.onError?.(toMessage(err));
        return false;
      } finally {
        gateways.onBusy?.(false);
      }
    },
    [merges, entityType, gateways, reloadHistory]
  );

  const unmerge = useCallback(
    async (recordId: string): Promise<boolean> => {
      gateways.onError?.(null);
      gateways.onBusy?.(true);
      try {
        const record = await merges.get(recordId);
        if (!record) throw new Error('統合履歴が見つかりません。');
        await gateways.applyGolden(record.winnerId, record.winnerBefore);
        for (const loserId of record.loserIds) {
          const status = record.loserStatuses[loserId] ?? 'draft';
          await gateways.restoreMerged(loserId, status);
        }
        await merges.markUndone(recordId);
        await gateways.reload();
        await reloadHistory();
        return true;
      } catch (err) {
        gateways.onError?.(toMessage(err));
        return false;
      } finally {
        gateways.onBusy?.(false);
      }
    },
    [merges, gateways, reloadHistory]
  );

  return {
    history,
    historyLoading,
    historyError,
    reloadHistory,
    merge,
    unmerge,
  };
}
