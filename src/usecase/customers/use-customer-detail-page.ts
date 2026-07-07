import { useCallback, useMemo, useState } from 'react';

import type { Customer } from '@/domain/models/customer';
import type { CustomerStatus } from '@/domain/models/master-status';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { QualityResult } from '@/domain/models/quality';
import {
  findCustomerDuplicates,
  pairsForId,
} from '@/domain/policies/duplicate-policy';
import { evaluateCustomerQuality } from '@/domain/policies/customer-quality-policy';
import {
  allowedCustomerTransitions,
  canDeleteCustomer,
  canEditCustomer,
} from '@/domain/policies/customer-status-policy';
import { toMessage } from '@/lib/errors';

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
  changeStatus: (status: CustomerStatus) => Promise<void>;
  deleteCustomer: () => Promise<boolean>;
}

/** Orchestrates the 360° customer detail screen and its lifecycle actions. */
export function useCustomerDetailPage(id: string): CustomerDetailViewModel {
  const store = useCustomers();
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
    changeStatus,
    deleteCustomer,
  };
}
