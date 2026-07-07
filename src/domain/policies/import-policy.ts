import type { Customer, CustomerInput } from '@/domain/models/customer';
import {
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPE_VALUES,
  emptyCustomerInput,
} from '@/domain/models/customer';
import type {
  ImportMode,
  ImportPreview,
  ImportRow,
  RowAction,
  RowStatus,
} from '@/domain/models/import';
import { summarizeRows } from '@/domain/models/import';
import {
  CUSTOMER_STATUS_VALUES,
  customerStatusLabel,
  PRODUCT_STATUS_VALUES,
  productStatusLabel,
} from '@/domain/models/master-status';
import type { Product, ProductInput } from '@/domain/models/product';
import {
  emptyProductInput,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_VALUES,
  UNIT_OF_MEASURE_LABELS,
  UNIT_OF_MEASURE_VALUES,
} from '@/domain/models/product';
import {
  findCustomerMatchesForInput,
  findProductMatchesForInput,
} from '@/domain/policies/duplicate-policy';
import { validateCustomerInput } from '@/domain/policies/customer-validation';
import { validateProductInput } from '@/domain/policies/product-validation';
import { normalizeCustomerCode } from '@/domain/value-objects/customer-code';
import {
  CURRENCY_LABELS,
  CURRENCY_VALUES,
} from '@/domain/value-objects/money';
import { normalizeSku } from '@/domain/value-objects/sku';

// ---------------------------------------------------------------------------
// Field specification: one CSV schema per entity, driving BOTH export
// (entity → cells) and import (cells → input). Keeping a single ordered spec
// guarantees the two directions round-trip.
// ---------------------------------------------------------------------------

interface FieldSpec<TEntity, TInput> {
  header: string;
  /** Accepted header variants (e.g. the English field name). */
  aliases: string[];
  /** Export: entity → CSV cell. */
  toCell: (entity: TEntity) => string;
  /** Import: raw cell → mutate the draft input, pushing any messages. */
  assign: (raw: string, draft: TInput, messages: string[]) => void;
}

function normKey(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

/** Build a raw-string → enum-value parser accepting canonical value or label. */
function buildEnumParser<T extends string>(
  values: readonly T[],
  label: (value: T) => string
): (raw: string) => T | undefined {
  const map = new Map<string, T>();
  for (const value of values) {
    map.set(normKey(value), value);
    map.set(normKey(label(value)), value);
  }
  return (raw: string) => map.get(normKey(raw));
}

/** Parse a numeric cell, tolerating thousands separators and currency marks. */
function parseNumberCell(raw: string): {
  value?: number;
  ok: boolean;
  empty: boolean;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, empty: true };
  const cleaned = trimmed.replace(/[,\s￥¥$€]/g, '');
  const num = Number(cleaned);
  if (Number.isNaN(num)) return { ok: false, empty: false };
  return { ok: true, empty: false, value: num };
}

function optionalText(raw: string): string | undefined {
  return raw ? raw : undefined;
}

// ---------------------------------------------------------------------------
// Customer schema
// ---------------------------------------------------------------------------

const parseCustomerType = buildEnumParser(
  CUSTOMER_TYPE_VALUES,
  (v) => CUSTOMER_TYPE_LABELS[v]
);
const parseCustomerStatus = buildEnumParser(
  CUSTOMER_STATUS_VALUES,
  customerStatusLabel
);

