import { describe, expect, it } from 'vitest';

import {
  includesNormalized,
  normalizeLoose,
  normalizeText,
  similarityRatio,
} from '@/lib/text';

/**
 * Shared text primitives behind search filtering and duplicate matching.
 * These are the substrate for higher-level policies, so their edge cases
 * (null/empty, NFKC width folding, punctuation stripping) are pinned directly.
 */
describe('normalizeText', () => {
  it('returns an empty string for null/undefined/empty', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText('')).toBe('');
  });

  it('lowercases and strips spaces and punctuation', () => {
    expect(normalizeText('ABC Corp., Ltd.')).toBe('abccorpltd');
  });

  it('folds full-width characters via NFKC', () => {
    // Full-width "ＡＢＣ１２３" → ascii "abc123"
    expect(normalizeText('ＡＢＣ１２３')).toBe('abc123');
  });

  it('keeps letters and numbers across scripts', () => {
    expect(normalizeText('東京-001')).toBe('東京001');
  });
});

describe('normalizeLoose', () => {
  it('returns an empty string for nullish input', () => {
    expect(normalizeLoose(null)).toBe('');
    expect(normalizeLoose(undefined)).toBe('');
  });

  it('collapses runs of whitespace and trims, preserving single spaces', () => {
    expect(normalizeLoose('  Hello   World  ')).toBe('hello world');
  });

  it('does not strip punctuation (unlike normalizeText)', () => {
    expect(normalizeLoose('A.B, C')).toBe('a.b, c');
  });
});

describe('includesNormalized', () => {
  it('is true for an empty needle (no filter)', () => {
    expect(includesNormalized('anything', '')).toBe(true);
    expect(includesNormalized(null, '   ')).toBe(true);
  });

  it('matches case- and width-insensitively', () => {
    expect(includesNormalized('Tokyo Head Office', 'head')).toBe(true);
    expect(includesNormalized('ＡＢＣ', 'abc')).toBe(true);
  });

  it('is false when the needle is absent', () => {
    expect(includesNormalized('Osaka Branch', 'tokyo')).toBe(false);
  });

  it('is false for a non-empty needle against a nullish haystack', () => {
    expect(includesNormalized(null, 'x')).toBe(false);
  });
});

describe('similarityRatio', () => {
  it('returns 1 for two empty strings', () => {
    expect(similarityRatio('', '')).toBe(1);
  });

  it('returns 0 when exactly one side is empty', () => {
    expect(similarityRatio('abc', '')).toBe(0);
    expect(similarityRatio('', 'abc')).toBe(0);
  });

  it('returns 1 for identical strings after normalization', () => {
    expect(similarityRatio('ABC Corp', 'abc corp')).toBe(1);
  });

  it('returns a fractional ratio for a single-character difference', () => {
    // "abc" vs "abd" → distance 1, maxLen 3 → 1 - 1/3
    expect(similarityRatio('abc', 'abd')).toBeCloseTo(2 / 3, 5);
  });

  it('is symmetric', () => {
    expect(similarityRatio('kitten', 'sitting')).toBeCloseTo(
      similarityRatio('sitting', 'kitten'),
      10,
    );
  });

  it('is low for entirely different strings', () => {
    expect(similarityRatio('alpha', 'zulu')).toBeLessThan(0.5);
  });
});
