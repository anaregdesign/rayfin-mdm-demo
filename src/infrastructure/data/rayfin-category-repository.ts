import type { Category, CategoryInput } from '@/domain/models/category';
import type { Clock } from '@/domain/ports/clock';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import { categoryInputToFields, toCategory } from './category-mapper';

/**
 * All ProductCategory columns. Reads MUST select fields explicitly — the Rayfin
 * query builder otherwise returns only `id`.
 */
const CATEGORY_FIELDS = [
  'id',
  'code',
  'name',
  'parentId',
  'description',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
] as const;

/** Rayfin-backed product-category repository. */
export class RayfinCategoryRepository implements CategoryRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly clock: Clock
  ) {}

  private actor(): string | undefined {
    const { user } = this.client.getSession();
    return user?.email ?? user?.id ?? undefined;
  }

  async list(): Promise<Category[]> {
    const rows = await this.client.data.ProductCategory.select(CATEGORY_FIELDS)
      .orderBy({ name: 'asc' })
      .execute();
    return rows.map(toCategory);
  }

  async findById(id: string): Promise<Category | null> {
    const rows = await this.client.data.ProductCategory.select(CATEGORY_FIELDS)
      .where({ id: { eq: id } })
      .execute();
    const row = rows[0];
    return row ? toCategory(row) : null;
  }

  async create(input: CategoryInput): Promise<Category> {
    const fields = categoryInputToFields(input);
    const now = this.clock.now();
    const actor = this.actor();
    const row = await this.client.data.ProductCategory.create({
      ...fields,
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
      updatedBy: actor,
    });
    return toCategory(row);
  }

  async update(id: string, input: CategoryInput): Promise<Category> {
    const fields = categoryInputToFields(input);
    await this.client.data.ProductCategory.update(
      { id },
      { ...fields, updatedAt: this.clock.now(), updatedBy: this.actor() }
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`ProductCategory ${id} not found after update`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.client.data.ProductCategory.delete({ id });
  }
}
