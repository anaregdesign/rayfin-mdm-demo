import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { QualityBadge } from '@/components/shared/QualityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PRODUCT_STATUS_META } from '@/domain/models/master-status';
import { productCategoryLabel } from '@/domain/models/product';
import { formatMoney } from '@/domain/value-objects/money';
import { formatDate } from '@/lib/format';
import type { ProductListItem } from '@/usecase/products/selectors';

interface ProductTableProps {
  items: ProductListItem[];
  onOpen: (id: string) => void;
  onEdit?: (id: string) => void;
}

/** Read-only product list table. Row actions open detail / edit screens. */
export function ProductTable({ items, onOpen, onEdit }: ProductTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">製品</th>
            <th className="px-4 py-3">カテゴリ</th>
            <th className="px-4 py-3 text-right">単価</th>
            <th className="px-4 py-3">ステータス</th>
            <th className="px-4 py-3">品質</th>
            <th className="px-4 py-3">更新日</th>
            <th className="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(({ product, quality, isDuplicate }) => (
            <tr key={product.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <button
                  onClick={() => onOpen(product.id)}
                  className="text-left font-medium text-indigo-600 hover:underline"
                >
                  {product.name}
                </button>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{product.sku}</span>
                  {isDuplicate && <Badge tone="warning">重複候補</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {productCategoryLabel(product.category)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                {formatMoney(product.unitPrice, product.currency)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge meta={PRODUCT_STATUS_META[product.status]} />
              </td>
              <td className="px-4 py-3">
                <QualityBadge score={quality.score} band={quality.band} />
              </td>
              <td className="px-4 py-3 text-slate-500">
                {formatDate(product.updatedAt)}
              </td>
              <td className="px-4 py-3 text-right">
                {onEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(product.id)}
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
