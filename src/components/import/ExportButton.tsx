import { Button } from '@/components/shared/Button';

interface ExportButtonProps {
  /** Number of rows that will be exported (the current filtered view). */
  count: number;
  disabled?: boolean;
  onExport: () => void;
}

/** Header action that exports the currently displayed rows as CSV. */
export function ExportButton({ count, disabled, onExport }: ExportButtonProps) {
  return (
    <Button
      variant="secondary"
      onClick={onExport}
      disabled={disabled || count === 0}
    >
      エクスポート（{count}件）
    </Button>
  );
}
