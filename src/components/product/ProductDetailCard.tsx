import { FieldRow } from '@/components/shared/FieldRow';
import { QualityMeter } from '@/components/shared/QualityMeter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PRODUCT_STATUS_META } from '@/domain/models/master-status';
import type { QualityResult } from '@/domain/models/quality';
import {
  productCategoryLabel,
  unitOfMeasureLabel,
  type Product,
} from '@/domain/models/product';
import { formatMoney } from '@/domain/value-objects/money';
import { formatDateTime } from '@/lib/format';

interface ProductDetailCardProps {
  product: Product;
  quality: QualityResult;
}

const DASH = '—';

/** 360° product view: attributes, pricing, quality breakdown, and audit trail. */
export function ProductDetailCard({ product, quality }: ProductDetailCardProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">基本情報</h2>
          <StatusBadge meta={PRODUCT_STATUS_META[product.status]} />
        </div>
        <dl className="divide-y divide-slate-100">
          <FieldRow label="SKU">{product.sku}</FieldRow>
          <FieldRow label="名称">{product.name}</FieldRow>
          <FieldRow label="名称（カナ）">{product.nameKana ?? DASH}</FieldRow>
          <FieldRow label="カテゴリ">
            {productCategoryLabel(product.category)}
          </FieldRow>
          <FieldRow label="ブランド">{product.brand ?? DASH}</FieldRow>
          <FieldRow label="単価">
            {formatMoney(product.unitPrice, product.currency)}
          </FieldRow>
          <FieldRow label="単位">
            {unitOfMeasureLabel(product.unitOfMeasure)}
          </FieldRow>
          <FieldRow label="バーコード">{product.barcode ?? DASH}</FieldRow>
          <FieldRow label="サプライヤー名">
            {product.supplierName ?? DASH}
          </FieldRow>
          <FieldRow label="データスチュワード">
            {product.steward ?? DASH}
          </FieldRow>
          <FieldRow label="説明">{product.description ?? DASH}</FieldRow>
          <FieldRow label="備考">{product.notes ?? DASH}</FieldRow>
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
              {formatDateTime(product.createdAt)}
            </FieldRow>
            <FieldRow label="作成者">{product.createdBy ?? DASH}</FieldRow>
            <FieldRow label="更新日時">
              {formatDateTime(product.updatedAt)}
            </FieldRow>
            <FieldRow label="更新者">{product.updatedBy ?? DASH}</FieldRow>
          </dl>
        </div>
      </div>
    </div>
  );
}
