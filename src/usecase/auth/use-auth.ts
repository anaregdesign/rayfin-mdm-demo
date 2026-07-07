import { createContext, useContext } from 'react';

import type { AuthUser } from '@/domain/models/auth-user';
import type { Actor, Role } from '@/domain/models/authz';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  fabricAuthEnabled: boolean;
  /** Roles granted to the signed-in identity (from the auth adapter). */
  grantedRoles: Role[];
  /**
   * The effective role for access decisions. Initialized to the highest
   * granted role and switchable at runtime for the demo (see RoleSwitcher).
   */
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  /**
   * Convenience actor (identity + active role) consumed by view-models when
   * calling the access policy. Null when unauthenticated.
   */
  actor: Actor | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * View-facing accessor for the auth context. Kept in a hook-only module so the
 * provider file exports a component exclusively (satisfies react-refresh and the
 * canonical usecase/auth layout).
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
