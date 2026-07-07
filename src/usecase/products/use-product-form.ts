import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Product, ProductInput } from '@/domain/models/product';
import { emptyProductInput, productToInput } from '@/domain/models/product';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { FieldErrors } from '@/domain/models/validation';
import { findProductMatchesForInput } from '@/domain/policies/duplicate-policy';
import {
  validateProductInput,
  type ProductField,
} from '@/domain/policies/product-validation';
import { can } from '@/domain/policies/access-policy';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';
import type { SubmitOutcome } from '@/usecase/shared/submit-outcome';

import { useProducts } from './use-products';
import { useAuth } from '@/usecase/auth/use-auth';

export interface ProductFormViewModel {
  draft: ProductInput;
  errors: FieldErrors<ProductField>;
  isValid: boolean;
  duplicateMatches: DuplicatePair[];
  loading: boolean;
  saving: boolean;
  submitError: string | null;
  isEdit: boolean;
  notFound: boolean;
  /** False when the active role may not create (new) or edit this record. */
  permitted: boolean;
  /**
   * True when the approval workflow is engaged, so a submit raises a change
   * request for review instead of writing immediately (drives button copy).
   */
  approvalRequired: boolean;
  setField: <K extends ProductField>(key: K, value: ProductInput[K]) => void;
  submit: () => Promise<SubmitOutcome<Product>>;
}

/**
 * Manages the product create/edit form: draft state, live validation and
 * duplicate warnings (both domain policies), and the save command. Business
 * rules stay in the domain — the form only renders what this exposes.
 */
export function useProductForm(editId?: string): ProductFormViewModel {
  const store = useProducts();
  const { actor, requireApproval } = useAuth();
  const { changeRequests } = useDependencies();
  const [draft, setDraft] = useState<ProductInput>(emptyProductInput);
  const [touched, setTouched] = useState<Set<ProductField>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const existing = useMemo(
    () => (editId ? store.products.find((p) => p.id === editId) ?? null : null),
    [store.products, editId]
  );

  useEffect(() => {
    if (editId && !hydrated && existing) {
      setDraft(productToInput(existing));
      setHydrated(true);
    }
  }, [editId, hydrated, existing]);

  const validation = useMemo(() => validateProductInput(draft), [draft]);

  const errors = useMemo<FieldErrors<ProductField>>(() => {
    if (submitAttempted) return validation.errors;
    const visible: FieldErrors<ProductField> = {};
    for (const key of Object.keys(validation.errors) as ProductField[]) {
      if (touched.has(key)) visible[key] = validation.errors[key];
    }
    return visible;
  }, [validation, submitAttempted, touched]);

  const duplicateMatches = useMemo(
    () => findProductMatchesForInput(draft, store.products, editId),
    [draft, store.products, editId]
  );

  const setField = useCallback(
    <K extends ProductField>(key: K, value: ProductInput[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
      setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
    },
    []
  );

  const submit = useCallback(async (): Promise<SubmitOutcome<Product>> => {
    setSubmitAttempted(true);
    if (!validation.valid) return { status: 'invalid' };
    setSaving(true);
    setSubmitError(null);
    try {
      // Approval workflow ON → raise a pending request instead of writing.
      if (requireApproval) {
        await changeRequests.raise({
          entityType: 'product',
          entityId: editId,
          operation: editId != null ? 'update' : 'create',
          payload: draft as unknown as Record<string, unknown>,
          requestedBy: actor?.email ?? actor?.id,
          summary: draft.name,
        });
        return { status: 'requested' };
      }
      const record =
        editId != null
          ? await store.updateProduct(editId, draft)
          : await store.createProduct(draft);
      return { status: 'saved', record };
    } catch (err) {
      setSubmitError(toMessage(err));
      return { status: 'error' };
    } finally {
      setSaving(false);
    }
  }, [validation.valid, editId, store, draft, requireApproval, changeRequests, actor]);

  const isEdit = editId != null;
  const notFound = isEdit && !store.loading && !existing;

  // Create needs 'create'; edit needs 'edit' on the loaded record (steward RLS).
  // Undetermined while the edit target is still loading → treat as permitted so
  // the loader shows instead of a false 403.
  const permitted = useMemo(() => {
    if (!actor) return false;
    if (!isEdit) return can(actor, 'create');
    if (!existing) return true;
    return can(actor, 'edit', existing);
  }, [actor, isEdit, existing]);

  return {
    draft,
    errors,
    isValid: validation.valid,
    duplicateMatches,
    loading: store.loading && isEdit && !hydrated,
    saving,
    submitError,
    isEdit,
    notFound,
    permitted,
    approvalRequired: requireApproval,
    setField,
    submit,
  };
}
