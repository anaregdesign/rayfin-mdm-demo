import { SearchInput } from '@/components/shared/SearchInput';
import { SelectField } from '@/components/shared/SelectField';
import {
  PRODUCT_STATUS_META,
  PRODUCT_STATUS_VALUES,
} from '@/domain/models/master-status';
import type {
  ProductSortKey,
  ProductStatusFilter,
  ProductQualityFilter,
} from '@/usecase/products/selectors';

interface ProductFiltersProps {
  search: string;
  status: ProductStatusFilter;
  sort: ProductSortKey;
  /** Low-quality quick filter (Issue #13 drill-down target). */
  quality: ProductQualityFilter;
  onSearch: (value: string) => void;
  onStatusFilter: (value: ProductStatusFilter) => void;
  onSort: (value: ProductSortKey) => void;
  onQuality: (value: ProductQualityFilter) => void;
}

const SORT_OPTIONS: { value: ProductSortKey; label: string }[] = [
  { value: 'updated', label: '更新日（新しい順）' },
  { value: 'name', label: '名称' },
  { value: 'sku', label: 'SKU' },
  { value: 'price', label: '単価（高い順）' },
  { value: 'quality', label: '品質スコア（低い順）' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'すべてのステータス' },
  ...PRODUCT_STATUS_VALUES.map((s) => ({
    value: s,
    label: PRODUCT_STATUS_META[s].label,
  })),
];

const QUALITY_OPTIONS: { value: ProductQualityFilter; label: string }[] = [
  { value: 'all', label: 'すべての品質' },
  { value: 'low', label: '低品質のみ' },
];

/** Search + status + sort controls for the product list. */
export function ProductFilters({
  search,
  status,
  sort,
  quality,
  onSearch,
  onStatusFilter,
  onSort,
  onQuality,
}: ProductFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder="名称・SKU・ブランドで検索"
        className="sm:col-span-1"
      />
      <SelectField
        label=""
        value={status}
        options={STATUS_OPTIONS}
        onChange={(v) => onStatusFilter(v as ProductStatusFilter)}
      />
      <SelectField
        label=""
        value={quality}
        options={QUALITY_OPTIONS}
        onChange={(v) => onQuality(v as ProductQualityFilter)}
      />
      <SelectField
        label=""
        value={sort}
        options={SORT_OPTIONS}
        onChange={(v) => onSort(v as ProductSortKey)}
      />
    </div>
  );
}
