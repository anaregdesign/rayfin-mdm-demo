import type { Customer } from '@/domain/models/customer';
import type { CustomerStatus } from '@/domain/models/master-status';
import type { DuplicatePair } from '@/domain/models/duplicate';
import {
  duplicateIdSet,
  findCustomerDuplicates,
} from '@/domain/policies/duplicate-policy';
import { evaluateCustomerQuality } from '@/domain/policies/customer-quality-policy';
import { subtreeIds } from '@/domain/policies/hierarchy-policy';
import type { QualityResult } from '@/domain/models/quality';
import { includesNormalized } from '@/lib/text';

export type CustomerSortKey = 'updated' | 'name' | 'code' | 'quality';
export type CustomerStatusFilter = CustomerStatus | 'all';
/** Quality quick filter (Issue #13 drill-down target). */
export type CustomerQualityFilter = 'all' | 'low';

export interface CustomerListFilters {
  search: string;
  status: CustomerStatusFilter;
  sort: CustomerSortKey;
  /**
   * Hierarchy rollup: when set, the list is restricted to this customer and
   * everything beneath it in the org tree (Issue #7). Empty = no restriction.
   */
  ancestorId: string;
  /**
   * Quality quick filter (Issue #13): `'low'` restricts the list to
   * low-quality (band = low) records — the target of a dashboard drill-down.
   */
  quality: CustomerQualityFilter;
}

export const DEFAULT_CUSTOMER_FILTERS: CustomerListFilters = {
  search: '',
  status: 'all',
  sort: 'updated',
  ancestorId: '',
  quality: 'all',
};

/** Row view-model: the record plus its derived quality and duplicate flag. */
export interface CustomerListItem {
  customer: Customer;
  quality: QualityResult;
  isDuplicate: boolean;
}

export interface CustomerListView {
  items: CustomerListItem[];
  total: number;
  filteredCount: number;
  duplicatePairs: DuplicatePair[];
  duplicateCount: number;
}

function matchesSearch(c: Customer, search: string): boolean {
  const q = search.trim();
  if (!q) return true;
  return (
    includesNormalized(c.name, q) ||
    includesNormalized(c.code, q) ||
    includesNormalized(c.nameKana, q) ||
    includesNormalized(c.email, q) ||
    includesNormalized(c.industry, q)
  );
}

function compareBySort(
  a: CustomerListItem,
  b: CustomerListItem,
  sort: CustomerSortKey
): number {
  switch (sort) {
    case 'name':
      return a.customer.name.localeCompare(b.customer.name, 'ja');
    case 'code':
      return a.customer.code.localeCompare(b.customer.code, 'ja');
    case 'quality':
      return a.quality.score - b.quality.score;
    case 'updated':
    default:
      return b.customer.updatedAt.getTime() - a.customer.updatedAt.getTime();
  }
}

/**
 * Build the customer list view: duplicate detection over the full set, then
 * search/status filtering, quality scoring, and sorting. Pure — no ports.
 */
export function buildCustomerListView(
  customers: Customer[],
  filters: CustomerListFilters
): CustomerListView {
  const duplicatePairs = findCustomerDuplicates(customers);
  const dupIds = duplicateIdSet(duplicatePairs);

  // Hierarchy rollup: restrict to the chosen ancestor + all descendants.
  const inScope =
    filters.ancestorId.length > 0
      ? subtreeIds(customers, filters.ancestorId)
      : null;

  const items = customers
    .filter(
      (c) =>
        (inScope === null || inScope.has(c.id)) &&
        matchesSearch(c, filters.search) &&
        (filters.status === 'all' || c.status === filters.status)
    )
    .map<CustomerListItem>((customer) => ({
      customer,
      quality: evaluateCustomerQuality(customer),
      isDuplicate: dupIds.has(customer.id),
    }))
    .filter((item) => filters.quality === 'all' || item.quality.band === 'low')
    .sort((a, b) => compareBySort(a, b, filters.sort));

  return {
    items,
    total: customers.length,
    filteredCount: items.length,
    duplicatePairs,
    duplicateCount: dupIds.size,
  };
}
