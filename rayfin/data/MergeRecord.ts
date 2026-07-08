import { authenticated, date, entity, set, text, uuid } from '@microsoft/rayfin-core';

/**
 * Merge history (統合履歴).
 *
 * A reversible record of one survivorship merge — the persistence backing for
 * #4 (matching/merge/golden records). Persistence shape owned by the Rayfin
 * platform; the app maps this to `domain/models/merge` inside the
 * infrastructure repository. Keep business rules out of this file.
 *
 * The JSON `@text` columns hold snapshots the unmerge flow needs:
 * `loserIds`/`loserStatuses` (which records were folded in and their prior
 * status) and `winnerBefore` (the winner's editable input before the merge).
 * Master data is shared org-wide, so any authenticated user may read.
 */
@entity()
@authenticated('*')
export class MergeRecord {
  @uuid() id!: string;

  /** Which master domain was merged. */
  @set('customer', 'product')
  entityType!: 'customer' | 'product';

  /** Surviving (golden) record id. */
  @uuid() winnerId!: string;

  /** JSON-serialized `string[]` of merged-away (loser) ids. */
  @text({ max: 2000 }) loserIds!: string;

  /** JSON map field → 'winner' | 'loser' (provenance of each golden value). */
  @text({ max: 2000, optional: true }) fieldSources?: string;

  /** JSON of the winner's editable input snapshot before the merge (for undo). */
  @text({ max: 4000, optional: true }) winnerBefore?: string;

  /** JSON map loserId → prior status (for undo restore). */
  @text({ max: 2000, optional: true }) loserStatuses?: string;

  /** Actor (email or id) who performed the merge. */
  @text({ max: 200, optional: true }) performedBy?: string;

  @date() performedAt!: Date;

  /** Set when the merge has been reversed (unmerged). */
  @date({ optional: true }) undoneAt?: Date;
}
