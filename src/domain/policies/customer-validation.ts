import type { CustomerInput } from '@/domain/models/customer';
import {
  toResult,
  type FieldErrors,
  type ValidationResult,
} from '@/domain/models/validation';
import {
  CUSTOMER_CODE_MAX,
  isValidCustomerCode,
} from '@/domain/value-objects/customer-code';
import { isValidEmail } from '@/domain/value-objects/email';

export type CustomerField = keyof CustomerInput;

const NAME_MAX = 200;

/**
 * Validate the customer form input. Business rules for the required business
 * key, formats, and lengths live here — the form only renders the messages.
 */
export function validateCustomerInput(
  input: CustomerInput
): ValidationResult<CustomerField> {
  const errors: FieldErrors<CustomerField> = {};

  if (!input.code.trim()) {
    errors.code = '顧客コードは必須です';
  } else if (!isValidCustomerCode(input.code)) {
    errors.code = `顧客コードは英数字・ハイフン・アンダースコアのみ、${CUSTOMER_CODE_MAX}文字以内で入力してください`;
  }

  if (!input.name.trim()) {
    errors.name = '名称は必須です';
  } else if (input.name.trim().length > NAME_MAX) {
    errors.name = `名称は${NAME_MAX}文字以内で入力してください`;
  }

  if (!input.country.trim()) {
    errors.country = '国は必須です';
  }

  if (input.email && input.email.trim() && !isValidEmail(input.email)) {
    errors.email = 'メールアドレスの形式が正しくありません';
  }

  if (
    input.annualRevenue != null &&
    (Number.isNaN(input.annualRevenue) || input.annualRevenue < 0)
  ) {
    errors.annualRevenue = '年間売上は0以上の数値で入力してください';
  }

  return toResult(errors);
}
