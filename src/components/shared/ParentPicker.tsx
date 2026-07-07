import { SelectField } from '@/components/shared/SelectField';

export interface ParentOption {
  id: string;
  label: string;
}

interface ParentPickerProps {
  label: string;
  value: string;
  options: ParentOption[];
  onChange: (value: string) => void;
  /** Label for the "no parent" (root) choice. */
  noneLabel?: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Presentational parent selector for any hierarchy master. Prepends a
 * "no parent" (root) option and renders the caller's already-indented options.
 * Cycle prevention lives in the domain policy; this component only renders.
 */
export function ParentPicker({
  label,
  value,
  options,
  onChange,
  noneLabel = '（親なし・トップレベル）',
  hint,
  disabled,
}: ParentPickerProps) {
  const selectOptions = [
    { value: '', label: noneLabel },
    ...options.map((o) => ({ value: o.id, label: o.label })),
  ];
  return (
    <SelectField
      label={label}
      value={value}
      options={selectOptions}
      onChange={onChange}
      hint={hint}
      disabled={disabled}
    />
  );
}
