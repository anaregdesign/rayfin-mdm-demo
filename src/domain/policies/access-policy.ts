import type {
  Actor,
  ResourceAction,
  StewardedResource,
} from '@/domain/models/authz';

/**
 * Pure access-control policy — the single source of truth for "who may do
 * what" in the PoC. Composed on top of the status-based edit rules (a record
 * that is `merged`/terminal is still uneditable regardless of role); callers
 * combine both (`can(...) && canEditCustomer(status)`).
 *
 * Role capabilities:
 * - `admin`   → everything.
 * - `steward` → read/export + create/import (new records) and, for existing
 *               records, edit/delete/merge/changeStatus **only when they own the
 *               record** (steward field matches) or the record is unassigned.
 * - `viewer`  → read/export only; sensitive fields are masked.
 */

/** Normalize a free-text identity token for tolerant comparison. */
function norm(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * True when the actor is the data steward of the record. The steward column is
 * free text (name/email), so match against any of the actor's identity tokens.
 */
export function isRecordSteward(
  actor: Actor,
  resource: StewardedResource
): boolean {
  const owner = norm(resource.steward);
  if (!owner) return false;
  return owner === norm(actor.email) || owner === norm(actor.name) || owner === norm(actor.id);
}

/** Actions any authenticated role may perform (no record ownership needed). */
const READ_ACTIONS: ResourceAction[] = ['view', 'export'];

/** Actions a steward may perform without owning a specific record. */
const STEWARD_OPEN_ACTIONS: ResourceAction[] = [
  'view',
  'export',
  'create',
  'import',
];

/** Actions that require record ownership for a steward. */
const STEWARD_OWNED_ACTIONS: ResourceAction[] = [
  'edit',
  'delete',
  'merge',
  'changeStatus',
];

/**
 * Decide whether `actor` may perform `action`. For record-scoped actions
 * (edit/delete/merge/changeStatus) pass the target `resource` so steward
 * ownership can be checked; a steward may also act on an **unassigned** record
 * (no steward set) so records can be claimed.
 */
export function can(
  actor: Actor,
  action: ResourceAction,
  resource?: StewardedResource
): boolean {
  if (actor.role === 'admin') return true;

  if (actor.role === 'viewer') {
    return READ_ACTIONS.includes(action);
  }

  // steward
  if (STEWARD_OPEN_ACTIONS.includes(action)) return true;
  if (STEWARD_OWNED_ACTIONS.includes(action)) {
    if (!resource) return false;
    // Owned records, or unassigned records a steward may claim.
    return isRecordSteward(actor, resource) || norm(resource.steward) === '';
  }
  return false;
}

/** Whether the actor may see sensitive fields (masked from viewers). */
export function canViewSensitive(actor: Actor): boolean {
  return actor.role !== 'viewer';
}

/**
 * Convenience for list screens: whether the actor may modify *any* record
 * (used to decide if row action affordances render at all). Admins and
 * stewards qualify; viewers do not.
 */
export function canModifyAny(actor: Actor): boolean {
  return actor.role === 'admin' || actor.role === 'steward';
}
