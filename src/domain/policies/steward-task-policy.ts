import type { Customer } from '../models/customer';
import { customerDisplayName, customerToInput } from '../models/customer';
import type { Product } from '../models/product';
import { productDisplayName, productToInput } from '../models/product';
import { customerStatusLabel, productStatusLabel } from '../models/master-status';
import type {
  ReasonCount,
  StewardTask,
  StewardWorkload,
  TaskReason,
} from '../models/steward-task';
import {
  TASK_REASON_LABELS,
  TASK_REASON_TONE,
  TASK_REASON_VALUES,
  UNASSIGNED_LABEL,
} from '../models/steward-task';
import { evaluateCustomerQuality } from './customer-quality-policy';
import { evaluateProductQuality } from './product-quality-policy';
import { validateCustomerInput } from './customer-validation';
import { validateProductInput } from './product-validation';
import {
  duplicateIdSet,
  findCustomerDuplicates,
  findProductDuplicates,
} from './duplicate-policy';

/**
 * Stewardship work-queue policy (Issue #10). Pure functions that *compose* the
 * existing quality, duplicate, validation, and status policies into a
 * prioritized list of `StewardTask`s. No SDK, no React, no routing — the
 * view-model turns tasks into navigable rows and the dashboard rolls them up.
 */

/** Tunable thresholds; `now` is injected so staleness is deterministic in tests. */
export interface StewardTaskContext {
  now?: Date;
  /** Quality score below this flags `low_quality` (default 50). */
  qualityThreshold?: number;
  /** Draft age (days) at/after which `stale_draft` fires (default 14). */
  staleDraftDays?: number;
}

const DEFAULT_QUALITY_THRESHOLD = 50;
const DEFAULT_STALE_DRAFT_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Lifecycle states that are not actionable in the work queue. */
const EXCLUDED_STATUSES = new Set(['merged', 'archived']);

function ageInDays(now: Date, then: Date): number {
  return (now.getTime() - then.getTime()) / MS_PER_DAY;
}

function severityOf(reasons: TaskReason[], qualityScore: number): number {
  return reasons.length * 100 + (100 - qualityScore);
}

/** Higher severity first; older records break ties (oldest first). */
function compareTasks(a: StewardTask, b: StewardTask): number {
  if (b.severity !== a.severity) return b.severity - a.severity;
  return a.updatedAt.getTime() - b.updatedAt.getTime();
}

/** Derive work-queue tasks for the customer master. */
export function deriveCustomerTasks(
  customers: Customer[],
  ctx: StewardTaskContext = {}
): StewardTask[] {
  const now = ctx.now ?? new Date();
  const threshold = ctx.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD;
  const staleDays = ctx.staleDraftDays ?? DEFAULT_STALE_DRAFT_DAYS;

  const actionable = customers.filter((c) => !EXCLUDED_STATUSES.has(c.status));
  const dupSet = duplicateIdSet(findCustomerDuplicates(actionable));

  const tasks: StewardTask[] = [];
  for (const c of actionable) {
    const quality = evaluateCustomerQuality(c);
    const reasons: TaskReason[] = [];
    if (!validateCustomerInput(customerToInput(c)).valid) {
      reasons.push('missing_required');
    }
    if (quality.score < threshold) reasons.push('low_quality');
    if (dupSet.has(c.id)) reasons.push('duplicate');
    if (c.status === 'draft' && ageInDays(now, c.updatedAt) >= staleDays) {
      reasons.push('stale_draft');
    }
    if (reasons.length === 0) continue;
    tasks.push({
      id: `customer:${c.id}`,
      entityType: 'customer',
      recordId: c.id,
      code: c.code,
      recordLabel: customerDisplayName(c),
      steward: c.steward,
      statusLabel: customerStatusLabel(c.status),
      reasons,
      qualityScore: quality.score,
      severity: severityOf(reasons, quality.score),
      updatedAt: c.updatedAt,
    });
  }
  return tasks.sort(compareTasks);
}

