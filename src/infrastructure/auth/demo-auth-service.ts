import type { AuthUser } from '@/domain/models/auth-user';
import { toAuthUser } from '@/domain/models/auth-user';
import type { AuthService } from '@/domain/ports/auth-service';

/** Email of the fixed demo identity — also used as the audit `actor`. */
export const DEMO_USER_EMAIL = 'demo@contoso.com';

/** The single identity every visitor is auto-signed-in as in demo mode. */
const DEMO_USER: AuthUser = toAuthUser(
  { id: 'demo-user', email: DEMO_USER_EMAIL, name: 'デモユーザー' },
  ['admin']
);

/**
 * Demo-mode auth adapter. Auto-authenticates every visitor as a fixed
 * `admin` demo user with NO network call and NO Fabric/Entra sign-in — so the
 * public demo app opens straight into the data with no login prompt. The demo
 * role switcher still lets you exercise viewer/steward at runtime.
 */
export class DemoAuthService implements AuthService {
  readonly fabricAuthEnabled = false;

  async signIn(): Promise<AuthUser> {
    return DEMO_USER;
  }

  async signOut(): Promise<void> {
    // No session to tear down in demo mode.
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return DEMO_USER;
  }

  async initEmbeddedAuth(): Promise<AuthUser | null> {
    return DEMO_USER;
  }
}
