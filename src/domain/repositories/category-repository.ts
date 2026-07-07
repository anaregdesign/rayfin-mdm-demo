import type { Category, CategoryInput } from '@/domain/models/category';

/**
 * Outbound port for product-category persistence. The domain speaks only in
 * domain models; the infrastructure adapter maps to/from the Rayfin entity.
 * The tree is built in memory by the pure hierarchy policy, so the port stays a
 * plain CRUD surface.
 */
export interface CategoryRepository {
  list(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  create(input: CategoryInput): Promise<Category>;
  update(id: string, input: CategoryInput): Promise<Category>;
  remove(id: string): Promise<void>;
}
