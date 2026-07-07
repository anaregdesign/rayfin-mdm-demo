/**
 * Result of a create/edit form submission. A discriminated union so the page
 * can branch without inspecting nulls: a direct save yields the record, an
 * approval-gated save yields `requested`, and validation/errors are explicit.
 */
export type SubmitOutcome<T> =
  | { status: 'saved'; record: T }
  | { status: 'requested' }
  | { status: 'invalid' }
  | { status: 'error' };
