import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ExportButton } from '@/components/import/ExportButton';
import { ImportWizard } from '@/components/import/ImportWizard';
import { ProductFilters } from '@/components/product/ProductFilters';
import { ProductTable } from '@/components/product/ProductTable';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import {
  describeDrilldown,
  type DrilldownFilter,
} from '@/domain/models/analytics';
import type {
  ProductListFilters,
  ProductStatusFilter,
} from '@/usecase/products/selectors';
import { useProductListPage } from '@/usecase/products/use-product-list-page';

/** Map a dashboard drill-down to the product list's seed filters. */
function toSeed(drilldown?: DrilldownFilter): Partial<ProductListFilters> | undefined {
  if (!drilldown || drilldown.entity !== 'product') return undefined;
  const seed: Partial<ProductListFilters> = {};
  if (drilldown.status) seed.status = drilldown.status as ProductStatusFilter;
  if (drilldown.quality) seed.quality = drilldown.quality;
  return seed;
}

/** Product master list: search/filter/sort, KPIs, and row navigation. */
export function ProductListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const drilldown = (location.state as { drilldown?: DrilldownFilter } | null)
    ?.drilldown;
  const scoped = drilldown?.entity === 'product' ? drilldown : undefined;
  const vm = useProductListPage(toSeed(scoped));
  const [importOpen, setImportOpen] = useState(false);

  const closeImport = () => {
    setImportOpen(false);
    vm.importer.reset();
  };

  const clearDrilldown = () => {
    vm.setStatusFilter('all');
    vm.setQuality('all');
    vm.setSearch('');
    navigate(location.pathname, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="製品マスタ"
        description="製品マスタデータの検索・登録・ガバナンス管理"
        actions={
          <div className="flex flex-wrap gap-2">
            {vm.canExport && (
              <ExportButton
                count={vm.view.filteredCount}
                onExport={vm.exportCsv}
              />
            )}
            {vm.canImport && (
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                インポート
              </Button>
            )}
            {vm.canCreate && (
              <Button onClick={() => navigate('/products/new')}>新規登録</Button>
            )}
          </div>
        }
      />

      {scoped && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
          <span>
            ダッシュボードから絞り込み中:{' '}
            <strong>{describeDrilldown(scoped)}</strong>
          </span>
          <button
            type="button"
            onClick={clearDrilldown}
            className="font-medium text-sky-700 underline decoration-dotted hover:text-sky-900"
          >
            すべて表示
          </button>
        </div>
      )}

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
        quality={vm.filters.quality}
        onSearch={vm.setSearch}
        onStatusFilter={vm.setStatusFilter}
        onSort={vm.setSort}
        onQuality={vm.setQuality}
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
            vm.canCreate ? (
              <Button onClick={() => navigate('/products/new')}>新規登録</Button>
            ) : undefined
          }
        />
      ) : (
        <ProductTable
          items={vm.view.items}
          onOpen={(id) => navigate(`/products/${id}`)}
          onEdit={
            vm.canModify ? (id) => navigate(`/products/${id}/edit`) : undefined
          }
        />
      )}

      <ImportWizard
        open={importOpen}
        entityLabel="製品"
        mode={vm.importer.mode}
        fileName={vm.importer.fileName}
        parsing={vm.importer.parsing}
        parseError={vm.importer.parseError}
        preview={vm.importer.preview}
        committing={vm.importer.committing}
        outcome={vm.importer.outcome}
        onModeChange={vm.importer.setMode}
        onSelectFile={vm.importer.loadFile}
        onCommit={vm.importer.commit}
        onClose={closeImport}
        onDownloadTemplate={vm.downloadTemplate}
      />
    </div>
  );
}
