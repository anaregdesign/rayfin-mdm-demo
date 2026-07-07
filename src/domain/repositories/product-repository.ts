import type { ProductStatus } from '@/domain/models/master-status';
import type { Product, ProductInput } from '@/domain/models/product';

/**
 * Outbound port for product persistence. The domain speaks only in domain
 * models; the infrastructure adapter maps to/from the Rayfin entity.
 */
export interface ProductRepository {
  list(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: ProductInput): Promise<Product>;
  setStatus(id: string, status: ProductStatus): Promise<Product>;
  remove(id: string): Promise<void>;
}
