import { useCallback, useMemo, useState } from 'react';

import type { ChangeEntry } from '@/domain/models/change-log';
import type { ProductStatus } from '@/domain/models/master-status';
import { isMergeActive, type MergeFieldSource } from '@/domain/models/merge';
import { productToInput, type Product, type ProductInput } from '@/domain/models/product';
import { categoryDisplayName } from '@/domain/models/category';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { QualityResult } from '@/domain/models/quality';
import {
  findProductDuplicates,
  pairsForId,
} from '@/domain/policies/duplicate-policy';
import { ancestorsOf } from '@/domain/policies/hierarchy-policy';
import { evaluateProductQuality } from '@/domain/policies/product-quality-policy';
import { revertChanges } from '@/domain/policies/diff-policy';
import {
  allowedProductTransitions,
  canDeleteProduct,
  canEditProduct,
} from '@/domain/policies/product-status-policy';
import {
  can,
  canViewSensitive as policyCanViewSensitive,
} from '@/domain/policies/access-policy';
import { useDependencies } from '@/di/dependencies';
import { useAuth } from '@/usecase/auth/use-auth';
import { useCategories } from '@/usecase/categories/use-categories';
import { toMessage } from '@/lib/errors';
import { useChangeHistory } from '@/usecase/history/use-change-history';
import {
  buildMergePlan,
  type MergeHistoryItem,
  type MergePlan,
} from '@/usecase/merge/merge-plan';
import { useMerge, type MergeGateways } from '@/usecase/merge/use-merge';

import { useProducts } from './use-products';

export interface ProductDetailViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  busy: boolean;
  product: Product | null;
  quality: QualityResult | null;
  duplicatePairs: DuplicatePair[];
  /** Breadcrumb of the assigned category master node (root → self), if any. */
  categoryPath: string | null;
  allowedTransitions: ProductStatus[];
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  canMerge: boolean;
  canViewSensitive: boolean;
  history: ChangeEntry[];
  historyLoading: boolean;
  historyError: string | null;
  mergeHistory: MergeHistoryItem[];
  mergeHistoryLoading: boolean;
  mergeHistoryError: string | null;
  changeStatus: (status: ProductStatus) => Promise<void>;
  deleteProduct: () => Promise<boolean>;
  restore: (entry: ChangeEntry) => Promise<void>;
  planMerge: (loserId: string) => MergePlan | null;
  confirmMerge: (
    loserId: string,
    sources: Record<string, MergeFieldSource>
  ) => Promise<boolean>;
  unmerge: (recordId: string) => Promise<boolean>;
}

/** Orchestrates the 360° product detail screen and its lifecycle actions. */
export function useProductDetailPage(id: string): ProductDetailViewModel {
  const store = useProducts();
  const deps = useDependencies();
  const { actor } = useAuth();
  const { categories } = useCategories();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const product = useMemo(
    () => store.products.find((p) => p.id === id) ?? null,
    [store.products, id]
  );

  const quality = useMemo(
    () => (product ? evaluateProductQuality(product) : null),
    [product]
  );

  const duplicatePairs = useMemo(() => {
    if (!product) return [];
    return pairsForId(findProductDuplicates(store.products), product.id);
  }, [store.products, product]);

  const categoryPath = useMemo<string | null>(() => {
    if (!product?.categoryId) return null;
    const self = categories.find((c) => c.id === product.categoryId);
    if (!self) return null;
    const chain = [...ancestorsOf(categories, self.id)].reverse();
    return [...chain, self].map(categoryDisplayName).join(' / ');
  }, [product, categories]);

  const allowedTransitions = product
    ? allowedProductTransitions(product.status)
    : [];
  const canEdit =
    !!product &&
    canEditProduct(product) &&
    !!actor &&
    can(actor, 'edit', product);
  const canDelete =
    !!product &&
    canDeleteProduct(product) &&
    !!actor &&
    can(actor, 'delete', product);
  const canChangeStatus =
    !!product &&
    allowedTransitions.length > 0 &&
    !!actor &&
    can(actor, 'changeStatus', product);
  const canMerge = !!product && !!actor && can(actor, 'merge', product);
  const canViewSensitive = !!actor && policyCanViewSensitive(actor);

  const changeStatus = useCallback(
    async (status: ProductStatus) => {
      if (!product) return;
      setActionError(null);
      setBusy(true);
      try {
        await store.changeStatus(product.id, status);
      } catch (err) {
        setActionError(toMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [store, product]
  );

  const deleteProduct = useCallback(async () => {
    if (!product) return false;
    setActionError(null);
    setBusy(true);
    try {
      await store.deleteProduct(product.id);
      return true;
    } catch (err) {
      setActionError(toMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, [store, product]);

  const history = useChangeHistory('product', id, product?.updatedAt?.getTime());

  const restore = useCallback(
    async (entry: ChangeEntry) => {
      if (!product || entry.changes.length === 0) return;
      setActionError(null);
      setBusy(true);
      try {
        const reverted = revertChanges(productToInput(product), entry.changes);
        await store.updateProduct(product.id, reverted);
      } catch (err) {
        setActionError(toMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [store, product]
  );

  const mergeGateways = useMemo<MergeGateways>(
    () => ({
      applyGolden: (winnerId, golden) =>
        store.updateProduct(winnerId, golden as unknown as ProductInput),
      markMerged: (loserId, winnerId) =>
        deps.products.markMerged(loserId, winnerId),
      restoreMerged: (loserId, status) =>
        deps.products.restoreMerged(loserId, status as ProductStatus),
      reload: () => store.reload(),
      onBusy: setBusy,
      onError: setActionError,
    }),
    [store, deps.products]
  );

  const mergeCtl = useMerge('product', mergeGateways);

  const nameOf = useCallback(
    (productId: string) =>
      store.products.find((p) => p.id === productId)?.name ?? productId,
    [store.products]
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
      const loser = store.products.find((p) => p.id === loserId);
      if (!product || !loser) return null;
      return buildMergePlan(
        'product',
        {
          id: product.id,
          label: product.name,
          input: productToInput(product) as unknown as Record<string, unknown>,
          updatedAt: product.updatedAt,
        },
        {
          id: loser.id,
          label: loser.name,
          input: productToInput(loser) as unknown as Record<string, unknown>,
          updatedAt: loser.updatedAt,
        }
      );
    },
    [product, store.products]
  );

  const confirmMerge = useCallback(
    async (loserId: string, sources: Record<string, MergeFieldSource>) => {
      const loser = store.products.find((p) => p.id === loserId);
      if (!product || !loser) return false;
      return mergeCtl.merge(
        {
          id: product.id,
          status: product.status,
          input: productToInput(product) as unknown as Record<string, unknown>,
        },
        {
          id: loser.id,
          status: loser.status,
          input: productToInput(loser) as unknown as Record<string, unknown>,
        },
        sources
      );
    },
    [product, store.products, mergeCtl]
  );

  return {
    loading: store.loading,
    error: store.error,
    actionError,
    busy,
    product,
    quality,
    duplicatePairs,
    categoryPath,
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
    deleteProduct,
    restore,
    planMerge,
    confirmMerge,
    unmerge: mergeCtl.unmerge,
  };
}
