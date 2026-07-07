/**
 * Lifecycle status types and their presentation metadata for the master
 * records. Statuses are a governance concept, so their labels and the tone
 * used to render them live in the domain (a single source of truth the view
 * reads instead of re-deriving from literals).
 */

export type CustomerStatus = 'draft' | 'active' | 'inactive' | 'archived';
export type ProductStatus = 'draft' | 'active' | 'discontinued' | 'archived';

/** Semantic tone shared by status badges and other status-driven UI. */
export type StatusTone = 'neutral' | 'positive' | 'warning' | 'danger' | 'muted';

export interface StatusMeta<S extends string> {
  value: S;
  label: string;
  tone: StatusTone;
}

export const CUSTOMER_STATUS_META: Record<
  CustomerStatus,
  StatusMeta<CustomerStatus>
> = {
  draft: { value: 'draft', label: '下書き', tone: 'neutral' },
  active: { value: 'active', label: '有効', tone: 'positive' },
  inactive: { value: 'inactive', label: '無効', tone: 'warning' },
  archived: { value: 'archived', label: 'アーカイブ', tone: 'muted' },
};

export const PRODUCT_STATUS_META: Record<
  ProductStatus,
  StatusMeta<ProductStatus>
> = {
  draft: { value: 'draft', label: '下書き', tone: 'neutral' },
  active: { value: 'active', label: '有効', tone: 'positive' },
  discontinued: { value: 'discontinued', label: '販売終了', tone: 'danger' },
  archived: { value: 'archived', label: 'アーカイブ', tone: 'muted' },
};

export const CUSTOMER_STATUS_VALUES: CustomerStatus[] = [
  'draft',
  'active',
  'inactive',
  'archived',
];

export const PRODUCT_STATUS_VALUES: ProductStatus[] = [
  'draft',
  'active',
  'discontinued',
  'archived',
];

export function customerStatusLabel(status: CustomerStatus): string {
  return CUSTOMER_STATUS_META[status].label;
}

export function productStatusLabel(status: ProductStatus): string {
  return PRODUCT_STATUS_META[status].label;
}
