import type { ProductStatus } from '@/domain/models/master-status';
import type { Product } from '@/domain/models/product';

/**
 * Product lifecycle state machine (governance workflow). The allowed
 * transitions and the action predicates the UI asks about live here so the
 * view never re-derives them from status literals.
 */
const PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['active', 'archived'],
  active: ['discontinued', 'archived'],
  discontinued: ['active', 'archived'],
  archived: ['draft'],
  // 'merged' is a terminal, system-set state. It has no manual transitions;
  // only the merge use case (unmerge) restores a record out of it.
  merged: [],
};

export function allowedProductTransitions(
  from: ProductStatus
): ProductStatus[] {
  return PRODUCT_TRANSITIONS[from];
}

export function canTransitionProduct(
  from: ProductStatus,
  to: ProductStatus
): boolean {
  return PRODUCT_TRANSITIONS[from].includes(to);
}

export function canEditProduct(p: Pick<Product, 'status'>): boolean {
  return p.status !== 'archived' && p.status !== 'merged';
}

export function canDeleteProduct(p: Pick<Product, 'status'>): boolean {
  return p.status === 'draft' || p.status === 'archived';
}
