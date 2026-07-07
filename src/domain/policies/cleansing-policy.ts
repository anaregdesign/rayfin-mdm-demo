import type { Customer, CustomerInput } from '../models/customer';
import { customerDisplayName, customerToInput } from '../models/customer';
import type { Product, ProductInput } from '../models/product';
import { productDisplayName, productToInput } from '../models/product';
import type { CleansingSuggestion, QualityBand } from '../models/quality';
import {
  normalizeBarcode,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizePostalCode,
  normalizeUrl,
} from '@/lib/normalize';
import { evaluateCustomerQuality } from './customer-quality-policy';
import { evaluateProductQuality } from './product-quality-policy';
import { validateCustomerInput } from './customer-validation';
import { validateProductInput } from './product-validation';

/**
 * Standardization / cleansing policy (Issue #11). Pure, data-driven rules that
 * propose normalized replacements for individual fields, plus a derivation that
 * rolls records needing attention into a prioritized 是正キュー (remediation
 * queue). Reuses the existing quality + validation policies; no SDK, no React.
 */

export type RemediationEntityType = 'customer' | 'product';

/** A single field→normalizer rule that drives both suggestion and apply. */
interface CleansingRule<T> {
  field: keyof T & string;
  label: string;
  reason: string;
  normalize: (value: string) => string;
}

const CUSTOMER_RULES: CleansingRule<CustomerInput>[] = [
  { field: 'name', label: '名称', reason: '全角・余分な空白を正規化', normalize: normalizeName },
  { field: 'nameKana', label: 'カナ名称', reason: '全角・余分な空白を正規化', normalize: normalizeName },
  { field: 'industry', label: '業種', reason: '余分な空白を正規化', normalize: normalizeName },
  { field: 'email', label: 'メール', reason: '小文字化・空白除去', normalize: normalizeEmail },
  { field: 'phone', label: '電話番号', reason: 'ハイフン・空白を除去', normalize: normalizePhone },
  { field: 'postalCode', label: '郵便番号', reason: 'NNN-NNNN 形式に統一', normalize: normalizePostalCode },
  { field: 'prefecture', label: '都道府県', reason: '余分な空白を正規化', normalize: normalizeName },
  { field: 'city', label: '市区町村', reason: '余分な空白を正規化', normalize: normalizeName },
  { field: 'addressLine', label: '住所', reason: '余分な空白を正規化', normalize: normalizeName },
  { field: 'website', label: 'ウェブサイト', reason: '空白・末尾スラッシュを除去', normalize: normalizeUrl },
];

const PRODUCT_RULES: CleansingRule<ProductInput>[] = [
  { field: 'name', label: '名称', reason: '全角・余分な空白を正規化', normalize: normalizeName },
  { field: 'nameKana', label: 'カナ名称', reason: '全角・余分な空白を正規化', normalize: normalizeName },
  { field: 'brand', label: 'ブランド', reason: '余分な空白を正規化', normalize: normalizeName },
  { field: 'description', label: '説明', reason: '余分な空白を正規化', normalize: normalizeName },
  { field: 'barcode', label: 'バーコード', reason: '数字のみに正規化', normalize: normalizeBarcode },
  { field: 'supplierName', label: '仕入先', reason: '余分な空白を正規化', normalize: normalizeName },
];

/**
 * Build suggestions for the fields whose stored value differs from its
 * normalized form. A suggestion is emitted only when the current value is
 * non-empty AND normalization changes it, so a clean record yields none.
 */
function suggest<T>(
  input: T,
  rules: CleansingRule<T>[]
): CleansingSuggestion[] {
  const out: CleansingSuggestion[] = [];
  for (const rule of rules) {
    const raw = input[rule.field];
    if (typeof raw !== 'string') continue;
    if (raw.trim().length === 0) continue;
    const suggested = rule.normalize(raw);
    if (suggested === raw) continue;
    out.push({
      field: rule.field,
      label: rule.label,
      current: raw,
      suggested,
      reason: rule.reason,
    });
  }
  return out;
}

/** Cleansing suggestions for a customer form input. */
export function suggestCustomerCleansing(
  input: CustomerInput
): CleansingSuggestion[] {
  return suggest(input, CUSTOMER_RULES);
}