const CUSTOMER_FIELD_SPECS: FieldSpec<Customer, CustomerInput>[] = [
  {
    header: '顧客コード',
    aliases: ['code'],
    toCell: (c) => c.code,
    assign: (raw, d) => {
      d.code = raw;
    },
  },
  {
    header: '名称',
    aliases: ['name'],
    toCell: (c) => c.name,
    assign: (raw, d) => {
      d.name = raw;
    },
  },
  {
    header: '名称カナ',
    aliases: ['nameKana', 'kana'],
    toCell: (c) => c.nameKana ?? '',
    assign: (raw, d) => {
      d.nameKana = optionalText(raw);
    },
  },
  {
    header: '顧客区分',
    aliases: ['customerType', 'type'],
    toCell: (c) => CUSTOMER_TYPE_LABELS[c.customerType],
    assign: (raw, d, msgs) => {
      if (!raw) return;
      const parsed = parseCustomerType(raw);
      if (parsed) d.customerType = parsed;
      else msgs.push(`顧客区分が不正です: ${raw}`);
    },
  },
  {
    header: '業種',
    aliases: ['industry'],
    toCell: (c) => c.industry ?? '',
    assign: (raw, d) => {
      d.industry = optionalText(raw);
    },
  },
  {
    header: 'メールアドレス',
    aliases: ['email'],
    toCell: (c) => c.email ?? '',
    assign: (raw, d) => {
      d.email = optionalText(raw);
    },
  },
  {
    header: '電話番号',
    aliases: ['phone'],
    toCell: (c) => c.phone ?? '',
    assign: (raw, d) => {
      d.phone = optionalText(raw);
    },
  },
  {
    header: '郵便番号',
    aliases: ['postalCode', 'zip'],
    toCell: (c) => c.postalCode ?? '',
    assign: (raw, d) => {
      d.postalCode = optionalText(raw);
    },
  },
  {
    header: '都道府県',
    aliases: ['prefecture'],
    toCell: (c) => c.prefecture ?? '',
    assign: (raw, d) => {
      d.prefecture = optionalText(raw);
    },
  },
  {
    header: '市区町村',
    aliases: ['city'],
    toCell: (c) => c.city ?? '',
    assign: (raw, d) => {
      d.city = optionalText(raw);
    },
  },
  {
    header: '住所',
    aliases: ['addressLine', 'address'],
    toCell: (c) => c.addressLine ?? '',
    assign: (raw, d) => {
      d.addressLine = optionalText(raw);
    },
  },
  {
    header: '国',
    aliases: ['country'],
    toCell: (c) => c.country,
    assign: (raw, d) => {
      if (raw) d.country = raw;
    },
  },
  {
    header: 'ウェブサイト',
    aliases: ['website', 'url'],
    toCell: (c) => c.website ?? '',
    assign: (raw, d) => {
      d.website = optionalText(raw);
    },
  },
  {
    header: '税務ID',
    aliases: ['taxId'],
    toCell: (c) => c.taxId ?? '',
    assign: (raw, d) => {
      d.taxId = optionalText(raw);
    },
  },
  {
    header: '年間売上',
    aliases: ['annualRevenue', 'revenue'],
    toCell: (c) => (c.annualRevenue != null ? String(c.annualRevenue) : ''),
    assign: (raw, d, msgs) => {
      if (!raw) return;
      const parsed = parseNumberCell(raw);
      if (!parsed.ok) msgs.push(`年間売上が数値ではありません: ${raw}`);
      else d.annualRevenue = parsed.value;
    },
  },
  {
    header: 'ステータス',
    aliases: ['status'],
    toCell: (c) => customerStatusLabel(c.status),
    assign: (raw, d, msgs) => {
      if (!raw) return;
      const parsed = parseCustomerStatus(raw);
      if (parsed) d.status = parsed;
      else msgs.push(`ステータスが不正です: ${raw}`);
    },
  },
  {
    header: 'データスチュワード',
    aliases: ['steward'],
    toCell: (c) => c.steward ?? '',
    assign: (raw, d) => {
      d.steward = optionalText(raw);
    },
  },
  {
    header: '備考',
    aliases: ['notes'],
    toCell: (c) => c.notes ?? '',
    assign: (raw, d) => {
      d.notes = optionalText(raw);
    },
  },
];

// ---------------------------------------------------------------------------
// Product schema
// ---------------------------------------------------------------------------

