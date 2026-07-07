import { useState } from 'react';

import {
  SURVIVORSHIP_STRATEGY_VALUES,
  survivorshipStrategyLabel,
  type MergeFieldSource,
  type SurvivorshipStrategy,
} from '@/domain/models/merge';
import type { MergePlan } from '@/usecase/merge/merge-plan';

import { Button } from '../shared/Button';

interface MergeDialogProps {
  open: boolean;
  plan: MergePlan | null;
  busy?: boolean;
  error?: string | null;
  onConfirm: (sources: Record<string, MergeFieldSource>) => void;
  onCancel: () => void;
}

const DEFAULT_STRATEGY: SurvivorshipStrategy = 'nonEmpty';

/**
 * Steward-facing survivorship editor for a pairwise merge. Presents the winner
 * and loser side by side, lets the steward pick a strategy or override each
 * field, previews the resulting golden value, and returns the per-field source
 * map on confirm. Purely presentational — all policy lives in the injected
 * `plan.computeDefaults` closure and the use-case layer.
 */
export function MergeDialog({
  open,
  plan,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: MergeDialogProps) {
  const [strategy, setStrategy] = useState<SurvivorshipStrategy>(DEFAULT_STRATEGY);
  const [sources, setSources] = useState<Record<string, MergeFieldSource>>(() =>
    plan ? plan.computeDefaults(DEFAULT_STRATEGY) : {}
  );

  if (!open || !plan) return null;

  const applyStrategy = (next: SurvivorshipStrategy) => {
    setStrategy(next);
    setSources(plan.computeDefaults(next));
  };

  const setField = (key: string, source: MergeFieldSource) => {
    setSources((prev) => ({ ...prev, [key]: source }));
  };

  const diffCount = plan.fields.filter((f) => f.differs).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={busy ? undefined : onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="レコードの統合"
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
      >
        <div className="border-b border-slate-200 p-6 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            レコードの統合（名寄せ）
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium text-emerald-700">
              {plan.winnerLabel}
            </span>
            <span className="mx-1 text-slate-400">←</span>
            <span className="font-medium text-slate-500">{plan.loserLabel}</span>
            を統合します。各項目でどちらの値を残すか選択してください（相違{' '}
            {diffCount} 件）。
          </p>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">
              既定の戦略
            </label>
            <div className="flex gap-1">
              {SURVIVORSHIP_STRATEGY_VALUES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => applyStrategy(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    strategy === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {survivorshipStrategyLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-6 pt-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 font-medium">項目</th>
                <th className="pb-2 font-medium">
                  {plan.winnerLabel}（統合先）
                </th>
                <th className="pb-2 font-medium">
                  {plan.loserLabel}（統合元）
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.fields.map((field) => {
                const chosen = sources[field.key] ?? 'winner';
                return (
                  <tr
                    key={field.key}
                    className={field.differs ? 'bg-amber-50/50' : undefined}
                  >
                    <td className="py-2 pr-3 align-top font-medium text-slate-600">
                      {field.label}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setField(field.key, 'winner')}
                        className={`w-full rounded-md border px-2.5 py-1.5 text-left transition-colors ${
                          chosen === 'winner'
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {field.winnerValue}
                      </button>
                    </td>
                    <td className="py-2 align-top">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setField(field.key, 'loser')}
                        className={`w-full rounded-md border px-2.5 py-1.5 text-left transition-colors ${
                          chosen === 'loser'
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {field.loserValue}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 p-6 pt-4">
          {error && (
            <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              統合元は「統合済み」となり、履歴から元に戻せます。
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onCancel} disabled={busy}>
                キャンセル
              </Button>
              <Button
                variant="primary"
                onClick={() => onConfirm(sources)}
                disabled={busy}
              >
                {busy ? '統合中…' : '統合する'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
