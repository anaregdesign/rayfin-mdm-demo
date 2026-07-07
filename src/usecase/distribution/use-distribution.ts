import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deliveryStatusLabel,
  type DeliveryStatus,
  type DistributionEntityType,
  type OutboxEvent,
  type OutboxEventType,
  type WebhookTarget,
} from '@/domain/models/distribution';
import { canModifyAny } from '@/domain/policies/access-policy';
import {
  buildCustomerJsonExport,
  buildProductJsonExport,
  customerExportMatrix,
  filterEvents,
  productExportMatrix,
  selectDistributable,
  signPayload,
  type EventFilter,
} from '@/domain/policies/distribution-policy';
import { useDependencies } from '@/di/dependencies';
import { useAuth } from '@/usecase/auth/use-auth';
import { useCustomers } from '@/usecase/customers/use-customers';
import { useCsvExport } from '@/usecase/export/use-export';
import { useProducts } from '@/usecase/products/use-products';

/** Time-window options for the event feed (`0` = すべて). */
export type EventWindowDays = 0 | 1 | 7 | 30;

/** Counts of events by delivery status (for the summary cards). */
export interface DeliveryCounts {
  total: number;
  pending: number;
  delivered: number;
  failed: number;
}

/** Result of a log-only webhook test send. */
export interface WebhookTestResult {
  ok: boolean;
  message: string;
}

export interface DistributionPageViewModel {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  lastMessage: string | null;

  /** Filtered event feed (newest first). */
  events: OutboxEvent[];
  counts: DeliveryCounts;

  // Filters
  entityFilter: 'all' | DistributionEntityType;
  setEntityFilter: (value: 'all' | DistributionEntityType) => void;
  eventTypeFilter: 'all' | OutboxEventType;
  setEventTypeFilter: (value: 'all' | OutboxEventType) => void;
  statusFilter: 'all' | DeliveryStatus;
  setStatusFilter: (value: 'all' | DeliveryStatus) => void;
  windowDays: EventWindowDays;
  setWindowDays: (value: EventWindowDays) => void;

  // Delivery actions (gated)
  canManageDelivery: boolean;
  updatingId: string | null;
  markDelivered: (id: string) => Promise<void>;
  markFailed: (id: string) => Promise<void>;
  deliverAllVisible: () => Promise<void>;

  // Export
  activeCustomerCount: number;
  activeProductCount: number;
  exportCustomersCsv: () => void;
  exportProductsCsv: () => void;
  exportCustomersJson: () => void;
  exportProductsJson: () => void;

  // Webhook (log-only in the PoC)
  webhook: WebhookTarget;
  setWebhookUrl: (url: string) => void;
  setWebhookSecret: (secret: string) => void;
  setWebhookActive: (active: boolean) => void;
  signaturePreview: string;
  testResult: WebhookTestResult | null;
  sendTest: () => Promise<void>;
  sending: boolean;

  reload: () => Promise<void>;
}

