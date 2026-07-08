import { describe, expect, it } from 'vitest';

import { isValidEmail } from '@/domain/value-objects/email';

/**
 * Email value object — the single format gate used by both the form validation
 * policy and the quality-scoring policy. These tests lock the accepted/rejected
 * shapes so the two callers can never drift.
 */
describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('info@example.com')).toBe(true);
  });

  it('accepts subdomains and plus-tags', () => {
    expect(isValidEmail('user+tag@mail.example.co.jp')).toBe(true);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidEmail('  info@example.com  ')).toBe(true);
  });

  it('rejects a value with no @', () => {
    expect(isValidEmail('info.example.com')).toBe(false);
  });

  it('rejects a value with no domain dot', () => {
    expect(isValidEmail('info@localhost')).toBe(false);
  });

  it('rejects a missing local part', () => {
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('rejects a missing domain', () => {
    expect(isValidEmail('info@')).toBe(false);
  });

  it('rejects internal whitespace', () => {
    expect(isValidEmail('in fo@example.com')).toBe(false);
  });

  it('rejects the empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects a double @', () => {
    expect(isValidEmail('a@@example.com')).toBe(false);
  });
});
