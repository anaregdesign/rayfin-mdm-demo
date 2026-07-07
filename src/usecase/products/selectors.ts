import type { ProductStatus } from '@/domain/models/master-status';
import type { Product } from '@/domain/models/product';
import type { DuplicatePair } from '@/domain/models/duplicate';
import {
  duplicateIdSet,
  findProductDuplicates,
} from '@/domain/policies/duplicate-policy';
import { evaluateProductQuality } from '@/domain/policies/product-quality-policy';
import type { QualityResult } from '@/domain/models/quality';
import { includesNormalized } from '@/lib/text';

export type ProductSortKey = 'updated' | 'name' | 'sku' | 'price' | 'quality';
export type ProductStatusFilter = ProductStatus | 'all';

export interface ProductListFilters {
  search: string;
  status: ProductStatusFilter;
  sort: ProductSortKey;
}

export const DEFAULT_PRODUCT_FILTERS: ProductListFilters = {
  search: '',
  status: 'all',
  sort: 'updated',
};

/** Row view-model: the record plus its derived quality and duplicate flag. */
export interface ProductListItem {
  product: Product;
  quality: QualityResult;
  isDuplicate: boolean;
}

export interface ProductListView {
  items: ProductListItem[];
  total: number;
  filteredCount: number;
  duplicatePairs: DuplicatePair[];
  duplicateCount: number;
}

function matchesSearch(p: Product, search: string): boolean {
  const q = search.trim();
  if (!q) return true;
  return (
    includesNormalized(p.name, q) ||
    includesNormalized(p.sku, q) ||
    includesNormalized(p.nameKana, q) ||
    includesNormalized(p.brand, q) ||
    includesNormalized(p.supplierName, q) ||
    includesNormalized(p.barcode, q)
  );
}

function compareBySort(
  a: ProductListItem,
  b: ProductListItem,
  sort: ProductSortKey
): number {
  switch (sort) {
    case 'name':
      return a.product.name.localeCompare(b.product.name, 'ja');
    case 'sku':
      return a.product.sku.localeCompare(b.product.sku, 'ja');
    case 'price':
      return b.product.unitPrice - a.product.unitPrice;
    case 'quality':
      return a.quality.score - b.quality.score;
    case 'updated':
    default:
      return b.product.updatedAt.getTime() - a.product.updatedAt.getTime();
  }
}

/**
 * Build the product list view: duplicate detection over the full set, then
 * search/status filtering, quality scoring, and sorting. Pure — no ports.
 */
export function buildProductListView(
  products: Product[],
  filters: ProductListFilters
): ProductListView {
  const duplicatePairs = findProductDuplicates(products);
  const dupIds = duplicateIdSet(duplicatePairs);

  const items = products
    .filter(
      (p) =>
        matchesSearch(p, filters.search) &&
        (filters.status === 'all' || p.status === filters.status)
    )
    .map<ProductListItem>((product) => ({
      product,
      quality: evaluateProductQuality(product),
      isDuplicate: dupIds.has(product.id),
    }))
    .sort((a, b) => compareBySort(a, b, filters.sort));

  return {
    items,
    total: products.length,
    filteredCount: items.length,
    duplicatePairs,
    duplicateCount: dupIds.size,
  };
}
