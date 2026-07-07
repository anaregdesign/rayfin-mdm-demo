import type { StatusTone } from './master-status';

/**
 * Stewardship work-queue model (Issue #10). A `StewardTask` is a *derived*
 * "needs attention" signal for a single master record — it is never persisted.
 * The pure `steward-task-policy` composes the existing quality, duplicate,
 * status, and validation policies into these tasks; the view-model turns them
 * into rows and the dashboard rolls them up per steward.
 */

/** Which master a task belongs to. */
export type MasterKind = 'customer' | 'product';

export const MASTER_KIND_LABELS: Record<MasterKind, string> = {
  customer: '顧客',
  product: '製品',
};

export function masterKindLabel(kind: MasterKind): string {
  return MASTER_KIND_LABELS[kind];
}

/** Why a record surfaced in the work queue. A record may carry several. */
export type TaskReason =
  | 'low_quality'
  | 'duplicate'
  | 'stale_draft'
  | 'missing_required';

export const TASK_REASON_VALUES: TaskReason[] = [
  'missing_required',
  'low_quality',
  'duplicate',
  'stale_draft',
];

export const TASK_REASON_LABELS: Record<TaskReason, string> = {
  low_quality: '品質スコア低',
  duplicate: '重複候補あり',
  stale_draft: '下書き滞留',
  missing_required: '必須項目未入力',
};

export const TASK_REASON_DESCRIPTIONS: Record<TaskReason, string> = {
  low_quality: '品質スコアが基準値を下回っています',
  duplicate: '他レコードとの重複候補が検出されています',
  stale_draft: '下書きのまま一定期間更新されていません',
  missing_required: '必須項目が未入力のため有効化できません',
};

/** Badge tone per reason (reuses the shared status tone scale). */
export const TASK_REASON_TONE: Record<TaskReason, StatusTone> = {
  missing_required: 'danger',
  low_quality: 'danger',
  duplicate: 'warning',
  stale_draft: 'neutral',
};

export function taskReasonLabel(reason: TaskReason): string {
  return TASK_REASON_LABELS[reason];
}

/**
 * A single record that needs steward attention, aggregating every reason it
 * matched. Route-free by design — the view-model derives navigation targets.
 */
export interface StewardTask {
  /** Stable id: `${entityType}:${recordId}`. */
  id: string;
  entityType: MasterKind;
  recordId: string;
  /** Business key (code / SKU). */
  code: string;
  /** Display name for the row. */
  recordLabel: string;
  /** Owning steward (free text) or undefined when unassigned. */
  steward?: string;
  /** Localized lifecycle status label for display. */
  statusLabel: string;
  reasons: TaskReason[];
  /** 0..100 data-quality score of the record. */
  qualityScore: number;
  /** Sort weight — higher is more urgent (more reasons, then lower quality). */
  severity: number;
  updatedAt: Date;
}

/** Sentinel steward key for the "unassigned" workload bucket. */
export const UNASSIGNED_STEWARD = '__unassigned__';

/** The unassigned bucket's display label. */
export const UNASSIGNED_LABEL = '未割当';

/**
 * A steward's aggregated open-task load, shown on the dashboard and used to
 * pick the busiest owner. `steward === null` is the unassigned bucket.
 */
export interface StewardWorkload {
  /** Steward identity (free text) or null for the unassigned bucket. */
  steward: string | null;
  label: string;
  taskCount: number;
  reasonCounts: Record<TaskReason, number>;
}

/** A per-reason tally (for filter chips and summaries). */
export interface ReasonCount {
  reason: TaskReason;
  label: string;
  tone: StatusTone;
  count: number;
}
