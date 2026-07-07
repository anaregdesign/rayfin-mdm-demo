import type { Product, ProductInput } from '@/domain/models/product';

import type { Product as ProductEntity } from '../../../rayfin/data/Product';

/** Rayfin row shape for the Product entity. */
export type ProductRow = ProductEntity;

/** Trim a string; return undefined when empty (so optional fields stay null). */
function blankToUndef(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Map a Rayfin row to the domain model, converting transport shapes. */
export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    nameKana: row.nameKana ?? undefined,
    category: row.category,
    brand: row.brand ?? undefined,
    description: row.description ?? undefined,
    categoryId: row.categoryId ?? undefined,
    unitPrice: row.unitPrice,
    currency: row.currency,
    unitOfMeasure: row.unitOfMeasure,
    barcode: row.barcode ?? undefined,
    supplierName: row.supplierName ?? undefined,
    status: row.status,
    steward: row.steward ?? undefined,
    notes: row.notes ?? undefined,
    mergedInto: row.mergedInto ?? undefined,
    mergedAt: row.mergedAt ? new Date(row.mergedAt) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
  };
}

/** Editable entity fields derived from form input (audit added by the repo). */
export interface ProductFields {
  sku: string;
  name: string;
  nameKana?: string;
  category: ProductInput['category'];
  brand?: string;
  description?: string;
  categoryId?: string;
  unitPrice: number;
  currency: ProductInput['currency'];
  unitOfMeasure: ProductInput['unitOfMeasure'];
  barcode?: string;
  supplierName?: string;
  status: ProductInput['status'];
  steward?: string;
  notes?: string;
}

/** Normalize form input into the entity field subset (empty → undefined). */
export function productInputToFields(input: ProductInput): ProductFields {
  return {
    sku: input.sku.trim(),
    name: input.name.trim(),
    nameKana: blankToUndef(input.nameKana),
    category: input.category,
    brand: blankToUndef(input.brand),
    description: blankToUndef(input.description),
    categoryId: blankToUndef(input.categoryId),
    unitPrice: input.unitPrice,
    currency: input.currency,
    unitOfMeasure: input.unitOfMeasure,
    barcode: blankToUndef(input.barcode),
    supplierName: blankToUndef(input.supplierName),
    status: input.status,
    steward: blankToUndef(input.steward),
    notes: blankToUndef(input.notes),
  };
}
