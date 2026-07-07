import { useCallback } from 'react';

import {
  reportToMatrix,
  type ReportSection,
} from '@/domain/policies/analytics-policy';
import { useCsvExport } from '@/usecase/export/use-export';

export interface ReportExporter {
  /** Flatten the report sections to CSV and trigger a browser download. */
  exportCsv: (filename?: string) => void;
  /** Open the browser print dialog (print / save-as-PDF). */
  print: () => void;
}

/**
 * Report-output controller (Issue #13). Turns the dashboard's pure
 * `ReportSection[]` into a downloadable CSV (via the shared CSV exporter) and
 * exposes the browser print path. The DOM side effects (`window.print`, Blob
 * download) stay in the usecase layer so components remain render-only.
 */
export function useReportExport(sections: ReportSection[]): ReportExporter {
  const exporter = useCsvExport();

  const exportCsv = useCallback(
    (filename = 'mdm-report.csv') => {
      exporter.exportMatrix(filename, reportToMatrix(sections));
    },
    [exporter, sections]
  );

  const print = useCallback(() => {
    window.print();
  }, []);

  return { exportCsv, print };
}
