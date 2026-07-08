import { systemClock } from '@/domain/ports/clock';
import type { AppDependencies } from '@/di/dependencies';
import { FabricAuthService } from '@/infrastructure/auth/fabric-auth-service';
import { MockAuthService } from '@/infrastructure/auth/mock-auth-service';
import { ChangeLoggingCustomerRepository } from '@/infrastructure/data/change-logging-customer-repository';
import { ChangeLoggingProductRepository } from '@/infrastructure/data/change-logging-product-repository';
import { DistributionCustomerRepository } from '@/infrastructure/data/distribution-customer-repository';
import { DistributionProductRepository } from '@/infrastructure/data/distribution-product-repository';
import { RayfinCategoryRepository } from '@/infrastructure/data/rayfin-category-repository';
import { RayfinChangeLogRepository } from '@/infrastructure/data/rayfin-change-log-repository';
import { RayfinChangeRequestRepository } from '@/infrastructure/data/rayfin-change-request-repository';
import { RayfinCustomerRepository } from '@/infrastructure/data/rayfin-customer-repository';
import { RayfinMergeRecordRepository } from '@/infrastructure/data/rayfin-merge-record-repository';
import { RayfinOutboxEventRepository } from '@/infrastructure/data/rayfin-outbox-event-repository';
import { RayfinProductRepository } from '@/infrastructure/data/rayfin-product-repository';
import { LoggingHttpClient } from '@/infrastructure/http/logging-http-client';
import { createRayfinClient } from '@/infrastructure/rayfin/client';
import { ConfigReportEmbedProvider } from '@/infrastructure/reporting/config-report-embed-provider';

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
  const changeRequests = new RayfinChangeRequestRepository(facade, clock);
  const categories = new RayfinCategoryRepository(facade, clock);
  const outbox = new RayfinOutboxEventRepository(facade, clock);
  // Log-only in the PoC (no network egress from the Fabric demo). Swap for
  // `FetchHttpClient` to enable real webhook delivery in production.
  const httpClient = new LoggingHttpClient();

  // Power BI report embedding config (secure-embed by default). Reads
  // build-time `VITE_POWERBI_*` config; returns null until a report is set.
  const reportEmbed = new ConfigReportEmbedProvider(config.reportEmbed);

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
    reportEmbed,
    clock,
    fabricAuthEnabled: auth.fabricAuthEnabled,
  };
}
