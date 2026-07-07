import type { AuthUser } from '@/domain/models/auth-user';

/**
 * Auth service contract used by the usecase layer. Implementations live in
 * infrastructure/auth (Mock for local dev, Fabric for production) and are
 * selected by the config factory from VITE_* env vars at startup.
 */
export interface AuthService {
  /**
   * True when this service requires Fabric/Entra interactive sign-in.
   * The sign-in view uses this to choose its loading-state label.
   */
  readonly fabricAuthEnabled: boolean;

  /**
   * Acquire a session interactively. For Fabric this opens the broker popup
   * and must be called from a user-gesture handler.
   */
  signIn(): Promise<AuthUser>;

  signOut(): Promise<void>;

  /** Return the current session's user, or `null` if not signed in. */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Try to acquire a session via the embedded (iframe) Fabric flow without
   * any UI. Returns `null` when not running inside a Fabric iframe.
   */
  initEmbeddedAuth(): Promise<AuthUser | null>;
}
