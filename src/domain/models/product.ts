import type { Currency } from '@/domain/value-objects/money';

import type { ProductStatus } from './master-status';

/**
 * Product master domain model — the business/view shape of a product, mapped
 * from the Rayfin `Product` entity by the infrastructure repository.
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  nameKana?: string;
  category: ProductCategory;
  brand?: string;
  description?: string;
  unitPrice: number;
  currency: Currency;
  unitOfMeasure: UnitOfMeasure;
  barcode?: string;
  supplierName?: string;
  status: ProductStatus;
  steward?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export type ProductCategory =
  | 'electronics'
  | 'apparel'
  | 'food'
  | 'beverage'
  | 'furniture'
  | 'stationery'
  | 'service'
  | 'other';

export type UnitOfMeasure =
  | 'piece'
  | 'box'
  | 'case'
  | 'kg'
  | 'liter'
  | 'set'
  | 'hour';

export const PRODUCT_CATEGORY_VALUES: ProductCategory[] = [
  'electronics',
  'apparel',
  'food',
  'beverage',
  'furniture',
  'stationery',
  'service',
  'other',
];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  electronics: '電子機器',
  apparel: 'アパレル',
  food: '食品',
  beverage: '飲料',
  furniture: '家具',
  stationery: '文具',
  service: 'サービス',
  other: 'その他',
};

export const UNIT_OF_MEASURE_VALUES: UnitOfMeasure[] = [
  'piece',
  'box',
  'case',
  'kg',
  'liter',
  'set',
  'hour',
];

export const UNIT_OF_MEASURE_LABELS: Record<UnitOfMeasure, string> = {
  piece: '個',
  box: '箱',
  case: 'ケース',
  kg: 'kg',
  liter: 'L',
  set: 'セット',
  hour: '時間',
};

export function productCategoryLabel(category: ProductCategory): string {
  return PRODUCT_CATEGORY_LABELS[category];
}

export function unitOfMeasureLabel(uom: UnitOfMeasure): string {
  return UNIT_OF_MEASURE_LABELS[uom];
}

/** Editable fields captured by the create/edit form (audit set by the repo). */
export interface ProductInput {
  sku: string;
  name: string;
  nameKana?: string;
  category: ProductCategory;
  brand?: string;
  description?: string;
  unitPrice: number;
  currency: Currency;
  unitOfMeasure: UnitOfMeasure;
  barcode?: string;
  supplierName?: string;
  status: ProductStatus;
  steward?: string;
  notes?: string;
}

/** Map an existing product to the editable form input shape. */
export function productToInput(p: Product): ProductInput {
  return {
    sku: p.sku,
    name: p.name,
    nameKana: p.nameKana,
    category: p.category,
    brand: p.brand,
    description: p.description,
    unitPrice: p.unitPrice,
    currency: p.currency,
    unitOfMeasure: p.unitOfMeasure,
    barcode: p.barcode,
    supplierName: p.supplierName,
    status: p.status,
    steward: p.steward,
    notes: p.notes,
  };
}

/** A blank product form input with sensible defaults. */
export function emptyProductInput(): ProductInput {
  return {
    sku: '',
    name: '',
    category: 'other',
    unitPrice: 0,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    status: 'draft',
  };
}

/** Concise display name for tables, duplicate panels, and audit trails. */
export function productDisplayName(p: Pick<Product, 'name' | 'sku'>): string {
  return `${p.name}（${p.sku}）`;
}
