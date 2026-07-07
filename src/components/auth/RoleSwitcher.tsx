import type { Role } from '@/domain/models/authz';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/domain/models/authz';

interface RoleSwitcherProps {
  activeRole: Role;
  options: Role[];
  onChange: (role: Role) => void;
}

/**
 * Demo-only role switcher shown in the app header. Lets a reviewer step through
 * 閲覧者 / データスチュワード / 管理者 at runtime to exercise the access policy
 * without provisioning Entra app-roles. Render-only: the active role and change
 * handler are supplied by the app shell from the auth context.
 */
export function RoleSwitcher({ activeRole, options, onChange }: RoleSwitcherProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span className="hidden sm:inline">ロール（デモ）</span>
      <select
        value={activeRole}
        onChange={(e) => onChange(e.target.value as Role)}
        title={ROLE_DESCRIPTIONS[activeRole]}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
      >
        {options.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </label>
  );
}
