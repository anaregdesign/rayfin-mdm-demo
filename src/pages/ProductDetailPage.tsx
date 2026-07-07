import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ProductDetailCard } from '@/components/product/ProductDetailCard';
import { ProductStatusActions } from '@/components/product/ProductStatusActions';
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
import { useProductDetailPage } from '@/usecase/products/use-product-detail-page';

/** 360° product view with lifecycle actions and duplicate insight. */
export function ProductDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const vm = useProductDetailPage(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mergePlan, setMergePlan] = useState<MergePlan | null>(null);

  if (vm.loading) return <LoadingState />;

  if (!vm.product || !vm.quality) {
    return (
      <div className="space-y-4">
        <ErrorState message="指定された製品が見つかりません。" />
        <Button variant="secondary" onClick={() => navigate('/products')}>
          一覧へ戻る
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await vm.deleteProduct();
    setConfirmOpen(false);
    if (ok) navigate('/products');
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
        title={vm.product.name}
        description={`SKU: ${vm.product.sku}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/products')}>
              一覧へ
            </Button>
            {vm.canEdit && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/products/${vm.product!.id}/edit`)}
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

      <ProductStatusActions
        allowedTransitions={vm.allowedTransitions}
        busy={vm.busy}
        onChange={vm.changeStatus}
      />

      <ProductDetailCard product={vm.product} quality={vm.quality} />

      <DuplicatePanel
        title="この製品の重複候補"
        pairs={vm.duplicatePairs}
        currentId={vm.product.id}
        renderRef={(refId, label) =>
          refId === vm.product!.id ? (
            <span>{label}</span>
          ) : (
            <button
              onClick={() => navigate(`/products/${refId}`)}
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
        entityType="product"
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
        title="製品を削除しますか？"
        message={`「${vm.product.name}」を削除します。この操作は取り消せません。`}
        confirmLabel="削除する"
        destructive
        busy={vm.busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
