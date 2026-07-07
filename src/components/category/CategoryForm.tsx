import { Button } from '@/components/shared/Button';
import { ErrorState } from '@/components/shared/ErrorState';
import { ParentPicker } from '@/components/shared/ParentPicker';
import { TextAreaField } from '@/components/shared/TextAreaField';
import { TextField } from '@/components/shared/TextField';
import type { CategoryInput } from '@/domain/models/category';
import type { CategoryFormState } from '@/usecase/categories/use-category-management-page';

interface CategoryFormProps {
  form: CategoryFormState;
  onField: (field: keyof CategoryInput, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/** Presentational create/edit form for a product category node. */
export function CategoryForm({
  form,
  onField,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-slate-700">
        {form.mode === 'edit' ? 'カテゴリの編集' : 'カテゴリの新規登録'}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="カテゴリコード"
          required
          value={form.input.code}
          onChange={(v) => onField('code', v)}
          placeholder="例: CAT-ELEC"
        />
        <TextField
          label="カテゴリ名"
          required
          value={form.input.name}
          onChange={(v) => onField('name', v)}
          placeholder="例: 電子機器"
        />
        <ParentPicker
          label="親カテゴリ"
          value={form.input.parentId ?? ''}
          options={form.parentOptions}
          onChange={(v) => onField('parentId', v)}
          hint="階層の親を選択します（未選択でトップレベル）"
        />
        <TextAreaField
          label="説明"
          className="sm:col-span-2"
          value={form.input.description ?? ''}
          onChange={(v) => onField('description', v)}
        />
      </div>

      {form.error && <ErrorState message={form.error} />}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={form.saving}>
          キャンセル
        </Button>
        <Button type="submit" disabled={form.saving}>
          {form.saving ? '保存中…' : form.mode === 'edit' ? '更新' : '登録'}
        </Button>
      </div>
    </form>
  );
}
