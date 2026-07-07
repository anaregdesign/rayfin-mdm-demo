import { Button } from '@/components/shared/Button';
import { TextField } from '@/components/shared/TextField';

interface StewardAssignPickerProps {
  value: string;
  onChange: (value: string) => void;
  onAssign: () => void;
  selectedCount: number;
  busy: boolean;
}

/**
 * Render-only bulk-assign bar: names a steward and assigns the selected tasks.
 * All permission logic lives in the view-model; this only reflects state.
 */
export function StewardAssignPicker({
  value,
  onChange,
  onAssign,
  selectedCount,
  busy,
}: StewardAssignPickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <TextField
        label="担当者を一括割り当て"
        value={value}
        onChange={onChange}
        placeholder="担当者名またはメール"
        hint="選択したタスクのレコードにスチュワードを設定します。"
        className="min-w-[220px] flex-1"
      />
      <span className="pb-2 text-sm tabular-nums text-slate-600">
        {selectedCount}件選択中
      </span>
      <Button
        onClick={onAssign}
        disabled={busy || selectedCount === 0}
        className="mb-0.5"
      >
        {busy ? '割り当て中…' : '割り当て'}
      </Button>
    </div>
  );
}
