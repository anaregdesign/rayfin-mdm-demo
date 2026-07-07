import { systemClock } from '@/domain/ports/clock';
import type { AppDependencies } from '@/di/dependencies';
import { FabricAuthService } from '@/infrastructure/auth/fabric-auth-service';
import { MockAuthService } from '@/infrastructure/auth/mock-auth-service';
import { RayfinCustomerRepository } from '@/infrastructure/data/rayfin-customer-repository';
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

  return {
    auth,
    customers: new RayfinCustomerRepository(facade, clock),
    products: new RayfinProductRepository(facade, clock),
    clock,
    fabricAuthEnabled: auth.fabricAuthEnabled,
  };
}
