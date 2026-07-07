import type { ProductStatus } from '@/domain/models/master-status';
import type { Product, ProductInput } from '@/domain/models/product';
import type { Clock } from '@/domain/ports/clock';
import type { ProductRepository } from '@/domain/repositories/product-repository';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import { productInputToFields, toProduct } from './product-mapper';

/**
 * All Product columns. Reads MUST select fields explicitly — the Rayfin query
 * builder otherwise returns only `id`.
 */
const PRODUCT_FIELDS = [
  'id',
  'sku',
  'name',
  'nameKana',
  'category',
  'brand',
  'description',
  'unitPrice',
  'currency',
  'unitOfMeasure',
  'barcode',
  'supplierName',
  'status',
  'steward',
  'notes',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
] as const;

/** Rayfin-backed product repository (Data API Builder via the typed client). */
export class RayfinProductRepository implements ProductRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly clock: Clock
  ) {}

  private actor(): string | undefined {
    const { user } = this.client.getSession();
    return user?.email ?? user?.id ?? undefined;
  }

  async list(): Promise<Product[]> {
    const rows = await this.client.data.Product.select(PRODUCT_FIELDS)
      .orderBy({ updatedAt: 'desc' })
      .execute();
    return rows.map(toProduct);
  }

  async findById(id: string): Promise<Product | null> {
    const rows = await this.client.data.Product.select(PRODUCT_FIELDS)
      .where({ id: { eq: id } })
      .execute();
    const row = rows[0];
    return row ? toProduct(row) : null;
  }

  async create(input: ProductInput): Promise<Product> {
    const fields = productInputToFields(input);
    const now = this.clock.now();
    const actor = this.actor();
    const row = await this.client.data.Product.create({
      ...fields,
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
      updatedBy: actor,
    });
    return toProduct(row);
  }

  async update(id: string, input: ProductInput): Promise<Product> {
    const fields = productInputToFields(input);
    await this.client.data.Product.update(
      { id },
      { ...fields, updatedAt: this.clock.now(), updatedBy: this.actor() }
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Product ${id} not found after update`);
    return updated;
  }

  async setStatus(id: string, status: ProductStatus): Promise<Product> {
    await this.client.data.Product.update(
      { id },
      { status, updatedAt: this.clock.now(), updatedBy: this.actor() }
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Product ${id} not found after status change`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.client.data.Product.delete({ id });
  }
}
