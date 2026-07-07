import { useCallback, useMemo, useState } from 'react';

import type { Customer } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import { can } from '@/domain/policies/access-policy';
import {
  deriveRemediationTargets,
  type RemediationTarget,
} from '@/domain/policies/cleansing-policy';
import { useAuth } from '@/usecase/auth/use-auth';
import { useCustomers } from '@/usecase/customers/use-customers';
import { useProducts } from '@/usecase/products/use-products';

import { useCleansing } from './use-cleansing';

/** Which master to show (`all` = both). */
export type RemediationEntityFilter = 'all' | 'customer' | 'product';

/** A remediation target decorated with navigation + per-record permission. */
export interface RemediationRow {
  target: RemediationTarget;
  detailPath: string;
  editPath: string;
  /** Actor may edit this record (apply cleansing / open editor). */
  canEdit: boolean;
  /** This row is currently being applied. */
  applying: boolean;
}

export interface RemediationPageViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  lastSummary: string | null;
  entityFilter: RemediationEntityFilter;
  setEntityFilter: (value: RemediationEntityFilter) => void;
  onlyWithSuggestions: boolean;
  setOnlyWithSuggestions: (value: boolean) => void;
  rows: RemediationRow[];
  /** All remediation targets (before filtering). */
  totalCount: number;
  /** Rows after filtering. */
  filteredCount: number;
  /** Targets carrying at least one cleansing suggestion (before filtering). */
  suggestionCount: number;
  apply: (target: RemediationTarget) => Promise<boolean>;
  applyAllVisible: () => Promise<void>;
  bulkApplying: boolean;
  /** Actor may apply at least one visible suggestion. */
  canApplyAny: boolean;
  reload: () => Promise<void>;
}

function detailPathFor(target: RemediationTarget): string {
  return target.entityType === 'customer'
    ? `/customers/${target.recordId}`
    : `/products/${target.recordId}`;
}

/**
 * Orchestrates the remediation queue (Issue #11). Composes the customer +
 * product stores and auth, derives cleansing/quality targets via the pure
 * policy, and exposes filters plus a permission-guarded apply command (single +
 * bulk) that writes normalized values back through the stores.
 */
export function useRemediationPage(): RemediationPageViewModel {
  const customers = useCustomers();
  const products = useProducts();
  const { actor } = useAuth();

  const [entityFilter, setEntityFilter] =
    useState<RemediationEntityFilter>('all');
  const [onlyWithSuggestions, setOnlyWithSuggestions] = useState(false);

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers.customers) map.set(c.id, c);
    return map;
  }, [customers.customers]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products.products) map.set(p.id, p);
    return map;
  }, [products.products]);

  const targets = useMemo(
    () => deriveRemediationTargets(customers.customers, products.products),
    [customers.customers, products.products]
  );

  const cleansing = useCleansing({
    actor,
    getCustomer: (id) => customerById.get(id),
    getProduct: (id) => productById.get(id),
    updateCustomer: customers.updateCustomer,
    updateProduct: products.updateProduct,
  });

  const canEditTarget = useCallback(
    (target: RemediationTarget): boolean => {
      if (!actor) return false;
      const record =
        target.entityType === 'customer'
          ? customerById.get(target.recordId)
          : productById.get(target.recordId);
      return !!record && can(actor, 'edit', record);
    },
    [actor, customerById, productById]
  );

  const filteredTargets = useMemo(() => {
    return targets.filter((t) => {
      if (entityFilter !== 'all' && t.entityType !== entityFilter) return false;
      if (onlyWithSuggestions && t.suggestions.length === 0) return false;
      return true;
    });
  }, [targets, entityFilter, onlyWithSuggestions]);

  const rows = useMemo<RemediationRow[]>(() => {
    return filteredTargets.map((target) => ({
      target,
      detailPath: detailPathFor(target),
      editPath: `${detailPathFor(target)}/edit`,
      canEdit: canEditTarget(target),
      applying: cleansing.applyingId === target.id,
    }));
  }, [filteredTargets, canEditTarget, cleansing.applyingId]);

  const applyAllVisible = useCallback(async () => {
    const applicable = filteredTargets.filter(
      (t) => t.suggestions.length > 0 && canEditTarget(t)
    );
    await cleansing.applyAll(applicable);
  }, [filteredTargets, canEditTarget, cleansing]);

  const canApplyAny = useMemo(
    () => rows.some((r) => r.canEdit && r.target.suggestions.length > 0),
    [rows]
  );

  const reload = useCallback(async () => {
    await Promise.all([customers.reload(), products.reload()]);
  }, [customers, products]);

  return {
    loading: customers.loading || products.loading,
    error: customers.error ?? products.error,
    actionError: cleansing.error,
    lastSummary: cleansing.lastSummary,
    entityFilter,
    setEntityFilter,
    onlyWithSuggestions,
    setOnlyWithSuggestions,
    rows,
    totalCount: targets.length,
    filteredCount: rows.length,
    suggestionCount: targets.filter((t) => t.suggestions.length > 0).length,
    apply: cleansing.apply,
    applyAllVisible,
    bulkApplying: cleansing.bulkApplying,
    canApplyAny,
    reload,
  };
}
