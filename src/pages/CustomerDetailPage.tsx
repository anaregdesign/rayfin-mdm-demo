import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CustomerDetailCard } from '@/components/customer/CustomerDetailCard';
import { CustomerStatusActions } from '@/components/customer/CustomerStatusActions';
import { HistoryTimeline } from '@/components/history/HistoryTimeline';
import { MergeDialog } from '@/components/merge/MergeDialog';
import { MergeHistoryPanel } from '@/components/merge/MergeHistoryPanel';
import { Button } from '@/components/shared/Button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DuplicatePanel } from '@/components/shared/DuplicatePanel';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import type { MergePlan } from '@/usecase/merge/merge-plan';
import { useCustomerDetailPage } from '@/usecase/customers/use-customer-detail-page';

/** 360° customer view with lifecycle actions and duplicate insight. */
export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const vm = useCustomerDetailPage(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mergePlan, setMergePlan] = useState<MergePlan | null>(null);

  if (vm.loading) return <LoadingState />;

  if (!vm.customer || !vm.quality) {
    return (
      <div className="space-y-4">
        <ErrorState message="指定された顧客が見つかりません。" />
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          一覧へ戻る
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await vm.deleteCustomer();
    setConfirmOpen(false);
    if (ok) navigate('/customers');
  };

  const handleConfirmMerge = async (
    sources: Parameters<typeof vm.confirmMerge>[1]
  ) => {
    if (!mergePlan) return;
    const ok = await vm.confirmMerge(mergePlan.loserId, sources);
    if (ok) setMergePlan(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={vm.customer.name}
        description={`顧客コード: ${vm.customer.code}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/customers')}>
              一覧へ
            </Button>
            {vm.canEdit && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/customers/${vm.customer!.id}/edit`)}
              >
                編集
              </Button>
            )}
            {vm.canDelete && (
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                削除
              </Button>
            )}
          </div>
        }
      />

      {vm.actionError && <ErrorState message={vm.actionError} />}

      <CustomerStatusActions
        allowedTransitions={vm.allowedTransitions}
        busy={vm.busy}
        onChange={vm.changeStatus}
      />

      <CustomerDetailCard customer={vm.customer} quality={vm.quality} />

      <DuplicatePanel
        title="この顧客の重複候補"
        pairs={vm.duplicatePairs}
        currentId={vm.customer.id}
        renderRef={(refId, label) =>
          refId === vm.customer!.id ? (
            <span>{label}</span>
          ) : (
            <button
              onClick={() => navigate(`/customers/${refId}`)}
              className="underline decoration-dotted hover:text-amber-950"
            >
              {label}
            </button>
          )
        }
        renderAction={
          vm.canEdit
            ? (otherId) => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMergePlan(vm.planMerge(otherId))}
                >
                  統合
                </Button>
              )
            : undefined
        }
      />

      <HistoryTimeline
        entityType="customer"
        entries={vm.history}
        loading={vm.historyLoading}
        error={vm.historyError}
        busy={vm.busy}
        onRestore={vm.restore}
      />

      <MergeHistoryPanel
        items={vm.mergeHistory}
        loading={vm.mergeHistoryLoading}
        error={vm.mergeHistoryError}
        busy={vm.busy}
        onUndo={vm.unmerge}
      />

      <MergeDialog
        open={mergePlan !== null}
        plan={mergePlan}
        busy={vm.busy}
        error={vm.actionError}
        onConfirm={handleConfirmMerge}
        onCancel={() => setMergePlan(null)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="顧客を削除しますか？"
        message={`「${vm.customer.name}」を削除します。この操作は取り消せません。`}
        confirmLabel="削除する"
        destructive
        busy={vm.busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
