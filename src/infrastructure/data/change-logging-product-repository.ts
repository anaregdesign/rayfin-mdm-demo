import type { ChangeAction, FieldChange } from '@/domain/models/change-log';
import {
  productStatusLabel,
  type ProductStatus,
} from '@/domain/models/master-status';
import {
  productDisplayName,
  productToInput,
  type Product,
  type ProductInput,
} from '@/domain/models/product';
import { diffRecords } from '@/domain/policies/diff-policy';
import type { ChangeLogRepository } from '@/domain/repositories/change-log-repository';
import type { ProductRepository } from '@/domain/repositories/product-repository';

/**
 * Decorator that records change history around a base product repository.
 * Mirrors `ChangeLoggingCustomerRepository`: composes the audit concern behind
 * the same `ProductRepository` port; audit writes never fail the mutation.
 */
export class ChangeLoggingProductRepository implements ProductRepository {
  constructor(
    private readonly inner: ProductRepository,
    private readonly changeLog: ChangeLogRepository,
    private readonly actor: () => string | undefined
  ) {}

  list(): Promise<Product[]> {
    return this.inner.list();
  }

  findById(id: string): Promise<Product | null> {
    return this.inner.findById(id);
  }

  async create(input: ProductInput): Promise<Product> {
    const created = await this.inner.create(input);
    await this.safeAppend({
      entityId: created.id,
      action: 'create',
      changes: [],
      summary: `製品「${productDisplayName(created)}」を登録`,
    });
    return created;
  }

  async update(id: string, input: ProductInput): Promise<Product> {
    const before = await this.inner.findById(id);
    const updated = await this.inner.update(id, input);
    const changes = before
      ? diffRecords(productToInput(before), productToInput(updated))
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

  async setStatus(id: string, status: ProductStatus): Promise<Product> {
    const before = await this.inner.findById(id);
    const updated = await this.inner.setStatus(id, status);
    if (before && before.status !== updated.status) {
      await this.safeAppend({
        entityId: id,
        action: 'status',
        changes: [{ field: 'status', before: before.status, after: updated.status }],
        summary: `ステータスを ${productStatusLabel(status)} に変更`,
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
      summary: before ? `製品「${productDisplayName(before)}」を削除` : '製品を削除',
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
        entityType: 'product',
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes,
        actorId: this.actor(),
        summary: entry.summary,
      });
    } catch (err) {
      // Audit failures must not break the user's mutation.
      console.error('[change-log] append failed for product', entry.entityId, err);
    }
  }
}
