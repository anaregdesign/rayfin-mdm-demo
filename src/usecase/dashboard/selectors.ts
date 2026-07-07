import type { Customer } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { QualityBand } from '@/domain/models/quality';
import {
  CUSTOMER_STATUS_META,
  PRODUCT_STATUS_META,
  type CustomerStatus,
  type ProductStatus,
  type StatusTone,
} from '@/domain/models/master-status';
import {
  findCustomerDuplicates,
  findProductDuplicates,
} from '@/domain/policies/duplicate-policy';
import { evaluateCustomerQuality } from '@/domain/policies/customer-quality-policy';
import { evaluateProductQuality } from '@/domain/policies/product-quality-policy';

export interface StatusCount {
  status: string;
  label: string;
  tone: StatusTone;
  count: number;
}

export interface QualityDistribution {
  high: number;
  medium: number;
  low: number;
  /** Mean 0..100 quality score across the master (0 when empty). */
  average: number;
}

/** Aggregated KPIs for one master domain, shown on the dashboard. */
export interface MasterSummary {
  total: number;
  statusCounts: StatusCount[];
  duplicateCount: number;
  quality: QualityDistribution;
}

function distribution(scores: number[], bands: QualityBand[]): QualityDistribution {
  const high = bands.filter((b) => b === 'high').length;
  const medium = bands.filter((b) => b === 'medium').length;
  const low = bands.filter((b) => b === 'low').length;
  const average =
    scores.length === 0
      ? 0
      : Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  return { high, medium, low, average };
}

export function summarizeCustomers(customers: Customer[]): MasterSummary {
  const results = customers.map(evaluateCustomerQuality);
  const statuses = Object.keys(CUSTOMER_STATUS_META) as CustomerStatus[];
  const statusCounts = statuses.map<StatusCount>((status) => ({
    status,
    label: CUSTOMER_STATUS_META[status].label,
    tone: CUSTOMER_STATUS_META[status].tone,
    count: customers.filter((c) => c.status === status).length,
  }));

  return {
    total: customers.length,
    statusCounts,
    duplicateCount: findCustomerDuplicates(customers).length,
    quality: distribution(
      results.map((r) => r.score),
      results.map((r) => r.band)
    ),
  };
}

export function summarizeProducts(products: Product[]): MasterSummary {
  const results = products.map(evaluateProductQuality);
  const statuses = Object.keys(PRODUCT_STATUS_META) as ProductStatus[];
  const statusCounts = statuses.map<StatusCount>((status) => ({
    status,
    label: PRODUCT_STATUS_META[status].label,
    tone: PRODUCT_STATUS_META[status].tone,
    count: products.filter((p) => p.status === status).length,
  }));

  return {
    total: products.length,
    statusCounts,
    duplicateCount: findProductDuplicates(products).length,
    quality: distribution(
      results.map((r) => r.score),
      results.map((r) => r.band)
    ),
  };
}

/** Most recently updated records (descending), capped to `limit`. */
export function recentlyUpdated<T extends { updatedAt: Date }>(
  records: T[],
  limit = 5
): T[] {
  return [...records]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
}

/** Top duplicate pairs by score, capped to `limit`. */
export function topDuplicates(
  pairs: DuplicatePair[],
  limit = 5
): DuplicatePair[] {
  return [...pairs].sort((a, b) => b.score - a.score).slice(0, limit);
}
