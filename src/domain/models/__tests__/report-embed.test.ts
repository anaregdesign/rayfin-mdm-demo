import { describe, expect, it } from 'vitest';

import {
  buildSecureEmbedUrl,
  type SecureEmbedParts,
} from '@/domain/models/report-embed';

describe('buildSecureEmbedUrl', () => {
  const base: SecureEmbedParts = {
    reportId: 'report-123',
    workspaceId: 'ws-456',
  };

  it('builds an app.powerbi.com reportEmbed URL', () => {
    const url = buildSecureEmbedUrl(base);
    expect(url.startsWith('https://app.powerbi.com/reportEmbed?')).toBe(true);
  });

  it('includes reportId, groupId and autoAuth params', () => {
    const params = new URL(buildSecureEmbedUrl(base)).searchParams;
    expect(params.get('reportId')).toBe('report-123');
    expect(params.get('groupId')).toBe('ws-456');
    expect(params.get('autoAuth')).toBe('true');
  });

  it('adds the ctid hint when a tenantId is provided', () => {
    const params = new URL(
      buildSecureEmbedUrl({ ...base, tenantId: 'tenant-789' }),
    ).searchParams;
    expect(params.get('ctid')).toBe('tenant-789');
  });

  it('omits ctid when tenantId is absent', () => {
    const params = new URL(buildSecureEmbedUrl(base)).searchParams;
    expect(params.has('ctid')).toBe(false);
  });

  it('url-encodes id values that contain special characters', () => {
    const params = new URL(
      buildSecureEmbedUrl({
        reportId: 'a b&c',
        workspaceId: 'w/s',
        tenantId: 't=1',
      }),
    ).searchParams;
    // URLSearchParams decodes on read → we get the original values back.
    expect(params.get('reportId')).toBe('a b&c');
    expect(params.get('groupId')).toBe('w/s');
    expect(params.get('ctid')).toBe('t=1');
  });
});
