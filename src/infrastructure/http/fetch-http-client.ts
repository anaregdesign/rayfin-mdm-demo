import type { HttpClient, HttpResponse } from '@/domain/ports/http-client';

/**
 * Real HTTP adapter backed by the platform `fetch`. This is the production path
 * for webhook delivery — it is intentionally **not** wired into the live PoC
 * (see `LoggingHttpClient` + AGENTS.md) to avoid outbound network egress and
 * CORS issues from the Fabric-hosted demo.
 */
export class FetchHttpClient implements HttpClient {
  async post(
    url: string,
    body: unknown,
    headers: Record<string, string> = {}
  ): Promise<HttpResponse> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    return { status: res.status, ok: res.ok };
  }
}
