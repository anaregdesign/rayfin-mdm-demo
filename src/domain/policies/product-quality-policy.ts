import type { Product } from '@/domain/models/product';
import { qualityBand, type QualityResult } from '@/domain/models/quality';

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
 * Score a product's data quality: completeness across the desirable profile
 * fields minus penalties for data-quality/governance issues. Pure business
 * rule — the dashboard and detail view both read this single result.
 */
export function evaluateProductQuality(p: Product): QualityResult {
  const checks: FieldCheck[] = [
    { label: '名称', filled: isFilled(p.name) },
    { label: 'カナ名称', filled: isFilled(p.nameKana) },
    { label: 'ブランド', filled: isFilled(p.brand) },
    { label: '説明', filled: isFilled(p.description) },
    { label: 'バーコード', filled: isFilled(p.barcode) },
    { label: '仕入先', filled: isFilled(p.supplierName) },
    { label: 'データ管理者', filled: isFilled(p.steward) },
  ];

  const scoredCount = checks.length;
  const filledCount = checks.filter((f) => f.filled).length;
  const missingFields = checks.filter((f) => !f.filled).map((f) => f.label);
  const completeness = Math.round((filledCount / scoredCount) * 100);

  const issues: string[] = [];
  if (!(p.unitPrice > 0)) {
    issues.push('単価が0以下です');
  }
  if (p.status === 'active' && !isFilled(p.steward)) {
    issues.push('有効な製品にデータ管理者が設定されていません');
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
