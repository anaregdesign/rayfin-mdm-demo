export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  hint,
  required,
  id,
  disabled,
  className = '',
}: SelectFieldProps) {
  const fieldId = id ?? label;
  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <select
        id={fieldId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`mt-1 block w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset disabled:bg-slate-50 disabled:text-slate-400 ${
          error
            ? 'ring-rose-400 focus:ring-rose-500'
            : 'ring-slate-300 focus:ring-indigo-600'
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
