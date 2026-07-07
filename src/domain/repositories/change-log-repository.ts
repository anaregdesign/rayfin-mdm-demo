import type {
  ChangeAction,
  ChangeEntityType,
  ChangeEntry,
  FieldChange,
} from '@/domain/models/change-log';

/** Payload for appending a new change entry (id/occurredAt set by the repo). */
export interface AppendChangeEntry {
  entityType: ChangeEntityType;
  entityId: string;
  action: ChangeAction;
  changes: FieldChange[];
  actorId?: string;
  summary?: string;
}

/**
 * Outbound port for the append-only change history. The domain speaks in
 * `ChangeEntry`/`AppendChangeEntry`; the infrastructure adapter maps to/from
 * the Rayfin `ChangeLog` entity.
 */
export interface ChangeLogRepository {
  /** Append one immutable audit record. */
  append(entry: AppendChangeEntry): Promise<void>;
  /** History for a single record, newest first. */
  listByEntity(
    entityType: ChangeEntityType,
    entityId: string
  ): Promise<ChangeEntry[]>;
  /** Whole-domain history (newest first), for analytics/distribution feeds. */
  listByType(entityType: ChangeEntityType): Promise<ChangeEntry[]>;
}
