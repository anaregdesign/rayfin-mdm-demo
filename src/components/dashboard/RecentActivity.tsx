import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/format';

export interface RecentActivityItem {
  id: string;
  label: string;
  sublabel: string;
  updatedAt: Date;
}

interface RecentActivityProps {
  title: string;
  items: RecentActivityItem[];
  onOpen: (id: string) => void;
  emptyLabel?: string;
}

/** Compact "recently updated" list linking to each record's detail view. */
export function RecentActivity({
  title,
  items,
  onOpen,
  emptyLabel = 'レコードがありません',
}: RecentActivityProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      {items.length === 0 ? (
        <EmptyState title={emptyLabel} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between py-2"
            >
              <div className="min-w-0">
                <button
                  onClick={() => onOpen(item.id)}
                  className="truncate text-left text-sm font-medium text-indigo-600 hover:underline"
                >
                  {item.label}
                </button>
                <p className="truncate text-xs text-slate-400">
                  {item.sublabel}
                </p>
              </div>
              <span className="ml-3 shrink-0 text-xs text-slate-400">
                {formatDate(item.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
