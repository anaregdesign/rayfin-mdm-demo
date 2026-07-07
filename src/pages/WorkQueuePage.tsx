import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { SelectField } from '@/components/shared/SelectField';
import { StewardAssignPicker } from '@/components/workqueue/StewardAssignPicker';
import { StewardWorkloadTable } from '@/components/workqueue/StewardWorkloadTable';
import { WorkQueueList } from '@/components/workqueue/WorkQueueList';
import {
  TASK_REASON_LABELS,
  TASK_REASON_VALUES,
} from '@/domain/models/steward-task';
import {
  useStewardWorkqueuePage,
  type ReasonFilter,
  type WorkQueueScope,
} from '@/usecase/workqueue/use-steward-workqueue';

const SCOPE_OPTIONS: { value: WorkQueueScope; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'mine', label: '自分の担当' },
  { value: 'unassigned', label: '未割当' },
];

const REASON_OPTIONS = [
  { value: 'all', label: 'すべての理由' },
  ...TASK_REASON_VALUES.map((reason) => ({
    value: reason,
    label: TASK_REASON_LABELS[reason],
  })),
];

/**
 * Stewardship work queue (Issue #10): a prioritized list of records needing
 * attention (low quality / duplicates / stale drafts / missing required),
 * with reason filters and permission-guarded bulk steward assignment. Thin
 * container — all orchestration lives in the view-model.
 */
export function WorkQueuePage() {
  const vm = useStewardWorkqueuePage();

  if (vm.loading) return <LoadingState />;
  if (vm.error) return <ErrorState message={vm.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ワークキュー"
        description="データスチュワードが対応すべきレコードを、検出理由と優先度つきで一覧します。編集・統合へワンクリックで遷移できます。"
      />

      {!vm.canManage && (
        <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
          担当者の割り当てを行うには、データスチュワードまたは管理者ロールが必要です。閲覧のみ可能です。
        </p>
      )}

      {vm.actionError && <ErrorState message={vm.actionError} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">対象</p>
            <div className="inline-flex overflow-hidden rounded-md ring-1 ring-inset ring-slate-300">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => vm.setScope(option.value)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    vm.scope === option.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <SelectField
            label="検出理由"
            value={vm.reasonFilter}
            options={REASON_OPTIONS}
            onChange={(value) => vm.setReasonFilter(value as ReasonFilter)}
            className="min-w-[180px]"
          />
        </div>
        <p className="text-sm text-slate-500">
          未対応 {vm.totalCount}件中 {vm.filteredCount}件を表示
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {vm.reasonCounts.map((rc) => (
          <button
            key={rc.reason}
            onClick={() =>
              vm.setReasonFilter(
                vm.reasonFilter === rc.reason ? 'all' : rc.reason
              )
            }
            className="focus:outline-none"
            title={`${rc.label}でフィルタ`}
          >
            <Badge tone={rc.tone}>
              {rc.label} {rc.count}
            </Badge>
          </button>
        ))}
      </div>

      {vm.canManage && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={vm.selectAllVisible}
              disabled={vm.filteredCount === 0}
            >
              表示中を全選択
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={vm.clearSelection}
              disabled={vm.selectedIds.length === 0}
            >
              選択解除
            </Button>
          </div>
          <StewardAssignPicker
            value={vm.assignTarget}
            onChange={vm.setAssignTarget}
            onAssign={() => {
              void vm.assign();
            }}
            selectedCount={vm.selectedIds.length}
            busy={vm.assigning}
          />
        </div>
      )}

      <WorkQueueList
        rows={vm.rows}
        canManage={vm.canManage}
        onToggleSelect={vm.toggleSelect}
      />

      <StewardWorkloadTable
        title="スチュワード別 未対応件数"
        workloads={vm.workloads}
        description="担当者ごとの未対応タスク件数です。未割当のレコードは早めにトリアージしてください。"
      />
    </div>
  );
}
