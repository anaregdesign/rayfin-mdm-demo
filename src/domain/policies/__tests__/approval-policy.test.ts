import { describe, expect, it } from 'vitest';

import type { Actor, Role } from '@/domain/models/authz';
import type { ChangeRequest } from '@/domain/models/change-request';
import {
  applyDecision,
  canApprove,
  canReview,
  isSelfReview,
  reviewBlockReason,
} from '@/domain/policies/approval-policy';

function actor(role: Role, overrides: Partial<Actor> = {}): Actor {
  return {
    id: 'u-1',
    email: 'maker@contoso.com',
    name: '申請 太郎',
    role,
    ...overrides,
  };
}

function request(overrides: Partial<ChangeRequest> = {}): ChangeRequest {
  return {
    id: 'cr-1',
    entityType: 'customer',
    operation: 'create',
    status: 'pending',
    requestedBy: 'maker@contoso.com',
    requestedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('canApprove', () => {
  it('allows only admins to act as checkers', () => {
    expect(canApprove(actor('admin'))).toBe(true);
    expect(canApprove(actor('steward'))).toBe(false);
    expect(canApprove(actor('viewer'))).toBe(false);
  });
});

describe('isSelfReview', () => {
  it('matches the maker by email, name, or id (case/space-insensitive)', () => {
    const req = request({ requestedBy: '  Maker@Contoso.com ' });
    expect(isSelfReview(req, actor('admin', { email: 'maker@contoso.com' }))).toBe(
      true
    );
    expect(
      isSelfReview(request({ requestedBy: '申請 太郎' }), actor('admin'))
    ).toBe(true);
    expect(
      isSelfReview(request({ requestedBy: 'u-1' }), actor('admin', { email: '' }))
    ).toBe(true);
  });

  it('is false when the request has no maker recorded', () => {
    expect(isSelfReview(request({ requestedBy: undefined }), actor('admin'))).toBe(
      false
    );
  });

  it('is false for a different identity', () => {
    expect(
      isSelfReview(
        request({ requestedBy: 'someone@else.com' }),
        actor('admin', { email: 'checker@contoso.com', name: '承認 花子', id: 'u-2' })
      )
    ).toBe(false);
  });
});

describe('canReview', () => {
  const checker = actor('admin', {
    email: 'checker@contoso.com',
    name: '承認 花子',
    id: 'u-2',
  });

  it('allows an admin to review a pending request from someone else', () => {
    expect(canReview(request(), checker)).toBe(true);
  });

  it('rejects a non-admin reviewer', () => {
    expect(canReview(request(), actor('steward'))).toBe(false);
  });

  it('rejects a request that is already processed', () => {
    expect(canReview(request({ status: 'approved' }), checker)).toBe(false);
    expect(canReview(request({ status: 'rejected' }), checker)).toBe(false);
  });

  it('permits self-review by default but blocks it when segregation is enforced', () => {
    const selfReq = request({ requestedBy: 'checker@contoso.com' });
    expect(canReview(selfReq, checker)).toBe(true);
    expect(canReview(selfReq, checker, { enforceSegregation: true })).toBe(false);
  });
});

describe('reviewBlockReason', () => {
  const checker = actor('admin', { email: 'checker@contoso.com', id: 'u-2' });

  it('returns null when the review is allowed', () => {
    expect(reviewBlockReason(request(), checker)).toBeNull();
  });

  it('explains a processed request', () => {
    expect(reviewBlockReason(request({ status: 'approved' }), checker)).toMatch(
      /処理済み/
    );
  });

  it('explains a non-admin reviewer', () => {
    expect(reviewBlockReason(request(), actor('steward'))).toMatch(/管理者/);
  });

  it('explains a blocked self-approval under segregation', () => {
    const selfReq = request({ requestedBy: 'checker@contoso.com' });
    expect(
      reviewBlockReason(selfReq, checker, { enforceSegregation: true })
    ).toMatch(/自己承認/);
  });
});

describe('applyDecision', () => {
  const checker = actor('admin', { email: 'checker@contoso.com', id: 'u-2' });
  const at = new Date('2025-02-03T04:05:06.000Z');

  it('records an approval with reviewer, timestamp, and trimmed reason', () => {
    const result = applyDecision(request(), 'approved', checker, '  問題なし  ', at);
    expect(result.status).toBe('approved');
    expect(result.reviewedBy).toBe('checker@contoso.com');
    expect(result.reviewedAt).toBe(at);
    expect(result.reason).toBe('問題なし');
  });

  it('normalizes an empty reason to undefined', () => {
    expect(applyDecision(request(), 'rejected', checker, '   ', at).reason).toBeUndefined();
    expect(applyDecision(request(), 'rejected', checker, undefined, at).reason).toBeUndefined();
  });

  it('falls back to the reviewer id when email is absent', () => {
    const idOnly = actor('admin', { email: '', id: 'u-9' });
    expect(applyDecision(request(), 'approved', idOnly, undefined, at).reviewedBy).toBe(
      'u-9'
    );
  });

  it('does not mutate the original request', () => {
    const original = request();
    const snapshot = { ...original };
    applyDecision(original, 'approved', checker, 'ok', at);
    expect(original).toEqual(snapshot);
  });
});
