import type { ReportEmbedConfig } from '@/domain/models/report-embed';

/**
 * Port that resolves the Power BI report embedding configuration. The concrete
 * adapter reads build-time config (env vars); returning `null` means "no report
 * configured yet" so the view can show a setup state instead of a broken embed.
 */
export interface ReportEmbedProvider {
  /** The embed config for the analytics report, or `null` when unconfigured. */
  getReportEmbed(): ReportEmbedConfig | null;
}
