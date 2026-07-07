import { createContext, useContext } from 'react';

import type { AuthUser } from '@/domain/models/auth-user';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  fabricAuthEnabled: boolean;
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