function windowSince(days: EventWindowDays, now: Date): Date | undefined {
  if (days === 0) return undefined;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Orchestrates the distribution / integration screen (Issue #12). Loads the
 * outbox event feed, composes the customer + product stores for active-only
 * CSV/JSON export, and exposes permission-guarded manual delivery plus a
 * **log-only** webhook test (no real egress from the live PoC). All pure
 * decisions (which records ship, filtering, signing) come from
 * `distribution-policy`; this hook only wires stores, IO and view state.
 */
export function useDistributionPage(): DistributionPageViewModel {
  const { outbox, httpClient } = useDependencies();
  const customers = useCustomers();
  const products = useProducts();
  const { actor } = useAuth();
  const { exportMatrix, exportJson } = useCsvExport();

  const [events, setEvents] = useState<OutboxEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [entityFilter, setEntityFilter] = useState<'all' | DistributionEntityType>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | OutboxEventType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DeliveryStatus>('all');
  const [windowDays, setWindowDays] = useState<EventWindowDays>(0);

  const [webhook, setWebhook] = useState<WebhookTarget>({
    url: 'https://example.com/webhooks/mdm',
    secret: 'demo-secret',
    active: false,
  });
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);
  const [sending, setSending] = useState(false);

  // Stable "now" for the window filter so a re-render doesn't drift the cutoff.
  const [now] = useState(() => new Date());

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      setEvents(await outbox.list());
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : '配信イベントの取得に失敗しました');
    } finally {
      setLoadingEvents(false);
    }
  }, [outbox]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const counts = useMemo<DeliveryCounts>(
    () => ({
      total: events.length,
      pending: events.filter((e) => e.status === 'pending').length,
      delivered: events.filter((e) => e.status === 'delivered').length,
      failed: events.filter((e) => e.status === 'failed').length,
    }),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const filter: EventFilter = {
      entityType: entityFilter === 'all' ? undefined : entityFilter,
      eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      since: windowSince(windowDays, now),
    };
    return filterEvents(events, filter);
  }, [events, entityFilter, eventTypeFilter, statusFilter, windowDays, now]);

  const canManageDelivery = actor ? canModifyAny(actor) : false;

  const setStatus = useCallback(
    async (id: string, status: DeliveryStatus) => {
      if (!canManageDelivery) {
        setActionError('配信ステータスを変更する権限がありません。');
        return;
      }
      setUpdatingId(id);
      setActionError(null);
      try {
        const updated = await outbox.setDeliveryStatus(id, status);
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
        setLastMessage(`イベントを「${deliveryStatusLabel(status)}」にしました。`);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : '更新に失敗しました');
      } finally {
        setUpdatingId(null);
      }
    },
    [canManageDelivery, outbox]
  );

  const markDelivered = useCallback((id: string) => setStatus(id, 'delivered'), [setStatus]);
  const markFailed = useCallback((id: string) => setStatus(id, 'failed'), [setStatus]);

  const deliverAllVisible = useCallback(async () => {
    if (!canManageDelivery) {
      setActionError('配信ステータスを変更する権限がありません。');
      return;
    }
    const pending = filteredEvents.filter((e) => e.status === 'pending');
    if (pending.length === 0) return;
    setActionError(null);
    let ok = 0;
    for (const event of pending) {
      setUpdatingId(event.id);
      try {
        const updated = await outbox.setDeliveryStatus(event.id, 'delivered');
        setEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
        ok += 1;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : '一括配信に失敗しました');
      }
    }
    setUpdatingId(null);
    setLastMessage(`${ok}件のイベントを配信済みにしました。`);
  }, [canManageDelivery, filteredEvents, outbox]);

  const activeCustomers = useMemo(
    () => selectDistributable(customers.customers),
    [customers.customers]
  );
  const activeProducts = useMemo(
    () => selectDistributable(products.products),
    [products.products]
  );

  const exportCustomersCsv = useCallback(() => {
    exportMatrix('customers-active.csv', customerExportMatrix(customers.customers));
    setLastMessage(`顧客マスタ（active ${activeCustomers.length}件）をCSV出力しました。`);
  }, [exportMatrix, customers.customers, activeCustomers.length]);

  const exportProductsCsv = useCallback(() => {
    exportMatrix('products-active.csv', productExportMatrix(products.products));
    setLastMessage(`製品マスタ（active ${activeProducts.length}件）をCSV出力しました。`);
  }, [exportMatrix, products.products, activeProducts.length]);

  const exportCustomersJson = useCallback(() => {
    exportJson('customers-active.json', buildCustomerJsonExport(customers.customers, new Date()));
    setLastMessage(`顧客マスタ（active ${activeCustomers.length}件）をJSON出力しました。`);
  }, [exportJson, customers.customers, activeCustomers.length]);

  const exportProductsJson = useCallback(() => {
    exportJson('products-active.json', buildProductJsonExport(products.products, new Date()));
    setLastMessage(`製品マスタ（active ${activeProducts.length}件）をJSON出力しました。`);
  }, [exportJson, products.products, activeProducts.length]);

  const setWebhookUrl = useCallback((url: string) => setWebhook((w) => ({ ...w, url })), []);
  const setWebhookSecret = useCallback(
    (secret: string) => setWebhook((w) => ({ ...w, secret })),
    []
  );
  const setWebhookActive = useCallback(
    (active: boolean) => setWebhook((w) => ({ ...w, active })),
    []
  );

  const samplePayload = useMemo(
    () => ({ event: 'ping', source: 'mdm', at: now.toISOString() }),
    [now]
  );

  const signaturePreview = useMemo(
    () => signPayload(webhook.secret ?? '', JSON.stringify(samplePayload)),
    [webhook.secret, samplePayload]
  );

  const sendTest = useCallback(async () => {
    if (!canManageDelivery) {
      setActionError('Webhookテストを実行する権限がありません。');
      return;
    }
    setSending(true);
    setActionError(null);
    setTestResult(null);
    try {
      const body = samplePayload;
      const signature = signPayload(webhook.secret ?? '', JSON.stringify(body));
      const res = await httpClient.post(webhook.url, body, {
        'X-Mdm-Signature': signature,
      });
      setTestResult({
        ok: res.ok,
        message: res.ok
          ? `テスト送信（ログのみ）に成功しました（HTTP ${res.status}）。`
          : `テスト送信が失敗しました（HTTP ${res.status}）。`,
      });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'テスト送信に失敗しました',
      });
    } finally {
      setSending(false);
    }
  }, [canManageDelivery, httpClient, webhook.url, webhook.secret, samplePayload]);

  const reload = useCallback(async () => {
    await Promise.all([loadEvents(), customers.reload(), products.reload()]);
  }, [loadEvents, customers, products]);

  return {
    loading: loadingEvents || customers.loading || products.loading,
    error: eventsError ?? customers.error ?? products.error,
    actionError,
    lastMessage,
    events: filteredEvents,
    counts,
    entityFilter,
    setEntityFilter,
    eventTypeFilter,
    setEventTypeFilter,
    statusFilter,
    setStatusFilter,
    windowDays,
    setWindowDays,
    canManageDelivery,
    updatingId,
    markDelivered,
    markFailed,
    deliverAllVisible,
    activeCustomerCount: activeCustomers.length,
    activeProductCount: activeProducts.length,
    exportCustomersCsv,
    exportProductsCsv,
    exportCustomersJson,
    exportProductsJson,
    webhook,
    setWebhookUrl,
    setWebhookSecret,
    setWebhookActive,
    signaturePreview,
    testResult,
    sendTest,
    sending,
    reload,
  };
}
