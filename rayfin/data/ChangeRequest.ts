import { authenticated, date, entity, set, text, uuid } from '@microsoft/rayfin-core';

/**
 * Change request (変更申請).
 *
 * A maker-checker approval record — the persistence backing for #8 (governance
 * workflow). When the approval mode is on, an edit/create is captured here as a
 * `pending` request instead of being written straight to the master; a checker
 * (approver) later approves it (the app applies the change) or rejects it.
 *
 * Persistence shape owned by the Rayfin platform; the app maps this to
 * `domain/models/change-request` inside the infrastructure repository. Keep
 * business rules out of this file.
 *
 * `payload` holds the JSON-serialized proposed input (a `CustomerInput` /
 * `ProductInput`). `entityId` is a free-text id reference — absent for a
 * create request. Master data is shared org-wide, so any authenticated user may
 * read the queue.
 */
@entity()
@authenticated('*')
export class ChangeRequest {
  @uuid() id!: string;

  /** Which master domain the request targets. */
  @set('customer', 'product')
  entityType!: 'customer' | 'product';

  /** Target master record id (absent for a create request). */
  @text({ max: 64, optional: true }) entityId?: string;

  /** What kind of change is being requested. */
  @set('create', 'update', 'status', 'delete')
  operation!: 'create' | 'update' | 'status' | 'delete';

  /** JSON-serialized proposed input (`CustomerInput` / `ProductInput`). */
  @text({ max: 8000, optional: true }) payload?: string;

  /** Review state of the request. */
  @set('pending', 'approved', 'rejected')
  status!: 'pending' | 'approved' | 'rejected';

  /** Actor (email or id) who raised the request (the maker). */
  @text({ max: 200, optional: true }) requestedBy?: string;

  /** Actor (email or id) who reviewed the request (the checker). */
  @text({ max: 200, optional: true }) reviewedBy?: string;

  /** Reviewer's note / rejection reason. */
  @text({ max: 400, optional: true }) reason?: string;

  /** Short human summary of the target, e.g. "顧客: アクメ商事 の更新". */
  @text({ max: 400, optional: true }) summary?: string;

  @date() requestedAt!: Date;

  /** Set once the request has been approved or rejected. */
  @date({ optional: true }) reviewedAt?: Date;
}
