import type { HasHierarchy } from './hierarchy';

/**
 * Product category master domain model — the business/view shape of a category
 * node, mapped from the Rayfin `ProductCategory` entity by the infrastructure
 * repository. Satisfies `HasHierarchy`, so the shared, cycle-safe
 * `hierarchy-policy` builds/queries the tree without any category-specific code.
 */
export interface Category extends HasHierarchy {
  id: string;
  code: string;
  name: string;
  /** Parent category id (undefined = top-level / root). */
  parentId?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/** Editable fields captured by the create/edit form (audit set by the repo). */
export interface CategoryInput {
  code: string;
  name: string;
  parentId?: string;
  description?: string;
}

/** Map an existing category to the editable form input shape. */
export function categoryToInput(c: Category): CategoryInput {
  return {
    code: c.code,
    name: c.name,
    parentId: c.parentId,
    description: c.description,
  };
}

/** A blank category form input. */
export function emptyCategoryInput(): CategoryInput {
  return {
    code: '',
    name: '',
  };
}

/** Concise display name for tree lists, pickers, and breadcrumbs. */
export function categoryDisplayName(c: Pick<Category, 'name' | 'code'>): string {
  return `${c.name}（${c.code}）`;
}
