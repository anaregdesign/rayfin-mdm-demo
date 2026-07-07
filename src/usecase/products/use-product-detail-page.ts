import { useCallback, useMemo, useState } from 'react';

import type { ChangeEntry } from '@/domain/models/change-log';
import type { ProductStatus } from '@/domain/models/master-status';
import { productToInput, type Product } from '@/domain/models/product';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { QualityResult } from '@/domain/models/quality';
import {
  findProductDuplicates,
  pairsForId,
} from '@/domain/policies/duplicate-policy';
import { evaluateProductQuality } from '@/domain/policies/product-quality-policy';
import { revertChanges } from '@/domain/policies/diff-policy';
import {
  allowedProductTransitions,
  canDeleteProduct,
  canEditProduct,
} from '@/domain/policies/product-status-policy';
import { toMessage } from '@/lib/errors';
import { useChangeHistory } from '@/usecase/history/use-change-history';

import { useProducts } from './use-products';

export interface ProductDetailViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  busy: boolean;
  product: Product | null;
  quality: QualityResult | null;
  duplicatePairs: DuplicatePair[];
  allowedTransitions: ProductStatus[];
  canEdit: boolean;
  canDelete: boolean;
  history: ChangeEntry[];
  historyLoading: boolean;
  historyError: string | null;
  changeStatus: (status: ProductStatus) => Promise<void>;
  deleteProduct: () => Promise<boolean>;
  restore: (entry: ChangeEntry) => Promise<void>;
}

/** Orchestrates the 360° product detail screen and its lifecycle actions. */
export function useProductDetailPage(id: string): ProductDetailViewModel {
  const store = useProducts();
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

  const allowedTransitions = product
    ? allowedProductTransitions(product.status)
    : [];
  const canEdit = product ? canEditProduct(product) : false;
  const canDelete = product ? canDeleteProduct(product) : false;

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

  return {
    loading: store.loading,
    error: store.error,
    actionError,
    busy,
    product,
    quality,
    duplicatePairs,
    allowedTransitions,
    canEdit,
    canDelete,
    history: history.entries,
    historyLoading: history.loading,
    historyError: history.error,
    changeStatus,
    deleteProduct,
    restore,
  };
}
