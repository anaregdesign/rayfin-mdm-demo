import type {
  ChangeRequest,
  ChangeRequestEntityType,
  ChangeRequestOperation,
} from '@/domain/models/change-request';

/** Payload for raising a new request (id/status/requestedAt set by the repo). */
export interface RaiseChangeRequest {
  entityType: ChangeRequestEntityType;
  /** Target record id — omit for a create request. */
  entityId?: string;
  operation: ChangeRequestOperation;
  /** Proposed input (`CustomerInput` / `ProductInput`) as a plain object. */
  payload?: Record<string, unknown>;
  requestedBy?: string;
  summary?: string;
}

/**
 * Outbound port for the change-request (approval) queue. The domain speaks in
 * `ChangeRequest`/`RaiseChangeRequest`; the infrastructure adapter maps to/from
 * the Rayfin `ChangeRequest` entity.
 */
export interface ChangeRequestRepository {
  /** Raise a new `pending` request. */
  raise(request: RaiseChangeRequest): Promise<ChangeRequest>;
  /** All requests, newest first. */
  list(): Promise<ChangeRequest[]>;
  findById(id: string): Promise<ChangeRequest | null>;
  /** Persist a reviewed request (status/reviewedBy/reason/reviewedAt). */
  update(request: ChangeRequest): Promise<ChangeRequest>;
}
