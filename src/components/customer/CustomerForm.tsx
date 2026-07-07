import { Button } from '@/components/shared/Button';
import { DuplicatePanel } from '@/components/shared/DuplicatePanel';
import { ErrorState } from '@/components/shared/ErrorState';
import { SelectField } from '@/components/shared/SelectField';
import { TextAreaField } from '@/components/shared/TextAreaField';
import { TextField } from '@/components/shared/TextField';
import type {
  CustomerInput,
  CustomerType,
} from '@/domain/models/customer';
import {
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPE_VALUES,
} from '@/domain/models/customer';
import type { DuplicatePair } from '@/domain/models/duplicate';
import {
  CUSTOMER_STATUS_META,
  CUSTOMER_STATUS_VALUES,
  type CustomerStatus,
} from '@/domain/models/master-status';
import type { FieldErrors } from '@/domain/models/validation';
import type { CustomerField } from '@/domain/policies/customer-validation';

interface CustomerFormProps {
  draft: CustomerInput;
  errors: FieldErrors<CustomerField>;
  duplicateMatches: DuplicatePair[];
  saving: boolean;
  submitError: string | null;
  isEdit: boolean;
  onField: <K extends CustomerField>(key: K, value: CustomerInput[K]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS = CUSTOMER_TYPE_VALUES.map((t) => ({
  value: t,
  label: CUSTOMER_TYPE_LABELS[t],
}));

const STATUS_OPTIONS = CUSTOMER_STATUS_VALUES.map((s) => ({
  value: s,
  label: CUSTOMER_STATUS_META[s].label,
}));

/** Presentational customer create/edit form. All rules come from the VM. */
export function CustomerForm({
  draft,
  errors,
  duplicateMatches,
  saving,
  submitError,
  isEdit,
  onField,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
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
            label="顧客コード"
            required
            value={draft.code}
            onChange={(v) => onField('code', v)}
            error={errors.code}
            placeholder="例: CUST-0001"
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
            label="顧客区分"
            required
            value={draft.customerType}
            options={TYPE_OPTIONS}
            onChange={(v) => onField('customerType', v as CustomerType)}
          />
          <TextField
            label="業種"
            value={draft.industry ?? ''}
            onChange={(v) => onField('industry', v)}
          />
          <TextField
            label="メールアドレス"
            type="email"
            value={draft.email ?? ''}
            onChange={(v) => onField('email', v)}
            error={errors.email}
          />
          <TextField
            label="電話番号"
            value={draft.phone ?? ''}
            onChange={(v) => onField('phone', v)}
          />
          <TextField
            label="ウェブサイト"
            value={draft.website ?? ''}
            onChange={(v) => onField('website', v)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">住所</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="郵便番号"
            value={draft.postalCode ?? ''}
            onChange={(v) => onField('postalCode', v)}
          />
          <TextField
            label="都道府県"
            value={draft.prefecture ?? ''}
            onChange={(v) => onField('prefecture', v)}
          />
          <TextField
            label="市区町村"
            value={draft.city ?? ''}
            onChange={(v) => onField('city', v)}
          />
          <TextField
            label="番地・建物"
            className="sm:col-span-2"
            value={draft.addressLine ?? ''}
            onChange={(v) => onField('addressLine', v)}
          />
          <TextField
            label="国"
            required
            value={draft.country}
            onChange={(v) => onField('country', v)}
            error={errors.country}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          企業情報・ガバナンス
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="税務ID・法人番号"
            value={draft.taxId ?? ''}
            onChange={(v) => onField('taxId', v)}
          />
          <TextField
            label="年間売上"
            type="number"
            min={0}
            value={draft.annualRevenue?.toString() ?? ''}
            onChange={(v) =>
              onField('annualRevenue', v.trim() === '' ? undefined : Number(v))
            }
            error={errors.annualRevenue}
          />
          <SelectField
            label="ステータス"
            required
            value={draft.status}
            options={STATUS_OPTIONS}
            onChange={(v) => onField('status', v as CustomerStatus)}
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
