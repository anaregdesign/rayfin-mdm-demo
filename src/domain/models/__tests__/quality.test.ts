import { describe, expect, it } from 'vitest';

import {
  qualityBand,
  qualityBandLabel,
  QUALITY_BAND_LABELS,
} from '@/domain/models/quality';

/**
 * Quality band thresholds are a business rule that every view maps through, so
 * the exact boundaries (high ≥ 80, medium ≥ 50, else low) are pinned here — the
 * ≥ boundaries are the easiest thing to regress.
 */
describe('qualityBand', () => {
  it('maps 100 and the high boundary (80) to high', () => {
    expect(qualityBand(100)).toBe('high');
    expect(qualityBand(80)).toBe('high');
  });

  it('maps just below the high boundary (79) to medium', () => {
    expect(qualityBand(79)).toBe('medium');
  });

  it('maps the medium boundary (50) to medium', () => {
    expect(qualityBand(50)).toBe('medium');
  });

  it('maps just below the medium boundary (49) and 0 to low', () => {
    expect(qualityBand(49)).toBe('low');
    expect(qualityBand(0)).toBe('low');
  });
});

describe('qualityBandLabel', () => {
  it('returns the Japanese label for the band a score falls in', () => {
    expect(qualityBandLabel(90)).toBe(QUALITY_BAND_LABELS.high);
    expect(qualityBandLabel(60)).toBe(QUALITY_BAND_LABELS.medium);
    expect(qualityBandLabel(10)).toBe(QUALITY_BAND_LABELS.low);
  });

  it('has a distinct label for each band', () => {
    const labels = Object.values(QUALITY_BAND_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
