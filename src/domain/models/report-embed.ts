/**
 * Power BI report embedding — domain model.
 *
 * The app embeds a *genuine* Power BI report (via the official
 * `powerbi-client-react` library or a token-less secure-embed iframe), rather
 * than hand-rolling chart visuals. This module carries only plain data + pure
 * URL construction, so it imports nothing outward and is trivially unit-tested.
 *
 * Two embedding modes are supported as a discriminated union:
 *  - `token`  — App/User-Owns-Data: an AAD or Embed token is supplied and the
 *               `<PowerBIEmbed>` component renders the report. (Advanced; a real
 *               token must be minted server-side — see AGENTS.md.)
 *  - `secure` — Secure-embed (autoAuth SSO): a token-less
 *               `app.powerbi.com/reportEmbed?...&autoAuth=true` URL is rendered
 *               in an iframe and Power BI authenticates the *viewer* directly.
 *               This is the most robust path for the live Fabric demo, where the
 *               viewer is the same Entra user who can already see the workspace.
 */

/** Power BI embed token kinds accepted by the embedding library. */
export type EmbedTokenType = 'Aad' | 'Embed';

/** App/User-Owns-Data: render `<PowerBIEmbed>` with a supplied access token. */
export interface TokenEmbedConfig {
  kind: 'token';
  reportId: string;
  embedUrl: string;
  accessToken: string;
  tokenType: EmbedTokenType;
}

/** Secure-embed (autoAuth SSO): render a token-less Power BI iframe. */
export interface SecureEmbedConfig {
  kind: 'secure';
  reportId: string;
  /** Full `https://app.powerbi.com/reportEmbed?...&autoAuth=true` URL. */
  src: string;
}

/** The resolved embedding configuration for the analytics report. */
export type ReportEmbedConfig = TokenEmbedConfig | SecureEmbedConfig;

/** Identifiers needed to build a secure-embed URL. */
export interface SecureEmbedParts {
  reportId: string;
  workspaceId: string;
  /** Entra tenant id — enables the `ctid` hint so SSO targets the right tenant. */
  tenantId?: string;
}

const POWERBI_EMBED_ORIGIN = 'https://app.powerbi.com/reportEmbed';

/**
 * Build a Power BI secure-embed (token-less SSO) URL from workspace/report ids.
 * `autoAuth=true` makes Power BI authenticate the viewer in the iframe, so no
 * access token has to be minted or handled by the app.
 */
export function buildSecureEmbedUrl(parts: SecureEmbedParts): string {
  const params = new URLSearchParams({
    reportId: parts.reportId,
    groupId: parts.workspaceId,
    autoAuth: 'true',
  });
  if (parts.tenantId) {
    params.set('ctid', parts.tenantId);
  }
  return `${POWERBI_EMBED_ORIGIN}?${params.toString()}`;
}
