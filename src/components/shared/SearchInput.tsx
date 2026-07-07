interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Debounce-free search box; the caller decides how to use the value. */
export function SearchInput({
  value,
  onChange,
  placeholder = '検索…',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
        aria-hidden
      >
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-md border-0 py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
      />
    </div>
  );
}
