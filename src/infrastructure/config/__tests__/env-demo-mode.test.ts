import { afterEach, describe, expect, it, vi } from 'vitest';

import { readAppConfig } from '../env';

const PROD_URL = 'https://example.fabricapps.net';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('readAppConfig — demo mode flag', () => {
  it('defaults demo mode ON when VITE_DEMO_MODE is unset', () => {
    expect(readAppConfig().demoMode).toBe(true);
  });

  it.each(['false', '0', 'off', 'no', 'FALSE', ' Off '])(
    'treats %j as demo mode OFF',
    (value) => {
      vi.stubEnv('VITE_DEMO_MODE', value);
      // keep it on the local-dev path so OFF does not trigger config throws
      vi.stubEnv('VITE_RAYFIN_API_URL', 'http://localhost:5168');
      expect(readAppConfig().demoMode).toBe(false);
    }
  );

  it.each(['true', '1', 'on', 'yes', 'anything-else'])(
    'treats %j as demo mode ON',
    (value) => {
      vi.stubEnv('VITE_DEMO_MODE', value);
      expect(readAppConfig().demoMode).toBe(true);
    }
  );

  it('does not throw or build Fabric config in demo mode even on a prod URL with no keys', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    vi.stubEnv('VITE_RAYFIN_API_URL', PROD_URL);
    vi.stubEnv('VITE_RAYFIN_PUBLISHABLE_KEY', '');

    const config = readAppConfig();
    expect(config.demoMode).toBe(true);
    expect(config.fabric).toBeNull();
    expect(config.localDev).toBe(false);
  });

  it('requires a publishable key when demo mode is OFF on a prod URL', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    vi.stubEnv('VITE_RAYFIN_API_URL', PROD_URL);
    vi.stubEnv('VITE_RAYFIN_PUBLISHABLE_KEY', '');

    expect(() => readAppConfig()).toThrow(/PUBLISHABLE_KEY/);
  });

  it('requires Fabric config when demo mode is OFF and a key is present', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    vi.stubEnv('VITE_RAYFIN_API_URL', PROD_URL);
    vi.stubEnv('VITE_RAYFIN_PUBLISHABLE_KEY', 'pk_live_test');
    vi.stubEnv('VITE_FABRIC_WORKSPACE_ID', '');
    vi.stubEnv('VITE_FABRIC_ITEM_ID', '');
    vi.stubEnv('VITE_FABRIC_PORTAL_URL', '');

    expect(() => readAppConfig()).toThrow(/Fabric config/);
  });

  it('builds Fabric config when demo mode is OFF and all values are present', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    vi.stubEnv('VITE_RAYFIN_API_URL', PROD_URL);
    vi.stubEnv('VITE_RAYFIN_PUBLISHABLE_KEY', 'pk_live_test');
    vi.stubEnv('VITE_FABRIC_WORKSPACE_ID', 'ws-1');
    vi.stubEnv('VITE_FABRIC_ITEM_ID', 'item-1');
    vi.stubEnv('VITE_FABRIC_PORTAL_URL', 'https://portal.example');

    const config = readAppConfig();
    expect(config.demoMode).toBe(false);
    expect(config.fabric).toEqual({
      workspaceId: 'ws-1',
      projectId: 'item-1',
      fabricPortalUrl: 'https://portal.example',
    });
  });
});
