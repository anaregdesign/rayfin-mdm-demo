/**
 * Outbound port for sending HTTP requests to downstream systems (webhooks).
 *
 * Kept abstract so the domain/usecase layers never touch `fetch` directly and
 * so the live PoC can inject a log-only implementation (no real network egress
 * from the Fabric demo). The production adapter is `FetchHttpClient`.
 */
export interface HttpResponse {
  status: number;
  ok: boolean;
}

export interface HttpClient {
  /** POST a JSON body with optional headers; resolves with the status. */
  post(
    url: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<HttpResponse>;
}
