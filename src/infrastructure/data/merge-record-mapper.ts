import type {
  MergeEntityType,
  MergeFieldSource,
  MergeRecord,
} from '@/domain/models/merge';

import type { MergeRecord as MergeRecordEntity } from '../../../rayfin/data/MergeRecord';

/** Rayfin row shape for the MergeRecord entity. */
export type MergeRecordRow = MergeRecordEntity;

function parseStringArray(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseSourceMap(
  raw: string | undefined | null
): Record<string, MergeFieldSource> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, MergeFieldSource> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        out[k] = v === 'loser' ? 'loser' : 'winner';
      }
      return out;
    }
  } catch {
    /* fall through */
  }
  return {};
}

function parseObject(raw: string | undefined | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseStatusMap(
  raw: string | undefined | null
): Record<string, string> {
  const obj = parseObject(raw);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = String(v);
  return out;
}

/** Map a Rayfin row to the domain merge record, parsing its JSON columns. */
export function toMergeRecord(row: MergeRecordRow): MergeRecord {
  return {
    id: row.id,
    entityType: row.entityType as MergeEntityType,
    winnerId: row.winnerId,
    loserIds: parseStringArray(row.loserIds),
    fieldSources: parseSourceMap(row.fieldSources),
    winnerBefore: parseObject(row.winnerBefore),
    loserStatuses: parseStatusMap(row.loserStatuses),
    performedBy: row.performedBy ?? undefined,
    performedAt: new Date(row.performedAt),
    undoneAt: row.undoneAt ? new Date(row.undoneAt) : undefined,
  };
}
