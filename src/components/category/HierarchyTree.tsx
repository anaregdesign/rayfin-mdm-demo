import { Button } from '@/components/shared/Button';
import type { CategoryTreeRow } from '@/usecase/categories/use-category-management-page';

interface HierarchyTreeProps {
  rows: CategoryTreeRow[];
  canManage: boolean;
  onAddChild: (parentId: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const INDENT_PX = 20;

/**
 * Presentational category tree. Renders the flattened, depth-annotated rows the
 * view-model produced (via the pure hierarchy policy) with per-node manage
 * actions. All rules — indentation depth, delete eligibility — arrive computed.
 */
export function HierarchyTree({
  rows,
  canManage,
  onAddChild,
  onEdit,
  onDelete,
}: HierarchyTreeProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        カテゴリがまだ登録されていません。
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div
            className="min-w-0"
            style={{ paddingLeft: `${row.depth * INDENT_PX}px` }}
          >
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-slate-900">
                {row.name}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                {row.code}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              子カテゴリ {row.childCount}件 ・ 製品 {row.productCount}件
            </p>
          </div>
          {canManage && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddChild(row.id)}
              >
                子を追加
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onEdit(row.id)}>
                編集
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!row.canDelete}
                title={row.deleteBlockReason}
                onClick={() => onDelete(row.id)}
              >
                削除
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
