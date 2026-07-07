import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AuthUser } from '@/domain/models/auth-user';
import type { Actor, Role } from '@/domain/models/authz';
import { highestRole } from '@/domain/models/authz';
import type { AuthService } from '@/domain/ports/auth-service';

import { AuthContext, type AuthContextValue } from './use-auth';

interface AuthProviderProps {
  children: ReactNode;
  authService: AuthService;
}

/**
 * Auth view-model provider. Receives the AuthService port by injection (from
 * the composition root) so the component tree can be tested with a stub. Owns
 * the session bootstrap (embedded → current user) and sign-in/out orchestration.
 */
export function AuthProvider({ children, authService }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<Role>('viewer');

  // When the signed-in identity changes, reset the effective role to the
  // highest role it was granted (demo switcher can then step down/up).
  const applyUser = useCallback((next: AuthUser | null) => {
    setUser(next);
    setActiveRole(next ? highestRole(next.roles) : 'viewer');
  }, []);

  useEffect(() => {
    let cancelled = false;
    authService
      .initEmbeddedAuth()
      .then((embedded) => embedded ?? authService.getCurrentUser())
      .then((current) => {
        if (!cancelled && current) applyUser(current);
      })
      .catch(() => {
        if (!cancelled) applyUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authService, applyUser]);

  const signIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await authService.signIn();
      applyUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'サインインに失敗しました';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService, applyUser]);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      applyUser(null);
      setError(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }, [authService, applyUser]);

  const actor = useMemo<Actor | null>(
    () =>
      user
        ? { id: user.id, email: user.email, name: user.name, role: activeRole }
        : null,
    [user, activeRole]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      signIn,
      signOut,
      isAuthenticated: !!user,
      fabricAuthEnabled: authService.fabricAuthEnabled,
      grantedRoles: user?.roles ?? [],
      activeRole,
      setActiveRole,
      actor,
    }),
    [user, loading, error, signIn, signOut, authService, activeRole, actor]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
