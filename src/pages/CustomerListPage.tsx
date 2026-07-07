import { useNavigate } from 'react-router-dom';

import { CustomerFilters } from '@/components/customer/CustomerFilters';
import { CustomerTable } from '@/components/customer/CustomerTable';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { useCustomerListPage } from '@/usecase/customers/use-customer-list-page';

/** Customer master list: search/filter/sort, KPIs, and row navigation. */
export function CustomerListPage() {
  const vm = useCustomerListPage();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="顧客マスタ"
        description="顧客マスタデータの検索・登録・ガバナンス管理"
        actions={
          <Button onClick={() => navigate('/customers/new')}>新規登録</Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="総顧客数" value={vm.view.total} />
        <StatCard label="表示中" value={vm.view.filteredCount} />
        <StatCard
          label="重複候補"
          value={vm.view.duplicateCount}
          accent={vm.view.duplicateCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <CustomerFilters
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
          title="顧客が見つかりません"
          description="検索条件を変更するか、新しい顧客を登録してください。"
          action={
            <Button onClick={() => navigate('/customers/new')}>新規登録</Button>
          }
        />
      ) : (
        <CustomerTable
          items={vm.view.items}
          onOpen={(id) => navigate(`/customers/${id}`)}
          onEdit={(id) => navigate(`/customers/${id}/edit`)}
        />
      )}
    </div>
  );
}
