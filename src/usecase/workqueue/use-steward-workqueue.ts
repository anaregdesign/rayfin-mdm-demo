import { useCallback, useMemo, useState } from 'react';

import type { Customer } from '@/domain/models/customer';
import { customerToInput } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import { productToInput } from '@/domain/models/product';
import type {
  ReasonCount,
  StewardTask,
  StewardWorkload,
  TaskReason,
} from '@/domain/models/steward-task';
import {
  can,
  canModifyAny,
  isRecordSteward,
} from '@/domain/policies/access-policy';
import {
  deriveStewardTasks,
  reasonCounts,
  stewardWorkloads,
} from '@/domain/policies/steward-task-policy';
import { toMessage } from '@/lib/errors';
import { useAuth } from '@/usecase/auth/use-auth';

import { useCustomers } from '@/usecase/customers/use-customers';
import { useProducts } from '@/usecase/products/use-products';

/** Which slice of the queue to show. */
export type WorkQueueScope = 'all' | 'mine' | 'unassigned';

/** Reason filter (`all` = no reason filter). */
export type ReasonFilter = TaskReason | 'all';

/** A task decorated with navigation targets + per-record permission. */
export interface WorkQueueRow {
  task: StewardTask;
  detailPath: string;
  editPath: string;
  /** Actor may edit / claim this record. */
  canEdit: boolean;
  selected: boolean;
}

export interface WorkQueuePageViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  scope: WorkQueueScope;
  setScope: (scope: WorkQueueScope) => void;
  reasonFilter: ReasonFilter;
  setReasonFilter: (reason: ReasonFilter) => void;
  rows: WorkQueueRow[];
  /** All open tasks (before scope/reason filtering). */
  totalCount: number;
  /** Rows after filtering. */
  filteredCount: number;
  /** Per-reason tallies across all open tasks. */
  reasonCounts: ReasonCount[];
  /** Per-steward open-task load across all open tasks. */
  workloads: StewardWorkload[];
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
  assignTarget: string;
  setAssignTarget: (value: string) => void;
  assign: () => Promise<void>;
  assigning: boolean;
  /** Actor may assign stewards (admins + stewards). */
  canManage: boolean;
  reload: () => Promise<void>;
}

function detailPathFor(task: StewardTask): string {
  return task.entityType === 'customer'
    ? `/customers/${task.recordId}`
    : `/products/${task.recordId}`;
}

function editPathFor(task: StewardTask): string {
  return `${detailPathFor(task)}/edit`;
}

/**
 * Orchestrates the stewardship work queue (Issue #10). Composes the customer +
 * product stores and auth, derives prioritized tasks via the pure policy, and
 * exposes filters, selection, and a permission-guarded bulk-assign command that
 * writes back through the stores (so lists refresh).
 */
export function useStewardWorkqueuePage(): WorkQueuePageViewModel {
  const customers = useCustomers();
  const products = useProducts();
  const { actor } = useAuth();

  const [scope, setScope] = useState<WorkQueueScope>('all');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTarget, setAssignTarget] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Stable "now" so staleness doesn't churn tasks across re-renders.
  const [now] = useState(() => new Date());

  const tasks = useMemo(
    () => deriveStewardTasks(customers.customers, products.products, { now }),
    [customers.customers, products.products, now]
  );

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers.customers) map.set(c.id, c);
    return map;
  }, [customers.customers]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products.products) map.set(p.id, p);
    return map;
  }, [products.products]);

  const workloads = useMemo(() => stewardWorkloads(tasks), [tasks]);
  const counts = useMemo(() => reasonCounts(tasks), [tasks]);

  const rows = useMemo<WorkQueueRow[]>(() => {
    return tasks
      .filter((task) => {
        if (scope === 'unassigned' && task.steward?.trim()) return false;
        if (scope === 'mine') {
          if (!actor || !isRecordSteward(actor, { steward: task.steward })) {
            return false;
          }
        }
        if (reasonFilter !== 'all' && !task.reasons.includes(reasonFilter)) {
          return false;
        }
        return true;
      })
      .map((task) => ({
        task,
        detailPath: detailPathFor(task),
        editPath: editPathFor(task),
        canEdit: !!actor && can(actor, 'edit', { steward: task.steward }),
        selected: selected.has(task.id),
      }));
  }, [tasks, scope, reasonFilter, actor, selected]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of rows) if (row.canEdit) next.add(row.task.id);
      return next;
    });
  }, [rows]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const assign = useCallback(async () => {
    setActionError(null);
    const target = assignTarget.trim();
    if (!target) {
      setActionError('割り当てる担当者名を入力してください。');
      return;
    }
    if (selected.size === 0) {
      setActionError('割り当てるタスクを選択してください。');
      return;
    }
    if (!actor) return;

    setAssigning(true);
    let denied = 0;
    let failed = 0;
    try {
      for (const task of tasks) {
        if (!selected.has(task.id)) continue;
        if (task.entityType === 'customer') {
          const record = customerById.get(task.recordId);
          if (!record || !can(actor, 'edit', record)) {
            denied += 1;
            continue;
          }
          try {
            await customers.updateCustomer(record.id, {
              ...customerToInput(record),
              steward: target,
            });
          } catch {
            failed += 1;
          }
        } else {
          const record = productById.get(task.recordId);
          if (!record || !can(actor, 'edit', record)) {
            denied += 1;
            continue;
          }
          try {
            await products.updateProduct(record.id, {
              ...productToInput(record),
              steward: target,
            });
          } catch {
            failed += 1;
          }
        }
      }
      setSelected(new Set());
      const notes: string[] = [];
      if (denied > 0) notes.push(`${denied}件は権限がないため割り当てできませんでした`);
      if (failed > 0) notes.push(`${failed}件の更新に失敗しました`);
      if (notes.length > 0) setActionError(`${notes.join('、')}。`);
    } catch (err) {
      setActionError(toMessage(err));
    } finally {
      setAssigning(false);
    }
  }, [assignTarget, selected, actor, tasks, customerById, productById, customers, products]);

  const reload = useCallback(async () => {
    await Promise.all([customers.reload(), products.reload()]);
  }, [customers, products]);

  return {
    loading: customers.loading || products.loading,
    error: customers.error ?? products.error,
    actionError,
    scope,
    setScope,
    reasonFilter,
    setReasonFilter,
    rows,
    totalCount: tasks.length,
    filteredCount: rows.length,
    reasonCounts: counts,
    workloads,
    selectedIds: [...selected],
    toggleSelect,
    selectAllVisible,
    clearSelection,
    assignTarget,
    setAssignTarget,
    assign,
    assigning,
    canManage: !!actor && canModifyAny(actor),
    reload,
  };
}