/** Derive work-queue tasks for the product master. */
export function deriveProductTasks(
  products: Product[],
  ctx: StewardTaskContext = {}
): StewardTask[] {
  const now = ctx.now ?? new Date();
  const threshold = ctx.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD;
  const staleDays = ctx.staleDraftDays ?? DEFAULT_STALE_DRAFT_DAYS;

  const actionable = products.filter((p) => !EXCLUDED_STATUSES.has(p.status));
  const dupSet = duplicateIdSet(findProductDuplicates(actionable));

  const tasks: StewardTask[] = [];
  for (const p of actionable) {
    const quality = evaluateProductQuality(p);
    const reasons: TaskReason[] = [];
    if (!validateProductInput(productToInput(p)).valid) {
      reasons.push('missing_required');
    }
    if (quality.score < threshold) reasons.push('low_quality');
    if (dupSet.has(p.id)) reasons.push('duplicate');
    if (p.status === 'draft' && ageInDays(now, p.updatedAt) >= staleDays) {
      reasons.push('stale_draft');
    }
    if (reasons.length === 0) continue;
    tasks.push({
      id: `product:${p.id}`,
      entityType: 'product',
      recordId: p.id,
      code: p.sku,
      recordLabel: productDisplayName(p),
      steward: p.steward,
      statusLabel: productStatusLabel(p.status),
      reasons,
      qualityScore: quality.score,
      severity: severityOf(reasons, quality.score),
      updatedAt: p.updatedAt,
    });
  }
  return tasks.sort(compareTasks);
}

/** Merge both masters' tasks into one prioritized queue. */
export function deriveStewardTasks(
  customers: Customer[],
  products: Product[],
  ctx: StewardTaskContext = {}
): StewardTask[] {
  return [
    ...deriveCustomerTasks(customers, ctx),
    ...deriveProductTasks(products, ctx),
  ].sort(compareTasks);
}

function emptyReasonCounts(): Record<TaskReason, number> {
  return {
    missing_required: 0,
    low_quality: 0,
    duplicate: 0,
    stale_draft: 0,
  };
}

/** Normalize a steward key; empty/whitespace becomes the unassigned bucket. */
function stewardKey(steward: string | undefined): string | null {
  const trimmed = steward?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Roll tasks up per steward (open-task load). `steward === null` is the
 * unassigned bucket. Sorted busiest-first; named stewards outrank the
 * unassigned bucket on ties.
 */
export function stewardWorkloads(tasks: StewardTask[]): StewardWorkload[] {
  const byKey = new Map<string, StewardWorkload>();
  for (const task of tasks) {
    const key = stewardKey(task.steward);
    const mapKey = key ?? '\u0000unassigned';
    let bucket = byKey.get(mapKey);
    if (!bucket) {
      bucket = {
        steward: key,
        label: key ?? UNASSIGNED_LABEL,
        taskCount: 0,
        reasonCounts: emptyReasonCounts(),
      };
      byKey.set(mapKey, bucket);
    }
    bucket.taskCount += 1;
    for (const reason of task.reasons) bucket.reasonCounts[reason] += 1;
  }

  return [...byKey.values()].sort((a, b) => {
    if (b.taskCount !== a.taskCount) return b.taskCount - a.taskCount;
    if (a.steward === null) return 1;
    if (b.steward === null) return -1;
    return a.label.localeCompare(b.label);
  });
}

/** Per-reason tally across tasks (a task counts once per distinct reason). */
export function reasonCounts(tasks: StewardTask[]): ReasonCount[] {
  const counts = emptyReasonCounts();
  for (const task of tasks) {
    for (const reason of task.reasons) counts[reason] += 1;
  }
  return TASK_REASON_VALUES.map((reason) => ({
    reason,
    label: TASK_REASON_LABELS[reason],
    tone: TASK_REASON_TONE[reason],
    count: counts[reason],
  }));
}
