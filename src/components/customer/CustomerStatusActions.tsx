import { Button } from '@/components/shared/Button';
import {
  CUSTOMER_STATUS_META,
  type CustomerStatus,
} from '@/domain/models/master-status';

interface CustomerStatusActionsProps {
  allowedTransitions: CustomerStatus[];
  busy: boolean;
  onChange: (status: CustomerStatus) => void;
}

/** Lifecycle transition buttons; the allowed set comes from the status policy. */
export function CustomerStatusActions({
  allowedTransitions,
  busy,
  onChange,
}: CustomerStatusActionsProps) {
  if (allowedTransitions.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500">
        ステータス変更:
      </span>
      {allowedTransitions.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === 'archived' ? 'danger' : 'secondary'}
          disabled={busy}
          onClick={() => onChange(status)}
        >
          {CUSTOMER_STATUS_META[status].label}へ
        </Button>
      ))}
    </div>
  );
}
