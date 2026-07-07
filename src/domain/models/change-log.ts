import {
  CUSTOMER_TYPE_LABELS,
  type CustomerType,
} from './customer';
import {
  CUSTOMER_STATUS_META,
  PRODUCT_STATUS_META,
  type CustomerStatus,
  type ProductStatus,
} from './master-status';
import {
  PRODUCT_CATEGORY_LABELS,
  UNIT_OF_MEASURE_LABELS,
  type ProductCategory,
  type UnitOfMeasure,
} from './product';

/**
 * Change-history domain model. A `ChangeEntry` is one immutable audit record of
 * how a master record changed over time — the raw material for the detail
 * screen's history timeline and (later) analytics trends. This type has no
 * persistence decorators and no SDK dependency; the infrastructure adapter maps
 * the Rayfin `ChangeLog` entity to/from it.
 */

export type ChangeEntityType = 'customer' | 'product';

export type ChangeAction = 'create' | 'update' | 'status' | 'delete';

/** One field-level before → after difference within a change entry. */
export interface FieldChange {
  field: string;
  before: ChangeValue;
  after: ChangeValue;
}

/** The primitive shapes a master field value can take in the audit log. */
export type ChangeValue = string | number | boolean | null | undefined;

export interface ChangeEntry {
  id: string;
  entityType: ChangeEntityType;
  entityId: string;
  action: ChangeAction;
  /** Field-level diffs (empty for pure create/delete). */
  changes: FieldChange[];
  actorId?: string;
  occurredAt: Date;
  /** Short human summary, e.g. "ステータスを 有効 に変更". */
  summary?: string;
}

export const CHANGE_ACTION_LABELS: Record<ChangeAction, string> = {
  create: '新規作成',
  update: '更新',
  status: 'ステータス変更',
  delete: '削除',
};

export function changeActionLabel(action: ChangeAction): string {
  return CHANGE_ACTION_LABELS[action];
}

/** Semantic tone for the action badge, reusing the shared status tones. */
export function changeActionTone(
  action: ChangeAction
): 'neutral' | 'positive' | 'warning' | 'danger' | 'muted' {
  switch (action) {
    case 'create':
      return 'positive';
    case 'update':
      return 'neutral';
    case 'status':
      return 'warning';
    case 'delete':
      return 'danger';
  }
}

const CUSTOMER_FIELD_LABELS: Record<string, string> = {
  code: '顧客コード',
  name: '名称',
  nameKana: '名称カナ',
  customerType: '顧客区分',
  industry: '業種',
  email: 'メール',
  phone: '電話',
  postalCode: '郵便番号',
  prefecture: '都道府県',
  city: '市区町村',
  addressLine: '住所',
  country: '国',
  website: 'Webサイト',
  taxId: '法人番号',
  annualRevenue: '年商',
  status: 'ステータス',
  steward: 'スチュワード',
  notes: '備考',
};

const PRODUCT_FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  name: '名称',
  nameKana: '名称カナ',
  category: 'カテゴリ',
  brand: 'ブランド',
  description: '説明',
  unitPrice: '単価',
  currency: '通貨',
  unitOfMeasure: '単位',
  barcode: 'バーコード',
  supplierName: '仕入先',
  status: 'ステータス',
  steward: 'スチュワード',
  notes: '備考',
};

/** Japanese label for a changed field, falling back to the raw key. */
export function changeFieldLabel(
  entityType: ChangeEntityType,
  field: string
): string {
  const map =
    entityType === 'customer' ? CUSTOMER_FIELD_LABELS : PRODUCT_FIELD_LABELS;
  return map[field] ?? field;
}

/**
 * Human-readable label for a changed value, resolving coded enum fields
 * (status/type/category/currency/unit) to their Japanese labels.
 */
export function changeValueLabel(
  entityType: ChangeEntityType,
  field: string,
  value: ChangeValue
): string {
  if (value === null || value === undefined || value === '') return '（空）';
  if (field === 'status') {
    const meta =
      entityType === 'customer'
        ? CUSTOMER_STATUS_META[value as CustomerStatus]
        : PRODUCT_STATUS_META[value as ProductStatus];
    if (meta) return meta.label;
  }
  if (entityType === 'customer' && field === 'customerType') {
    return CUSTOMER_TYPE_LABELS[value as CustomerType] ?? String(value);
  }
  if (entityType === 'product' && field === 'category') {
    return PRODUCT_CATEGORY_LABELS[value as ProductCategory] ?? String(value);
  }
  if (entityType === 'product' && field === 'unitOfMeasure') {
    return UNIT_OF_MEASURE_LABELS[value as UnitOfMeasure] ?? String(value);
  }
  return String(value);
}
