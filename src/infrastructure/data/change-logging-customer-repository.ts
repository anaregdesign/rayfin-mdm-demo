import {
  customerDisplayName,
  customerToInput,
  type Customer,
  type CustomerInput,
} from '@/domain/models/customer';
import {
  customerStatusLabel,
  type CustomerStatus,
} from '@/domain/models/master-status';
import type { ChangeAction, FieldChange } from '@/domain/models/change-log';
import type { CustomerRepository } from '@/domain/repositories/customer-repository';
import type { ChangeLogRepository } from '@/domain/repositories/change-log-repository';
import { diffRecords } from '@/domain/policies/diff-policy';

/**
 * Decorator that records change history around a base customer repository.
 * Keeps the audit concern out of the Rayfin adapter (single responsibility)
 * and composes both behind the same `CustomerRepository` port, so use cases are
 * unaware. Audit writes happen in the same flow but never fail the mutation.
 */
export class ChangeLoggingCustomerRepository implements CustomerRepository {
  constructor(
    private readonly inner: CustomerRepository,
    private readonly changeLog: ChangeLogRepository,
    private readonly actor: () => string | undefined
  ) {}

  list(): Promise<Customer[]> {
    return this.inner.list();
  }

  findById(id: string): Promise<Customer | null> {
    return this.inner.findById(id);
  }

  async create(input: CustomerInput): Promise<Customer> {
    const created = await this.inner.create(input);
    await this.safeAppend({
      entityId: created.id,
      action: 'create',
      changes: [],
      summary: `顧客「${customerDisplayName(created)}」を登録`,
    });
    return created;
  }

  async update(id: string, input: CustomerInput): Promise<Customer> {
    const before = await this.inner.findById(id);
    const updated = await this.inner.update(id, input);
    const changes = before
      ? diffRecords(customerToInput(before), customerToInput(updated))
      : [];
    if (changes.length > 0) {
      await this.safeAppend({
        entityId: id,
        action: 'update',
        changes,
        summary: `${changes.length}項目を更新`,
      });
    }
    return updated;
  }

  async setStatus(id: string, status: CustomerStatus): Promise<Customer> {
    const before = await this.inner.findById(id);
    const updated = await this.inner.setStatus(id, status);
    if (before && before.status !== updated.status) {
      await this.safeAppend({
        entityId: id,
        action: 'status',
        changes: [{ field: 'status', before: before.status, after: updated.status }],
        summary: `ステータスを ${customerStatusLabel(status)} に変更`,
      });
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const before = await this.inner.findById(id);
    await this.inner.remove(id);
    await this.safeAppend({
      entityId: id,
      action: 'delete',
      changes: [],
      summary: before ? `顧客「${customerDisplayName(before)}」を削除` : '顧客を削除',
    });
  }

  async markMerged(loserId: string, winnerId: string): Promise<void> {
    const before = await this.inner.findById(loserId);
    await this.inner.markMerged(loserId, winnerId);
    await this.safeAppend({
      entityId: loserId,
      action: 'status',
      changes: before
        ? [{ field: 'status', before: before.status, after: 'merged' }]
        : [],
      summary: '統合により「統合済み」に変更',
    });
  }

  async restoreMerged(loserId: string, status: CustomerStatus): Promise<void> {
    await this.inner.restoreMerged(loserId, status);
    await this.safeAppend({
      entityId: loserId,
      action: 'status',
      changes: [{ field: 'status', before: 'merged', after: status }],
      summary: `統合解除により ${customerStatusLabel(status)} に復元`,
    });
  }

  private async safeAppend(entry: {
    entityId: string;
    action: ChangeAction;
    changes: FieldChange[];
    summary: string;
  }): Promise<void> {
    try {
      await this.changeLog.append({
        entityType: 'customer',
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes,
        actorId: this.actor(),
        summary: entry.summary,
      });
    } catch (err) {
      // Audit failures must not break the user's mutation.
      console.error('[change-log] append failed for customer', entry.entityId, err);
    }
  }
}
