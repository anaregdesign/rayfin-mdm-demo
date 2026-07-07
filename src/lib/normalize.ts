/**
 * Pure text-normalization / cleansing primitives (Issue #11). Each function is
 * deterministic and **idempotent** (applying twice equals applying once), which
 * makes them safe to surface as one-click "suggested fixes" and trivial to unit
 * test. No DOM, no SDK, no framework.
 */

/** Unicode NFKC compatibility form: 全角→半角 for ASCII/digits, ligatures, etc. */
export function toNfkc(value: string): string {
  return value.normalize('NFKC');
}

/**
 * Canonical form for free-text names: NFKC, trimmed, internal whitespace runs
 * collapsed to a single ASCII space. Full-width spaces (U+3000) fold to space
 * via NFKC so they collapse too.
 */
export function normalizeName(value: string): string {
  return toNfkc(value).replace(/\s+/g, ' ').trim();
}

/** Email canonical form: NFKC, trimmed, lower-cased. */
export function normalizeEmail(value: string): string {
  return toNfkc(value).trim().toLowerCase();
}

/**
 * Phone canonical form: NFKC (full-width digits → half-width), then keep digits
 * plus an optional single leading `+`; drop spaces, hyphens, parens, dots.
 */
export function normalizePhone(value: string): string {
  const nfkc = toNfkc(value).trim();
  const hasPlus = nfkc.startsWith('+');
  const digits = nfkc.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Japanese postal-code canonical form: NFKC, digits only; if exactly 7 digits
 * format as `NNN-NNNN`, otherwise return the bare digits.
 */
export function normalizePostalCode(value: string): string {
  const digits = toNfkc(value).replace(/\D/g, '');
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
}

/** Barcode / SKU-like canonical form: NFKC, digits only (drop separators). */
export function normalizeBarcode(value: string): string {
  return toNfkc(value).replace(/\D/g, '');
}

/**
 * URL canonical form: NFKC, trimmed, collapse internal whitespace, drop a single
 * trailing slash. Scheme/host are left as-is (case-preserving) to avoid breaking
 * case-sensitive paths.
 */
export function normalizeUrl(value: string): string {
  return toNfkc(value).replace(/\s+/g, '').replace(/\/+$/, '');
}
