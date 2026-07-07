import type { Customer } from '@/domain/models/customer';
import { qualityBand, type QualityResult } from '@/domain/models/quality';
import { isValidEmail } from '@/domain/value-objects/email';

interface FieldCheck {
  label: string;
  filled: boolean;
}

const ISSUE_PENALTY = 10;

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  return true;
}

/**
 * Score a customer's data quality: completeness across the desirable profile
 * fields minus penalties for data-quality/governance issues. Pure business
 * rule — the dashboard and detail view both read this single result.
 */
export function evaluateCustomerQuality(c: Customer): QualityResult {
  const checks: FieldCheck[] = [
    { label: '名称', filled: isFilled(c.name) },
    { label: 'カナ名称', filled: isFilled(c.nameKana) },
    { label: '業種', filled: isFilled(c.industry) },
    { label: 'メール', filled: isFilled(c.email) },
    { label: '電話番号', filled: isFilled(c.phone) },
    { label: '郵便番号', filled: isFilled(c.postalCode) },
    { label: '都道府県', filled: isFilled(c.prefecture) },
    { label: '市区町村', filled: isFilled(c.city) },
    { label: '住所', filled: isFilled(c.addressLine) },
    { label: 'ウェブサイト', filled: isFilled(c.website) },
    { label: '税番号', filled: isFilled(c.taxId) },
    { label: '年間売上', filled: isFilled(c.annualRevenue) },
    { label: 'データ管理者', filled: isFilled(c.steward) },
  ];

  const scoredCount = checks.length;
  const filledCount = checks.filter((f) => f.filled).length;
  const missingFields = checks.filter((f) => !f.filled).map((f) => f.label);
  const completeness = Math.round((filledCount / scoredCount) * 100);

  const issues: string[] = [];
  if (isFilled(c.email) && !isValidEmail(c.email as string)) {
    issues.push('メールアドレスの形式が不正です');
  }
  if (c.status === 'active' && !isFilled(c.steward)) {
    issues.push('有効な顧客にデータ管理者が設定されていません');
  }

  const score = Math.max(
    0,
    Math.min(100, completeness - issues.length * ISSUE_PENALTY)
  );

  return {
    score,
    completeness,
    band: qualityBand(score),
    filledCount,
    scoredCount,
    missingFields,
    issues,
  };
}
