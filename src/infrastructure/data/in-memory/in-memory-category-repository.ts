import type { Category, CategoryInput } from '@/domain/models/category';
import type { Clock } from '@/domain/ports/clock';
import type { CategoryRepository } from '@/domain/repositories/category-repository';

import { clone } from './clone';

/**
 * In-memory product-category repository for demo mode. Plain CRUD over an array
 * (the tree is built by the pure hierarchy policy). `list` returns clones
 * ordered by name, mirroring the Rayfin adapter.
 */
export class InMemoryCategoryRepository implements CategoryRepository {
  private readonly rows: Category[];

  constructor(
    private readonly clock: Clock,
    private readonly actor: () => string | undefined,
    seed: Category[] = []
  ) {
    this.rows = seed.map(clone);
  }

  async list(): Promise<Category[]> {
    return this.rows
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
      .map(clone);
  }

  async findById(id: string): Promise<Category | null> {
    const row = this.rows.find((r) => r.id === id);
    return row ? clone(row) : null;
  }

  async create(input: CategoryInput): Promise<Category> {
    const now = this.clock.now();
    const actor = this.actor();
    const row: Category = {
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

  async update(id: string, input: CategoryInput): Promise<Category> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(`Category ${id} not found after update`);
    Object.assign(row, input, {
      updatedAt: this.clock.now(),
      updatedBy: this.actor(),
    });
    return clone(row);
  }

  async remove(id: string): Promise<void> {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index >= 0) this.rows.splice(index, 1);
  }
}
