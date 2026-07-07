import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { QualityBadge } from '@/components/shared/QualityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { customerTypeLabel } from '@/domain/models/customer';
import { CUSTOMER_STATUS_META } from '@/domain/models/master-status';
import { formatDate } from '@/lib/format';
import type { CustomerListItem } from '@/usecase/customers/selectors';

interface CustomerTableProps {
  items: CustomerListItem[];
  onOpen: (id: string) => void;
  onEdit?: (id: string) => void;
}

/** Read-only customer list table. Row actions open detail / edit screens. */
export function CustomerTable({ items, onOpen, onEdit }: CustomerTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">顧客</th>
            <th className="px-4 py-3">区分</th>
            <th className="px-4 py-3">ステータス</th>
            <th className="px-4 py-3">品質</th>
            <th className="px-4 py-3">更新日</th>
            <th className="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(({ customer, quality, isDuplicate }) => (
            <tr key={customer.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <button
                  onClick={() => onOpen(customer.id)}
                  className="text-left font-medium text-indigo-600 hover:underline"
                >
                  {customer.name}
                </button>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{customer.code}</span>
                  {isDuplicate && <Badge tone="warning">重複候補</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {customerTypeLabel(customer.customerType)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge meta={CUSTOMER_STATUS_META[customer.status]} />
              </td>
              <td className="px-4 py-3">
                <QualityBadge score={quality.score} band={quality.band} />
              </td>
              <td className="px-4 py-3 text-slate-500">
                {formatDate(customer.updatedAt)}
              </td>
              <td className="px-4 py-3 text-right">
                {onEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(customer.id)}
                  >
                    編集
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
