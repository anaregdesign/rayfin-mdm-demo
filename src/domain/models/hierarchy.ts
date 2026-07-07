/**
 * Generic hierarchy shapes shared by every parent/child master (customer
 * groups, product categories, …). Pure data — no SDK, React, or entity
 * dependency — so the hierarchy policy that operates on these types is trivially
 * unit-testable and reused across features (Issue #7).
 */

/** Anything that can participate in a 1:N parent/child tree. */
export interface HasHierarchy {
  id: string;
  /** Parent id, or undefined for a root node. */
  parentId?: string;
}

/** A depth-annotated node in a nested forest. */
export interface TreeNode<T extends HasHierarchy> {
  value: T;
  /** 0 for roots, +1 per level. */
  depth: number;
  children: TreeNode<T>[];
}

/** A node flattened out of a forest, keeping its depth for indented rendering. */
export interface FlatNode<T extends HasHierarchy> {
  value: T;
  depth: number;
}
