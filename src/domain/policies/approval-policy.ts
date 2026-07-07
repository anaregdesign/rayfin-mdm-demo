import type { Actor } from '@/domain/models/authz';
import type {
  ChangeRequest,
  ReviewDecision,
} from '@/domain/models/change-request';

/**
 * Pure approval policy for the maker-checker workflow (#8) — the single source
 * of truth for "who may review what". No SDK, no persistence, no React.
 *
 * Roles (reusing the #9 model):
 * - `admin`   → checker (approver). May review any pending request.
 * - `steward` → maker. Raises requests; cannot approve.
 * - `viewer`  → neither.
 *
 * Segregation of duties (maker ≠ checker) is **optional** (`enforceSegregation`)
 * so the single-user PoC demo can raise *and* approve a request to show the full
 * loop, then toggle the rule on to demonstrate the self-approval guard.
 */

/** Normalize a free-text identity token for tolerant comparison. */
function norm(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** Only admins act as checkers (approvers) in the PoC. */
export function canApprove(actor: Actor): boolean {
  return actor.role === 'admin';
}

/** True when the reviewer is the same identity that raised the request. */
export function isSelfReview(
  request: ChangeRequest,
  reviewer: Actor
): boolean {
  const maker = norm(request.requestedBy);
  if (!maker) return false;
  return (
    maker === norm(reviewer.email) ||
    maker === norm(reviewer.name) ||
    maker === norm(reviewer.id)
  );
}

export interface ReviewOptions {
  /** When true, the maker may not be the checker (self-approval forbidden). */
  enforceSegregation?: boolean;
}

/**
 * Decide whether `reviewer` may act on `request`. The request must be pending,
 * the reviewer must be an approver, and — when segregation of duties is enforced
 * — the reviewer must not be the original maker.
 */
export function canReview(
  request: ChangeRequest,
  reviewer: Actor,
  options: ReviewOptions = {}
): boolean {
  if (request.status !== 'pending') return false;
  if (!canApprove(reviewer)) return false;
  if (options.enforceSegregation && isSelfReview(request, reviewer)) {
    return false;
  }
  return true;
}

/**
 * Human-readable reason a review is blocked, or `null` when it is allowed.
 * Used by the UI to explain a disabled 承認/却下 control.
 */
export function reviewBlockReason(
  request: ChangeRequest,
  reviewer: Actor,
  options: ReviewOptions = {}
): string | null {
  if (request.status !== 'pending') return 'この申請は既に処理済みです。';
  if (!canApprove(reviewer)) return '承認は管理者のみが行えます。';
  if (options.enforceSegregation && isSelfReview(request, reviewer)) {
    return '自己承認は禁止されています（申請者と承認者を分ける必要があります）。';
  }
  return null;
}

/**
 * Apply a reviewer's decision to a request, producing the updated record. Pure
 * and non-mutating; the caller persists the result (and, on approval, applies
 * the payload to the target master separately).
 */
export function applyDecision(
  request: ChangeRequest,
  decision: ReviewDecision,
  reviewer: Actor,
  reason: string | undefined,
  at: Date
): ChangeRequest {
  return {
    ...request,
    status: decision,
    reviewedBy: reviewer.email || reviewer.id,
    reason: reason?.trim() ? reason.trim() : undefined,
    reviewedAt: at,
  };
}
