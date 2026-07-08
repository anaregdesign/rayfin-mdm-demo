import { PowerBIReport } from '@/components/report/PowerBIReport';
import { PageHeader } from '@/components/shared/PageHeader';
import { useReportEmbed } from '@/usecase/report/use-report-embed';

/**
 * BI report page: embeds a genuine Power BI report over the MDM data using the
 * official embedding library (secure-embed SSO by default). Thin container —
 * the config is resolved by `useReportEmbed()` and rendered by the
 * presentational `<PowerBIReport>`; a setup card shows until a report is
 * connected.
 */
export function ReportPage() {
  const { config } = useReportEmbed();

  return (
    <div className="space-y-6">
      <PageHeader
        title="BIレポート"
        description="MDM のマスタデータ上に作成した Power BI レポートを埋め込み表示します。ダッシュボードの集計に加えて、対話的な分析・ドリルダウンを行えます。"
      />
      <PowerBIReport config={config} />
    </div>
  );
}
