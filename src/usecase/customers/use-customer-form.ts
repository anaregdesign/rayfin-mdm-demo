import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Customer, CustomerInput } from '@/domain/models/customer';
import {
  customerDisplayName,
  customerToInput,
  emptyCustomerInput,
} from '@/domain/models/customer';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { FieldErrors } from '@/domain/models/validation';
import { findCustomerMatchesForInput } from '@/domain/policies/duplicate-policy';
import {
  buildForest,
  flattenForest,
  parentCandidates,
} from '@/domain/policies/hierarchy-policy';
import {
  validateCustomerInput,
  type CustomerField,
} from '@/domain/policies/customer-validation';
import { can } from '@/domain/policies/access-policy';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';
import type { SubmitOutcome } from '@/usecase/shared/submit-outcome';

import { useCustomers } from './use-customers';
import { useAuth } from '@/usecase/auth/use-auth';

/** Indented parent option for the relation picker (cycle-safe candidates). */
export interface CustomerParentOption {
  id: string;
  label: string;
  depth: number;
}

export interface CustomerFormViewModel {
  draft: CustomerInput;
  errors: FieldErrors<CustomerField>;
  isValid: boolean;
  duplicateMatches: DuplicatePair[];
  loading: boolean;
  saving: boolean;
  submitError: string | null;
  isEdit: boolean;
  notFound: boolean;
  /** Cycle-safe, indented parent candidates for the 親会社 picker (Issue #7). */
  parentOptions: CustomerParentOption[];
  /** False when the active role may not create (new) or edit this record. */
  permitted: boolean;
  /**
   * True when the approval workflow is engaged, so a submit raises a change
   * request for review instead of writing immediately (drives button copy).
   */
  approvalRequired: boolean;
  setField: <K extends CustomerField>(key: K, value: CustomerInput[K]) => void;
  submit: () => Promise<SubmitOutcome<Customer>>;
}

/**
 * Manages the customer create/edit form: draft state, live validation and
 * duplicate warnings (both domain policies), and the save command. Business
 * rules stay in the domain — the form only renders what this exposes.
 */
export function useCustomerForm(editId?: string): CustomerFormViewModel {
  const store = useCustomers();
  const { actor, requireApproval } = useAuth();
  const { changeRequests } = useDependencies();
  const [draft, setDraft] = useState<CustomerInput>(emptyCustomerInput);
  const [touched, setTouched] = useState<Set<CustomerField>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const existing = useMemo(
    () => (editId ? store.customers.find((c) => c.id === editId) ?? null : null),
    [store.customers, editId]
  );

  useEffect(() => {
    if (editId && !hydrated && existing) {
      setDraft(customerToInput(existing));
      setHydrated(true);
    }
  }, [editId, hydrated, existing]);

  const validation = useMemo(() => validateCustomerInput(draft), [draft]);

  const errors = useMemo<FieldErrors<CustomerField>>(() => {
    if (submitAttempted) return validation.errors;
    const visible: FieldErrors<CustomerField> = {};
    for (const key of Object.keys(validation.errors) as CustomerField[]) {
      if (touched.has(key)) visible[key] = validation.errors[key];
    }
    return visible;
  }, [validation, submitAttempted, touched]);

  const duplicateMatches = useMemo(
    () => findCustomerMatchesForInput(draft, store.customers, editId),
    [draft, store.customers, editId]
  );

  // Parent picker options: exclude merged records, then (when editing) the node
  // itself and its descendants so a relation can never form a cycle. Rendered
  // as an indented tree.
  const parentOptions = useMemo<CustomerParentOption[]>(() => {
    const selectable = store.customers.filter((c) => c.status !== 'merged');
    const candidates = editId
      ? parentCandidates(selectable, editId)
      : selectable;
    return flattenForest(buildForest(candidates)).map((node) => ({
      id: node.value.id,
      label: `${'　'.repeat(node.depth)}${customerDisplayName(node.value)}`,
      depth: node.depth,
    }));
  }, [store.customers, editId]);

  const setField = useCallback(
    <K extends CustomerField>(key: K, value: CustomerInput[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
      setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
    },
    []
  );

  const submit = useCallback(async (): Promise<SubmitOutcome<Customer>> => {
    setSubmitAttempted(true);
    if (!validation.valid) return { status: 'invalid' };
    setSaving(true);
    setSubmitError(null);
    try {
      // Approval workflow ON → raise a pending request instead of writing.
      if (requireApproval) {
        await changeRequests.raise({
          entityType: 'customer',
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
          ? await store.updateCustomer(editId, draft)
          : await store.createCustomer(draft);
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
    parentOptions,
    permitted,
    approvalRequired: requireApproval,
    setField,
    submit,
  };
}
