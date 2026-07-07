/**
 * Authorization model — roles, actions, and the acting user (`Actor`) used by
 * `access-policy`. Pure types + label maps; no SDK, no persistence.
 *
 * PoC scoping: roles are resolved by the auth adapter (see
 * `infrastructure/auth`) and, for the demo, can be switched at runtime from the
 * app shell. Platform-side `@role`/RLS enforcement is documented as the
 * production hardening path (see `rayfin/data/Customer.ts`); the app layer is
 * the source of truth for access decisions in this PoC.
 */

/** Coarse role the acting user carries. Higher index = more capability. */
export type Role = 'viewer' | 'steward' | 'admin';

export const ROLE_VALUES: Role[] = ['viewer', 'steward', 'admin'];

export const ROLE_LABELS: Record<Role, string> = {
  viewer: '閲覧者',
  steward: 'データスチュワード',
  admin: '管理者',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  viewer: '閲覧のみ（機微項目は非表示）',
  steward: '担当レコードの編集・統合・状態変更＋新規登録／取込',
  admin: 'すべての操作（承認・削除を含む）',
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** Rank used to pick the "highest" granted role as the default active role. */
const ROLE_RANK: Record<Role, number> = { viewer: 0, steward: 1, admin: 2 };

/** Return the most privileged role from a list, defaulting to `viewer`. */
export function highestRole(roles: Role[]): Role {
  return roles.reduce<Role>(
    (best, r) => (ROLE_RANK[r] > ROLE_RANK[best] ? r : best),
    'viewer'
  );
}

/** Operations that access control gates across the master-data screens. */
export type ResourceAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'merge'
  | 'changeStatus'
  | 'import'
  | 'export';

/**
 * The acting user for an authorization decision: identity + the currently
 * effective role. Built in the usecase layer from the auth session and the
 * (demo-switchable) active role.
 */
export interface Actor {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** A record that may carry a data steward (owner) for row-level checks. */
export interface StewardedResource {
  steward?: string;
}

/**
 * Sensitive fields masked from `viewer`. Keep in sync with the master models;
 * the access policy exposes `canViewSensitive` and the views render a masked
 * placeholder when it is false.
 */
export const SENSITIVE_CUSTOMER_FIELDS = ['taxId', 'annualRevenue'] as const;
export const SENSITIVE_PRODUCT_FIELDS: readonly string[] = [];

/** Placeholder rendered in place of a masked sensitive value. */
export const MASKED_PLACEHOLDER = '••••（権限不足）';
