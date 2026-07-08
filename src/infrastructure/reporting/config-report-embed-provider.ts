import {
  buildSecureEmbedUrl,
  type ReportEmbedConfig,
} from '@/domain/models/report-embed';
import type { ReportEmbedProvider } from '@/domain/ports/report-embed-provider';

/**
 * Raw report-embed settings read from build-time config (see `env.ts`). All
 * fields are optional; the provider decides which embedding mode is possible
 * from whichever values are present.
 */
export interface ReportEmbedSettings {
  /** Power BI / Fabric workspace (group) id hosting the report. */
  workspaceId?: string;
  /** The report id to embed. Without it, nothing can be embedded. */
  reportId?: string;
  /** Entra tenant id, used as the `ctid` SSO hint for secure-embed. */
  tenantId?: string;
  /** Token mode: embed URL from the Power BI `reports` REST call. */
  embedUrl?: string;
  /** Token mode: a minted AAD/Embed access token (advanced; server-side). */
  accessToken?: string;
  /** Token mode: which token kind `accessToken` is. Defaults to `Aad`. */
  tokenType?: string;
  /** Explicit secure-embed URL override (skips URL construction). */
  secureEmbedUrl?: string;
}

/**
 * Config-driven `ReportEmbedProvider`. Selects an embedding mode from whatever
 * settings are present, preferring the token-less secure-embed path (best for
 * the live Fabric demo). Returns `null` when no report is configured so the UI
 * can render a setup card rather than a broken embed. Pure + synchronous, so it
 * unit-tests without a DOM.
 */
export class ConfigReportEmbedProvider implements ReportEmbedProvider {
  constructor(private readonly settings: ReportEmbedSettings) {}

  getReportEmbed(): ReportEmbedConfig | null {
    const s = this.settings;
    if (!s.reportId) {
      return null;
    }

    // Token mode (App/User-Owns-Data) — only when a real token is supplied.
    if (s.embedUrl && s.accessToken) {
      return {
        kind: 'token',
        reportId: s.reportId,
        embedUrl: s.embedUrl,
        accessToken: s.accessToken,
        tokenType: s.tokenType === 'Embed' ? 'Embed' : 'Aad',
      };
    }

    // Explicit secure-embed URL override.
    if (s.secureEmbedUrl) {
      return { kind: 'secure', reportId: s.reportId, src: s.secureEmbedUrl };
    }

    // Secure-embed (autoAuth SSO) built from ids — the default live path.
    if (s.workspaceId) {
      return {
        kind: 'secure',
        reportId: s.reportId,
        src: buildSecureEmbedUrl({
          reportId: s.reportId,
          workspaceId: s.workspaceId,
          tenantId: s.tenantId,
        }),
      };
    }

    return null;
  }
}
