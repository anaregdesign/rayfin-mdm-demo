import type { Role } from './authz';

/** Trimmed view of the authenticated user shown in the UI. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  /**
   * Roles granted to this identity. In the PoC the auth adapters default to
   * `['admin']` so the single Fabric SSO demo user keeps full access; the app
   * shell's demo role switcher lets you exercise `viewer`/`steward` at runtime.
   * A production build would source these from Entra app-role claims.
   */
  roles: Role[];
}

/** Map a raw session user shape to the trimmed view used in the UI. */
export function toAuthUser(
  user: {
    id: string;
    email: string;
    name?: string;
  },
  roles: Role[] = ['admin']
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email.split('@')[0],
    roles,
  };
}
