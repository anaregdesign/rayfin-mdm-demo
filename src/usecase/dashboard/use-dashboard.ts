import { useMemo } from 'react';

import type { Customer } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { StewardWorkload } from '@/domain/models/steward-task';
import { findCustomerDuplicates } from '@/domain/policies/duplicate-policy';
import { findProductDuplicates } from '@/domain/policies/duplicate-policy';
import { deriveRemediationTargets } from '@/domain/policies/cleansing-policy';
import {
  deriveStewardTasks,
  stewardWorkloads,
} from '@/domain/policies/steward-task-policy';

import { useCustomers } from '@/usecase/customers/use-customers';
import { useProducts } from '@/usecase/products/use-products';

import {
  recentlyUpdated,
  summarizeCustomers,
  summarizeProducts,
  topDuplicates,
  type MasterSummary,
} from './selectors';

export interface DashboardViewModel {
  loading: boolean;
  error: string | null;
  customerSummary: MasterSummary;
  productSummary: MasterSummary;
  recentCustomers: Customer[];
  recentProducts: Product[];
  customerDuplicates: DuplicatePair[];
  productDuplicates: DuplicatePair[];
  /** Per-steward open-task load across both masters (Issue #10). */
  stewardWorkloads: StewardWorkload[];
  /** Records needing standardization/cleansing or below quality bar (Issue #11). */
  remediationCount: number;
  /** Subset of `remediationCount` that has at least one cleansing suggestion. */
  cleansingSuggestionCount: number;
}

/** Aggregates both masters into the analytics view shown on the dashboard. */
export function useDashboard(): DashboardViewModel {
  const customers = useCustomers();
  const products = useProducts();

  const customerSummary = useMemo(
    () => summarizeCustomers(customers.customers),
    [customers.customers]
  );
  const productSummary = useMemo(
    () => summarizeProducts(products.products),
    [products.products]
  );

  const recentCustomers = useMemo(
    () => recentlyUpdated(customers.customers),
    [customers.customers]
  );
  const recentProducts = useMemo(
    () => recentlyUpdated(products.products),
    [products.products]
  );

  const customerDuplicates = useMemo(
    () => topDuplicates(findCustomerDuplicates(customers.customers)),
    [customers.customers]
  );
  const productDuplicates = useMemo(
    () => topDuplicates(findProductDuplicates(products.products)),
    [products.products]
  );

  const stewardLoads = useMemo(
    () =>
      stewardWorkloads(
        deriveStewardTasks(customers.customers, products.products)
      ),
    [customers.customers, products.products]
  );

  const remediationTargets = useMemo(
    () => deriveRemediationTargets(customers.customers, products.products),
    [customers.customers, products.products]
  );

  return {
    loading: customers.loading || products.loading,
    error: customers.error ?? products.error,
    customerSummary,
    productSummary,
    recentCustomers,
    recentProducts,
    customerDuplicates,
    productDuplicates,
    stewardWorkloads: stewardLoads,
    remediationCount: remediationTargets.length,
    cleansingSuggestionCount: remediationTargets.filter(
      (t) => t.suggestions.length > 0
    ).length,
  };
}
