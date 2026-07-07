import type { TextareaHTMLAttributes } from 'react';

interface TextAreaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  id,
  rows = 3,
  className = '',
  ...rest
}: TextAreaFieldProps) {
  const fieldId = id ?? label;
  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`mt-1 block w-full rounded-md border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset ${
          error
            ? 'ring-rose-400 focus:ring-rose-500'
            : 'ring-slate-300 focus:ring-indigo-600'
        }`}
        {...rest}
      />
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
