/**
 * Reads the Vite environment into a typed config object. This is the only
 * module that touches `import.meta.env`, so the rest of the app depends on a
 * plain config value instead of ambient globals.
 */

import type { ReportEmbedSettings } from '@/infrastructure/reporting/config-report-embed-provider';

export interface FabricConfig {
  workspaceId: string;
  projectId: string;
  fabricPortalUrl: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  publishableKey: string;
  localDev: boolean;
  /**
   * When true, the app runs fully client-side against in-memory seeded data
   * with an auto demo user — NO backend, NO sign-in. Defaults ON so the public
   * demo opens straight into the data; set VITE_DEMO_MODE=false to use the real
   * Fabric backend + SSO. See AGENTS.md「Anonymous / demo mode」.
   */
  demoMode: boolean;
  fabric: FabricConfig | null;
  /** Power BI report embedding config (all fields optional; unset = no report). */
  reportEmbed: ReportEmbedSettings;
}

/**
 * Read the demo-mode flag. Defaults ON (true); only an explicit falsy string
 * (`false`/`0`/`off`/`no`) turns it off, so a plain production build stays a
 * no-login demo unless deliberately switched to real auth.
 */
function readDemoMode(): boolean {
  const raw = import.meta.env.VITE_DEMO_MODE;
  if (typeof raw !== 'string') return true;
  const v = raw.trim().toLowerCase();
  return !(v === 'false' || v === '0' || v === 'off' || v === 'no');
}

/**
 * Read optional Power BI embedding config. Uses dedicated `VITE_POWERBI_*` vars
 * (baked in at build time — see AGENTS.md for how the deploy workflow injects
 * them) and falls back to the existing Fabric workspace/tenant ids so that only
 * a single `VITE_POWERBI_REPORT_ID` is needed to light up a secure embed. Never
 * throws — an unconfigured report just renders a setup card.
 */
function readReportEmbedSettings(): ReportEmbedSettings {
  const env = import.meta.env;
  const opt = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v : undefined;
  return {
    reportId: opt(env.VITE_POWERBI_REPORT_ID),
    workspaceId:
      opt(env.VITE_POWERBI_WORKSPACE_ID) ?? opt(env.VITE_FABRIC_WORKSPACE_ID),
    tenantId: opt(env.VITE_POWERBI_TENANT_ID) ?? opt(env.VITE_FABRIC_TENANT_ID),
    embedUrl: opt(env.VITE_POWERBI_EMBED_URL),
    accessToken: opt(env.VITE_POWERBI_ACCESS_TOKEN),
    tokenType: opt(env.VITE_POWERBI_TOKEN_TYPE),
    secureEmbedUrl: opt(env.VITE_POWERBI_SECURE_EMBED_URL),
  };
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
  const demoMode = readDemoMode();
  const publishableKey = import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY as
    | string
    | undefined;

  if (!publishableKey && !localDev && !demoMode) {
    throw new Error(
      'VITE_RAYFIN_PUBLISHABLE_KEY environment variable is required'
    );
  }

  const apiBaseUrl = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;

  let fabric: FabricConfig | null = null;
  if (!localDev && !demoMode) {
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
    demoMode,
    fabric,
    reportEmbed: readReportEmbedSettings(),
  };
}
