import {
  changeFieldLabel,
  changeValueLabel,
  type ChangeEntityType,
  type FieldChange,
} from '@/domain/models/change-log';

interface FieldDiffRowProps {
  entityType: ChangeEntityType;
  change: FieldChange;
}

/** One field's before → after line inside a change-history entry. */
export function FieldDiffRow({ entityType, change }: FieldDiffRowProps) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-xs">
      <div className="text-slate-500">{changeFieldLabel(entityType, change.field)}</div>
      <div className="col-span-2 flex items-center gap-2">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 line-through">
          {changeValueLabel(entityType, change.field, change.before)}
        </span>
        <span className="text-slate-400">→</span>
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800">
          {changeValueLabel(entityType, change.field, change.after)}
        </span>
      </div>
    </div>
  );
}
