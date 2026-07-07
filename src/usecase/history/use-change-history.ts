import { useCallback, useEffect, useState } from 'react';

import type { ChangeEntityType, ChangeEntry } from '@/domain/models/change-log';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';

export interface ChangeHistoryViewModel {
  entries: ChangeEntry[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Loads the change history for a single master record, newest first. Pass a
 * `reloadKey` that changes on every mutation (e.g. the record's `updatedAt`
 * timestamp) so the timeline refreshes after edits/status changes/restores.
 */
export function useChangeHistory(
  entityType: ChangeEntityType,
  entityId: string | undefined,
  reloadKey?: unknown
): ChangeHistoryViewModel {
  const { changeLog } = useDependencies();
  const [entries, setEntries] = useState<ChangeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!entityId) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    changeLog
      .listByEntity(entityType, entityId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(toMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [changeLog, entityType, entityId, reloadKey, tick]);

  return { entries, loading, error, reload };
}