const parseProductCategory = buildEnumParser(
  PRODUCT_CATEGORY_VALUES,
  (v) => PRODUCT_CATEGORY_LABELS[v]
);
const parseUnitOfMeasure = buildEnumParser(
  UNIT_OF_MEASURE_VALUES,
  (v) => UNIT_OF_MEASURE_LABELS[v]
);
const parseCurrency = buildEnumParser(
  CURRENCY_VALUES,
  (v) => CURRENCY_LABELS[v]
);
const parseProductStatus = buildEnumParser(
  PRODUCT_STATUS_VALUES,
  productStatusLabel
);

const PRODUCT_FIELD_SPECS: FieldSpec<Product, ProductInput>[] = [
  {
    header: 'SKU',
    aliases: ['sku'],
    toCell: (p) => p.sku,
    assign: (raw, d) => {
      d.sku = raw;
    },
  },
  {
    header: '名称',
    aliases: ['name'],
    toCell: (p) => p.name,
    assign: (raw, d) => {
      d.name = raw;
    },
  },
  {
    header: '名称カナ',
    aliases: ['nameKana', 'kana'],
    toCell: (p) => p.nameKana ?? '',
    assign: (raw, d) => {
      d.nameKana = optionalText(raw);
    },
  },
  {
    header: 'カテゴリ',
    aliases: ['category'],
    toCell: (p) => PRODUCT_CATEGORY_LABELS[p.category],
    assign: (raw, d, msgs) => {
      if (!raw) return;
      const parsed = parseProductCategory(raw);
      if (parsed) d.category = parsed;
      else msgs.push(`カテゴリが不正です: ${raw}`);
    },
  },
  {
    header: 'ブランド',
    aliases: ['brand'],
    toCell: (p) => p.brand ?? '',
    assign: (raw, d) => {
      d.brand = optionalText(raw);
    },
  },
  {
    header: '説明',
    aliases: ['description'],
    toCell: (p) => p.description ?? '',
    assign: (raw, d) => {
      d.description = optionalText(raw);
    },
  },
  {
    header: '単価',
    aliases: ['unitPrice', 'price'],
    toCell: (p) => String(p.unitPrice),
    assign: (raw, d, msgs) => {
      if (!raw) return;
      const parsed = parseNumberCell(raw);
      if (!parsed.ok) msgs.push(`単価が数値ではありません: ${raw}`);
      else if (parsed.value != null) d.unitPrice = parsed.value;
    },
  },
  {
    header: '通貨',
    aliases: ['currency'],
    toCell: (p) => p.currency,
    assign: (raw, d, msgs) => {
      if (!raw) return;
      const parsed = parseCurrency(raw);
      if (parsed) d.currency = parsed;
      else msgs.push(`通貨が不正です: ${raw}`);
    },
  },
  {
    header: '単位',
    aliases: ['unitOfMeasure', 'uom', 'unit'],
    toCell: (p) => UNIT_OF_MEASURE_LABELS[p.unitOfMeasure],
    assign: (raw, d, msgs) => {
      if (!raw) return;
      const parsed = parseUnitOfMeasure(raw);
      if (parsed) d.unitOfMeasure = parsed;
      else msgs.push(`単位が不正です: ${raw}`);
    },
  },
  {
    header: 'バーコード',
    aliases: ['barcode'],
    toCell: (p) => p.barcode ?? '',
    assign: (raw, d) => {
      d.barcode = optionalText(raw);
    },
  },
  {
    header: '仕入先',
    aliases: ['supplierName', 'supplier'],
    toCell: (p) => p.supplierName ?? '',
    assign: (raw, d) => {
      d.supplierName = optionalText(raw);
    },
  },
  {
    header: 'ステータス',
    aliases: ['status'],
    toCell: (p) => productStatusLabel(p.status),
    assign: (raw, d, msgs) => {
      if (!raw) return;
      const parsed = parseProductStatus(raw);
      if (parsed) d.status = parsed;
      else msgs.push(`ステータスが不正です: ${raw}`);
    },
  },
  {
    header: 'データスチュワード',
    aliases: ['steward'],
    toCell: (p) => p.steward ?? '',
    assign: (raw, d) => {
      d.steward = optionalText(raw);
    },
  },
  {
    header: '備考',
    aliases: ['notes'],
    toCell: (p) => p.notes ?? '',
    assign: (raw, d) => {
      d.notes = optionalText(raw);
    },
  },
];

