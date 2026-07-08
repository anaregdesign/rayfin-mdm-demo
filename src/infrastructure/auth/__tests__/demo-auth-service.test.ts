import { describe, expect, it } from 'vitest';

import { DemoAuthService, DEMO_USER_EMAIL } from '../demo-auth-service';

describe('DemoAuthService', () => {
  const service = new DemoAuthService();

  it('exports the fixed demo email', () => {
    expect(DEMO_USER_EMAIL).toBe('demo@contoso.com');
  });

  it('reports Fabric auth as disabled', () => {
    expect(service.fabricAuthEnabled).toBe(false);
  });

  it('auto-authenticates via initEmbeddedAuth as an admin demo user', async () => {
    const user = await service.initEmbeddedAuth();
    expect(user).not.toBeNull();
    expect(user?.email).toBe(DEMO_USER_EMAIL);
    expect(user?.name).toBe('デモユーザー');
    expect(user?.roles).toEqual(['admin']);
  });

  it('getCurrentUser returns the same demo identity', async () => {
    const user = await service.getCurrentUser();
    expect(user?.email).toBe(DEMO_USER_EMAIL);
    expect(user?.roles).toEqual(['admin']);
  });

  it('signIn resolves the demo identity without a network call', async () => {
    const user = await service.signIn();
    expect(user.email).toBe(DEMO_USER_EMAIL);
  });

  it('signOut is a no-op that resolves', async () => {
    await expect(service.signOut()).resolves.toBeUndefined();
  });
});
