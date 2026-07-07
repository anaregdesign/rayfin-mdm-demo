import {
  customerDisplayName,
  customerRelationTypeLabel,
  type Customer,
} from '@/domain/models/customer';
import type { CustomerRelations } from '@/usecase/customers/use-customer-detail-page';

interface CustomerRelationsPanelProps {
  /** The record currently in focus (anchors the breadcrumb). */
  customer: Customer;
  relations: CustomerRelations;
  /** Navigate to another customer's detail (page-owned handler). */
  onOpen: (id: string) => void;
}

/** A clickable customer name chip used across the relations panel. */
function RefButton({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(customer.id)}
      className="underline decoration-dotted underline-offset-2 hover:text-sky-700"
    >
      {customerDisplayName(customer)}
    </button>
  );
}

/**
 * Presents a customer's org-hierarchy neighbourhood (Issue #7): the ancestor
 * breadcrumb, relationship type, direct children, and siblings. Pure
 * presentation — navigation is delegated to the page via `onOpen`.
 */
export function CustomerRelationsPanel({
  customer,
  relations,
  onOpen,
}: CustomerRelationsPanelProps) {
  const { parent, ancestors, children, siblings, relationTypeLabel } = relations;
  const hasAny =
    parent !== null ||
    children.length > 0 ||
    siblings.length > 0 ||
    relationTypeLabel !== null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">
        組織階層・関係
      </h2>

      {!hasAny && (
        <p className="text-sm text-slate-500">
          階層関係は登録されていません。編集画面で親会社・関係区分を設定できます。
        </p>
      )}

      {hasAny && (
        <dl className="space-y-4 text-sm">
          {relationTypeLabel && (
            <div>
              <dt className="mb-1 font-medium text-slate-500">関係区分</dt>
              <dd className="text-slate-900">{relationTypeLabel}</dd>
            </div>
          )}

          <div>
            <dt className="mb-1 font-medium text-slate-500">階層（親→自社）</dt>
            <dd className="flex flex-wrap items-center gap-1 text-slate-900">
              {ancestors.length === 0 && parent === null ? (
                <span className="text-slate-500">最上位（親なし）</span>
              ) : (
                <>
                  {ancestors.map((a) => (
                    <span key={a.id} className="flex items-center gap-1">
                      <RefButton customer={a} onOpen={onOpen} />
                      <span className="text-slate-400">›</span>
                    </span>
                  ))}
                  <span className="font-semibold">
                    {customerDisplayName(customer)}
                  </span>
                </>
              )}
            </dd>
          </div>

          {children.length > 0 && (
            <div>
              <dt className="mb-1 font-medium text-slate-500">
                子会社・拠点（{children.length}件）
              </dt>
              <dd>
                <ul className="space-y-1">
                  {children.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <RefButton customer={c} onOpen={onOpen} />
                      {c.relationType && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {customerRelationTypeLabel(c.relationType)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}

          {siblings.length > 0 && (
            <div>
              <dt className="mb-1 font-medium text-slate-500">
                同じ親を持つ顧客（{siblings.length}件）
              </dt>
              <dd className="flex flex-wrap gap-x-3 gap-y-1">
                {siblings.map((s) => (
                  <RefButton key={s.id} customer={s} onOpen={onOpen} />
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
