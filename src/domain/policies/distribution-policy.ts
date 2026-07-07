import type { Customer } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import type {
  DistributionEntityType,
  OutboxEvent,
  OutboxEventType,
  DeliveryStatus,
} from '@/domain/models/distribution';

import {
  CUSTOMER_CSV_HEADERS,
  PRODUCT_CSV_HEADERS,
  customerToCsvRow,
  productToCsvRow,
} from './import-policy';

/**
 * Pure distribution / integration policy (#12) — the single source of truth for
 * *which* records are distributable, *what* an event payload looks like, *how*
 * an export matrix is built, and *how* a payload is signed. No IO, no SDK, no
 * DOM: the usecase layer performs the Blob/HTTP side effects, this module only
 * computes values so it stays trivially testable.
 */

/**
 * Only `active` master records are distributed downstream — drafts, inactive,
 * archived and merged records are withheld. Status is a plain string here so
 * the rule works for both customer and product unions.
 */
export function isDistributable(status: string): boolean {
  return status === 'active';
}

/** The active (distributable) subset of a record list. */
export function selectDistributable<T extends { status: string }>(
  records: readonly T[]
): T[] {
  return records.filter((r) => isDistributable(r.status));
}

/** Compact event snapshot for a customer (what downstream consumers receive). */
export function customerEventPayload(customer: Customer): Record<string, unknown> {
  return {
    id: customer.id,
    code: customer.code,
    name: customer.name,
    customerType: customer.customerType,
    email: customer.email,
    status: customer.status,
    updatedAt: customer.updatedAt.toISOString(),
  };
}

/** Compact event snapshot for a product. */
export function productEventPayload(product: Product): Record<string, unknown> {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unitPrice: product.unitPrice,
    currency: product.currency,
    status: product.status,
    updatedAt: product.updatedAt.toISOString(),
  };
}

/** Filter criteria for the event feed. All fields optional (AND-combined). */
export interface EventFilter {
  entityType?: DistributionEntityType;
  eventType?: OutboxEventType;
  status?: DeliveryStatus;
  /** Only events at or after this instant. */
  since?: Date;
}

/** Apply the (AND-combined) filter to a list of events. Pure, non-mutating. */
export function filterEvents(
  events: readonly OutboxEvent[],
  filter: EventFilter = {}
): OutboxEvent[] {
  const sinceMs = filter.since ? filter.since.getTime() : undefined;
  return events.filter((e) => {
    if (filter.entityType && e.entityType !== filter.entityType) return false;
    if (filter.eventType && e.eventType !== filter.eventType) return false;
    if (filter.status && e.status !== filter.status) return false;
    if (sinceMs !== undefined && e.occurredAt.getTime() < sinceMs) return false;
    return true;
  });
}

/** CSV matrix (header + active rows) for the customer master export. */
export function customerExportMatrix(customers: readonly Customer[]): string[][] {
  return [CUSTOMER_CSV_HEADERS, ...selectDistributable(customers).map(customerToCsvRow)];
}

/** CSV matrix (header + active rows) for the product master export. */
export function productExportMatrix(products: readonly Product[]): string[][] {
  return [PRODUCT_CSV_HEADERS, ...selectDistributable(products).map(productToCsvRow)];
}

/** Envelope shape for a JSON integration export. */
export interface JsonExport {
  entityType: DistributionEntityType;
  exportedAt: string;
  count: number;
  records: Record<string, unknown>[];
}

/** Build the active-only JSON export envelope for a master. `now` is injected. */
export function buildCustomerJsonExport(
  customers: readonly Customer[],
  now: Date
): JsonExport {
  const records = selectDistributable(customers).map(customerEventPayload);
  return {
    entityType: 'customer',
    exportedAt: now.toISOString(),
    count: records.length,
    records,
  };
}

/** Build the active-only JSON export envelope for the product master. */
export function buildProductJsonExport(
  products: readonly Product[],
  now: Date
): JsonExport {
  const records = selectDistributable(products).map(productEventPayload);
  return {
    entityType: 'product',
    exportedAt: now.toISOString(),
    count: records.length,
    records,
  };
}

/**
 * Deterministic **demo** signature for a webhook payload. This is a
 * non-cryptographic digest (djb2) over `secret + '.' + payloadJson` used only
 * to illustrate the HMAC-style header a real integration would send; the
 * production path (Web Crypto `HMAC-SHA256`) is documented in AGENTS.md and is
 * intentionally NOT wired into the live PoC.
 */
export function signPayload(secret: string, payloadJson: string): string {
  const input = `${secret}.${payloadJson}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    // hash * 33 + charCode, folded to an unsigned 32-bit integer.
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return `v1=${hash.toString(16).padStart(8, '0')}`;
}
