import { CategoryForm } from '@/components/category/CategoryForm';
import { HierarchyTree } from '@/components/category/HierarchyTree';
import { Button } from '@/components/shared/Button';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { useCategoryManagementPage } from '@/usecase/categories/use-category-management-page';

/**
 * Product category master screen: manage the reference hierarchy that product
 * records can be assigned to. Thin container — all orchestration is in the VM.
 */
export function CategoryManagementPage() {
  const vm = useCategoryManagementPage();

  if (vm.loading) return <LoadingState />;
  if (vm.error) return <ErrorState message={vm.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="カテゴリ管理"
        description="製品マスタが参照するカテゴリ階層を管理します。階層はドリルダウン集計や絞り込みに利用されます。"
        actions={
          vm.canManage ? (
            <Button onClick={() => vm.openCreate()}>新規カテゴリ</Button>
          ) : undefined
        }
      />

      {!vm.canManage && (
        <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
          カテゴリ階層を編集するには、データスチュワードまたは管理者ロールが必要です。閲覧のみ可能です。
        </p>
      )}

      {vm.actionError && <ErrorState message={vm.actionError} />}

      {vm.form && (
        <CategoryForm
          form={vm.form}
          onField={vm.setField}
          onSubmit={vm.submit}
          onCancel={vm.cancelForm}
        />
      )}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>登録カテゴリ数: {vm.total}件</span>
      </div>

      <HierarchyTree
        rows={vm.rows}
        canManage={vm.canManage}
        onAddChild={(parentId) => vm.openCreate(parentId)}
        onEdit={vm.openEdit}
        onDelete={vm.remove}
      />
    </div>
  );
}
