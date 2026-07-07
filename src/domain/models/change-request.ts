/**
 * Change-request domain model — the maker-checker approval record for #8.
 *
 * A `ChangeRequest` captures a proposed create/update to a master record that
 * is awaiting review. It has no persistence decorators and no SDK dependency;
 * the infrastructure adapter maps the Rayfin `ChangeRequest` entity to/from it.
 * The `payload` carries the proposed `CustomerInput` / `ProductInput` as a
 * plain object; the usecase layer casts and applies it on approval.
 */

import type { StatusTone } from '@/domain/models/master-status';

export type ChangeRequestEntityType = 'customer' | 'product';

/** The kind of mutation a request represents. */
export type ChangeRequestOperation = 'create' | 'update' | 'status' | 'delete';

/** Review lifecycle of a request. */
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

/** A reviewer's terminal decision. */
export type ReviewDecision = 'approved' | 'rejected';

export interface ChangeRequest {
  id: string;
  entityType: ChangeRequestEntityType;
  /** Target record id — absent for a create request. */
  entityId?: string;
  operation: ChangeRequestOperation;
  /** Proposed input (create/update), parsed from JSON. */
  payload?: Record<string, unknown>;
  status: ChangeRequestStatus;
  /** Maker (email or id). */
  requestedBy?: string;
  /** Checker (email or id), set on review. */
  reviewedBy?: string;
  /** Reviewer note / rejection reason. */
  reason?: string;
  /** Short human summary of the target. */
  summary?: string;
  requestedAt: Date;
  reviewedAt?: Date;
}

export const CHANGE_REQUEST_ENTITY_LABELS: Record<
  ChangeRequestEntityType,
  string
> = {
  customer: '顧客',
  product: '製品',
};

export const CHANGE_REQUEST_OPERATION_LABELS: Record<
  ChangeRequestOperation,
  string
> = {
  create: '新規登録',
  update: '更新',
  status: 'ステータス変更',
  delete: '削除',
};

export const CHANGE_REQUEST_STATUS_LABELS: Record<
  ChangeRequestStatus,
  string
> = {
  pending: '承認待ち',
  approved: '承認済み',
  rejected: '却下',
};

export function changeRequestOperationLabel(
  operation: ChangeRequestOperation
): string {
  return CHANGE_REQUEST_OPERATION_LABELS[operation];
}

export function changeRequestStatusLabel(status: ChangeRequestStatus): string {
  return CHANGE_REQUEST_STATUS_LABELS[status];
}

/** Semantic tone for the status badge, reusing the shared status tones. */
export function changeRequestStatusTone(status: ChangeRequestStatus): StatusTone {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'positive';
    case 'rejected':
      return 'danger';
  }
}

/** True while the request still needs a decision. */
export function isPending(request: ChangeRequest): boolean {
  return request.status === 'pending';
}
