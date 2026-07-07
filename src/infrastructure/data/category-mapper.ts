import type { Category, CategoryInput } from '@/domain/models/category';

import type { ProductCategory as ProductCategoryEntity } from '../../../rayfin/data/ProductCategory';

/** Rayfin row shape for the ProductCategory entity. */
export type CategoryRow = ProductCategoryEntity;

/** Trim a string; return undefined when empty (so optional fields stay null). */
function blankToUndef(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Map a Rayfin row to the domain category model. */
export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    parentId: row.parentId ?? undefined,
    description: row.description ?? undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
  };
}

/** Editable entity fields derived from form input (audit added by the repo). */
export interface CategoryFields {
  code: string;
  name: string;
  parentId?: string;
  description?: string;
}

/** Normalize form input into the entity field subset (empty → undefined). */
export function categoryInputToFields(input: CategoryInput): CategoryFields {
  return {
    code: input.code.trim(),
    name: input.name.trim(),
    parentId: blankToUndef(input.parentId),
    description: blankToUndef(input.description),
  };
}
