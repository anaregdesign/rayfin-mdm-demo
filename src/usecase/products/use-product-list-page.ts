import { useCallback, useMemo, useState } from 'react';

import type { ProductStatus } from '@/domain/models/master-status';
import { toMessage } from '@/lib/errors';

import { useProducts } from './use-products';
import {
  buildProductListView,
  DEFAULT_PRODUCT_FILTERS,
  type ProductListFilters,
  type ProductListView,
  type ProductSortKey,
  type ProductStatusFilter,
} from './selectors';

export interface ProductListPageViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  busyId: string | null;
  filters: ProductListFilters;
  view: ProductListView;
  setSearch: (search: string) => void;
  setStatusFilter: (status: ProductStatusFilter) => void;
  setSort: (sort: ProductSortKey) => void;
  changeStatus: (id: string, status: ProductStatus) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

/** Orchestrates the product list screen: filters, derived view, row actions. */
export function useProductListPage(): ProductListPageViewModel {
  const store = useProducts();
  const [filters, setFilters] = useState<ProductListFilters>(
    DEFAULT_PRODUCT_FILTERS
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const view = useMemo(
    () => buildProductListView(store.products, filters),
    [store.products, filters]
  );

  const setSearch = useCallback(
    (search: string) => setFilters((f) => ({ ...f, search })),
    []
  );
  const setStatusFilter = useCallback(
    (status: ProductStatusFilter) => setFilters((f) => ({ ...f, status })),
    []
  );
  const setSort = useCallback(
    (sort: ProductSortKey) => setFilters((f) => ({ ...f, sort })),
    []
  );

  const changeStatus = useCallback(
    async (id: string, status: ProductStatus) => {
      setActionError(null);
      setBusyId(id);
      try {
        await store.changeStatus(id, status);
      } catch (err) {
        setActionError(toMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    [store]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      setActionError(null);
      setBusyId(id);
      try {
        await store.deleteProduct(id);
      } catch (err) {
        setActionError(toMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    [store]
  );

  return {
    loading: store.loading,
    error: store.error,
    actionError,
    busyId,
    filters,
    view,
    setSearch,
    setStatusFilter,
    setSort,
    changeStatus,
    deleteProduct,
    reload: store.reload,
  };
}
