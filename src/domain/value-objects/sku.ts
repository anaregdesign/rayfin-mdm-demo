/** SKU value object — the unique business key for a product. */

export const SKU_MAX = 64;

const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Canonical form used for duplicate detection (case/width-insensitive). */
export function normalizeSku(value: string): string {
  return value.normalize('NFKC').trim().toUpperCase();
}

export function isValidSku(value: string): boolean {
  const v = value.trim();
  return v.length >= 1 && v.length <= SKU_MAX && SKU_PATTERN.test(v);
}
