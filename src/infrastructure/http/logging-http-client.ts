import type { HttpClient, HttpResponse } from '@/domain/ports/http-client';

/**
 * Log-only HTTP adapter used by the live PoC. It records the request to the
 * console and reports success **without performing any network call**, so the
 * Fabric-hosted demo never egresses data or trips CORS while still exercising
 * the full distribution pipeline (sign → build request → "send" → mark). Swap
 * for `FetchHttpClient` to enable real webhook delivery in production.
 */
export class LoggingHttpClient implements HttpClient {
  async post(
    url: string,
    body: unknown,
    headers: Record<string, string> = {}
  ): Promise<HttpResponse> {
    console.info('[webhook:log-only] POST', url, { headers, body });
    return { status: 200, ok: true };
  }
}
