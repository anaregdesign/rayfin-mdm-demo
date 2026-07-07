import type {
  ChangeRequest,
  ChangeRequestEntityType,
  ChangeRequestOperation,
  ChangeRequestStatus,
} from '@/domain/models/change-request';

import type { ChangeRequest as ChangeRequestEntity } from '../../../rayfin/data/ChangeRequest';

/** Rayfin row shape for the ChangeRequest entity. */
export type ChangeRequestRow = ChangeRequestEntity;

/** Defensive cap so an oversized payload never breaks the DB write. */
const MAX_PAYLOAD_JSON = 8000;

/** Parse the JSON `payload` column back into a plain object. */
export function parsePayload(
  raw: string | undefined | null
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Serialize a proposed input for the `payload` column (with a size guard). */
export function serializePayload(
  payload: Record<string, unknown> | undefined
): string | undefined {
  if (!payload) return undefined;
  const json = JSON.stringify(payload);
  // Payloads are a single master record; the guard is a safety net only.
  return json.length <= MAX_PAYLOAD_JSON ? json : undefined;
}

/** Map a Rayfin row to the domain change request. */
export function toChangeRequest(row: ChangeRequestRow): ChangeRequest {
  return {
    id: row.id,
    entityType: row.entityType as ChangeRequestEntityType,
    entityId: row.entityId ?? undefined,
    operation: row.operation as ChangeRequestOperation,
    payload: parsePayload(row.payload),
    status: row.status as ChangeRequestStatus,
    requestedBy: row.requestedBy ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reason: row.reason ?? undefined,
    summary: row.summary ?? undefined,
    requestedAt: new Date(row.requestedAt),
    reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
  };
}
