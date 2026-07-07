import { Link, useNavigate } from 'react-router-dom';

import { BreakdownTable } from '@/components/analytics/BreakdownTable';
import { QualityTrendChart } from '@/components/analytics/QualityTrendChart';
import { ReportExportButton } from '@/components/analytics/ReportExportButton';
import { DuplicatePanel } from '@/components/shared/DuplicatePanel';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { SelectField } from '@/components/shared/SelectField';
import { StatCard } from '@/components/shared/StatCard';
import { QualityOverview } from '@/components/dashboard/QualityOverview';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { StatusBreakdown } from '@/components/dashboard/StatusBreakdown';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { StewardWorkloadTable } from '@/components/workqueue/StewardWorkloadTable';
import {
  TREND_WINDOW_VALUES,
  trendWindowLabel,
  type TrendWindowDays,
} from '@/domain/models/analytics';
import { useReportExport } from '@/usecase/analytics/use-report-export';
import { useDashboard } from '@/usecase/dashboard/use-dashboard';

const TREND_WINDOW_OPTIONS = TREND_WINDOW_VALUES.map((days) => ({
  value: String(days),
  label: trendWindowLabel(days),
}));

/** Analytics overview across both masters (counts, quality, duplicates). */
export function DashboardPage() {
  const vm = useDashboard();
  const navigate = useNavigate();
  const report = useReportExport(vm.reportSections);

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

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">品質トレンド</h2>
            <p className="text-sm text-slate-500">
              両マスタの平均品質・有効率の推移（累積コホート）
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="w-36">
              <SelectField
                label="期間"
                value={String(vm.trendWindow)}
                options={TREND_WINDOW_OPTIONS}
                onChange={(v) =>
                  vm.setTrendWindow(Number(v) as TrendWindowDays)
                }
              />
            </div>
            <ReportExportButton
              onExportCsv={() => report.exportCsv()}
              onPrint={report.print}
            />
          </div>
        </div>
        <QualityTrendChart points={vm.trend} />
      </section>

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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          ドリルダウン（低品質レコード）
        </h2>
        <p className="text-sm text-slate-500">
          カードをクリックすると、該当マスタの一覧を低品質のみに絞り込んで開きます。
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="低品質の顧客"
            value={vm.customerSummary.quality.low}
            hint="品質スコアが50未満の顧客レコード"
            accent={vm.customerSummary.quality.low > 0 ? 'danger' : 'positive'}
            onClick={() =>
              navigate('/customers', {
                state: { drilldown: { entity: 'customer', quality: 'low' } },
              })
            }
          />
          <StatCard
            label="低品質の製品"
            value={vm.productSummary.quality.low}
            hint="品質スコアが50未満の製品レコード"
            accent={vm.productSummary.quality.low > 0 ? 'danger' : 'positive'}
            onClick={() =>
              navigate('/products', {
                state: { drilldown: { entity: 'product', quality: 'low' } },
              })
            }
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">構成分析</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <BreakdownTable
            title="マスタ種別"
            keyLabel="マスタ"
            groups={vm.entityBreakdown}
          />
          <BreakdownTable
            title="スチュワード別"
            keyLabel="担当"
            groups={vm.stewardBreakdown}
          />
          <BreakdownTable
            title="製品カテゴリ別"
            keyLabel="カテゴリ"
            groups={vm.categoryBreakdown}
          />
        </div>
      </section>

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
