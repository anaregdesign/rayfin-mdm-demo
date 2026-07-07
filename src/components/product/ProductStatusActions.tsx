import { Button } from '@/components/shared/Button';
import {
  PRODUCT_STATUS_META,
  type ProductStatus,
} from '@/domain/models/master-status';

interface ProductStatusActionsProps {
  allowedTransitions: ProductStatus[];
  busy: boolean;
  onChange: (status: ProductStatus) => void;
}

/** Lifecycle transition buttons; the allowed set comes from the status policy. */
export function ProductStatusActions({
  allowedTransitions,
  busy,
  onChange,
}: ProductStatusActionsProps) {
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
          variant={
            status === 'discontinued' || status === 'archived'
              ? 'danger'
              : 'secondary'
          }
          disabled={busy}
          onClick={() => onChange(status)}
        >
          {PRODUCT_STATUS_META[status].label}へ
        </Button>
      ))}
    </div>
  );
}
