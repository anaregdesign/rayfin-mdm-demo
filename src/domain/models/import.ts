/**
 * Domain model for bulk CSV import: the row/summary/outcome shapes and their
 * Japanese labels. No SDK, no framework — pure types and label lookups the
 * import policy produces and the wizard renders.
 */

/** How rows whose business key already exists are handled. */
export type ImportMode = 'insert' | 'upsert' | 'skip';

/** Per-row evaluation result before committing. */
export type RowStatus = 'ok' | 'warning' | 'error';

/** The write a row would perform once committed. */
export type RowAction = 'insert' | 'update' | 'skip' | 'error';

/** A single evaluated CSV row: the raw cells plus the mapped/validated input. */
export interface ImportRow<TInput> {
  /** 1-based data row number (excludes the header row). */
  rowNumber: number;
  raw: Record<string, string>;
  /** Mapped form input; present unless the row could not be parsed at all. */
  input?: TInput;
  status: RowStatus;
  action: RowAction;
  /** Existing record id when the business key matches (upsert/skip target). */
  existingId?: string;
  /** Short display key (code/sku) for the preview table. */
  key: string;
  /** Display name for the preview table. */
  label: string;
  messages: string[];
}

/** Aggregate counts for the preview (pre-commit). */
export interface ImportSummary {
  total: number;
  ok: number;
  warning: number;
  error: number;
  toInsert: number;
  toUpdate: number;
  toSkip: number;
}

/** The evaluated preview handed to the wizard. */
export interface ImportPreview<TInput> {
  rows: ImportRow<TInput>[];
  summary: ImportSummary;
  /** Headers present in the file that no field mapping recognized. */
  unknownHeaders: string[];
  /** True when at least one row can actually be written. */
  hasWritableRows: boolean;
}

/** A row-level failure captured while committing. */
export interface ImportError {
  rowNumber: number;
  key: string;
  message: string;
}

/** Result summary after committing an import. */
export interface ImportOutcome {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}

export const IMPORT_MODE_VALUES: ImportMode[] = ['insert', 'upsert', 'skip'];

const IMPORT_MODE_LABELS: Record<ImportMode, string> = {
  insert: '新規のみ（既存コードはエラー）',
  upsert: '更新（既存コードは上書き）',
  skip: 'スキップ（既存コードは無視）',
};

export function importModeLabel(mode: ImportMode): string {
  return IMPORT_MODE_LABELS[mode];
}

const ROW_STATUS_LABELS: Record<RowStatus, string> = {
  ok: '取込可',
  warning: '警告',
  error: 'エラー',
};

export function rowStatusLabel(status: RowStatus): string {
  return ROW_STATUS_LABELS[status];
}

const ROW_ACTION_LABELS: Record<RowAction, string> = {
  insert: '新規登録',
  update: '更新',
  skip: 'スキップ',
  error: '対象外',
};

export function rowActionLabel(action: RowAction): string {
  return ROW_ACTION_LABELS[action];
}

/** Fold evaluated rows into the aggregate preview summary. */
export function summarizeRows(rows: { status: RowStatus; action: RowAction }[]): ImportSummary {
  const summary: ImportSummary = {
    total: rows.length,
    ok: 0,
    warning: 0,
    error: 0,
    toInsert: 0,
    toUpdate: 0,
    toSkip: 0,
  };
  for (const row of rows) {
    if (row.status === 'ok') summary.ok++;
    else if (row.status === 'warning') summary.warning++;
    else summary.error++;

    if (row.action === 'insert') summary.toInsert++;
    else if (row.action === 'update') summary.toUpdate++;
    else if (row.action === 'skip') summary.toSkip++;
  }
  return summary;
}
