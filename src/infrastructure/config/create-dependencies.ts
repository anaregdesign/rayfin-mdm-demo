import { systemClock } from '@/domain/ports/clock';
import type { AppDependencies } from '@/di/dependencies';
import { FabricAuthService } from '@/infrastructure/auth/fabric-auth-service';
import { MockAuthService } from '@/infrastructure/auth/mock-auth-service';
import { ChangeLoggingCustomerRepository } from '@/infrastructure/data/change-logging-customer-repository';
import { ChangeLoggingProductRepository } from '@/infrastructure/data/change-logging-product-repository';
import { RayfinChangeLogRepository } from '@/infrastructure/data/rayfin-change-log-repository';
import { RayfinCustomerRepository } from '@/infrastructure/data/rayfin-customer-repository';
import { RayfinMergeRecordRepository } from '@/infrastructure/data/rayfin-merge-record-repository';
import { RayfinProductRepository } from '@/infrastructure/data/rayfin-product-repository';
import { createRayfinClient } from '@/infrastructure/rayfin/client';

import { readAppConfig, type AppConfig } from './env';

/**
 * Composition-root factory. Reads config, constructs the SDK client facade,
 * and wires the concrete adapters behind the domain ports. Strategy selection
 * (local dev vs Fabric) is confined to this factory.
 */
export function createAppDependencies(
  config: AppConfig = readAppConfig()
): AppDependencies {
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

  // Wrap the base repositories so every mutation records change history,
  // transparently to the use-case layer (both share the domain port).
  const customers = new ChangeLoggingCustomerRepository(
    new RayfinCustomerRepository(facade, clock),
    changeLog,
    actor
  );
  const products = new ChangeLoggingProductRepository(
    new RayfinProductRepository(facade, clock),
    changeLog,
    actor
  );

  return {
    auth,
    customers,
    products,
    changeLog,
    merges,
    clock,
    fabricAuthEnabled: auth.fabricAuthEnabled,
  };
}
