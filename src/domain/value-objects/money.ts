/** Money value object: the supported currencies plus a locale-aware formatter. */

export type Currency = 'JPY' | 'USD' | 'EUR';

export const CURRENCY_VALUES: Currency[] = ['JPY', 'USD', 'EUR'];

export const CURRENCY_LABELS: Record<Currency, string> = {
  JPY: '日本円 (JPY)',
  USD: '米ドル (USD)',
  EUR: 'ユーロ (EUR)',
};

export function formatMoney(
  amount: number | null | undefined,
  currency: Currency
): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('ja-JP').format(amount)} ${currency}`;
  }
}
