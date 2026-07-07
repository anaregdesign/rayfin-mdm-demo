import { useCallback, useState } from 'react';

import type { Customer, CustomerInput } from '@/domain/models/customer';
import { customerToInput } from '@/domain/models/customer';
import type { Product, ProductInput } from '@/domain/models/product';
import { productToInput } from '@/domain/models/product';
import type { Actor } from '@/domain/models/authz';
import { can } from '@/domain/policies/access-policy';
import {
  applyCleansing,
  type RemediationTarget,
} from '@/domain/policies/cleansing-policy';
import { toMessage } from '@/lib/errors';

/**
 * Store-agnostic cleansing controller (Issue #11). Applies a remediation
 * target's suggested normalizations to the underlying record through injected
 * update gateways, guarded per-record by the access policy. Kept independent of
 * any specific store so the remediation page and (potentially) detail views can
 * reuse it while writing through their own store instance.
 */
export interface CleansingGateways {
  actor: Actor | null;
  getCustomer: (id: string) => Customer | undefined;
  getProduct: (id: string) => Product | undefined;
  updateCustomer: (id: string, input: CustomerInput) => Promise<unknown>;
  updateProduct: (id: string, input: ProductInput) => Promise<unknown>;
}

export interface CleansingController {
  /** Apply one target's suggestions; returns true when a write succeeded. */
  apply: (target: RemediationTarget) => Promise<boolean>;
  /** Apply suggestions for every permitted target, tallying the outcome. */
  applyAll: (targets: RemediationTarget[]) => Promise<void>;
  /** Id of the single target currently being applied (row spinner). */
  applyingId: string | null;
  /** True while a bulk apply is running. */
  bulkApplying: boolean;
  error: string | null;
  /** Human-readable summary of the last bulk apply. */
  lastSummary: string | null;
}

/** Outcome of applying one target, used to tally bulk runs. */
type ApplyOutcome = 'applied' | 'skipped' | 'denied' | 'failed';

export function useCleansing(
  gateways: CleansingGateways
): CleansingController {
  const {
    actor,
    getCustomer,
    getProduct,
    updateCustomer,
    updateProduct,
  } = gateways;

  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  const applyOne = useCallback(
    async (target: RemediationTarget): Promise<ApplyOutcome> => {
      if (target.suggestions.length === 0) return 'skipped';
      if (!actor) return 'denied';

      if (target.entityType === 'customer') {
        const record = getCustomer(target.recordId);
        if (!record || !can(actor, 'edit', record)) return 'denied';
        const next = applyCleansing(customerToInput(record), target.suggestions);
        try {
          await updateCustomer(record.id, next);
          return 'applied';
        } catch {
          return 'failed';
        }
      }

      const record = getProduct(target.recordId);
      if (!record || !can(actor, 'edit', record)) return 'denied';
      const next = applyCleansing(productToInput(record), target.suggestions);
      try {
        await updateProduct(record.id, next);
        return 'applied';
      } catch {
        return 'failed';
      }
    },
    [actor, getCustomer, getProduct, updateCustomer, updateProduct]
  );

  const apply = useCallback(
    async (target: RemediationTarget): Promise<boolean> => {
      setError(null);
      setLastSummary(null);
      setApplyingId(target.id);
      try {
        const outcome = await applyOne(target);
        if (outcome === 'denied') {
          setError('この操作を行う権限がありません。');
        } else if (outcome === 'failed') {
          setError('更新に失敗しました。');
        } else if (outcome === 'skipped') {
          setError('適用できる修正候補がありません。');
        }
        return outcome === 'applied';
      } catch (err) {
        setError(toMessage(err));
        return false;
      } finally {
        setApplyingId(null);
      }
    },
    [applyOne]
  );

  const applyAll = useCallback(
    async (targets: RemediationTarget[]): Promise<void> => {
      setError(null);
      setLastSummary(null);
      setBulkApplying(true);
      let applied = 0;
      let denied = 0;
      let failed = 0;
      try {
        for (const target of targets) {
          const outcome = await applyOne(target);
          if (outcome === 'applied') applied += 1;
          else if (outcome === 'denied') denied += 1;
          else if (outcome === 'failed') failed += 1;
        }
        const notes = [`${applied}件に適用`];
        if (denied > 0) notes.push(`${denied}件は権限なし`);
        if (failed > 0) notes.push(`${failed}件は更新失敗`);
        setLastSummary(notes.join('、'));
      } catch (err) {
        setError(toMessage(err));
      } finally {
        setBulkApplying(false);
      }
    },
    [applyOne]
  );

  return { apply, applyAll, applyingId, bulkApplying, error, lastSummary };
}
