import { useMemo } from 'react';

import type { Customer } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import type { DuplicatePair } from '@/domain/models/duplicate';
import { findCustomerDuplicates } from '@/domain/policies/duplicate-policy';
import { findProductDuplicates } from '@/domain/policies/duplicate-policy';

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

  return {
    loading: customers.loading || products.loading,
    error: customers.error ?? products.error,
    customerSummary,
    productSummary,
    recentCustomers,
    recentProducts,
    customerDuplicates,
    productDuplicates,
  };
}
