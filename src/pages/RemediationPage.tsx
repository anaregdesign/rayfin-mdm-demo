import { Button } from '@/components/shared/Button';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { SelectField } from '@/components/shared/SelectField';
import { RemediationQueue } from '@/components/quality/RemediationQueue';
import {
  useRemediationPage,
  type RemediationEntityFilter,
} from '@/usecase/quality/use-remediation-page';

const ENTITY_OPTIONS: { value: RemediationEntityFilter; label: string }[] = [
  { value: 'all', label: 'すべてのマスタ' },
  { value: 'customer', label: '顧客マスタ' },
  { value: 'product', label: '製品マスタ' },
];

/**
 * Remediation queue page (Issue #11): surfaces records needing data-quality
 * remediation —表記ゆれの標準化候補、低品質、必須未入力 — with one-click
 * cleansing (single + bulk). Thin container; all orchestration lives in the
 * view-model.
 */
export function RemediationPage() {
  const vm = useRemediationPage();

  if (vm.loading) return <LoadingState />;
  if (vm.error) return <ErrorState message={vm.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="是正キュー"
        description="表記ゆれの標準化候補、品質スコアの低いレコード、必須項目が未入力のレコードを一覧します。標準化候補はワンクリックで適用できます。"
      />

      {!vm.canApplyAny && (
        <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
          標準化を適用するには、対象レコードを編集できるデータスチュワードまたは管理者ロールが必要です。閲覧のみ可能です。
        </p>
      )}

      {vm.actionError && <ErrorState message={vm.actionError} />}

      {vm.lastSummary && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          {vm.lastSummary}
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <SelectField
            label="対象マスタ"
            value={vm.entityFilter}
            options={ENTITY_OPTIONS}
            onChange={(value) =>
              vm.setEntityFilter(value as RemediationEntityFilter)
            }
            className="min-w-[180px]"
          />
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={vm.onlyWithSuggestions}
              onChange={(e) => vm.setOnlyWithSuggestions(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            標準化候補があるものだけ表示
          </label>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            対象 {vm.totalCount}件（標準化候補 {vm.suggestionCount}件）中 {vm.filteredCount}件を表示
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              void vm.applyAllVisible();
            }}
            disabled={!vm.canApplyAny || vm.bulkApplying}
          >
            {vm.bulkApplying ? '適用中…' : '表示中の標準化を一括適用'}
          </Button>
        </div>
      </div>

      <RemediationQueue
        rows={vm.rows}
        bulkApplying={vm.bulkApplying}
        onApply={(target) => {
          void vm.apply(target);
        }}
      />
    </div>
  );
}
