import type { StatusMeta } from '@/domain/models/master-status';

import { Badge } from './Badge';

interface StatusBadgeProps {
  /** Resolved status metadata from the domain (label + tone). */
  meta: StatusMeta<string>;
}

/** Renders a lifecycle status using the domain-provided label and tone. */
export function StatusBadge({ meta }: StatusBadgeProps) {
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
