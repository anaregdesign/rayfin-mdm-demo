interface ApprovalModeToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

/**
 * Demo-only header switch for the maker-checker workflow (#8). When enabled,
 * customer/product edits are routed into the approval queue instead of being
 * written directly. Render-only: state and handler come from the auth context
 * via the app shell.
 */
export function ApprovalModeToggle({ enabled, onChange }: ApprovalModeToggleProps) {
  return (
    <label
      className="flex items-center gap-2 text-xs text-slate-500"
      title="有効にすると、登録・編集は直接保存されず承認申請として作成されます。"
    >
      <span className="hidden sm:inline">承認フロー（デモ）</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          enabled ? 'bg-indigo-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}
