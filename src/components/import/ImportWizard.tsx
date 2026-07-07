import { useRef, useState } from 'react';

import { Button } from '@/components/shared/Button';
import type {
  ImportMode,
  ImportOutcome,
  ImportPreview,
  ImportRow,
  RowStatus,
} from '@/domain/models/import';
import {
  IMPORT_MODE_VALUES,
  importModeLabel,
  rowActionLabel,
  rowStatusLabel,
} from '@/domain/models/import';

interface ImportWizardProps {
  open: boolean;
  entityLabel: string;
  mode: ImportMode;
  fileName: string | null;
  parsing: boolean;
  parseError: string | null;
  preview: ImportPreview<unknown> | null;
  committing: boolean;
  outcome: ImportOutcome | null;
  onModeChange: (mode: ImportMode) => void;
  onSelectFile: (file: File) => void;
  onCommit: () => void;
  onClose: () => void;
  onDownloadTemplate: () => void;
}

const STATUS_TONE: Record<RowStatus, string> = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  error: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

function RowStatusBadge({ status }: { status: RowStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_TONE[status]}`}
    >
      {rowStatusLabel(status)}
    </span>
  );
}

/**
 * Bulk CSV import wizard: pick a file, choose how existing keys are handled,
 * review a validated per-row preview, then commit. Render-only — all parsing,
 * validation, and writing happen in the injected controller.
 */
export function ImportWizard({
  open,
  entityLabel,
  mode,
  fileName,
  parsing,
  parseError,
  preview,
  committing,
  outcome,
  onModeChange,
  onSelectFile,
  onCommit,
  onClose,
  onDownloadTemplate,
}: ImportWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  if (!open) return null;

  const writable = preview
    ? preview.summary.toInsert + preview.summary.toUpdate
    : 0;

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onSelectFile(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={committing ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${entityLabel}マスタ CSVインポート`}
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {entityLabel}マスタ CSVインポート
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={committing}
          >
            閉じる
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {outcome ? (
            <ImportResult outcome={outcome} />
          ) : (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              <div
                className={`rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                  dragging
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-300 bg-slate-50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
              >
                <p className="text-sm text-slate-600">
                  CSVファイルをドラッグ＆ドロップ、または
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={parsing || committing}
                  >
                    ファイルを選択
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onDownloadTemplate}>
                    テンプレートをダウンロード
                  </Button>
                </div>
                {fileName && (
                  <p className="mt-3 text-xs text-slate-500">
                    選択中: {fileName}
                    {parsing && '（解析中…）'}
                  </p>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-700">
                  既存キーの扱い
                </legend>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {IMPORT_MODE_VALUES.map((value) => (
                    <label
                      key={value}
                      className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                        mode === value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                          : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="import-mode"
                        value={value}
                        checked={mode === value}
                        onChange={() => onModeChange(value)}
                        disabled={committing}
                      />
                      {importModeLabel(value)}
                    </label>
                  ))}
                </div>
              </fieldset>

              {parseError && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-600/20">
                  {parseError}
                </p>
              )}

              {preview && (
                <ImportPreviewSection entityLabel={entityLabel} preview={preview} />
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={committing}>
            {outcome ? '閉じる' : 'キャンセル'}
          </Button>
          {!outcome && (
            <Button
              onClick={onCommit}
              disabled={committing || !preview || writable === 0}
            >
              {committing ? '取り込み中…' : `取り込み実行（${writable}件）`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportPreviewSection({
  entityLabel,
  preview,
}: {
  entityLabel: string;
  preview: ImportPreview<unknown>;
}) {
  const { summary, rows, unknownHeaders } = preview;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <SummaryChip label="全行" value={summary.total} />
        <SummaryChip label="新規" value={summary.toInsert} tone="ok" />
        <SummaryChip label="更新" value={summary.toUpdate} tone="warning" />
        <SummaryChip label="スキップ" value={summary.toSkip} />
        <SummaryChip label="エラー" value={summary.error} tone="error" />
      </div>

      {unknownHeaders.length > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-600/20">
          未対応の列は無視されます: {unknownHeaders.join('、')}
        </p>
      )}

      <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">行</th>
              <th className="px-3 py-2 text-left font-medium">状態</th>
              <th className="px-3 py-2 text-left font-medium">キー</th>
              <th className="px-3 py-2 text-left font-medium">{entityLabel}名</th>
              <th className="px-3 py-2 text-left font-medium">予定</th>
              <th className="px-3 py-2 text-left font-medium">メッセージ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row: ImportRow<unknown>) => (
              <tr key={row.rowNumber} className="align-top">
                <td className="px-3 py-2 text-slate-500">{row.rowNumber}</td>
                <td className="px-3 py-2">
                  <RowStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700">
                  {row.key}
                </td>
                <td className="px-3 py-2 text-slate-700">{row.label}</td>
                <td className="px-3 py-2 text-slate-600">
                  {rowActionLabel(row.action)}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {row.messages.length > 0 ? row.messages.join(' / ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportResult({ outcome }: { outcome: ImportOutcome }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <SummaryChip label="新規登録" value={outcome.inserted} tone="ok" />
        <SummaryChip label="更新" value={outcome.updated} tone="warning" />
        <SummaryChip label="スキップ" value={outcome.skipped} />
        <SummaryChip label="失敗" value={outcome.failed} tone="error" />
      </div>
      {outcome.errors.length > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <p className="font-medium">失敗した行:</p>
          <ul className="mt-1 space-y-1">
            {outcome.errors.map((err) => (
              <li key={`${err.rowNumber}-${err.key}`}>
                行 {err.rowNumber}（{err.key}）: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {outcome.failed === 0 && (
        <p className="text-sm text-emerald-700">取り込みが完了しました。</p>
      )}
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'ok' | 'warning' | 'error';
}) {
  const toneClass =
    tone === 'ok'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
        : tone === 'error'
          ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
          : 'bg-slate-100 text-slate-600 ring-slate-500/20';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ring-1 ring-inset ${toneClass}`}
    >
      {label}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
