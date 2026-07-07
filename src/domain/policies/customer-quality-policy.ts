import type { Customer } from '@/domain/models/customer';
import {
  qualityBand,
  type QualityFactor,
  type QualityIssueDetail,
  type QualityResult,
} from '@/domain/models/quality';
import { isValidEmail } from '@/domain/value-objects/email';

interface FieldCheck {
  key: string;
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
 * rule — the dashboard and detail view both read this single result. Also
 * returns a per-field `factors` breakdown and reasoned `issueDetails` (#11);
 * the score/completeness math is unchanged for backward compatibility.
 */
export function evaluateCustomerQuality(c: Customer): QualityResult {
  const checks: FieldCheck[] = [
    { key: 'name', label: '名称', filled: isFilled(c.name) },
    { key: 'nameKana', label: 'カナ名称', filled: isFilled(c.nameKana) },
    { key: 'industry', label: '業種', filled: isFilled(c.industry) },
    { key: 'email', label: 'メール', filled: isFilled(c.email) },
    { key: 'phone', label: '電話番号', filled: isFilled(c.phone) },
    { key: 'postalCode', label: '郵便番号', filled: isFilled(c.postalCode) },
    { key: 'prefecture', label: '都道府県', filled: isFilled(c.prefecture) },
    { key: 'city', label: '市区町村', filled: isFilled(c.city) },
    { key: 'addressLine', label: '住所', filled: isFilled(c.addressLine) },
    { key: 'website', label: 'ウェブサイト', filled: isFilled(c.website) },
    { key: 'taxId', label: '税番号', filled: isFilled(c.taxId) },
    { key: 'annualRevenue', label: '年間売上', filled: isFilled(c.annualRevenue) },
    { key: 'steward', label: 'データ管理者', filled: isFilled(c.steward) },
  ];

  const scoredCount = checks.length;
  const filledCount = checks.filter((f) => f.filled).length;
  const missingFields = checks.filter((f) => !f.filled).map((f) => f.label);
  const completeness = Math.round((filledCount / scoredCount) * 100);
  const weight = Math.round(100 / scoredCount);
  const factors: QualityFactor[] = checks.map((f) => ({
    key: f.key,
    label: f.label,
    filled: f.filled,
    weight,
  }));

  const issueDetails: QualityIssueDetail[] = [];
  if (isFilled(c.email) && !isValidEmail(c.email as string)) {
    issueDetails.push({
      message: 'メールアドレスの形式が不正です',
      penalty: ISSUE_PENALTY,
    });
  }
  if (c.status === 'active' && !isFilled(c.steward)) {
    issueDetails.push({
      message: '有効な顧客にデータ管理者が設定されていません',
      penalty: ISSUE_PENALTY,
    });
  }
  const issues = issueDetails.map((d) => d.message);

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
    factors,
    issueDetails,
  };
}
