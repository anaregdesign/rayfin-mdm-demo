import { authenticated, date, entity, set, text, uuid } from '@microsoft/rayfin-core';

/**
 * Change history (変更履歴).
 *
 * Append-only audit log of how a master record changed over time — the
 * persistence backing for #5 (versioning). Persistence shape owned by the
 * Rayfin platform; the app maps this to `domain/models/change-log` inside the
 * infrastructure repository. Keep business rules out of this file.
 *
 * `changedFields` holds a JSON-serialized `FieldChange[]` (before/after per
 * field). Master data is shared org-wide, so any authenticated user may read.
 */
@entity()
@authenticated('*')
export class ChangeLog {
  @uuid() id!: string;

  /** Which master domain the audited record belongs to. */
  @set('customer', 'product')
  entityType!: 'customer' | 'product';

  /** Id of the audited master record. */
  @uuid() entityId!: string;

  /** What kind of change occurred. */
  @set('create', 'update', 'status', 'delete')
  action!: 'create' | 'update' | 'status' | 'delete';

  /** JSON-serialized `FieldChange[]` (before → after per field). */
  @text({ max: 8000, optional: true }) changedFields?: string;

  /** Actor (email or id) who performed the change. */
  @text({ max: 200, optional: true }) actorId?: string;

  /** Short human summary of the change. */
  @text({ max: 400, optional: true }) summary?: string;

  @date() occurredAt!: Date;
}
