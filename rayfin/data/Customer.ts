import {
  authenticated,
  date,
  decimal,
  email,
  entity,
  set,
  text,
  uuid,
} from '@microsoft/rayfin-core';

/**
 * Customer master (顧客マスタ).
 *
 * Persistence shape owned by the Rayfin platform. This is NOT the domain
 * model — the app maps this to `domain/models/customer` inside the
 * infrastructure repository. Keep business rules out of this file.
 *
 * Master data is shared organization-wide, so access is granted to any
 * authenticated user (no per-user row policy). Field-level access hardening
 * (@role/RLS) is a platform concern deferred to the `rayfin` skill.
 */
@entity()
@authenticated('*')
export class Customer {
  @uuid() id!: string;

  /** Business key / customer code — unique master identifier. */
  @text({ min: 1, max: 32, unique: true }) code!: string;

  @text({ min: 1, max: 200 }) name!: string;
  @text({ max: 200, optional: true }) nameKana?: string;

  @set('corporate', 'individual')
  customerType!: 'corporate' | 'individual';

  @text({ max: 120, optional: true }) industry?: string;
  @email({ optional: true }) email?: string;
  @text({ max: 32, optional: true }) phone?: string;

  @text({ max: 16, optional: true }) postalCode?: string;
  @text({ max: 60, optional: true }) prefecture?: string;
  @text({ max: 120, optional: true }) city?: string;
  @text({ max: 200, optional: true }) addressLine?: string;
  @text({ max: 60 }) country!: string;

  @text({ max: 200, optional: true }) website?: string;
  @text({ max: 40, optional: true }) taxId?: string;

  /**
   * Parent customer id for org-group / head-office ↔ branch hierarchies
   * (Issue #7). Stored as text (not a declared FK) since the app resolves the
   * tree in memory; cycle prevention is enforced in the domain policy.
   */
  @text({ max: 60, optional: true }) parentId?: string;

  /** Nature of the link to the parent (本社/子会社/拠点/グループ). */
  @text({ max: 20, optional: true }) relationType?: string;

  /** Estimated annual revenue (for segmentation / demo analytics). */
  @decimal({ optional: true }) annualRevenue?: number;

  /** Lifecycle status for governance workflow. */
  @set('draft', 'active', 'inactive', 'archived', 'merged')
  status!: 'draft' | 'active' | 'inactive' | 'archived' | 'merged';

  /** Data steward responsible for this record. */
  @text({ max: 120, optional: true }) steward?: string;

  @text({ max: 1000, optional: true }) notes?: string;

  /**
   * Survivorship cross-reference. When `status` is 'merged', points at the
   * surviving (winner) customer id. Stored as text (not a declared FK) since
   * the app resolves it in memory. Set/cleared by the merge use case.
   */
  @text({ max: 60, optional: true }) mergedInto?: string;
  @date({ optional: true }) mergedAt?: Date;

  @date() createdAt!: Date;
  @date() updatedAt!: Date;
  @text({ max: 120, optional: true }) createdBy?: string;
  @text({ max: 120, optional: true }) updatedBy?: string;
}
