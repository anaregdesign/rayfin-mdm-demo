import type { ProductStatus } from '@/domain/models/master-status';
import type { Product, ProductInput } from '@/domain/models/product';
import type { Clock } from '@/domain/ports/clock';
import type { ProductRepository } from '@/domain/repositories/product-repository';

import { clone } from './clone';

/**
 * In-memory product repository for demo mode — the product twin of
 * `InMemoryCustomerRepository`. Same `ProductRepository` port, same Rayfin
 * audit/merge semantics, no backend. State lives in a plain array; returns are
 * cloned so callers cannot mutate it.
 */
export class InMemoryProductRepository implements ProductRepository {
  private readonly rows: Product[];

  constructor(
    private readonly clock: Clock,
    private readonly actor: () => string | undefined,
    seed: Product[] = []
  ) {
    this.rows = seed.map(clone);
  }

  async list(): Promise<Product[]> {
    return this.rows
      .slice()
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(clone);
  }

  async findById(id: string): Promise<Product | null> {
    const row = this.rows.find((r) => r.id === id);
    return row ? clone(row) : null;
  }

  async create(input: ProductInput): Promise<Product> {
    const now = this.clock.now();
    const actor = this.actor();
    const row: Product = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
      updatedBy: actor,
    };
    this.rows.push(clone(row));
    return clone(row);
  }

  async update(id: string, input: ProductInput): Promise<Product> {
    const row = this.require(id, 'update');
    Object.assign(row, input, {
      updatedAt: this.clock.now(),
      updatedBy: this.actor(),
    });
    return clone(row);
  }

  async setStatus(id: string, status: ProductStatus): Promise<Product> {
    const row = this.require(id, 'status change');
    row.status = status;
    row.updatedAt = this.clock.now();
    row.updatedBy = this.actor();
    return clone(row);
  }

  async remove(id: string): Promise<void> {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index >= 0) this.rows.splice(index, 1);
  }

  async markMerged(loserId: string, winnerId: string): Promise<void> {
    const row = this.rows.find((r) => r.id === loserId);
    if (!row) return;
    const now = this.clock.now();
    row.status = 'merged';
    row.mergedInto = winnerId;
    row.mergedAt = now;
    row.updatedAt = now;
    row.updatedBy = this.actor();
  }

  async restoreMerged(loserId: string, status: ProductStatus): Promise<void> {
    const row = this.rows.find((r) => r.id === loserId);
    if (!row) return;
    row.status = status;
    row.mergedInto = undefined;
    row.mergedAt = undefined;
    row.updatedAt = this.clock.now();
    row.updatedBy = this.actor();
  }

  private require(id: string, op: string): Product {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(`Product ${id} not found after ${op}`);
    return row;
  }
}
