import { useCallback, useMemo, useState } from 'react';

import type {
  ImportMode,
  ImportOutcome,
  ImportPreview,
} from '@/domain/models/import';
import { parseCsv, recordsFromMatrix } from '@/lib/csv';
import { toMessage } from '@/lib/errors';

/**
 * Ports the import controller needs. `buildPreview` composes the domain import
 * policy with the caller's current record set; `create`/`update`/`reload` are
 * the detail store's own commands so the list screen refreshes after a commit.
 */
export interface ImportGateways<TInput> {
  buildPreview: (
    records: Record<string, string>[],
    mode: ImportMode
  ) => ImportPreview<TInput>;
  create: (input: TInput) => Promise<unknown>;
  update: (id: string, input: TInput) => Promise<unknown>;
  reload: () => Promise<void>;
}

export interface ImportController<TInput> {
  mode: ImportMode;
  fileName: string | null;
  parsing: boolean;
  parseError: string | null;
  preview: ImportPreview<TInput> | null;
  committing: boolean;
  outcome: ImportOutcome | null;
  setMode: (mode: ImportMode) => void;
  loadFile: (file: File) => Promise<void>;
  commit: () => Promise<void>;
  reset: () => void;
}

/**
 * Store-agnostic bulk-import controller: read a CSV file, build a validated
 * preview (re-evaluated when the mode changes), then commit row by row through
 * the injected gateways. Business rules live in the import policy behind
 * `buildPreview`; this hook only orchestrates file IO, state, and the writes.
 */
export function useImport<TInput>(
  gateways: ImportGateways<TInput>
): ImportController<TInput> {
  const { buildPreview, create, update, reload } = gateways;

  const [mode, setModeState] = useState<ImportMode>('upsert');
  const [fileName, setFileName] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, string>[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  const preview = useMemo(
    () => (records ? buildPreview(records, mode) : null),
    [records, mode, buildPreview]
  );

  const setMode = useCallback((next: ImportMode) => {
    setModeState(next);
    setOutcome(null);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setParsing(true);
    setParseError(null);
    setOutcome(null);
    setRecords(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const { headers, records: parsed } = recordsFromMatrix(parseCsv(text));
      if (headers.length === 0) {
        setParseError('CSVのヘッダ行が見つかりません。');
        return;
      }
      if (parsed.length === 0) {
        setParseError(
          'データ行がありません。ヘッダの下に1行以上のデータが必要です。'
        );
        return;
      }
      setRecords(parsed);
    } catch (err) {
      setParseError(toMessage(err));
    } finally {
      setParsing(false);
    }
  }, []);

  const commit = useCallback(async () => {
    if (!preview) return;
    setCommitting(true);
    const result: ImportOutcome = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
    for (const row of preview.rows) {
      if (row.action === 'skip') {
        result.skipped++;
        continue;
      }
      if (row.action === 'error' || !row.input) continue;
      try {
        if (row.action === 'update' && row.existingId) {
          await update(row.existingId, row.input);
          result.updated++;
        } else if (row.action === 'insert') {
          await create(row.input);
          result.inserted++;
        }
      } catch (err) {
        result.failed++;
        result.errors.push({
          rowNumber: row.rowNumber,
          key: row.key,
          message: toMessage(err),
        });
      }
    }
    try {
      await reload();
    } catch {
      // A failed refresh must not hide a successful import result.
    }
    setOutcome(result);
    setRecords(null);
    setCommitting(false);
  }, [preview, create, update, reload]);

  const reset = useCallback(() => {
    setModeState('upsert');
    setFileName(null);
    setRecords(null);
    setParsing(false);
    setParseError(null);
    setCommitting(false);
    setOutcome(null);
  }, []);

  return {
    mode,
    fileName,
    parsing,
    parseError,
    preview,
    committing,
    outcome,
    setMode,
    loadFile,
    commit,
    reset,
  };
}
