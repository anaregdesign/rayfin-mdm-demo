import { useCallback, useMemo, useState } from 'react';

import type { CustomerStatus } from '@/domain/models/master-status';
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

export interface CustomerListPageViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  busyId: string | null;
  filters: CustomerListFilters;
  view: CustomerListView;
  setSearch: (search: string) => void;
  setStatusFilter: (status: CustomerStatusFilter) => void;
  setSort: (sort: CustomerSortKey) => void;
  changeStatus: (id: string, status: CustomerStatus) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

/** Orchestrates the customer list screen: filters, derived view, row actions. */
export function useCustomerListPage(): CustomerListPageViewModel {
  const store = useCustomers();
  const [filters, setFilters] = useState<CustomerListFilters>(
    DEFAULT_CUSTOMER_FILTERS
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const view = useMemo(
    () => buildCustomerListView(store.customers, filters),
    [store.customers, filters]
  );

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
    setSearch,
    setStatusFilter,
    setSort,
    changeStatus,
    deleteCustomer,
    reload: store.reload,
  };
}
