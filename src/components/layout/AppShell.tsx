import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface AppShellProps {
  userName: string;
  onSignOut: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/', label: 'ダッシュボード', end: true },
  { to: '/customers', label: '顧客マスタ', end: false },
  { to: '/products', label: '製品マスタ', end: false },
  { to: '/guide', label: 'MDMガイド', end: false },
];

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

/** Authenticated app chrome: top navigation, identity, and content area. */
export function AppShell({ userName, onSignOut, headerExtra, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              MDM<span className="text-indigo-600"> Hub</span>
            </span>
            <nav className="flex items-center gap-1">
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
          </div>
          <div className="flex items-center gap-3">
            {headerExtra}
            {userName && (
              <span className="hidden text-sm text-slate-500 sm:inline">
                {userName}
              </span>
            )}
            <button
              onClick={onSignOut}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              サインアウト
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
