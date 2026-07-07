import type { Product } from '@/domain/models/product';
import {
  qualityBand,
  type QualityFactor,
  type QualityIssueDetail,
  type QualityResult,
} from '@/domain/models/quality';

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
 * Score a product's data quality: completeness across the desirable profile
 * fields minus penalties for data-quality/governance issues. Pure business
 * rule — the dashboard and detail view both read this single result. Also
 * returns a per-field `factors` breakdown and reasoned `issueDetails` (#11);
 * the score/completeness math is unchanged for backward compatibility.
 */
export function evaluateProductQuality(p: Product): QualityResult {
  const checks: FieldCheck[] = [
    { key: 'name', label: '名称', filled: isFilled(p.name) },
    { key: 'nameKana', label: 'カナ名称', filled: isFilled(p.nameKana) },
    { key: 'brand', label: 'ブランド', filled: isFilled(p.brand) },
    { key: 'description', label: '説明', filled: isFilled(p.description) },
    { key: 'barcode', label: 'バーコード', filled: isFilled(p.barcode) },
    { key: 'supplierName', label: '仕入先', filled: isFilled(p.supplierName) },
    { key: 'steward', label: 'データ管理者', filled: isFilled(p.steward) },
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
  if (!(p.unitPrice > 0)) {
    issueDetails.push({ message: '単価が0以下です', penalty: ISSUE_PENALTY });
  }
  if (p.status === 'active' && !isFilled(p.steward)) {
    issueDetails.push({
      message: '有効な製品にデータ管理者が設定されていません',
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
