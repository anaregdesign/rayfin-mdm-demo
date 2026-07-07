import { useCallback, useEffect, useState } from 'react';

import type { Actor } from '@/domain/models/authz';
import type {
  ChangeRequest,
  ReviewDecision,
} from '@/domain/models/change-request';
import {
  applyDecision,
  canReview,
  reviewBlockReason,
  type ReviewOptions,
} from '@/domain/policies/approval-policy';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';

/** Applies an approved request's payload to the target master. Injected so the
 *  controller stays store-agnostic and reuses the page's own stores. */
export type ApplyRequest = (request: ChangeRequest) => Promise<void>;

export interface ReviewGateways {
  /** Reviewer identity (active actor). */
  reviewer: Actor | null;
  /** Segregation-of-duties option for `canReview`. */
  options: ReviewOptions;
  /** Applies the payload on approval. */
  apply: ApplyRequest;
}

export interface ChangeRequestsController {
  requests: ChangeRequest[];
  loading: boolean;
  error: string | null;
  reviewingId: string | null;
  reviewError: string | null;
  reload: () => Promise<void>;
  review: (
    request: ChangeRequest,
    decision: ReviewDecision,
    reason?: string
  ) => Promise<boolean>;
}

/**
 * Store-agnostic approval controller (#8). Loads the change-request queue and
 * performs a reviewed decision: on approval it first applies the payload to the
 * master (injected `apply`), then persists the decision; on rejection it only
 * records the outcome. Guard rules come from the pure approval policy.
 */
export function useChangeRequests(
  gateways: ReviewGateways
): ChangeRequestsController {
  const { changeRequests: repo, clock } = useDependencies();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const { reviewer, options, apply } = gateways;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await repo.list());
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const review = useCallback(
    async (
      request: ChangeRequest,
      decision: ReviewDecision,
      reason?: string
    ): Promise<boolean> => {
      setReviewError(null);
      if (!reviewer || !canReview(request, reviewer, options)) {
        setReviewError(
          (reviewer && reviewBlockReason(request, reviewer, options)) ??
            '承認権限がありません。'
        );
        return false;
      }
      setReviewingId(request.id);
      try {
        // Apply first so a failed write never leaves a request marked approved.
        if (decision === 'approved') await apply(request);
        const decided = applyDecision(
          request,
          decision,
          reviewer,
          reason,
          clock.now()
        );
        await repo.update(decided);
        await reload();
        return true;
      } catch (err) {
        setReviewError(toMessage(err));
        return false;
      } finally {
        setReviewingId(null);
      }
    },
    [reviewer, options, apply, repo, clock, reload]
  );

  return {
    requests,
    loading,
    error,
    reviewingId,
    reviewError,
    reload,
    review,
  };
}
