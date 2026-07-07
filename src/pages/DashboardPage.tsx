import { useNavigate } from 'react-router-dom';

import { DuplicatePanel } from '@/components/shared/DuplicatePanel';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { QualityOverview } from '@/components/dashboard/QualityOverview';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { StatusBreakdown } from '@/components/dashboard/StatusBreakdown';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { StewardWorkloadTable } from '@/components/workqueue/StewardWorkloadTable';
import { useDashboard } from '@/usecase/dashboard/use-dashboard';

/** Analytics overview across both masters (counts, quality, duplicates). */
export function DashboardPage() {
  const vm = useDashboard();
  const navigate = useNavigate();

  if (vm.loading) return <LoadingState />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="ダッシュボード"
        description="製品マスタ・顧客マスタの品質とガバナンス状況の概要"
      />

      {vm.error && <ErrorState message={vm.error} />}

      <SummaryCards title="顧客マスタ" summary={vm.customerSummary} />
      <SummaryCards title="製品マスタ" summary={vm.productSummary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusBreakdown
          title="顧客ステータス内訳"
          statusCounts={vm.customerSummary.statusCounts}
          total={vm.customerSummary.total}
        />
        <StatusBreakdown
          title="製品ステータス内訳"
          statusCounts={vm.productSummary.statusCounts}
          total={vm.productSummary.total}
        />
        <QualityOverview
          title="顧客データ品質分布"
          quality={vm.customerSummary.quality}
          total={vm.customerSummary.total}
        />
        <QualityOverview
          title="製品データ品質分布"
          quality={vm.productSummary.quality}
          total={vm.productSummary.total}
        />
      </div>

      <StewardWorkloadTable
        title="スチュワード別 未対応件数"
        workloads={vm.stewardWorkloads}
        description="品質・重複・下書き滞留・必須未入力などで対応が必要なレコードの担当者別件数です。詳細はワークキューを参照してください。"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivity
          title="最近更新された顧客"
          items={vm.recentCustomers.map((c) => ({
            id: c.id,
            label: c.name,
            sublabel: c.code,
            updatedAt: c.updatedAt,
          }))}
          onOpen={(id) => navigate(`/customers/${id}`)}
        />
        <RecentActivity
          title="最近更新された製品"
          items={vm.recentProducts.map((p) => ({
            id: p.id,
            label: p.name,
            sublabel: p.sku,
            updatedAt: p.updatedAt,
          }))}
          onOpen={(id) => navigate(`/products/${id}`)}
        />
      </div>

      {(vm.customerDuplicates.length > 0 || vm.productDuplicates.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DuplicatePanel
            title="顧客の重複候補"
            pairs={vm.customerDuplicates}
            renderRef={(id, label) => (
              <button
                onClick={() => navigate(`/customers/${id}`)}
                className="underline decoration-dotted hover:text-amber-950"
              >
                {label}
              </button>
            )}
          />
          <DuplicatePanel
            title="製品の重複候補"
            pairs={vm.productDuplicates}
            renderRef={(id, label) => (
              <button
                onClick={() => navigate(`/products/${id}`)}
                className="underline decoration-dotted hover:text-amber-950"
              >
                {label}
              </button>
            )}
          />
        </div>
      )}
    </div>
  );
}
