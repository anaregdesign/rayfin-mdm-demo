import { Button } from '@/components/shared/Button';

interface ExportPanelProps {
  activeCustomerCount: number;
  activeProductCount: number;
  onExportCustomersCsv: () => void;
  onExportProductsCsv: () => void;
  onExportCustomersJson: () => void;
  onExportProductsJson: () => void;
}

/**
 * Render-only export panel (Issue #12). Offers active-only CSV and JSON
 * downloads for each master. Only 有効（active）レコード are exported —
 * the counts are computed by the view-model via the distribution policy.
 */
export function ExportPanel({
  activeCustomerCount,
  activeProductCount,
  onExportCustomersCsv,
  onExportProductsCsv,
  onExportCustomersJson,
  onExportProductsJson,
}: ExportPanelProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">顧客マスタ</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          配信対象（active）{activeCustomerCount}件
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={onExportCustomersCsv}>
            CSV出力
          </Button>
          <Button size="sm" variant="secondary" onClick={onExportCustomersJson}>
            JSON出力
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">製品マスタ</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          配信対象（active）{activeProductCount}件
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={onExportProductsCsv}>
            CSV出力
          </Button>
          <Button size="sm" variant="secondary" onClick={onExportProductsJson}>
            JSON出力
          </Button>
        </div>
      </div>
    </div>
  );
}
