import { useCallback, useMemo, useState } from 'react';

import type { ProductInput } from '@/domain/models/product';
import type { ProductStatus } from '@/domain/models/master-status';
import {
  PRODUCT_CSV_HEADERS,
  productImportTemplate,
  productToCsvRow,
  evaluateProductImport,
} from '@/domain/policies/import-policy';
import { useCsvExport } from '@/usecase/export/use-export';
import { useImport, type ImportController } from '@/usecase/import/use-import';
import { can, canModifyAny } from '@/domain/policies/access-policy';
import { useAuth } from '@/usecase/auth/use-auth';
import { toMessage } from '@/lib/errors';

import { useProducts } from './use-products';
import type {
  ProductListFilters,
  ProductListView,
  ProductSortKey,
  ProductStatusFilter,
  ProductQualityFilter,
} from './selectors';
import {
  buildProductListView,
  DEFAULT_PRODUCT_FILTERS,
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
  /** Toggle the low-quality quick filter (Issue #13 drill-down). */
  setQuality: (quality: ProductQualityFilter) => void;
  changeStatus: (id: string, status: ProductStatus) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  importer: ImportController<ProductInput>;
  exportCsv: () => void;
  downloadTemplate: () => void;
  canCreate: boolean;
  canImport: boolean;
  canExport: boolean;
  canModify: boolean;
}

/** Orchestrates the product list screen: filters, derived view, row actions. */
export function useProductListPage(
  seed?: Partial<ProductListFilters>
): ProductListPageViewModel {
  const store = useProducts();
  const { actor } = useAuth();
  const [filters, setFilters] = useState<ProductListFilters>(() => ({
    ...DEFAULT_PRODUCT_FILTERS,
    ...seed,
  }));
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const view = useMemo(
    () => buildProductListView(store.products, filters),
    [store.products, filters]
  );

  const exporter = useCsvExport();

  const buildPreview = useCallback(
    (records: Record<string, string>[], mode: Parameters<typeof evaluateProductImport>[2]) =>
      evaluateProductImport(records, store.products, mode),
    [store.products]
  );

  const importer = useImport<ProductInput>({
    buildPreview,
    create: store.createProduct,
    update: store.updateProduct,
    reload: store.reload,
  });

  const exportCsv = useCallback(() => {
    const rows = view.items.map((item) => productToCsvRow(item.product));
    exporter.exportMatrix('products.csv', [PRODUCT_CSV_HEADERS, ...rows]);
  }, [exporter, view.items]);

  const downloadTemplate = useCallback(() => {
    exporter.exportMatrix('products-template.csv', productImportTemplate());
  }, [exporter]);

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
  const setQuality = useCallback(
    (quality: ProductQualityFilter) => setFilters((f) => ({ ...f, quality })),
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
    setQuality,
    changeStatus,
    deleteProduct,
    reload: store.reload,
    importer,
    exportCsv,
    downloadTemplate,
    canCreate: !!actor && can(actor, 'create'),
    canImport: !!actor && can(actor, 'import'),
    canExport: !!actor && can(actor, 'export'),
    canModify: !!actor && canModifyAny(actor),
  };
}
