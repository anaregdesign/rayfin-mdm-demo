import {
  authenticated,
  date,
  decimal,
  entity,
  set,
  text,
  uuid,
} from '@microsoft/rayfin-core';

/**
 * Product master (製品マスタ).
 *
 * Persistence shape owned by the Rayfin platform. This is NOT the domain
 * model — the app maps this to `domain/models/product` inside the
 * infrastructure repository. Keep business rules out of this file.
 *
 * Master data is shared organization-wide, so access is granted to any
 * authenticated user (no per-user row policy).
 */
@entity()
@authenticated('*')
export class Product {
  @uuid() id!: string;

  /** Stock Keeping Unit — unique master identifier. */
  @text({ min: 1, max: 64, unique: true }) sku!: string;

  @text({ min: 1, max: 200 }) name!: string;
  @text({ max: 200, optional: true }) nameKana?: string;

  @set(
    'electronics',
    'apparel',
    'food',
    'beverage',
    'furniture',
    'stationery',
    'service',
    'other'
  )
  category!:
    | 'electronics'
    | 'apparel'
    | 'food'
    | 'beverage'
    | 'furniture'
    | 'stationery'
    | 'service'
    | 'other';

  @text({ max: 120, optional: true }) brand?: string;
  @text({ max: 1000, optional: true }) description?: string;

  @decimal() unitPrice!: number;

  @set('JPY', 'USD', 'EUR')
  currency!: 'JPY' | 'USD' | 'EUR';

  @set('piece', 'box', 'case', 'kg', 'liter', 'set', 'hour')
  unitOfMeasure!: 'piece' | 'box' | 'case' | 'kg' | 'liter' | 'set' | 'hour';

  @text({ max: 64, optional: true }) barcode?: string;
  @text({ max: 200, optional: true }) supplierName?: string;

  /** Lifecycle status for governance workflow. */
  @set('draft', 'active', 'discontinued', 'archived')
  status!: 'draft' | 'active' | 'discontinued' | 'archived';

  /** Data steward responsible for this record. */
  @text({ max: 120, optional: true }) steward?: string;

  @text({ max: 1000, optional: true }) notes?: string;

  @date() createdAt!: Date;
  @date() updatedAt!: Date;
  @text({ max: 120, optional: true }) createdBy?: string;
  @text({ max: 120, optional: true }) updatedBy?: string;
}
