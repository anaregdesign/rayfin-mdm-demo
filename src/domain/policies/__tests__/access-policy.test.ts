import { describe, expect, it } from 'vitest';

import type { Actor, Role } from '@/domain/models/authz';
import { highestRole } from '@/domain/models/authz';
import {
  can,
  canModifyAny,
  canViewSensitive,
  isRecordSteward,
} from '@/domain/policies/access-policy';

function actor(role: Role, over: Partial<Actor> = {}): Actor {
  return {
    id: 'u1',
    email: 'dana@contoso.com',
    name: 'Dana Steward',
    role,
    ...over,
  };
}

describe('access-policy: can()', () => {
  it('admin may do everything', () => {
    const a = actor('admin');
    for (const action of [
      'view',
      'create',
      'edit',
      'delete',
      'merge',
      'changeStatus',
      'import',
      'export',
    ] as const) {
      expect(can(a, action, { steward: 'someone-else' })).toBe(true);
    }
  });

  it('viewer may only read/export', () => {
    const a = actor('viewer');
    expect(can(a, 'view')).toBe(true);
    expect(can(a, 'export')).toBe(true);
    expect(can(a, 'create')).toBe(false);
    expect(can(a, 'import')).toBe(false);
    expect(can(a, 'edit', { steward: 'dana@contoso.com' })).toBe(false);
    expect(can(a, 'delete', { steward: 'dana@contoso.com' })).toBe(false);
    expect(can(a, 'merge', { steward: 'dana@contoso.com' })).toBe(false);
    expect(can(a, 'changeStatus', { steward: 'dana@contoso.com' })).toBe(false);
  });

  it('steward may create/import without a record', () => {
    const a = actor('steward');
    expect(can(a, 'view')).toBe(true);
    expect(can(a, 'export')).toBe(true);
    expect(can(a, 'create')).toBe(true);
    expect(can(a, 'import')).toBe(true);
  });

  it('steward may modify only records they own', () => {
    const a = actor('steward');
    expect(can(a, 'edit', { steward: 'dana@contoso.com' })).toBe(true);
    expect(can(a, 'delete', { steward: 'dana@contoso.com' })).toBe(true);
    expect(can(a, 'merge', { steward: 'dana@contoso.com' })).toBe(true);
    expect(can(a, 'changeStatus', { steward: 'dana@contoso.com' })).toBe(true);
    expect(can(a, 'edit', { steward: 'other@contoso.com' })).toBe(false);
    expect(can(a, 'delete', { steward: 'other@contoso.com' })).toBe(false);
  });

  it('steward may claim an unassigned record', () => {
    const a = actor('steward');
    expect(can(a, 'edit', { steward: '' })).toBe(true);
    expect(can(a, 'edit', { steward: undefined })).toBe(true);
    expect(can(a, 'edit', {})).toBe(true);
  });

  it('steward cannot modify without a resource for owned actions', () => {
    const a = actor('steward');
    expect(can(a, 'edit')).toBe(false);
    expect(can(a, 'delete')).toBe(false);
  });
});

describe('access-policy: isRecordSteward()', () => {
  it('matches on email/name/id case-insensitively and trims', () => {
    const a = actor('steward');
    expect(isRecordSteward(a, { steward: '  DANA@contoso.com ' })).toBe(true);
    expect(isRecordSteward(a, { steward: 'dana steward' })).toBe(true);
    expect(isRecordSteward(a, { steward: 'U1' })).toBe(true);
  });

  it('is false for empty or non-matching steward', () => {
    const a = actor('steward');
    expect(isRecordSteward(a, { steward: '' })).toBe(false);
    expect(isRecordSteward(a, { steward: undefined })).toBe(false);
    expect(isRecordSteward(a, { steward: 'someone-else' })).toBe(false);
  });
});

describe('access-policy: sensitivity + list helpers', () => {
  it('masks sensitive fields from viewer only', () => {
    expect(canViewSensitive(actor('viewer'))).toBe(false);
    expect(canViewSensitive(actor('steward'))).toBe(true);
    expect(canViewSensitive(actor('admin'))).toBe(true);
  });

  it('canModifyAny is true for steward/admin, false for viewer', () => {
    expect(canModifyAny(actor('viewer'))).toBe(false);
    expect(canModifyAny(actor('steward'))).toBe(true);
    expect(canModifyAny(actor('admin'))).toBe(true);
  });
});

describe('authz: highestRole()', () => {
  it('picks the most privileged granted role', () => {
    expect(highestRole(['viewer'])).toBe('viewer');
    expect(highestRole(['viewer', 'steward'])).toBe('steward');
    expect(highestRole(['steward', 'admin', 'viewer'])).toBe('admin');
    expect(highestRole([])).toBe('viewer');
  });
});
