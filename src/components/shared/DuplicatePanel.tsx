import type { DuplicatePair } from '@/domain/models/duplicate';

interface DuplicatePanelProps {
  pairs: DuplicatePair[];
  /** Optional: render a link/action for the "other" side of each pair. */
  renderRef?: (id: string, label: string) => React.ReactNode;
  title?: string;
}

/**
 * Warning panel listing potential duplicate pairs with their similarity score
 * and match reasons. Pure presentation over the domain's DuplicatePair.
 */
export function DuplicatePanel({
  pairs,
  renderRef,
  title = '重複候補',
}: DuplicatePanelProps) {
  if (pairs.length === 0) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-800">
        {title}（{pairs.length}件）
      </p>
      <ul className="mt-2 space-y-2">
        {pairs.map((pair) => (
          <li key={pair.key} className="text-sm text-amber-900">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {renderRef ? (
                  <>
                    {renderRef(pair.left.id, pair.left.label)}
                    <span className="mx-1 text-amber-500">↔</span>
                    {renderRef(pair.right.id, pair.right.label)}
                  </>
                ) : (
                  <>
                    {pair.left.label}
                    <span className="mx-1 text-amber-500">↔</span>
                    {pair.right.label}
                  </>
                )}
              </span>
              <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-800">
                一致度 {pair.score}
              </span>
            </div>
            {pair.reasons.length > 0 && (
              <p className="mt-0.5 text-xs text-amber-700">
                {pair.reasons.join('、')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
