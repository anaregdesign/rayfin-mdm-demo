import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AuthUser } from '@/domain/models/auth-user';
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

  useEffect(() => {
    let cancelled = false;
    authService
      .initEmbeddedAuth()
      .then((embedded) => embedded ?? authService.getCurrentUser())
      .then((current) => {
        if (!cancelled && current) setUser(current);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authService]);

  const signIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await authService.signIn();
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'サインインに失敗しました';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService]);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }, [authService]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      signIn,
      signOut,
      isAuthenticated: !!user,
      fabricAuthEnabled: authService.fabricAuthEnabled,
    }),
    [user, loading, error, signIn, signOut, authService]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
