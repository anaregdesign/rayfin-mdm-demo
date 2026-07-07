import { describe, expect, it } from 'vitest';

import {
  normalizeBarcode,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizePostalCode,
  normalizeUrl,
  toNfkc,
} from '@/lib/normalize';

describe('toNfkc', () => {
  it('folds full-width ASCII/digits to half-width', () => {
    expect(toNfkc('ＡＢＣ１２３')).toBe('ABC123');
  });

  it('folds the full-width space (U+3000) to a normal space', () => {
    expect(toNfkc('a\u3000b')).toBe('a b');
  });
});

describe('normalizeName', () => {
  it('collapses internal whitespace runs and trims', () => {
    expect(normalizeName('  山田   太郎  ')).toBe('山田 太郎');
  });

  it('folds full-width spaces then collapses them', () => {
    expect(normalizeName('山田\u3000\u3000太郎')).toBe('山田 太郎');
  });

  it('folds full-width ASCII via NFKC', () => {
    expect(normalizeName('ＡＣＭＥ　株式会社')).toBe('ACME 株式会社');
  });

  it('is idempotent', () => {
    const once = normalizeName('  ＡＣＭＥ   Corp  ');
    expect(normalizeName(once)).toBe(once);
  });
});

describe('normalizeEmail', () => {
  it('trims, lower-cases and folds full-width characters', () => {
    expect(normalizeEmail('  INFO@Example.COM ')).toBe('info@example.com');
    expect(normalizeEmail('ＩＮＦＯ@ＥＸＡＭＰＬＥ.com')).toBe(
      'info@example.com'
    );
  });

  it('is idempotent', () => {
    const once = normalizeEmail(' Foo@Bar.CO.JP ');
    expect(normalizeEmail(once)).toBe(once);
  });
});

describe('normalizePhone', () => {
  it('keeps digits only, dropping hyphens/spaces/parens', () => {
    expect(normalizePhone('03-1234-5678')).toBe('0312345678');
    expect(normalizePhone(' (03) 1234 5678 ')).toBe('0312345678');
  });

  it('folds full-width digits', () => {
    expect(normalizePhone('０３１２３４５６７８')).toBe('0312345678');
  });

  it('preserves a single leading + for international format', () => {
    expect(normalizePhone('+81 3-1234-5678')).toBe('+81312345678');
  });

  it('is idempotent', () => {
    const once = normalizePhone('+81 (3) 1234-5678');
    expect(normalizePhone(once)).toBe(once);
  });
});

describe('normalizePostalCode', () => {
  it('formats exactly 7 digits as NNN-NNNN', () => {
    expect(normalizePostalCode('1000001')).toBe('100-0001');
    expect(normalizePostalCode('100-0001')).toBe('100-0001');
    expect(normalizePostalCode('１０００００１')).toBe('100-0001');
  });

  it('returns bare digits when not exactly 7', () => {
    expect(normalizePostalCode('123')).toBe('123');
  });

  it('is idempotent', () => {
    expect(normalizePostalCode(normalizePostalCode('1000001'))).toBe(
      '100-0001'
    );
  });
});

describe('normalizeBarcode', () => {
  it('keeps digits only', () => {
    expect(normalizeBarcode('4900-000-000-017')).toBe('4900000000017');
    expect(normalizeBarcode('４９００')).toBe('4900');
  });

  it('is idempotent', () => {
    const once = normalizeBarcode('4900 0000 0001 7');
    expect(normalizeBarcode(once)).toBe(once);
  });
});

describe('normalizeUrl', () => {
  it('strips whitespace and a single trailing slash', () => {
    expect(normalizeUrl(' https://example.com/ ')).toBe('https://example.com');
    expect(normalizeUrl('https://example.com/path/')).toBe(
      'https://example.com/path'
    );
  });

  it('preserves path case', () => {
    expect(normalizeUrl('https://example.com/AbC')).toBe(
      'https://example.com/AbC'
    );
  });

  it('is idempotent', () => {
    const once = normalizeUrl('  https://example.com/x/  ');
    expect(normalizeUrl(once)).toBe(once);
  });
});
