import { SearchInput } from '@/components/shared/SearchInput';
import { SelectField } from '@/components/shared/SelectField';
import {
  CUSTOMER_STATUS_META,
  CUSTOMER_STATUS_VALUES,
} from '@/domain/models/master-status';
import type {
  CustomerSortKey,
  CustomerStatusFilter,
  CustomerQualityFilter,
} from '@/usecase/customers/selectors';
import type { CustomerHierarchyOption } from '@/usecase/customers/use-customer-list-page';

interface CustomerFiltersProps {
  search: string;
  status: CustomerStatusFilter;
  sort: CustomerSortKey;
  /** Selected hierarchy rollup ancestor (empty = all). */
  ancestor: string;
  /** Low-quality quick filter (Issue #13 drill-down target). */
  quality: CustomerQualityFilter;
  /** Indented customer tree for the rollup picker. */
  hierarchyOptions: CustomerHierarchyOption[];
  onSearch: (value: string) => void;
  onStatusFilter: (value: CustomerStatusFilter) => void;
  onSort: (value: CustomerSortKey) => void;
  onAncestor: (value: string) => void;
  onQuality: (value: CustomerQualityFilter) => void;
}

const SORT_OPTIONS: { value: CustomerSortKey; label: string }[] = [
  { value: 'updated', label: '更新日（新しい順）' },
  { value: 'name', label: '名称' },
  { value: 'code', label: '顧客コード' },
  { value: 'quality', label: '品質スコア（低い順）' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'すべてのステータス' },
  ...CUSTOMER_STATUS_VALUES.map((s) => ({
    value: s,
    label: CUSTOMER_STATUS_META[s].label,
  })),
];

const QUALITY_OPTIONS: { value: CustomerQualityFilter; label: string }[] = [
  { value: 'all', label: 'すべての品質' },
  { value: 'low', label: '低品質のみ' },
];

/** Search + status + sort + hierarchy-rollup controls for the customer list. */
export function CustomerFilters({
  search,
  status,
  sort,
  ancestor,
  quality,
  hierarchyOptions,
  onSearch,
  onStatusFilter,
  onSort,
  onAncestor,
  onQuality,
}: CustomerFiltersProps) {
  const ancestorOptions = [
    { value: '', label: 'すべての階層' },
    ...hierarchyOptions.map((o) => ({ value: o.id, label: o.label })),
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder="名称・コード・メールで検索"
        className="sm:col-span-1"
      />
      <SelectField
        label=""
        value={status}
        options={STATUS_OPTIONS}
        onChange={(v) => onStatusFilter(v as CustomerStatusFilter)}
      />
      <SelectField
        label=""
        value={ancestor}
        options={ancestorOptions}
        onChange={onAncestor}
      />
      <SelectField
        label=""
        value={quality}
        options={QUALITY_OPTIONS}
        onChange={(v) => onQuality(v as CustomerQualityFilter)}
      />
      <SelectField
        label=""
        value={sort}
        options={SORT_OPTIONS}
        onChange={(v) => onSort(v as CustomerSortKey)}
      />
    </div>
  );
}
