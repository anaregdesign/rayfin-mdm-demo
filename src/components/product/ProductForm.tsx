import { Button } from '@/components/shared/Button';
import { DuplicatePanel } from '@/components/shared/DuplicatePanel';
import { ErrorState } from '@/components/shared/ErrorState';
import { SelectField } from '@/components/shared/SelectField';
import { TextAreaField } from '@/components/shared/TextAreaField';
import { TextField } from '@/components/shared/TextField';
import type { DuplicatePair } from '@/domain/models/duplicate';
import {
  PRODUCT_STATUS_META,
  PRODUCT_STATUS_VALUES,
  type ProductStatus,
} from '@/domain/models/master-status';
import type {
  ProductCategory,
  ProductInput,
  UnitOfMeasure,
} from '@/domain/models/product';
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_VALUES,
  UNIT_OF_MEASURE_LABELS,
  UNIT_OF_MEASURE_VALUES,
} from '@/domain/models/product';
import type { FieldErrors } from '@/domain/models/validation';
import type { ProductField } from '@/domain/policies/product-validation';
import {
  CURRENCY_LABELS,
  CURRENCY_VALUES,
  type Currency,
} from '@/domain/value-objects/money';

interface ProductFormProps {
  draft: ProductInput;
  errors: FieldErrors<ProductField>;
  duplicateMatches: DuplicatePair[];
  saving: boolean;
  submitError: string | null;
  isEdit: boolean;
  onField: <K extends ProductField>(key: K, value: ProductInput[K]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const CATEGORY_OPTIONS = PRODUCT_CATEGORY_VALUES.map((c) => ({
  value: c,
  label: PRODUCT_CATEGORY_LABELS[c],
}));

const UOM_OPTIONS = UNIT_OF_MEASURE_VALUES.map((u) => ({
  value: u,
  label: UNIT_OF_MEASURE_LABELS[u],
}));

const CURRENCY_OPTIONS = CURRENCY_VALUES.map((c) => ({
  value: c,
  label: CURRENCY_LABELS[c],
}));

const STATUS_OPTIONS = PRODUCT_STATUS_VALUES.map((s) => ({
  value: s,
  label: PRODUCT_STATUS_META[s].label,
}));

/** Presentational product create/edit form. All rules come from the VM. */
export function ProductForm({
  draft,
  errors,
  duplicateMatches,
  saving,
  submitError,
  isEdit,
  onField,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="SKU"
            required
            value={draft.sku}
            onChange={(v) => onField('sku', v)}
            error={errors.sku}
            placeholder="例: SKU-0001"
          />
          <TextField
            label="名称"
            required
            value={draft.name}
            onChange={(v) => onField('name', v)}
            error={errors.name}
          />
          <TextField
            label="名称（カナ）"
            value={draft.nameKana ?? ''}
            onChange={(v) => onField('nameKana', v)}
          />
          <SelectField
            label="カテゴリ"
            required
            value={draft.category}
            options={CATEGORY_OPTIONS}
            onChange={(v) => onField('category', v as ProductCategory)}
          />
          <TextField
            label="ブランド"
            value={draft.brand ?? ''}
            onChange={(v) => onField('brand', v)}
          />
          <TextField
            label="バーコード"
            value={draft.barcode ?? ''}
            onChange={(v) => onField('barcode', v)}
          />
          <TextAreaField
            label="説明"
            className="sm:col-span-2"
            value={draft.description ?? ''}
            onChange={(v) => onField('description', v)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          価格・単位
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="単価"
            required
            type="number"
            min={0}
            value={Number.isNaN(draft.unitPrice) ? '' : draft.unitPrice.toString()}
            onChange={(v) =>
              onField('unitPrice', v.trim() === '' ? NaN : Number(v))
            }
            error={errors.unitPrice}
          />
          <SelectField
            label="通貨"
            required
            value={draft.currency}
            options={CURRENCY_OPTIONS}
            onChange={(v) => onField('currency', v as Currency)}
          />
          <SelectField
            label="単位"
            required
            value={draft.unitOfMeasure}
            options={UOM_OPTIONS}
            onChange={(v) => onField('unitOfMeasure', v as UnitOfMeasure)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          サプライヤー・ガバナンス
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="サプライヤー名"
            value={draft.supplierName ?? ''}
            onChange={(v) => onField('supplierName', v)}
          />
          <SelectField
            label="ステータス"
            required
            value={draft.status}
            options={STATUS_OPTIONS}
            onChange={(v) => onField('status', v as ProductStatus)}
          />
          <TextField
            label="データスチュワード"
            value={draft.steward ?? ''}
            onChange={(v) => onField('steward', v)}
            hint="このレコードの管理責任者"
          />
          <TextAreaField
            label="備考"
            className="sm:col-span-2"
            value={draft.notes ?? ''}
            onChange={(v) => onField('notes', v)}
          />
        </div>
      </div>

      <DuplicatePanel
        pairs={duplicateMatches}
        title="入力内容に一致する既存レコード"
      />

      {submitError && <ErrorState message={submitError} />}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          キャンセル
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? '保存中…' : isEdit ? '更新' : '登録'}
        </Button>
      </div>
    </form>
  );
}