// ---------------------------------------------------------------------------
// Export mapping (entity → CSV matrix)
// ---------------------------------------------------------------------------

export const CUSTOMER_CSV_HEADERS: string[] = CUSTOMER_FIELD_SPECS.map(
  (s) => s.header
);
export const PRODUCT_CSV_HEADERS: string[] = PRODUCT_FIELD_SPECS.map(
  (s) => s.header
);

export function customerToCsvRow(customer: Customer): string[] {
  return CUSTOMER_FIELD_SPECS.map((s) => s.toCell(customer));
}

export function productToCsvRow(product: Product): string[] {
  return PRODUCT_FIELD_SPECS.map((s) => s.toCell(product));
}

/** Header-only matrix used as a downloadable import template. */
export function customerImportTemplate(): string[][] {
  return [CUSTOMER_CSV_HEADERS];
}

export function productImportTemplate(): string[][] {
  return [PRODUCT_CSV_HEADERS];
}

// ---------------------------------------------------------------------------
// Import evaluation (CSV records → validated preview)
// ---------------------------------------------------------------------------

function specNames<T, U>(specs: FieldSpec<T, U>[]): string[][] {
  return specs.map((s) => [s.header, ...s.aliases].map(normKey));
}

function readCell(
  normalizedRaw: Map<string, string>,
  candidates: string[]
): string {
  for (const candidate of candidates) {
    const value = normalizedRaw.get(candidate);
    if (value !== undefined) return value;
  }
  return '';
}

function normalizeRawKeys(raw: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(raw)) {
    map.set(normKey(key), value);
  }
  return map;
}

function unknownHeaders<T, U>(
  records: Record<string, string>[],
  specs: FieldSpec<T, U>[]
): string[] {
  if (records.length === 0) return [];
  const known = new Set<string>();
  for (const names of specNames(specs)) {
    for (const name of names) known.add(name);
  }
  return Object.keys(records[0]).filter((h) => !known.has(normKey(h)));
}

interface EvaluateConfig<TEntity, TInput> {
  records: Record<string, string>[];
  existing: TEntity[];
  mode: ImportMode;
  specs: FieldSpec<TEntity, TInput>[];
  emptyInput: () => TInput;
  validate: (input: TInput) => { valid: boolean; errors: Record<string, string | undefined> };
  keyOf: (input: TInput) => string;
  normalizeKey: (key: string) => string;
  existingKey: (entity: TEntity) => string;
  idOf: (entity: TEntity) => string;
  displayName: (input: TInput) => string;
  keyLabel: string;
  findMatches: (input: TInput, existing: TEntity[]) => { right: { label: string }; reasons: string[] }[];
}

