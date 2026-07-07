import type {
  MergeEntityType,
  MergeFieldSource,
  MergeRecord,
} from '@/domain/models/merge';

/** Payload for appending a merge record (id/performedAt/performedBy set by repo). */
export interface AppendMergeRecord {
  entityType: MergeEntityType;
  winnerId: string;
  loserIds: string[];
  fieldSources: Record<string, MergeFieldSource>;
  winnerBefore: Record<string, unknown>;
  loserStatuses: Record<string, string>;
}

/**
 * Outbound port for the reversible merge history. The domain speaks in
 * `MergeRecord`/`AppendMergeRecord`; the infrastructure adapter maps to/from
 * the Rayfin `MergeRecord` entity.
 */
export interface MergeRecordRepository {
  /** Append one merge record and return the persisted (id-assigned) shape. */
  append(record: AppendMergeRecord): Promise<MergeRecord>;
  /** All merges for a domain (newest first). */
  listByType(entityType: MergeEntityType): Promise<MergeRecord[]>;
  /** Fetch a single merge record by id. */
  get(id: string): Promise<MergeRecord | null>;
  /** Flag a merge as reversed (unmerged). */
  markUndone(id: string): Promise<void>;
}
