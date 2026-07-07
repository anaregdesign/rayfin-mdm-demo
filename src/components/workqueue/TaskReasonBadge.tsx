import { Badge } from '@/components/shared/Badge';
import type { TaskReason } from '@/domain/models/steward-task';
import {
  TASK_REASON_LABELS,
  TASK_REASON_TONE,
} from '@/domain/models/steward-task';

/** Small pill describing why a record surfaced in the work queue. */
export function TaskReasonBadge({ reason }: { reason: TaskReason }) {
  return (
    <Badge tone={TASK_REASON_TONE[reason]}>{TASK_REASON_LABELS[reason]}</Badge>
  );
}
