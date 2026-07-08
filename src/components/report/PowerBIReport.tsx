import { models } from 'powerbi-client';
import { PowerBIEmbed } from 'powerbi-client-react';
import { Link } from 'react-router-dom';

import type { ReportEmbedConfig } from '@/domain/models/report-embed';

interface PowerBIReportProps {
  /** Resolved embed config, or `null` when no report has been configured. */
  config: ReportEmbedConfig | null;
}

/**
 * Presentational Power BI report embed. Renders a *genuine* embedded report:
 * the official `<PowerBIEmbed>` for token configs, or a token-less secure-embed
 * iframe (autoAuth SSO) for the default live path. When unconfigured it shows a
 * setup card — never a hand-rolled chart. Purely render-only: the config is
 * resolved by the page via `useReportEmbed()` and passed in as a prop.
 */
export function PowerBIReport({ config }: PowerBIReportProps) {
  if (!config) {
    return <ReportSetupCard />;
  }

  if (config.kind === 'secure') {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <iframe
          title="Power BI レポート"
          src={config.src}
          className="h-[80vh] w-full border-0"
          allowFullScreen
        />
      </div>
    );
  }

  const embedConfig: models.IReportEmbedConfiguration = {
    type: 'report',
    id: config.reportId,
    embedUrl: config.embedUrl,
    accessToken: config.accessToken,
    tokenType:
      config.tokenType === 'Embed'
        ? models.TokenType.Embed
        : models.TokenType.Aad,
    settings: {
      panes: {
        filters: { visible: false, expanded: false },
        pageNavigation: { visible: true },
      },
    },
  };

  return (
    <PowerBIEmbed
      embedConfig={embedConfig}
      cssClassName="h-[80vh] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    />
  );
}

/** Setup guidance shown until a Power BI report is connected. */
function ReportSetupCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
        <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          レポート未接続
        </span>
        <h2 className="text-lg font-semibold text-slate-900">
          Power BI レポートの埋め込み
        </h2>
        <p className="text-sm text-slate-600">
          このタブは Power BI の
          <span className="font-medium">実レポートを埋め込み表示</span>
          します（グラフを自作するのではなく、公式の埋め込み機能を使用します）。
          レポートを接続すると、ここにインタラクティブなレポートが表示されます。
        </p>
      </div>

      <div className="pt-4">
        <h3 className="text-sm font-semibold text-slate-800">接続手順</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>
            Fabric ワークスペース{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
              rayfin-demo
            </code>{' '}
            で、MDM の SQL データ（顧客・製品マスタ）上に Power BI レポートを作成します。
          </li>
          <li>
            レポートの<span className="font-medium">安全な埋め込み（secure embed）</span>
            を有効化し、レポート ID を控えます。
          </li>
          <li>
            デプロイ変数{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
              VITE_POWERBI_REPORT_ID
            </code>{' '}
            にレポート ID を設定して再デプロイします（ワークスペース・テナントは
            既存の Fabric 設定を自動的に再利用します）。
          </li>
        </ol>
        <p className="mt-4 text-sm text-slate-500">
          接続方法の詳細は{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            AGENTS.md
          </code>{' '}
          の「Power BI report embedding」節を参照してください。
        </p>
        <div className="mt-5">
          <Link
            to="/"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            ダッシュボードへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
