/** Customer code value object — the unique business key for a customer. */

export const CUSTOMER_CODE_MAX = 32;

const CUSTOMER_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** Canonical form used for duplicate detection (case/width-insensitive). */
export function normalizeCustomerCode(value: string): string {
  return value.normalize('NFKC').trim().toUpperCase();
}

export function isValidCustomerCode(value: string): boolean {
  const v = value.trim();
  return (
    v.length >= 1 && v.length <= CUSTOMER_CODE_MAX && CUSTOMER_CODE_PATTERN.test(v)
  );
}
