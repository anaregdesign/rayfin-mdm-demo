import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { DuplicatePanel } from '@/components/shared/DuplicatePanel';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            データ品質・是正
          </h2>
          <Link
            to="/remediation"
            className="text-sm font-medium text-sky-700 underline decoration-dotted hover:text-sky-900"
          >
            是正キューを開く →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="是正対象件数"
            value={vm.remediationCount}
            hint="標準化候補・低品質・必須未入力のいずれかに該当するレコード"
            accent={vm.remediationCount > 0 ? 'warning' : 'positive'}
          />
          <StatCard
            label="標準化候補あり"
            value={vm.cleansingSuggestionCount}
            hint="表記ゆれを自動修正できるレコード（ワンクリックで適用可能）"
            accent={vm.cleansingSuggestionCount > 0 ? 'warning' : 'positive'}
          />
        </div>
      </section>

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
