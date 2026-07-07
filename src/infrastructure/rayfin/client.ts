import { RayfinClient } from '@microsoft/rayfin-client';

import type { MdmSchema } from '../../../rayfin/data/schema';

/** The typed data proxy (`client.data`) for the MDM schema. */
export type MdmData = RayfinClient<MdmSchema>['data'];

/** The SDK auth object (`client.auth`) used by the auth adapters. */
export type MdmAuth = RayfinClient<MdmSchema>['auth'];

/** Session snapshot exposed to repositories that need the current user. */
export interface SessionInfo {
  isAuthenticated: boolean;
  user: { id: string; email: string } | null;
}

/**
 * Thin wrapper over the Rayfin SDK client. It is the ONLY place the rest of
 * infrastructure touches the raw SDK: repositories read `.data`/`.getSession()`
 * and the auth adapters read `.auth`. No module-level singleton — one instance
 * is created in the composition root and injected.
 */
export class RayfinClientFacade {
  constructor(private readonly client: RayfinClient<MdmSchema>) {}

  get data(): MdmData {
    return this.client.data;
  }

  get auth(): MdmAuth {
    return this.client.auth;
  }

  getSession(): SessionInfo {
    const session = this.client.auth.getSession();
    return {
      isAuthenticated: session.isAuthenticated,
      user: session.user
        ? { id: session.user.id, email: session.user.email }
        : null,
    };
  }
}

export interface RayfinClientConfig {
  baseUrl: string;
  publishableKey: string;
}

/** Construct the SDK client and wrap it in the facade. */
export function createRayfinClient(config: RayfinClientConfig): {
  client: RayfinClient<MdmSchema>;
  facade: RayfinClientFacade;
} {
  const client = new RayfinClient<MdmSchema>({
    baseUrl: config.baseUrl,
    publishableKey: config.publishableKey,
    useProxy: false,
    authStorage: true,
  });
  return { client, facade: new RayfinClientFacade(client) };
}
