/** Shared validation result shape used by the form validation policies. */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export interface ValidationResult<K extends string> {
  valid: boolean;
  errors: FieldErrors<K>;
}

export function toResult<K extends string>(
  errors: FieldErrors<K>
): ValidationResult<K> {
  return { valid: Object.keys(errors).length === 0, errors };
}
