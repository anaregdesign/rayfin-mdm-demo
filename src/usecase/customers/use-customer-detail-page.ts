import { useCallback, useMemo, useState } from 'react';

import type { ChangeEntry } from '@/domain/models/change-log';
import { customerToInput, type Customer, type CustomerInput } from '@/domain/models/customer';
import type { CustomerStatus } from '@/domain/models/master-status';
import type { DuplicatePair } from '@/domain/models/duplicate';
import { isMergeActive, type MergeFieldSource } from '@/domain/models/merge';
import type { QualityResult } from '@/domain/models/quality';
import {
  findCustomerDuplicates,
  pairsForId,
} from '@/domain/policies/duplicate-policy';
import { evaluateCustomerQuality } from '@/domain/policies/customer-quality-policy';
import { revertChanges } from '@/domain/policies/diff-policy';
import {
  allowedCustomerTransitions,
  canDeleteCustomer,
  canEditCustomer,
} from '@/domain/policies/customer-status-policy';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';
import { useChangeHistory } from '@/usecase/history/use-change-history';
import {
  buildMergePlan,
  type MergeHistoryItem,
  type MergePlan,
} from '@/usecase/merge/merge-plan';
import { useMerge, type MergeGateways } from '@/usecase/merge/use-merge';

import { useCustomers } from './use-customers';

export interface CustomerDetailViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  busy: boolean;
  customer: Customer | null;
  quality: QualityResult | null;
  duplicatePairs: DuplicatePair[];
  allowedTransitions: CustomerStatus[];
  canEdit: boolean;
  canDelete: boolean;
  history: ChangeEntry[];
  historyLoading: boolean;
  historyError: string | null;
  mergeHistory: MergeHistoryItem[];
  mergeHistoryLoading: boolean;
  mergeHistoryError: string | null;
  changeStatus: (status: CustomerStatus) => Promise<void>;
  deleteCustomer: () => Promise<boolean>;
  restore: (entry: ChangeEntry) => Promise<void>;
  /** Build the comparison plan for merging a duplicate into this record. */
  planMerge: (loserId: string) => MergePlan | null;
  /** Execute the merge with the steward's per-field source choices. */
  confirmMerge: (
    loserId: string,
    sources: Record<string, MergeFieldSource>
  ) => Promise<boolean>;
  /** Reverse a previously recorded merge. */
  unmerge: (recordId: string) => Promise<boolean>;
}

/** Orchestrates the 360° customer detail screen and its lifecycle actions. */
export function useCustomerDetailPage(id: string): CustomerDetailViewModel {
  const store = useCustomers();
  const deps = useDependencies();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const customer = useMemo(
    () => store.customers.find((c) => c.id === id) ?? null,
    [store.customers, id]
  );

  const quality = useMemo(
    () => (customer ? evaluateCustomerQuality(customer) : null),
    [customer]
  );

  const duplicatePairs = useMemo(() => {
    if (!customer) return [];
    return pairsForId(findCustomerDuplicates(store.customers), customer.id);
  }, [store.customers, customer]);

  const allowedTransitions = customer
    ? allowedCustomerTransitions(customer.status)
    : [];
  const canEdit = customer ? canEditCustomer(customer) : false;
  const canDelete = customer ? canDeleteCustomer(customer) : false;

  const changeStatus = useCallback(
    async (status: CustomerStatus) => {
      if (!customer) return;
      setActionError(null);
      setBusy(true);
      try {
        await store.changeStatus(customer.id, status);
      } catch (err) {
        setActionError(toMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [store, customer]
  );

  const deleteCustomer = useCallback(async () => {
    if (!customer) return false;
    setActionError(null);
    setBusy(true);
    try {
      await store.deleteCustomer(customer.id);
      return true;
    } catch (err) {
      setActionError(toMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, [store, customer]);

  const history = useChangeHistory('customer', id, customer?.updatedAt?.getTime());

  const restore = useCallback(
    async (entry: ChangeEntry) => {
      if (!customer || entry.changes.length === 0) return;
      setActionError(null);
      setBusy(true);
      try {
        const reverted = revertChanges(customerToInput(customer), entry.changes);
        await store.updateCustomer(customer.id, reverted);
      } catch (err) {
        setActionError(toMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [store, customer]
  );

  const mergeGateways = useMemo<MergeGateways>(
    () => ({
      applyGolden: (winnerId, golden) =>
        store.updateCustomer(winnerId, golden as unknown as CustomerInput),
      markMerged: (loserId, winnerId) =>
        deps.customers.markMerged(loserId, winnerId),
      restoreMerged: (loserId, status) =>
        deps.customers.restoreMerged(loserId, status as CustomerStatus),
      reload: () => store.reload(),
      onBusy: setBusy,
      onError: setActionError,
    }),
    [store, deps.customers]
  );

  const mergeCtl = useMerge('customer', mergeGateways);

  const nameOf = useCallback(
    (customerId: string) =>
      store.customers.find((c) => c.id === customerId)?.name ?? customerId,
    [store.customers]
  );

  const mergeHistory = useMemo<MergeHistoryItem[]>(
    () =>
      mergeCtl.history.map((record) => ({
        id: record.id,
        winnerLabel: nameOf(record.winnerId),
        loserLabels: record.loserIds.map(nameOf),
        performedBy: record.performedBy,
        performedAt: record.performedAt,
        active: isMergeActive(record),
      })),
    [mergeCtl.history, nameOf]
  );

  const planMerge = useCallback(
    (loserId: string): MergePlan | null => {
      const loser = store.customers.find((c) => c.id === loserId);
      if (!customer || !loser) return null;
      return buildMergePlan(
        'customer',
        {
          id: customer.id,
          label: customer.name,
          input: customerToInput(customer) as unknown as Record<string, unknown>,
          updatedAt: customer.updatedAt,
        },
        {
          id: loser.id,
          label: loser.name,
          input: customerToInput(loser) as unknown as Record<string, unknown>,
          updatedAt: loser.updatedAt,
        }
      );
    },
    [customer, store.customers]
  );

  const confirmMerge = useCallback(
    async (loserId: string, sources: Record<string, MergeFieldSource>) => {
      const loser = store.customers.find((c) => c.id === loserId);
      if (!customer || !loser) return false;
      return mergeCtl.merge(
        {
          id: customer.id,
          status: customer.status,
          input: customerToInput(customer) as unknown as Record<string, unknown>,
        },
        {
          id: loser.id,
          status: loser.status,
          input: customerToInput(loser) as unknown as Record<string, unknown>,
        },
        sources
      );
    },
    [customer, store.customers, mergeCtl]
  );

  return {
    loading: store.loading,
    error: store.error,
    actionError,
    busy,
    customer,
    quality,
    duplicatePairs,
    allowedTransitions,
    canEdit,
    canDelete,
    history: history.entries,
    historyLoading: history.loading,
    historyError: history.error,
    mergeHistory,
    mergeHistoryLoading: mergeCtl.historyLoading,
    mergeHistoryError: mergeCtl.historyError,
    changeStatus,
    deleteCustomer,
    restore,
    planMerge,
    confirmMerge,
    unmerge: mergeCtl.unmerge,
  };
}
