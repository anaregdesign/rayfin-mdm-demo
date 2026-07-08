/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAYFIN_API_URL?: string;
  readonly VITE_RAYFIN_PUBLISHABLE_KEY?: string;
  readonly VITE_FABRIC_WORKSPACE_ID?: string;
  readonly VITE_FABRIC_ITEM_ID?: string;
  readonly VITE_FABRIC_TENANT_ID?: string;
  readonly VITE_FABRIC_PORTAL_URL?: string;
  // Optional Power BI report embedding (baked in at build time). Only
  // VITE_POWERBI_REPORT_ID is required to light up a secure embed; workspace
  // and tenant fall back to the VITE_FABRIC_* values above.
  readonly VITE_POWERBI_REPORT_ID?: string;
  readonly VITE_POWERBI_WORKSPACE_ID?: string;
  readonly VITE_POWERBI_TENANT_ID?: string;
  readonly VITE_POWERBI_EMBED_URL?: string;
  readonly VITE_POWERBI_ACCESS_TOKEN?: string;
  readonly VITE_POWERBI_TOKEN_TYPE?: string;
  readonly VITE_POWERBI_SECURE_EMBED_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