/** Cleansing suggestions for a product form input. */
export function suggestProductCleansing(
  input: ProductInput
): CleansingSuggestion[] {
  return suggest(input, PRODUCT_RULES);
}

/**
 * Apply a set of suggestions to an input, returning a non-mutating shallow copy
 * with each suggested field written. Generic over the input shape so both
 * masters reuse it.
 */
export function applyCleansing<T>(
  input: T,
  suggestions: CleansingSuggestion[]
): T {
  const next: Record<string, unknown> = { ...(input as Record<string, unknown>) };
  for (const s of suggestions) {
    next[s.field] = s.suggested;
  }
  return next as T;
}

/** A record surfaced in the remediation queue with its actionable findings. */
export interface RemediationTarget {
  /** Stable `${entityType}:${recordId}` id. */
  id: string;
  entityType: RemediationEntityType;
  recordId: string;
  code: string;
  name: string;
  score: number;
  band: QualityBand;
  suggestions: CleansingSuggestion[];
  missingFields: string[];
  issues: string[];
  /** True when required fields are missing (validation fails). */
  missingRequired: boolean;
}

/** Tunable derivation thresholds. */
export interface RemediationContext {
  /** Records with score below this are surfaced even without suggestions (default 50). */
  qualityThreshold?: number;
}

const DEFAULT_QUALITY_THRESHOLD = 50;

/** Lifecycle states that are not actionable for cleansing. */
const EXCLUDED_STATUSES = new Set(['merged', 'archived']);

/** Worst score first; more suggestions break ties; then stable by id. */
function compareTargets(a: RemediationTarget, b: RemediationTarget): number {
  if (a.score !== b.score) return a.score - b.score;
  if (a.suggestions.length !== b.suggestions.length) {
    return b.suggestions.length - a.suggestions.length;
  }
  return a.id.localeCompare(b.id);
}

/** Remediation targets for the customer master. */
export function deriveCustomerRemediation(
  customers: Customer[],
  ctx: RemediationContext = {}
): RemediationTarget[] {
  const threshold = ctx.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD;
  const targets: RemediationTarget[] = [];
  for (const c of customers) {
    if (EXCLUDED_STATUSES.has(c.status)) continue;
    const input = customerToInput(c);
    const suggestions = suggestCustomerCleansing(input);
    const quality = evaluateCustomerQuality(c);
    const missingRequired = !validateCustomerInput(input).valid;
    if (suggestions.length === 0 && quality.score >= threshold && !missingRequired) {
      continue;
    }
    targets.push({
      id: `customer:${c.id}`,
      entityType: 'customer',
      recordId: c.id,
      code: c.code,
      name: customerDisplayName(c),
      score: quality.score,
      band: quality.band,
      suggestions,
      missingFields: quality.missingFields,
      issues: quality.issues,
      missingRequired,
    });
  }
  return targets.sort(compareTargets);
}

/** Remediation targets for the product master. */
export function deriveProductRemediation(
  products: Product[],
  ctx: RemediationContext = {}
): RemediationTarget[] {
  const threshold = ctx.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD;
  const targets: RemediationTarget[] = [];
  for (const p of products) {
    if (EXCLUDED_STATUSES.has(p.status)) continue;
    const input = productToInput(p);
    const suggestions = suggestProductCleansing(input);
    const quality = evaluateProductQuality(p);
    const missingRequired = !validateProductInput(input).valid;
    if (suggestions.length === 0 && quality.score >= threshold && !missingRequired) {
      continue;
    }
    targets.push({
      id: `product:${p.id}`,
      entityType: 'product',
      recordId: p.id,
      code: p.sku,
      name: productDisplayName(p),
      score: quality.score,
      band: quality.band,
      suggestions,
      missingFields: quality.missingFields,
      issues: quality.issues,
      missingRequired,
    });
  }
  return targets.sort(compareTargets);
}

/** Merge both masters' remediation targets into one prioritized queue. */
export function deriveRemediationTargets(
  customers: Customer[],
  products: Product[],
  ctx: RemediationContext = {}
): RemediationTarget[] {
  return [
    ...deriveCustomerRemediation(customers, ctx),
    ...deriveProductRemediation(products, ctx),
  ].sort(compareTargets);
}
