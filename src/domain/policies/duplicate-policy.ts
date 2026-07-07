import type { Customer } from '@/domain/models/customer';
import {
  customerDisplayName,
  type CustomerInput,
} from '@/domain/models/customer';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { Product } from '@/domain/models/product';
import { productDisplayName, type ProductInput } from '@/domain/models/product';
import { normalizeCustomerCode } from '@/domain/value-objects/customer-code';
import { normalizeSku } from '@/domain/value-objects/sku';
import { normalizeText, similarityRatio } from '@/lib/text';

/** Name similarity at/above this ratio is treated as a probable match. */
const NAME_MATCH_THRESHOLD = 0.82;

function pairKey(leftId: string, rightId: string): string {
  return [leftId, rightId].sort().join('|');
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export function findCustomerDuplicates(customers: Customer[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < customers.length; i++) {
    for (let j = i + 1; j < customers.length; j++) {
      const a = customers[i];
      const b = customers[j];
      const reasons: string[] = [];
      let score = 0;

      if (normalizeCustomerCode(a.code) === normalizeCustomerCode(b.code)) {
        reasons.push('顧客コードが一致');
        score = Math.max(score, 100);
      }

      if (
        a.email &&
        b.email &&
        normalizeText(a.email) === normalizeText(b.email)
      ) {
        reasons.push('メールアドレスが一致');
        score = Math.max(score, 95);
      }

      const nameRatio = similarityRatio(a.name, b.name);
      if (nameRatio >= NAME_MATCH_THRESHOLD) {
        reasons.push(`名称が類似 (${Math.round(nameRatio * 100)}%)`);
        score = Math.max(score, Math.round(nameRatio * 100));
      } else if (a.nameKana && b.nameKana) {
        const kanaRatio = similarityRatio(a.nameKana, b.nameKana);
        if (kanaRatio >= NAME_MATCH_THRESHOLD) {
          reasons.push(`カナ名称が類似 (${Math.round(kanaRatio * 100)}%)`);
          score = Math.max(score, Math.round(kanaRatio * 100));
        }
      }

      if (reasons.length > 0) {
        pairs.push({
          key: pairKey(a.id, b.id),
          left: { id: a.id, label: customerDisplayName(a) },
          right: { id: b.id, label: customerDisplayName(b) },
          score,
          reasons,
        });
      }
    }
  }

  return pairs.sort((x, y) => y.score - x.score);
}

/** Candidate matches for a not-yet-saved customer (form-time warning). */
export function findCustomerMatchesForInput(
  input: CustomerInput,
  existing: Customer[],
  excludeId?: string
): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const inputCode = normalizeCustomerCode(input.code);
  const inputEmail = input.email ? normalizeText(input.email) : '';

  for (const c of existing) {
    if (excludeId && c.id === excludeId) continue;
    const reasons: string[] = [];
    let score = 0;

    if (inputCode && normalizeCustomerCode(c.code) === inputCode) {
      reasons.push('顧客コードが一致');
      score = Math.max(score, 100);
    }
    if (inputEmail && c.email && normalizeText(c.email) === inputEmail) {
      reasons.push('メールアドレスが一致');
      score = Math.max(score, 95);
    }
    const nameRatio = similarityRatio(input.name, c.name);
    if (nameRatio >= NAME_MATCH_THRESHOLD) {
      reasons.push(`名称が類似 (${Math.round(nameRatio * 100)}%)`);
      score = Math.max(score, Math.round(nameRatio * 100));
    }

    if (reasons.length > 0) {
      pairs.push({
        key: c.id,
        left: { id: '', label: `${input.name}（${input.code}）` },
        right: { id: c.id, label: customerDisplayName(c) },
        score,
        reasons,
      });
    }
  }

  return pairs.sort((x, y) => y.score - x.score);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export function findProductDuplicates(products: Product[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const a = products[i];
      const b = products[j];
      const reasons: string[] = [];
      let score = 0;

      if (normalizeSku(a.sku) === normalizeSku(b.sku)) {
        reasons.push('SKUが一致');
        score = Math.max(score, 100);
      }

      if (
        a.barcode &&
        b.barcode &&
        normalizeText(a.barcode) === normalizeText(b.barcode)
      ) {
        reasons.push('バーコードが一致');
        score = Math.max(score, 98);
      }

      const nameRatio = similarityRatio(a.name, b.name);
      if (nameRatio >= NAME_MATCH_THRESHOLD) {
        reasons.push(`名称が類似 (${Math.round(nameRatio * 100)}%)`);
        score = Math.max(score, Math.round(nameRatio * 100));
      }

      if (reasons.length > 0) {
        pairs.push({
          key: pairKey(a.id, b.id),
          left: { id: a.id, label: productDisplayName(a) },
          right: { id: b.id, label: productDisplayName(b) },
          score,
          reasons,
        });
      }
    }
  }

  return pairs.sort((x, y) => y.score - x.score);
}

/** Candidate matches for a not-yet-saved product (form-time warning). */
export function findProductMatchesForInput(
  input: ProductInput,
  existing: Product[],
  excludeId?: string
): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const inputSku = normalizeSku(input.sku);
  const inputBarcode = input.barcode ? normalizeText(input.barcode) : '';

  for (const p of existing) {
    if (excludeId && p.id === excludeId) continue;
    const reasons: string[] = [];
    let score = 0;

    if (inputSku && normalizeSku(p.sku) === inputSku) {
      reasons.push('SKUが一致');
      score = Math.max(score, 100);
    }
    if (inputBarcode && p.barcode && normalizeText(p.barcode) === inputBarcode) {
      reasons.push('バーコードが一致');
      score = Math.max(score, 98);
    }
    const nameRatio = similarityRatio(input.name, p.name);
    if (nameRatio >= NAME_MATCH_THRESHOLD) {
      reasons.push(`名称が類似 (${Math.round(nameRatio * 100)}%)`);
      score = Math.max(score, Math.round(nameRatio * 100));
    }

    if (reasons.length > 0) {
      pairs.push({
        key: p.id,
        left: { id: '', label: `${input.name}（${input.sku}）` },
        right: { id: p.id, label: productDisplayName(p) },
        score,
        reasons,
      });
    }
  }

  return pairs.sort((x, y) => y.score - x.score);
}

// ---------------------------------------------------------------------------
// Shared helpers for views
// ---------------------------------------------------------------------------

/** Set of record ids that appear in at least one duplicate pair. */
export function duplicateIdSet(pairs: DuplicatePair[]): Set<string> {
  const ids = new Set<string>();
  for (const pair of pairs) {
    if (pair.left.id) ids.add(pair.left.id);
    if (pair.right.id) ids.add(pair.right.id);
  }
  return ids;
}

/** Pairs that involve a specific record id (for the detail view). */
export function pairsForId(
  pairs: DuplicatePair[],
  id: string
): DuplicatePair[] {
  return pairs.filter((p) => p.left.id === id || p.right.id === id);
}
