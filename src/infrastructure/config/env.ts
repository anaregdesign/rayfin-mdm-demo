/**
 * Reads the Vite environment into a typed config object. This is the only
 * module that touches `import.meta.env`, so the rest of the app depends on a
 * plain config value instead of ambient globals.
 */

export interface FabricConfig {
  workspaceId: string;
  projectId: string;
  fabricPortalUrl: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  publishableKey: string;
  localDev: boolean;
  fabric: FabricConfig | null;
}

function isLocalBackendUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function readAppConfig(): AppConfig {
  const apiUrl = import.meta.env.VITE_RAYFIN_API_URL || 'http://localhost:5168';
  const localDev = isLocalBackendUrl(apiUrl);
  const publishableKey = import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY as
    | string
    | undefined;

  if (!publishableKey && !localDev) {
    throw new Error(
      'VITE_RAYFIN_PUBLISHABLE_KEY environment variable is required'
    );
  }

  const apiBaseUrl = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;

  let fabric: FabricConfig | null = null;
  if (!localDev) {
    const workspaceId = import.meta.env.VITE_FABRIC_WORKSPACE_ID as
      | string
      | undefined;
    const projectId = import.meta.env.VITE_FABRIC_ITEM_ID as string | undefined;
    const fabricPortalUrl = import.meta.env.VITE_FABRIC_PORTAL_URL as
      | string
      | undefined;

    if (!workspaceId || !projectId || !fabricPortalUrl) {
      throw new Error(
        'Missing required Fabric config. Set VITE_FABRIC_WORKSPACE_ID, VITE_FABRIC_ITEM_ID, and VITE_FABRIC_PORTAL_URL.'
      );
    }
    fabric = { workspaceId, projectId, fabricPortalUrl };
  }

  return {
    apiBaseUrl,
    publishableKey: publishableKey ?? 'local-dev-key',
    localDev,
    fabric,
  };
}
