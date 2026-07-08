import { systemClock } from '@/domain/ports/clock';
import type { AppDependencies } from '@/di/dependencies';
import { DemoAuthService, DEMO_USER_EMAIL } from '@/infrastructure/auth/demo-auth-service';
import { FabricAuthService } from '@/infrastructure/auth/fabric-auth-service';
import { MockAuthService } from '@/infrastructure/auth/mock-auth-service';
import { ChangeLoggingCustomerRepository } from '@/infrastructure/data/change-logging-customer-repository';
import { ChangeLoggingProductRepository } from '@/infrastructure/data/change-logging-product-repository';
import { DistributionCustomerRepository } from '@/infrastructure/data/distribution-customer-repository';
import { DistributionProductRepository } from '@/infrastructure/data/distribution-product-repository';
import { buildDemoSeed } from '@/infrastructure/data/in-memory/demo-seed';
import { InMemoryCategoryRepository } from '@/infrastructure/data/in-memory/in-memory-category-repository';
import { InMemoryChangeLogRepository } from '@/infrastructure/data/in-memory/in-memory-change-log-repository';
import { InMemoryChangeRequestRepository } from '@/infrastructure/data/in-memory/in-memory-change-request-repository';
import { InMemoryCustomerRepository } from '@/infrastructure/data/in-memory/in-memory-customer-repository';
import { InMemoryMergeRecordRepository } from '@/infrastructure/data/in-memory/in-memory-merge-record-repository';
import { InMemoryOutboxEventRepository } from '@/infrastructure/data/in-memory/in-memory-outbox-event-repository';
import { InMemoryProductRepository } from '@/infrastructure/data/in-memory/in-memory-product-repository';
import { RayfinCategoryRepository } from '@/infrastructure/data/rayfin-category-repository';
import { RayfinChangeLogRepository } from '@/infrastructure/data/rayfin-change-log-repository';
import { RayfinChangeRequestRepository } from '@/infrastructure/data/rayfin-change-request-repository';
import { RayfinCustomerRepository } from '@/infrastructure/data/rayfin-customer-repository';
import { RayfinMergeRecordRepository } from '@/infrastructure/data/rayfin-merge-record-repository';
import { RayfinOutboxEventRepository } from '@/infrastructure/data/rayfin-outbox-event-repository';
import { RayfinProductRepository } from '@/infrastructure/data/rayfin-product-repository';
import { LoggingHttpClient } from '@/infrastructure/http/logging-http-client';
import { createRayfinClient } from '@/infrastructure/rayfin/client';

import { readAppConfig, type AppConfig } from './env';

/**
 * Demo-mode composition root. Builds a fully client-side dependency graph:
 * in-memory seeded repositories + an auto demo user, with NO backend and NO
 * sign-in. Reuses the SAME change-logging + distribution decorators as the real
 * path so change-history and outbox events stay functional against the seeded
 * data. Selected by `createAppDependencies` when `config.demoMode` is on.
 */
function createDemoDependencies(): AppDependencies {
  const clock = systemClock;
  const auth = new DemoAuthService();
  const actor = (): string => DEMO_USER_EMAIL;

  const seed = buildDemoSeed(clock.now());

  const changeLog = new InMemoryChangeLogRepository(clock);
  const merges = new InMemoryMergeRecordRepository(clock, actor);
  const changeRequests = new InMemoryChangeRequestRepository(clock);
  const categories = new InMemoryCategoryRepository(
    clock,
    actor,
    seed.categories
  );
  const outbox = new InMemoryOutboxEventRepository(clock);
  const httpClient = new LoggingHttpClient();

  // Same decorator chain as the real path: distribution wraps OUTSIDE the audit
  // decorator so one write yields both an audit entry and an outbox event.
  const customers = new DistributionCustomerRepository(
    new ChangeLoggingCustomerRepository(
      new InMemoryCustomerRepository(clock, actor, seed.customers),
      changeLog,
      actor
    ),
    outbox,
    actor
  );
  const products = new DistributionProductRepository(
    new ChangeLoggingProductRepository(
      new InMemoryProductRepository(clock, actor, seed.products),
      changeLog,
      actor
    ),
    outbox,
    actor
  );

  return {
    auth,
    customers,
    products,
    categories,
    changeLog,
    merges,
    changeRequests,
    outbox,
    httpClient,
    clock,
    fabricAuthEnabled: auth.fabricAuthEnabled,
    anonymousDemo: true,
  };
}

/**
 * Composition-root factory. Reads config, constructs the SDK client facade,
 * and wires the concrete adapters behind the domain ports. Strategy selection
 * (demo vs local dev vs Fabric) is confined to this factory.
 */
export function createAppDependencies(
  config: AppConfig = readAppConfig()
): AppDependencies {
  if (config.demoMode) {
    return createDemoDependencies();
  }

  const { facade } = createRayfinClient({
    baseUrl: config.apiBaseUrl,
    publishableKey: config.publishableKey,
  });

  const clock = systemClock;

  const auth =
    config.localDev || !config.fabric
      ? new MockAuthService(facade)
      : new FabricAuthService(facade, {
          workspaceId: config.fabric.workspaceId,
          projectId: config.fabric.projectId,
          fabricPortalUrl: config.fabric.fabricPortalUrl,
          returnOrigin: window.location.origin,
        });

  // Resolve the acting user for audit trails from the current session.
  const actor = (): string | undefined => {
    const { user } = facade.getSession();
    return user?.email ?? user?.id ?? undefined;
  };

  const changeLog = new RayfinChangeLogRepository(facade, clock);
  const merges = new RayfinMergeRecordRepository(facade, clock);
  const changeRequests = new RayfinChangeRequestRepository(facade, clock);
  const categories = new RayfinCategoryRepository(facade, clock);
  const outbox = new RayfinOutboxEventRepository(facade, clock);
  // Log-only in the PoC (no network egress from the Fabric demo). Swap for
  // `FetchHttpClient` to enable real webhook delivery in production.
  const httpClient = new LoggingHttpClient();

  // Wrap the base repositories so every mutation records change history AND
  // emits a distribution (outbox) event, transparently to the use-case layer
  // (all three share the domain port). Distribution wraps OUTSIDE the audit
  // decorator so one write yields both an audit entry and an outbox event.
  const customers = new DistributionCustomerRepository(
    new ChangeLoggingCustomerRepository(
      new RayfinCustomerRepository(facade, clock),
      changeLog,
      actor
    ),
    outbox,
    actor
  );
  const products = new DistributionProductRepository(
    new ChangeLoggingProductRepository(
      new RayfinProductRepository(facade, clock),
      changeLog,
      actor
    ),
    outbox,
    actor
  );

  return {
    auth,
    customers,
    products,
    categories,
    changeLog,
    merges,
    changeRequests,
    outbox,
    httpClient,
    clock,
    fabricAuthEnabled: auth.fabricAuthEnabled,
    anonymousDemo: false,
  };
}
