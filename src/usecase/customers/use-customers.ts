import { useCallback, useEffect, useState } from 'react';

import type { CustomerStatus } from '@/domain/models/master-status';
import type { Customer, CustomerInput } from '@/domain/models/customer';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';

/** Shared customer data source: loads the master list and exposes commands. */
export interface CustomersStore {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createCustomer: (input: CustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, input: CustomerInput) => Promise<Customer>;
  changeStatus: (id: string, status: CustomerStatus) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
}

/**
 * Loads all customers once and exposes CRUD/status commands. Mutations reload
 * the full list so client-side duplicate detection and analytics stay accurate.
 * The list/detail/form page hooks compose this store with pure selectors.
 */
export function useCustomers(): CustomersStore {
  const { customers: repo } = useDependencies();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await repo.list());
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createCustomer = useCallback(
    async (input: CustomerInput) => {
      const created = await repo.create(input);
      await reload();
      return created;
    },
    [repo, reload]
  );

  const updateCustomer = useCallback(
    async (id: string, input: CustomerInput) => {
      const updated = await repo.update(id, input);
      await reload();
      return updated;
    },
    [repo, reload]
  );

  const changeStatus = useCallback(
    async (id: string, status: CustomerStatus) => {
      const updated = await repo.setStatus(id, status);
      await reload();
      return updated;
    },
    [repo, reload]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      await repo.remove(id);
      await reload();
    },
    [repo, reload]
  );

  return {
    customers,
    loading,
    error,
    reload,
    createCustomer,
    updateCustomer,
    changeStatus,
    deleteCustomer,
  };
}
