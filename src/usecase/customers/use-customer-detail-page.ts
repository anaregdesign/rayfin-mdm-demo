import { useCallback, useMemo, useState } from 'react';

import type { ChangeEntry } from '@/domain/models/change-log';
import {
  customerRelationTypeLabel,
  customerToInput,
  type Customer,
  type CustomerInput,
} from '@/domain/models/customer';
import type { CustomerStatus } from '@/domain/models/master-status';
import type { DuplicatePair } from '@/domain/models/duplicate';
import { isMergeActive, type MergeFieldSource } from '@/domain/models/merge';
import type { QualityResult } from '@/domain/models/quality';
import {
  findCustomerDuplicates,
  pairsForId,
} from '@/domain/policies/duplicate-policy';
import { evaluateCustomerQuality } from '@/domain/policies/customer-quality-policy';
import {
  applyCleansing,
  suggestCustomerCleansing,
} from '@/domain/policies/cleansing-policy';
import type { CleansingSuggestion } from '@/domain/models/quality';
import {
  ancestorsOf,
  childrenOf,
  siblingsOf,
} from '@/domain/policies/hierarchy-policy';
import { revertChanges } from '@/domain/policies/diff-policy';
import {
  allowedCustomerTransitions,
  canDeleteCustomer,
  canEditCustomer,
} from '@/domain/policies/customer-status-policy';
import {
  can,
  canViewSensitive as policyCanViewSensitive,
} from '@/domain/policies/access-policy';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';
import { useAuth } from '@/usecase/auth/use-auth';
import { useChangeHistory } from '@/usecase/history/use-change-history';
import {
  buildMergePlan,
  type MergeHistoryItem,
  type MergePlan,
} from '@/usecase/merge/merge-plan';
import { useMerge, type MergeGateways } from '@/usecase/merge/use-merge';

import { useCustomers } from './use-customers';

/** The org-hierarchy neighbourhood of a customer (Issue #7). */
export interface CustomerRelations {
  /** Immediate parent record, if the parentId resolves. */
  parent: Customer | null;
  /** Ancestor chain ordered root → nearest parent (breadcrumb order). */
  ancestors: Customer[];
  /** Direct children. */
  children: Customer[];
  /** Records that share the same parent. */
  siblings: Customer[];
  /** Localised relationship-type label (子会社 / 支店 …), if set. */
  relationTypeLabel: string | null;
}

export interface CustomerDetailViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  busy: boolean;
  customer: Customer | null;
  quality: QualityResult | null;
  /** Normalization suggestions for this record (Issue #11). */
  cleansingSuggestions: CleansingSuggestion[];
  duplicatePairs: DuplicatePair[];
  /** Parent / children / siblings neighbourhood for the relations panel. */
  relations: CustomerRelations | null;
  allowedTransitions: CustomerStatus[];
  canEdit: boolean;
  canDelete: boolean;
  /** Role may change lifecycle status of this record (steward owns it / admin). */
  canChangeStatus: boolean;
  /** Role may merge duplicates into this record. */
  canMerge: boolean;
  /** Role may see masked sensitive fields (taxId / annualRevenue). */
  canViewSensitive: boolean;
  history: ChangeEntry[];
  historyLoading: boolean;
  historyError: string | null;
  mergeHistory: MergeHistoryItem[];
  mergeHistoryLoading: boolean;
  mergeHistoryError: string | null;
  changeStatus: (status: CustomerStatus) => Promise<void>;
  deleteCustomer: () => Promise<boolean>;
  restore: (entry: ChangeEntry) => Promise<void>;
  /** Apply all normalization suggestions to this record (Issue #11). */
  applyCleansing: () => Promise<void>;
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
  const { actor } = useAuth();
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

  const cleansingSuggestions = useMemo(
    () => (customer ? suggestCustomerCleansing(customerToInput(customer)) : []),
    [customer]
  );

  const duplicatePairs = useMemo(() => {
    if (!customer) return [];
    return pairsForId(findCustomerDuplicates(store.customers), customer.id);
  }, [store.customers, customer]);

  const relations = useMemo<CustomerRelations | null>(() => {
    if (!customer) return null;
    const parent = customer.parentId
      ? store.customers.find((c) => c.id === customer.parentId) ?? null
      : null;
    return {
      parent,
      // ancestorsOf returns nearest→root; reverse for a root→nearest breadcrumb.
      ancestors: [...ancestorsOf(store.customers, customer.id)].reverse(),
      children: childrenOf(store.customers, customer.id),
      siblings: siblingsOf(store.customers, customer.id),
      relationTypeLabel: customer.relationType
        ? customerRelationTypeLabel(customer.relationType)
        : null,
    };
  }, [store.customers, customer]);

  const allowedTransitions = customer
    ? allowedCustomerTransitions(customer.status)
    : [];
  // Access is the AND of the status-based rule and the role/steward policy.
  const canEdit =
    !!customer &&
    canEditCustomer(customer) &&
    !!actor &&
    can(actor, 'edit', customer);
  const canDelete =
    !!customer &&
    canDeleteCustomer(customer) &&
    !!actor &&
    can(actor, 'delete', customer);
  const canChangeStatus =
    !!customer &&
    allowedTransitions.length > 0 &&
    !!actor &&
    can(actor, 'changeStatus', customer);
  const canMerge = !!customer && !!actor && can(actor, 'merge', customer);
  const canViewSensitive = !!actor && policyCanViewSensitive(actor);

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

  const applyCleansingAll = useCallback(async () => {
    if (!customer || cleansingSuggestions.length === 0) return;
    setActionError(null);
    setBusy(true);
    try {
      const cleansed = applyCleansing(
        customerToInput(customer),
        cleansingSuggestions
      );
      await store.updateCustomer(customer.id, cleansed);
    } catch (err) {
      setActionError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }, [store, customer, cleansingSuggestions]);

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
    cleansingSuggestions,
    duplicatePairs,
    relations,
    allowedTransitions,
    canEdit,
    canDelete,
    canChangeStatus,
    canMerge,
    canViewSensitive,
    history: history.entries,
    historyLoading: history.loading,
    historyError: history.error,
    mergeHistory,
    mergeHistoryLoading: mergeCtl.historyLoading,
    mergeHistoryError: mergeCtl.historyError,
    changeStatus,
    deleteCustomer,
    restore,
    applyCleansing: applyCleansingAll,
    planMerge,
    confirmMerge,
    unmerge: mergeCtl.unmerge,
  };
}
