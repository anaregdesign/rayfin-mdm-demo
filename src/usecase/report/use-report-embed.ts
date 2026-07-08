import { useMemo } from 'react';

import { useDependencies } from '@/di/dependencies';
import type { ReportEmbedConfig } from '@/domain/models/report-embed';

/** View model for the BI report screen. */
export interface ReportEmbedView {
  /** The resolved embed config, or `null` when no report is configured. */
  config: ReportEmbedConfig | null;
  /** Convenience flag: a report is configured and ready to embed. */
  ready: boolean;
}

/**
 * Resolve the Power BI report embedding configuration for the view. Thin
 * orchestration over the `ReportEmbedProvider` port — the page passes the result
 * to the presentational `<PowerBIReport>` component.
 */
export function useReportEmbed(): ReportEmbedView {
  const { reportEmbed } = useDependencies();
  const config = useMemo(() => reportEmbed.getReportEmbed(), [reportEmbed]);
  return { config, ready: config !== null };
}
