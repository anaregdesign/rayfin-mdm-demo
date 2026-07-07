import { useCallback, useEffect, useState } from 'react';

import type { ProductStatus } from '@/domain/models/master-status';
import type { Product, ProductInput } from '@/domain/models/product';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';

/** Shared product data source: loads the master list and exposes commands. */
export interface ProductsStore {
  products: Product[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createProduct: (input: ProductInput) => Promise<Product>;
  updateProduct: (id: string, input: ProductInput) => Promise<Product>;
  changeStatus: (id: string, status: ProductStatus) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
}

/**
 * Loads all products once and exposes CRUD/status commands. Mutations reload
 * the full list so client-side duplicate detection and analytics stay accurate.
 */
export function useProducts(): ProductsStore {
  const { products: repo } = useDependencies();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await repo.list());
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createProduct = useCallback(
    async (input: ProductInput) => {
      const created = await repo.create(input);
      await reload();
      return created;
    },
    [repo, reload]
  );

  const updateProduct = useCallback(
    async (id: string, input: ProductInput) => {
      const updated = await repo.update(id, input);
      await reload();
      return updated;
    },
    [repo, reload]
  );

  const changeStatus = useCallback(
    async (id: string, status: ProductStatus) => {
      const updated = await repo.setStatus(id, status);
      await reload();
      return updated;
    },
    [repo, reload]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await repo.remove(id);
      await reload();
    },
    [repo, reload]
  );

  return {
    products,
    loading,
    error,
    reload,
    createProduct,
    updateProduct,
    changeStatus,
    deleteProduct,
  };
}
