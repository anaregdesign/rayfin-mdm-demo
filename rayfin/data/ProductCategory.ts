import { authenticated, date, entity, text, uuid } from '@microsoft/rayfin-core';

/**
 * Product category master (製品カテゴリマスタ) — a hierarchical classification
 * tree for products (Issue #7). Persistence shape owned by the Rayfin platform;
 * the app maps this to `domain/models/category` inside the infrastructure
 * repository. Keep business rules out of this file.
 *
 * Additive by design: the flat `Product.category` @set is preserved for
 * backward compatibility; this master powers an OPTIONAL, richer
 * `Product.categoryId` assignment resolved into a tree in memory.
 *
 * Master data is shared organization-wide, so access is granted to any
 * authenticated user (no per-user row policy).
 */
@entity()
@authenticated('*')
export class ProductCategory {
  @uuid() id!: string;

  /** Business key / category code — unique master identifier. */
  @text({ min: 1, max: 32, unique: true }) code!: string;

  @text({ min: 1, max: 120 }) name!: string;

  /**
   * Parent category id for parent→child hierarchies. Stored as text (not a
   * declared FK) since the app resolves the tree in memory; cycle prevention is
   * enforced in the shared domain hierarchy policy.
   */
  @text({ max: 60, optional: true }) parentId?: string;

  @text({ max: 500, optional: true }) description?: string;

  @date() createdAt!: Date;
  @date() updatedAt!: Date;
  @text({ max: 120, optional: true }) createdBy?: string;
  @text({ max: 120, optional: true }) updatedBy?: string;
}
