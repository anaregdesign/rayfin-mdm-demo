/**
 * Tiny pure text utilities shared by search filtering and duplicate matching.
 * No framework or SDK dependencies.
 */

/** Normalize for exact matching: NFKC, lowercase, strip spaces & punctuation. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Normalize loosely for substring search: NFKC, lowercase, collapse spaces. */
export function normalizeLoose(value: string | null | undefined): string {
  if (!value) return '';
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** True when `haystack` contains `needle` after loose normalization. */
export function includesNormalized(
  haystack: string | null | undefined,
  needle: string
): boolean {
  const n = normalizeLoose(needle);
  if (!n) return true;
  return normalizeLoose(haystack).includes(n);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, prevDiag + cost);
      prevDiag = temp;
    }
  }
  return prev[b.length];
}

/** Similarity ratio 0..1 based on normalized Levenshtein distance. */
export function similarityRatio(a: string, b: string): number {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  const distance = levenshtein(x, y);
  const maxLen = Math.max(x.length, y.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}
