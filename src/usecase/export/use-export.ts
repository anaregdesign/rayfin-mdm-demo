import { useCallback } from 'react';

import { toCsv } from '@/lib/csv';

export interface CsvExporter {
  /** Serialize a matrix to CSV and trigger a browser download. */
  exportMatrix: (
    filename: string,
    matrix: readonly (readonly string[])[]
  ) => void;
  /** Serialize a value to pretty JSON and trigger a browser download. */
  exportJson: (filename: string, value: unknown) => void;
}

/**
 * Export orchestration: turns a pure CSV matrix into a downloaded file. The
 * DOM/Blob side effect is isolated here (usecase layer) so components stay
 * render-only and the matrix building stays a pure domain concern.
 */
export function useCsvExport(): CsvExporter {
  const download = useCallback(
    (filename: string, contents: string, mime: string) => {
      const blob = new Blob([contents], { type: mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
    []
  );

  const exportMatrix = useCallback(
    (filename: string, matrix: readonly (readonly string[])[]) => {
      const csv = toCsv(matrix);
      // Prepend a UTF-8 BOM so Excel opens Japanese text without mojibake.
      download(filename, `\uFEFF${csv}`, 'text/csv;charset=utf-8;');
    },
    [download]
  );

  const exportJson = useCallback(
    (filename: string, value: unknown) => {
      download(
        filename,
        JSON.stringify(value, null, 2),
        'application/json;charset=utf-8;'
      );
    },
    [download]
  );

  return { exportMatrix, exportJson };
}
