import { useCallback, useEffect, useState } from 'react';

import type { Category, CategoryInput } from '@/domain/models/category';
import { useDependencies } from '@/di/dependencies';
import { toMessage } from '@/lib/errors';

/** Shared category data source: loads the master tree and exposes commands. */
export interface CategoriesStore {
  categories: Category[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createCategory: (input: CategoryInput) => Promise<Category>;
  updateCategory: (id: string, input: CategoryInput) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
}

/**
 * Loads all product categories once and exposes CRUD commands. Mutations reload
 * the full list so the in-memory tree (built by the pure hierarchy policy) stays
 * accurate. The management page hook composes this store with the policy.
 */
export function useCategories(): CategoriesStore {
  const { categories: repo } = useDependencies();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await repo.list());
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createCategory = useCallback(
    async (input: CategoryInput) => {
      const created = await repo.create(input);
      await reload();
      return created;
    },
    [repo, reload]
  );

  const updateCategory = useCallback(
    async (id: string, input: CategoryInput) => {
      const updated = await repo.update(id, input);
      await reload();
      return updated;
    },
    [repo, reload]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await repo.remove(id);
      await reload();
    },
    [repo, reload]
  );

  return {
    categories,
    loading,
    error,
    reload,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