function evaluateImport<TEntity, TInput>(
  config: EvaluateConfig<TEntity, TInput>
): ImportPreview<TInput> {
  const {
    records,
    existing,
    mode,
    specs,
    emptyInput,
    validate,
    keyOf,
    normalizeKey,
    existingKey,
    idOf,
    displayName,
    keyLabel,
    findMatches,
  } = config;

  const names = specNames(specs);
  const byKey = new Map<string, TEntity>();
  for (const entity of existing) {
    const key = existingKey(entity);
    if (key) byKey.set(normalizeKey(key), entity);
  }

  const seenKeys = new Map<string, number>();
  const rows: ImportRow<TInput>[] = [];

  records.forEach((raw, index) => {
    const rowNumber = index + 1;
    const messages: string[] = [];
    const normalizedRaw = normalizeRawKeys(raw);
    const draft = emptyInput();
    specs.forEach((spec, i) => {
      spec.assign(readCell(normalizedRaw, names[i]), draft, messages);
    });

    const validation = validate(draft);
    if (!validation.valid) {
      for (const message of Object.values(validation.errors)) {
        if (message) messages.push(message);
      }
    }

    const rawKey = keyOf(draft);
    const normalizedRowKey = rawKey ? normalizeKey(rawKey) : '';
    const key = rawKey || `(${keyLabel}未設定)`;
    const label = displayName(draft) || '(名称未設定)';

    let status: RowStatus;
    let action: RowAction;
    let existingId: string | undefined;

    const hasHardError = messages.length > 0;

    if (normalizedRowKey && seenKeys.has(normalizedRowKey)) {
      messages.push(
        `ファイル内で${keyLabel}が重複しています（行 ${seenKeys.get(normalizedRowKey)}）`
      );
      status = 'error';
      action = 'error';
    } else if (hasHardError) {
      status = 'error';
      action = 'error';
    } else {
      const match = normalizedRowKey ? byKey.get(normalizedRowKey) : undefined;
      if (match) {
        existingId = idOf(match);
        if (mode === 'insert') {
          messages.push(`既存の${keyLabel}です（新規のみモードのため対象外）`);
          status = 'error';
          action = 'error';
        } else if (mode === 'skip') {
          messages.push(`既存の${keyLabel}のためスキップします`);
          status = 'warning';
          action = 'skip';
        } else {
          messages.push('既存レコードを更新します');
          status = 'warning';
          action = 'update';
        }
      } else {
        const matches = findMatches(draft, existing);
        if (matches.length > 0) {
          const top = matches[0];
          messages.push(
            `重複候補: ${top.right.label}（${top.reasons.join('・')}）`
          );
          status = 'warning';
        } else {
          status = 'ok';
        }
        action = 'insert';
      }
    }

    if (normalizedRowKey && !seenKeys.has(normalizedRowKey)) {
      seenKeys.set(normalizedRowKey, rowNumber);
    }

    rows.push({
      rowNumber,
      raw,
      input: draft,
      status,
      action,
      existingId,
      key,
      label,
      messages,
    });
  });

  return {
    rows,
    summary: summarizeRows(rows),
    unknownHeaders: unknownHeaders(records, specs),
    hasWritableRows: rows.some(
      (r) => r.action === 'insert' || r.action === 'update'
    ),
  };
}

export function evaluateCustomerImport(
  records: Record<string, string>[],
  existing: Customer[],
  mode: ImportMode
): ImportPreview<CustomerInput> {
  return evaluateImport<Customer, CustomerInput>({
    records,
    existing,
    mode,
    specs: CUSTOMER_FIELD_SPECS,
    emptyInput: emptyCustomerInput,
    validate: (input) => validateCustomerInput(input),
    keyOf: (input) => input.code,
    normalizeKey: normalizeCustomerCode,
    existingKey: (c) => c.code,
    idOf: (c) => c.id,
    displayName: (input) => input.name,
    keyLabel: '顧客コード',
    findMatches: (input, all) => findCustomerMatchesForInput(input, all),
  });
}

export function evaluateProductImport(
  records: Record<string, string>[],
  existing: Product[],
  mode: ImportMode
): ImportPreview<ProductInput> {
  return evaluateImport<Product, ProductInput>({
    records,
    existing,
    mode,
    specs: PRODUCT_FIELD_SPECS,
    emptyInput: emptyProductInput,
    validate: (input) => validateProductInput(input),
    keyOf: (input) => input.sku,
    normalizeKey: normalizeSku,
    existingKey: (p) => p.sku,
    idOf: (p) => p.id,
    displayName: (input) => input.name,
    keyLabel: 'SKU',
    findMatches: (input, all) => findProductMatchesForInput(input, all),
  });
}
