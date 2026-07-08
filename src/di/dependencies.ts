import { createContext, useContext } from 'react';

import type { AuthService } from '@/domain/ports/auth-service';
import type { Clock } from '@/domain/ports/clock';
import type { HttpClient } from '@/domain/ports/http-client';
import type { ChangeLogRepository } from '@/domain/repositories/change-log-repository';
import type { ChangeRequestRepository } from '@/domain/repositories/change-request-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { CustomerRepository } from '@/domain/repositories/customer-repository';
import type { MergeRecordRepository } from '@/domain/repositories/merge-record-repository';
import type { OutboxEventRepository } from '@/domain/repositories/outbox-event-repository';
import type { ProductRepository } from '@/domain/repositories/product-repository';

/**
 * The application's assembled dependencies. Built once in the composition root
 * and provided through React context; use cases read them via `useDependencies`.
 */
export interface AppDependencies {
  auth: AuthService;
  customers: CustomerRepository;
  products: ProductRepository;
  categories: CategoryRepository;
  changeLog: ChangeLogRepository;
  merges: MergeRecordRepository;
  changeRequests: ChangeRequestRepository;
  outbox: OutboxEventRepository;
  httpClient: HttpClient;
  clock: Clock;
  /** True when the auth service requires Fabric interactive sign-in. */
  fabricAuthEnabled: boolean;
  /**
   * True when running the fully client-side demo (in-memory seeded data + auto
   * demo user, no backend). The app shell uses this to hide the sign-out
   * control since there is no real session to end.
   */
  anonymousDemo: boolean;
}

const DependenciesContext = createContext<AppDependencies | null>(null);

export const DependenciesProvider = DependenciesContext.Provider;

/** Read the injected dependencies. Throws if used outside the provider. */
export function useDependencies(): AppDependencies {
  const deps = useContext(DependenciesContext);
  if (!deps) {
    throw new Error(
      'useDependencies must be used within a DependenciesProvider.'
    );
  }
  return deps;
}
