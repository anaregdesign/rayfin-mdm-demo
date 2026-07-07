import { SearchInput } from '@/components/shared/SearchInput';
import { SelectField } from '@/components/shared/SelectField';
import {
  CUSTOMER_STATUS_META,
  CUSTOMER_STATUS_VALUES,
} from '@/domain/models/master-status';
import type {
  CustomerSortKey,
  CustomerStatusFilter,
} from '@/usecase/customers/selectors';

interface CustomerFiltersProps {
  search: string;
  status: CustomerStatusFilter;
  sort: CustomerSortKey;
  onSearch: (value: string) => void;
  onStatusFilter: (value: CustomerStatusFilter) => void;
  onSort: (value: CustomerSortKey) => void;
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

/** Search + status + sort controls for the customer list. */
export function CustomerFilters({
  search,
  status,
  sort,
  onSearch,
  onStatusFilter,
  onSort,
}: CustomerFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        value={sort}
        options={SORT_OPTIONS}
        onChange={(v) => onSort(v as CustomerSortKey)}
      />
    </div>
  );
}
