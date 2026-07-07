import { useCallback, useMemo, useState } from 'react';

import type { CustomerInput } from '@/domain/models/customer';
import { customerDisplayName } from '@/domain/models/customer';
import type { CustomerStatus } from '@/domain/models/master-status';
import {
  CUSTOMER_CSV_HEADERS,
  customerImportTemplate,
  customerToCsvRow,
  evaluateCustomerImport,
} from '@/domain/policies/import-policy';
import { buildForest, flattenForest } from '@/domain/policies/hierarchy-policy';
import { useCsvExport } from '@/usecase/export/use-export';
import { useImport, type ImportController } from '@/usecase/import/use-import';
import { can, canModifyAny } from '@/domain/policies/access-policy';
import { useAuth } from '@/usecase/auth/use-auth';
import { toMessage } from '@/lib/errors';

import { useCustomers } from './use-customers';
import {
  buildCustomerListView,
  DEFAULT_CUSTOMER_FILTERS,
  type CustomerListFilters,
  type CustomerListView,
  type CustomerSortKey,
  type CustomerStatusFilter,
} from './selectors';

/** An indented option for the hierarchy rollup filter / parent pickers. */
export interface CustomerHierarchyOption {
  id: string;
  label: string;
  depth: number;
}

export interface CustomerListPageViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  busyId: string | null;
  filters: CustomerListFilters;
  view: CustomerListView;
  /** Indented customer tree for the hierarchy rollup filter (Issue #7). */
  hierarchyOptions: CustomerHierarchyOption[];
  setSearch: (search: string) => void;
  setStatusFilter: (status: CustomerStatusFilter) => void;
  setSort: (sort: CustomerSortKey) => void;
  /** Restrict the list to a customer + its descendants (empty = all). */
  setAncestor: (id: string) => void;
  changeStatus: (id: string, status: CustomerStatus) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  importer: ImportController<CustomerInput>;
  exportCsv: () => void;
  downloadTemplate: () => void;
  /** Role may create a new record. */
  canCreate: boolean;
  /** Role may bulk-import records. */
  canImport: boolean;
  /** Role may export (all authenticated roles). */
  canExport: boolean;
  /** Role may modify records (controls the row edit affordance). */
  canModify: boolean;
}

/** Orchestrates the customer list screen: filters, derived view, row actions. */
export function useCustomerListPage(): CustomerListPageViewModel {
  const store = useCustomers();
  const { actor } = useAuth();
  const [filters, setFilters] = useState<CustomerListFilters>(
    DEFAULT_CUSTOMER_FILTERS
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const view = useMemo(
    () => buildCustomerListView(store.customers, filters),
    [store.customers, filters]
  );

  const hierarchyOptions = useMemo<CustomerHierarchyOption[]>(
    () =>
      flattenForest(buildForest(store.customers)).map((node) => ({
        id: node.value.id,
        label: `${'　'.repeat(node.depth)}${customerDisplayName(node.value)}`,
        depth: node.depth,
      })),
    [store.customers]
  );

  const exporter = useCsvExport();

  const buildPreview = useCallback(
    (records: Record<string, string>[], mode: Parameters<typeof evaluateCustomerImport>[2]) =>
      evaluateCustomerImport(records, store.customers, mode),
    [store.customers]
  );

  const importer = useImport<CustomerInput>({
    buildPreview,
    create: store.createCustomer,
    update: store.updateCustomer,
    reload: store.reload,
  });

  const exportCsv = useCallback(() => {
    const rows = view.items.map((item) => customerToCsvRow(item.customer));
    exporter.exportMatrix('customers.csv', [CUSTOMER_CSV_HEADERS, ...rows]);
  }, [exporter, view.items]);

  const downloadTemplate = useCallback(() => {
    exporter.exportMatrix('customers-template.csv', customerImportTemplate());
  }, [exporter]);

  const setSearch = useCallback(
    (search: string) => setFilters((f) => ({ ...f, search })),
    []
  );
  const setStatusFilter = useCallback(
    (status: CustomerStatusFilter) => setFilters((f) => ({ ...f, status })),
    []
  );
  const setSort = useCallback(
    (sort: CustomerSortKey) => setFilters((f) => ({ ...f, sort })),
    []
  );
  const setAncestor = useCallback(
    (ancestorId: string) => setFilters((f) => ({ ...f, ancestorId })),
    []
  );

  const changeStatus = useCallback(
    async (id: string, status: CustomerStatus) => {
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

  const deleteCustomer = useCallback(
    async (id: string) => {
      setActionError(null);
      setBusyId(id);
      try {
        await store.deleteCustomer(id);
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
    hierarchyOptions,
    setSearch,
    setStatusFilter,
    setSort,
    setAncestor,
    changeStatus,
    deleteCustomer,
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
