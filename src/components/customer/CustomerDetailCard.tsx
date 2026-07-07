import { FieldRow } from '@/components/shared/FieldRow';
import { QualityMeter } from '@/components/shared/QualityMeter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  customerAddress,
  customerTypeLabel,
  type Customer,
} from '@/domain/models/customer';
import { CUSTOMER_STATUS_META } from '@/domain/models/master-status';
import type { QualityResult } from '@/domain/models/quality';
import { formatDateTime, formatNumber } from '@/lib/format';

interface CustomerDetailCardProps {
  customer: Customer;
  quality: QualityResult;
}

const DASH = '—';

/** 360° customer view: profile fields, quality breakdown, and audit trail. */
export function CustomerDetailCard({
  customer,
  quality,
}: CustomerDetailCardProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">基本情報</h2>
          <StatusBadge meta={CUSTOMER_STATUS_META[customer.status]} />
        </div>
        <dl className="divide-y divide-slate-100">
          <FieldRow label="顧客コード">{customer.code}</FieldRow>
          <FieldRow label="名称">{customer.name}</FieldRow>
          <FieldRow label="名称（カナ）">{customer.nameKana ?? DASH}</FieldRow>
          <FieldRow label="顧客区分">
            {customerTypeLabel(customer.customerType)}
          </FieldRow>
          <FieldRow label="業種">{customer.industry ?? DASH}</FieldRow>
          <FieldRow label="メールアドレス">{customer.email ?? DASH}</FieldRow>
          <FieldRow label="電話番号">{customer.phone ?? DASH}</FieldRow>
          <FieldRow label="ウェブサイト">{customer.website ?? DASH}</FieldRow>
          <FieldRow label="住所">{customerAddress(customer)}</FieldRow>
          <FieldRow label="税務ID・法人番号">{customer.taxId ?? DASH}</FieldRow>
          <FieldRow label="年間売上">
            {customer.annualRevenue != null
              ? `¥${formatNumber(customer.annualRevenue)}`
              : DASH}
          </FieldRow>
          <FieldRow label="データスチュワード">
            {customer.steward ?? DASH}
          </FieldRow>
          <FieldRow label="備考">{customer.notes ?? DASH}</FieldRow>
        </dl>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            データ品質
          </h2>
          <QualityMeter score={quality.score} band={quality.band} />
          <dl className="mt-4 space-y-1 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt>完全性</dt>
              <dd className="tabular-nums">{quality.completeness}%</dd>
            </div>
            <div className="flex justify-between">
              <dt>入力済み項目</dt>
              <dd className="tabular-nums">
                {quality.filledCount}/{quality.scoredCount}
              </dd>
            </div>
          </dl>
          {quality.missingFields.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500">未入力の項目</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {quality.missingFields.map((f) => (
                  <span
                    key={f}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
          {quality.issues.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-rose-600">
              {quality.issues.map((issue) => (
                <li key={issue}>⚠ {issue}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            監査情報
          </h2>
          <dl className="divide-y divide-slate-100">
            <FieldRow label="作成日時">
              {formatDateTime(customer.createdAt)}
            </FieldRow>
            <FieldRow label="作成者">{customer.createdBy ?? DASH}</FieldRow>
            <FieldRow label="更新日時">
              {formatDateTime(customer.updatedAt)}
            </FieldRow>
            <FieldRow label="更新者">{customer.updatedBy ?? DASH}</FieldRow>
          </dl>
        </div>
      </div>
    </div>
  );
}
