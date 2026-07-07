import { ChangeLog } from './ChangeLog.js';
import { Customer } from './Customer.js';
import { Product } from './Product.js';

/**
 * Binds entity names to their classes so `RayfinClient` can provide typed
 * `client.data.<Entity>` proxies, and the `schema` array registers the
 * decorated classes at runtime for CLI schema generation.
 */
export type MdmSchema = {
  Customer: Customer;
  Product: Product;
  ChangeLog: ChangeLog;
};

export const schema = [Customer, Product, ChangeLog];
