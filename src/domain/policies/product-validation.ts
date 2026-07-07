import type { ProductInput } from '@/domain/models/product';
import {
  toResult,
  type FieldErrors,
  type ValidationResult,
} from '@/domain/models/validation';
import { isValidSku, SKU_MAX } from '@/domain/value-objects/sku';

export type ProductField = keyof ProductInput;

const NAME_MAX = 200;

/**
 * Validate the product form input. Business rules for the required business
 * key, price, and lengths live here — the form only renders the messages.
 */
export function validateProductInput(
  input: ProductInput
): ValidationResult<ProductField> {
  const errors: FieldErrors<ProductField> = {};

  if (!input.sku.trim()) {
    errors.sku = 'SKUは必須です';
  } else if (!isValidSku(input.sku)) {
    errors.sku = `SKUは英数字・ハイフン・ピリオド・アンダースコアのみ、${SKU_MAX}文字以内で入力してください`;
  }

  if (!input.name.trim()) {
    errors.name = '名称は必須です';
  } else if (input.name.trim().length > NAME_MAX) {
    errors.name = `名称は${NAME_MAX}文字以内で入力してください`;
  }

  if (input.unitPrice == null || Number.isNaN(input.unitPrice)) {
    errors.unitPrice = '単価は必須です';
  } else if (input.unitPrice < 0) {
    errors.unitPrice = '単価は0以上の数値で入力してください';
  }

  return toResult(errors);
}
