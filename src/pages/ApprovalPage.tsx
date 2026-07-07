import { useLocation } from 'react-router-dom';

import { ApprovalQueue } from '@/components/approval/ApprovalQueue';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import type { ApprovalItem } from '@/usecase/approval/use-approval-page';
import { useApprovalPage } from '@/usecase/approval/use-approval-page';

/**
 * Approval queue page (#8). Thin route container: reads the view-model and lays
 * out the maker-checker experience — a review queue + segregation toggle for
 * approvers, and a read-only request history for everyone.
 */
export function ApprovalPage() {
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice ?? null;
  const vm = useApprovalPage();

  const pendingItems = vm.items.filter((i) => i.request.status === 'pending');
  const processedItems = vm.items.filter((i) => i.request.status !== 'pending');

  const handleReview = (
    item: ApprovalItem,
    decision: 'approved' | 'rejected',
    reason: string
  ) => {
    void vm.review(item.request, decision, reason);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="変更承認"
        description="マスタの登録・編集の申請を確認し、承認または却下します。"
      />

      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {vm.reviewError && <ErrorState message={vm.reviewError} />}
      {vm.error && <ErrorState message={vm.error} />}

      {vm.loading ? (
        <LoadingState />
      ) : vm.isApprover ? (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                承認待ち（{vm.pendingCount}）
              </h2>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={vm.enforceSegregation}
                  onChange={(e) => vm.setEnforceSegregation(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                申請者本人の承認を禁止（職務分掌）
              </label>
            </div>
            <ApprovalQueue
              items={pendingItems}
              isApprover
              reviewingId={vm.reviewingId}
              onReview={handleReview}
              emptyTitle="承認待ちの申請はありません"
              emptyDescription="新しい申請が作成されるとここに表示されます。"
            />
          </section>

          {processedItems.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">処理済み</h2>
              <ApprovalQueue
                items={processedItems}
                isApprover={false}
                reviewingId={vm.reviewingId}
                onReview={handleReview}
                emptyTitle="処理済みの申請はありません"
              />
            </section>
          )}
        </>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">申請履歴</h2>
          <p className="text-xs text-slate-500">
            承認は管理者のみが行えます。申請の状況をここで確認できます。
          </p>
          <ApprovalQueue
            items={vm.items}
            isApprover={false}
            reviewingId={vm.reviewingId}
            onReview={handleReview}
            emptyTitle="申請はまだありません"
            emptyDescription="ヘッダーの「承認フロー（デモ）」を有効にして登録・編集すると、ここに申請が表示されます。"
          />
        </section>
      )}
    </div>
  );
}
