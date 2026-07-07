import { Button } from '@/components/shared/Button';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { SelectField } from '@/components/shared/SelectField';
import { StatCard } from '@/components/shared/StatCard';
import { ExportPanel } from '@/components/distribution/ExportPanel';
import { OutboxEventFeed } from '@/components/distribution/OutboxEventFeed';
import { WebhookTargetCard } from '@/components/distribution/WebhookTargetCard';
import {
  DELIVERY_STATUS_VALUES,
  OUTBOX_EVENT_TYPE_VALUES,
} from '@/domain/models/distribution';
import {
  deliveryStatusLabel,
  distributionEntityLabel,
  outboxEventTypeLabel,
  type DeliveryStatus,
  type DistributionEntityType,
  type OutboxEventType,
} from '@/domain/models/distribution';
import {
  useDistributionPage,
  type EventWindowDays,
} from '@/usecase/distribution/use-distribution';

const ENTITY_OPTIONS = [
  { value: 'all', label: 'すべてのマスタ' },
  ...(['customer', 'product'] as DistributionEntityType[]).map((v) => ({
    value: v,
    label: distributionEntityLabel(v),
  })),
];

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'すべてのイベント' },
  ...OUTBOX_EVENT_TYPE_VALUES.map((v: OutboxEventType) => ({
    value: v,
    label: outboxEventTypeLabel(v),
  })),
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'すべての配信状態' },
  ...DELIVERY_STATUS_VALUES.map((v: DeliveryStatus) => ({
    value: v,
    label: deliveryStatusLabel(v),
  })),
];

const WINDOW_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: 'すべての期間' },
  { value: '1', label: '直近24時間' },
  { value: '7', label: '直近7日' },
  { value: '30', label: '直近30日' },
];

/**
 * Distribution / integration page (Issue #12): アウトボックスのイベントフィード、
 * 有効レコードのCSV/JSONエクスポート、Webhook配信先の設定（PoCでは送信ログのみ）。
 * Thin container — all orchestration lives in `useDistributionPage`.
 */
export function DistributionPage() {
  const vm = useDistributionPage();

  if (vm.loading) return <LoadingState />;
  if (vm.error) return <ErrorState message={vm.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="配信・連携"
        description="マスタの変更を配信イベント（アウトボックス）として記録し、下流システムへ連携します。イベントの確認・手動配信、有効レコードのCSV/JSONエクスポート、Webhook配信先の設定ができます。"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void vm.reload();
            }}
          >
            再読み込み
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="イベント総数" value={vm.counts.total} />
        <StatCard label="未配信" value={vm.counts.pending} accent="warning" />
        <StatCard label="配信済み" value={vm.counts.delivered} accent="positive" />
        <StatCard label="失敗" value={vm.counts.failed} accent="danger" />
      </div>

      {vm.actionError && <ErrorState message={vm.actionError} />}
      {vm.lastMessage && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          {vm.lastMessage}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">イベントフィード</h2>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              label="マスタ"
              value={vm.entityFilter}
              options={ENTITY_OPTIONS}
              onChange={(v) =>
                vm.setEntityFilter(v as 'all' | DistributionEntityType)
              }
              className="min-w-[160px]"
            />
            <SelectField
              label="イベント種別"
              value={vm.eventTypeFilter}
              options={EVENT_TYPE_OPTIONS}
              onChange={(v) =>
                vm.setEventTypeFilter(v as 'all' | OutboxEventType)
              }
              className="min-w-[160px]"
            />
            <SelectField
              label="配信状態"
              value={vm.statusFilter}
              options={STATUS_OPTIONS}
              onChange={(v) => vm.setStatusFilter(v as 'all' | DeliveryStatus)}
              className="min-w-[160px]"
            />
            <SelectField
              label="期間"
              value={String(vm.windowDays)}
              options={WINDOW_OPTIONS}
              onChange={(v) =>
                vm.setWindowDays(Number(v) as EventWindowDays)
              }
              className="min-w-[140px]"
            />
          </div>
          {vm.canManageDelivery && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                void vm.deliverAllVisible();
              }}
            >
              表示中の未配信を一括配信
            </Button>
          )}
        </div>

        <OutboxEventFeed
          events={vm.events}
          canManage={vm.canManageDelivery}
          updatingId={vm.updatingId}
          onMarkDelivered={(id) => {
            void vm.markDelivered(id);
          }}
          onMarkFailed={(id) => {
            void vm.markFailed(id);
          }}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">エクスポート</h2>
        <ExportPanel
          activeCustomerCount={vm.activeCustomerCount}
          activeProductCount={vm.activeProductCount}
          onExportCustomersCsv={vm.exportCustomersCsv}
          onExportProductsCsv={vm.exportProductsCsv}
          onExportCustomersJson={vm.exportCustomersJson}
          onExportProductsJson={vm.exportProductsJson}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Webhook連携</h2>
        <WebhookTargetCard
          webhook={vm.webhook}
          signaturePreview={vm.signaturePreview}
          canManage={vm.canManageDelivery}
          sending={vm.sending}
          testResult={vm.testResult}
          onUrlChange={vm.setWebhookUrl}
          onSecretChange={vm.setWebhookSecret}
          onActiveChange={vm.setWebhookActive}
          onSendTest={() => {
            void vm.sendTest();
          }}
        />
      </section>
    </div>
  );
}
