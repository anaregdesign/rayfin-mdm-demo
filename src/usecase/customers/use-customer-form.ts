import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Customer, CustomerInput } from '@/domain/models/customer';
import {
  customerToInput,
  emptyCustomerInput,
} from '@/domain/models/customer';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { FieldErrors } from '@/domain/models/validation';
import { findCustomerMatchesForInput } from '@/domain/policies/duplicate-policy';
import {
  validateCustomerInput,
  type CustomerField,
} from '@/domain/policies/customer-validation';
import { toMessage } from '@/lib/errors';

import { useCustomers } from './use-customers';

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
  setField: <K extends CustomerField>(key: K, value: CustomerInput[K]) => void;
  submit: () => Promise<Customer | null>;
}

/**
 * Manages the customer create/edit form: draft state, live validation and
 * duplicate warnings (both domain policies), and the save command. Business
 * rules stay in the domain — the form only renders what this exposes.
 */
export function useCustomerForm(editId?: string): CustomerFormViewModel {
  const store = useCustomers();
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

  const setField = useCallback(
    <K extends CustomerField>(key: K, value: CustomerInput[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
      setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
    },
    []
  );

  const submit = useCallback(async () => {
    setSubmitAttempted(true);
    if (!validation.valid) return null;
    setSaving(true);
    setSubmitError(null);
    try {
      const saved =
        editId != null
          ? await store.updateCustomer(editId, draft)
          : await store.createCustomer(draft);
      return saved;
    } catch (err) {
      setSubmitError(toMessage(err));
      return null;
    } finally {
      setSaving(false);
    }
  }, [validation.valid, editId, store, draft]);

  const isEdit = editId != null;
  const notFound = isEdit && !store.loading && !existing;

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
    setField,
    submit,
  };
}
