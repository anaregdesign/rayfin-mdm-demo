import type { ApprovalItem } from '@/usecase/approval/use-approval-page';

import { EmptyState } from '@/components/shared/EmptyState';

import { RequestReviewCard } from './RequestReviewCard';

interface ApprovalQueueProps {
  items: ApprovalItem[];
  /** True when the current actor is a checker (admin). */
  isApprover: boolean;
  /** Id of the request currently being processed, if any. */
  reviewingId: string | null;
  onReview: (
    item: ApprovalItem,
    decision: 'approved' | 'rejected',
    reason: string
  ) => void;
  emptyTitle: string;
  emptyDescription?: string;
}

/** Render-only list of change-request review cards (#8). */
export function ApprovalQueue({
  items,
  isApprover,
  reviewingId,
  onReview,
  emptyTitle,
  emptyDescription,
}: ApprovalQueueProps) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <RequestReviewCard
          key={item.request.id}
          item={item}
          isApprover={isApprover}
          reviewing={reviewingId === item.request.id}
          onReview={(decision, reason) => onReview(item, decision, reason)}
        />
      ))}
    </ul>
  );
}
