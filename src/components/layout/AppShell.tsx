import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface AppShellProps {
  userName: string;
  /** Sign-out handler. Omit in demo mode to hide the control (no real session). */
  onSignOut?: () => void;
  /** Extra controls rendered in the sidebar footer (role switcher, toggles). */
  controls?: ReactNode;
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/guide', label: 'MDMガイド', end: false },
  { to: '/', label: 'ダッシュボード', end: true },
  { to: '/report', label: 'BIレポート', end: false },
  { to: '/customers', label: '顧客マスタ', end: false },
  { to: '/products', label: '製品マスタ', end: false },
  { to: '/categories', label: 'カテゴリ管理', end: false },
  { to: '/workqueue', label: 'ワークキュー', end: false },
  { to: '/remediation', label: '是正キュー', end: false },
  { to: '/distribution', label: '配信・連携', end: false },
  { to: '/approvals', label: '承認', end: false },
];

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

/** Authenticated app chrome: left sidebar navigation, identity, and content area. */
export function AppShell({ userName, onSignOut, controls, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <span className="text-lg font-bold tracking-tight text-slate-900">
            MDM<span className="text-indigo-600"> Hub</span>
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4">
          {controls}
          {userName && (
            <span className="truncate text-sm text-slate-500" title={userName}>
              {userName}
            </span>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              サインアウト
            </button>
          )}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
