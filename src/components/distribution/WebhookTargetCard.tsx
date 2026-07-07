import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { TextField } from '@/components/shared/TextField';
import type {
  WebhookTarget,
} from '@/domain/models/distribution';
import type { WebhookTestResult } from '@/usecase/distribution/use-distribution';

interface WebhookTargetCardProps {
  webhook: WebhookTarget;
  signaturePreview: string;
  canManage: boolean;
  sending: boolean;
  testResult: WebhookTestResult | null;
  onUrlChange: (url: string) => void;
  onSecretChange: (secret: string) => void;
  onActiveChange: (active: boolean) => void;
  onSendTest: () => void;
}

/**
 * Render-only webhook config card (Issue #12). In the PoC no real HTTP egress
 * happens — "テスト送信" only logs to the console via the injected
 * `LoggingHttpClient`. The signature preview shows how payloads would be
 * signed. All state is owned by the view-model; this component is presentational.
 */
export function WebhookTargetCard({
  webhook,
  signaturePreview,
  canManage,
  sending,
  testResult,
  onUrlChange,
  onSecretChange,
  onActiveChange,
  onSendTest,
}: WebhookTargetCardProps) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Webhook配信先</h3>
          <Badge tone={webhook.active ? 'positive' : 'muted'}>
            {webhook.active ? '有効' : '無効'}
          </Badge>
        </div>
        <Badge tone="warning">PoC: 送信ログのみ（実送信なし）</Badge>
      </div>

      <TextField
        label="配信先URL"
        value={webhook.url}
        onChange={onUrlChange}
        disabled={!canManage}
        placeholder="https://example.com/webhooks/mdm"
      />

      <TextField
        label="署名シークレット"
        value={webhook.secret ?? ''}
        onChange={onSecretChange}
        disabled={!canManage}
        hint="ペイロード署名に使用します（本番ではHMAC-SHA256を推奨）。"
      />

      <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200">
        <p className="text-xs font-medium text-slate-500">署名プレビュー</p>
        <p className="mt-0.5 break-all font-mono text-xs text-slate-700">
          {signaturePreview}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={webhook.active}
          disabled={!canManage}
          onChange={(e) => onActiveChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
        />
        Webhook配信を有効にする
      </label>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="primary"
          disabled={!canManage || sending}
          onClick={onSendTest}
        >
          {sending ? '送信中…' : 'テスト送信（ログのみ）'}
        </Button>
        {!canManage && (
          <p className="text-xs text-slate-400">
            テスト送信にはスチュワード／管理者ロールが必要です。
          </p>
        )}
      </div>

      {testResult && (
        <p
          className={`rounded-md px-3 py-2 text-sm ring-1 ring-inset ${
            testResult.ok
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
              : 'bg-rose-50 text-rose-700 ring-rose-200'
          }`}
        >
          {testResult.message}
        </p>
      )}
    </div>
  );
}
