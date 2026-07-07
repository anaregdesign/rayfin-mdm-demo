import { Button } from '@/components/shared/Button';

interface ReportExportButtonProps {
  onExportCsv: () => void;
  onPrint: () => void;
}

/**
 * Report-output actions for the dashboard (Issue #13): download the summary as
 * CSV or open the print dialog (print / save-as-PDF). Render-only — the page
 * wires these to `useReportExport`.
 */
export function ReportExportButton({
  onExportCsv,
  onPrint,
}: ReportExportButtonProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={onExportCsv}>
        CSVレポート
      </Button>
      <Button variant="secondary" size="sm" onClick={onPrint}>
        印刷
      </Button>
    </div>
  );
}
