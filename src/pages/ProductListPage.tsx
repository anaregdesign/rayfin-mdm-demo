import { useNavigate } from 'react-router-dom';

import { ProductFilters } from '@/components/product/ProductFilters';
import { ProductTable } from '@/components/product/ProductTable';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { useProductListPage } from '@/usecase/products/use-product-list-page';

/** Product master list: search/filter/sort, KPIs, and row navigation. */
export function ProductListPage() {
  const vm = useProductListPage();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="製品マスタ"
        description="製品マスタデータの検索・登録・ガバナンス管理"
        actions={
          <Button onClick={() => navigate('/products/new')}>新規登録</Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="総製品数" value={vm.view.total} />
        <StatCard label="表示中" value={vm.view.filteredCount} />
        <StatCard
          label="重複候補"
          value={vm.view.duplicateCount}
          accent={vm.view.duplicateCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <ProductFilters
        search={vm.filters.search}
        status={vm.filters.status}
        sort={vm.filters.sort}
        onSearch={vm.setSearch}
        onStatusFilter={vm.setStatusFilter}
        onSort={vm.setSort}
      />

      {vm.actionError && <ErrorState message={vm.actionError} />}

      {vm.loading ? (
        <LoadingState />
      ) : vm.error ? (
        <ErrorState message={vm.error} action={
          <Button variant="secondary" size="sm" onClick={() => vm.reload()}>
            再読み込み
          </Button>
        } />
      ) : vm.view.items.length === 0 ? (
        <EmptyState
          title="製品が見つかりません"
          description="検索条件を変更するか、新しい製品を登録してください。"
          action={
            <Button onClick={() => navigate('/products/new')}>新規登録</Button>
          }
        />
      ) : (
        <ProductTable
          items={vm.view.items}
          onOpen={(id) => navigate(`/products/${id}`)}
          onEdit={(id) => navigate(`/products/${id}/edit`)}
        />
      )}
    </div>
  );
}
