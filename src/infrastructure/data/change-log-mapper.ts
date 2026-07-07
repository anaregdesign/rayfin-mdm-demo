import type {
  ChangeAction,
  ChangeEntityType,
  ChangeEntry,
  FieldChange,
} from '@/domain/models/change-log';

import type { ChangeLog as ChangeLogEntity } from '../../../rayfin/data/ChangeLog';

/** Rayfin row shape for the ChangeLog entity. */
export type ChangeLogRow = ChangeLogEntity;

/** Defensive cap so an oversized diff never breaks the DB write. */
const MAX_CHANGED_FIELDS_JSON = 8000;

/** Parse the JSON `changedFields` column back into `FieldChange[]`. */
export function parseChangedFields(raw: string | undefined | null): FieldChange[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FieldChange[]) : [];
  } catch {
    return [];
  }
}

/** Serialize `FieldChange[]` for the `changedFields` column (with a size guard). */
export function serializeChangedFields(changes: FieldChange[]): string | undefined {
  if (changes.length === 0) return undefined;
  const json = JSON.stringify(changes);
  if (json.length <= MAX_CHANGED_FIELDS_JSON) return json;
  // Drop values but keep the field names so the timeline still lists them.
  const trimmed = changes.map((c) => ({
    field: c.field,
    before: '（省略）',
    after: '（省略）',
  }));
  return JSON.stringify(trimmed);
}

/** Map a Rayfin row to the domain change entry. */
export function toChangeEntry(row: ChangeLogRow): ChangeEntry {
  return {
    id: row.id,
    entityType: row.entityType as ChangeEntityType,
    entityId: row.entityId,
    action: row.action as ChangeAction,
    changes: parseChangedFields(row.changedFields),
    actorId: row.actorId ?? undefined,
    occurredAt: new Date(row.occurredAt),
    summary: row.summary ?? undefined,
  };
}
