import { AuthError } from '@microsoft/rayfin-client';

import type { AuthUser } from '@/domain/models/auth-user';
import { toAuthUser } from '@/domain/models/auth-user';
import type { AuthService } from '@/domain/ports/auth-service';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

// Local-dev fixture credentials. The bundled local backend ships without
// Fabric/Entra, so this auth service signs in with a shared dev account.
// These values only ever reach a developer's local machine — never use them
// in production.
const MOCK_EMAIL = 'dev@contoso.com';
const MOCK_PASSWORD = 'LocalDev!Pass123';

/**
 * Local-development auth adapter. Used when the API URL targets localhost.
 * Signs into the bundled local backend with a fixed email/password — no
 * Fabric/Entra wiring required. Creates the dev account on first sign-in.
 */
export class MockAuthService implements AuthService {
  readonly fabricAuthEnabled = false;

  constructor(private readonly client: RayfinClientFacade) {}

  async signIn(): Promise<AuthUser> {
    const auth = this.client.auth;

    try {
      await auth.signIn({ email: MOCK_EMAIL, password: MOCK_PASSWORD });
    } catch (err) {
      if (!(err instanceof AuthError) || err.code !== 'INVALID_GRANT') {
        throw err;
      }
      await auth.signUp({ email: MOCK_EMAIL, password: MOCK_PASSWORD });
      await auth.signIn({ email: MOCK_EMAIL, password: MOCK_PASSWORD });
    }

    const session = auth.getSession();
    if (!session.isAuthenticated || !session.user) {
      throw new Error('Local mock sign-in failed to establish a session.');
    }
    return toAuthUser(session.user);
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = this.client.auth.getSession();
    if (!session.isAuthenticated || !session.user) return null;
    return toAuthUser(session.user);
  }

  async initEmbeddedAuth(): Promise<AuthUser | null> {
    return null;
  }
}
