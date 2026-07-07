import { useCallback, useMemo, useState } from 'react';

import {
  categoryDisplayName,
  categoryToInput,
  emptyCategoryInput,
  type Category,
  type CategoryInput,
} from '@/domain/models/category';
import { canModifyAny } from '@/domain/policies/access-policy';
import {
  buildForest,
  childrenOf,
  flattenForest,
  parentCandidates,
  wouldCreateCycle,
} from '@/domain/policies/hierarchy-policy';
import { toMessage } from '@/lib/errors';
import { useAuth } from '@/usecase/auth/use-auth';
import { useProducts } from '@/usecase/products/use-products';

import { useCategories } from './use-categories';

const INDENT = '　'; // full-width space (U+3000) for indented tree rendering

/** A category flattened for indented tree rendering with usage metadata. */
export interface CategoryTreeRow {
  id: string;
  depth: number;
  code: string;
  name: string;
  displayName: string;
  childCount: number;
  productCount: number;
  canDelete: boolean;
  deleteBlockReason?: string;
}

/** A selectable parent option (indented by depth). */
export interface CategoryParentOption {
  id: string;
  label: string;
  depth: number;
}

/** The open create/edit form state. Null when the form is closed. */
export interface CategoryFormState {
  mode: 'create' | 'edit';
  editingId?: string;
  input: CategoryInput;
  parentOptions: CategoryParentOption[];
  error: string | null;
  saving: boolean;
}

export interface CategoryManagementPageModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  canManage: boolean;
  rows: CategoryTreeRow[];
  total: number;
  form: CategoryFormState | null;
  openCreate: (parentId?: string) => void;
  openEdit: (id: string) => void;
  cancelForm: () => void;
  setField: (field: keyof CategoryInput, value: string) => void;
  submit: () => Promise<boolean>;
  remove: (id: string) => Promise<void>;
}

interface FormDraft {
  mode: 'create' | 'edit';
  editingId?: string;
  input: CategoryInput;
  error: string | null;
  saving: boolean;
}

/**
 * View-model for the product-category master page. Composes the category store,
 * the pure hierarchy policy (tree + cycle guard), the product store (delete
 * reference guard), and RBAC. All orchestration lives here; the page and its
 * components stay render-only.
 */
export function useCategoryManagementPage(): CategoryManagementPageModel {
  const {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const { products } = useProducts();
  const { actor } = useAuth();

  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = actor ? canModifyAny(actor) : false;

  /** How many products reference each category id. */
  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (p.categoryId) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const rows = useMemo<CategoryTreeRow[]>(() => {
    return flattenForest(buildForest(categories)).map(({ value, depth }) => {
      const childCount = childrenOf(categories, value.id).length;
      const productCount = productCounts.get(value.id) ?? 0;
      const blockReason =
        childCount > 0
          ? '子カテゴリが存在します'
          : productCount > 0
            ? '製品が割り当てられています'
            : undefined;
      return {
        id: value.id,
        depth,
        code: value.code,
        name: value.name,
        displayName: categoryDisplayName(value),
        childCount,
        productCount,
        canDelete: !blockReason,
        deleteBlockReason: blockReason,
      };
    });
  }, [categories, productCounts]);

  const parentOptionsFor = useCallback(
    (editingId?: string): CategoryParentOption[] => {
      const base: Category[] = editingId
        ? parentCandidates(categories, editingId)
        : [...categories];
      return flattenForest(buildForest(base)).map(({ value, depth }) => ({
        id: value.id,
        label: `${INDENT.repeat(depth)}${categoryDisplayName(value)}`,
        depth,
      }));
    },
    [categories]
  );

  const openCreate = useCallback(
    (parentId?: string) => {
      setActionError(null);
      setDraft({
        mode: 'create',
        input: { ...emptyCategoryInput(), parentId },
        error: null,
        saving: false,
      });
    },
    []
  );

  const openEdit = useCallback(
    (id: string) => {
      const target = categories.find((c) => c.id === id);
      if (!target) return;
      setActionError(null);
      setDraft({
        mode: 'edit',
        editingId: id,
        input: categoryToInput(target),
        error: null,
        saving: false,
      });
    },
    [categories]
  );

  const cancelForm = useCallback(() => setDraft(null), []);

  const setField = useCallback(
    (field: keyof CategoryInput, value: string) => {
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              input: {
                ...prev.input,
                [field]: field === 'parentId' && value === '' ? undefined : value,
              },
              error: null,
            }
          : prev
      );
    },
    []
  );

  const submit = useCallback(async (): Promise<boolean> => {
    if (!draft) return false;
    const code = draft.input.code.trim();
    const name = draft.input.name.trim();
    if (!code) {
      setDraft({ ...draft, error: 'カテゴリコードを入力してください。' });
      return false;
    }
    if (!name) {
      setDraft({ ...draft, error: 'カテゴリ名を入力してください。' });
      return false;
    }
    const duplicateCode = categories.some(
      (c) =>
        c.id !== draft.editingId &&
        c.code.trim().toLowerCase() === code.toLowerCase()
    );
    if (duplicateCode) {
      setDraft({ ...draft, error: `カテゴリコード「${code}」は既に使用されています。` });
      return false;
    }
    if (
      draft.mode === 'edit' &&
      draft.editingId &&
      wouldCreateCycle(categories, draft.editingId, draft.input.parentId)
    ) {
      setDraft({
        ...draft,
        error: '自分自身または子孫を親に設定することはできません。',
      });
      return false;
    }

    setDraft({ ...draft, saving: true, error: null });
    try {
      const payload: CategoryInput = {
        code,
        name,
        parentId: draft.input.parentId,
        description: draft.input.description?.trim() || undefined,
      };
      if (draft.mode === 'edit' && draft.editingId) {
        await updateCategory(draft.editingId, payload);
      } else {
        await createCategory(payload);
      }
      setDraft(null);
      return true;
    } catch (err) {
      setDraft({ ...draft, saving: false, error: toMessage(err) });
      return false;
    }
  }, [draft, categories, createCategory, updateCategory]);

  const remove = useCallback(
    async (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (row && !row.canDelete) {
        setActionError(
          `「${row.name}」は削除できません（${row.deleteBlockReason}）。`
        );
        return;
      }
      setActionError(null);
      try {
        await deleteCategory(id);
      } catch (err) {
        setActionError(toMessage(err));
      }
    },
    [rows, deleteCategory]
  );

  const form: CategoryFormState | null = draft
    ? {
        mode: draft.mode,
        editingId: draft.editingId,
        input: draft.input,
        parentOptions: parentOptionsFor(draft.editingId),
        error: draft.error,
        saving: draft.saving,
      }
    : null;

  return {
    loading,
    error,
    actionError,
    canManage,
    rows,
    total: categories.length,
    form,
    openCreate,
    openEdit,
    cancelForm,
    setField,
    submit,
    remove,
  };
}
