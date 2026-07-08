import { describe, expect, it } from 'vitest';

import type { ReportEmbedConfig } from '@/domain/models/report-embed';
import {
  ConfigReportEmbedProvider,
  type ReportEmbedSettings,
} from '@/infrastructure/reporting/config-report-embed-provider';

function resolve(settings: ReportEmbedSettings): ReportEmbedConfig | null {
  return new ConfigReportEmbedProvider(settings).getReportEmbed();
}

describe('ConfigReportEmbedProvider', () => {
  it('returns null when no reportId is configured', () => {
    expect(resolve({})).toBeNull();
    expect(resolve({ workspaceId: 'ws-1', tenantId: 't-1' })).toBeNull();
  });

  it('returns null when a reportId exists but nothing to embed with', () => {
    // reportId present but no workspaceId / secure URL / token → cannot embed.
    expect(resolve({ reportId: 'r-1' })).toBeNull();
  });

  describe('token mode', () => {
    const tokenSettings: ReportEmbedSettings = {
      reportId: 'r-1',
      embedUrl: 'https://embed.example/report',
      accessToken: 'tok-abc',
    };

    it('is selected when embedUrl + accessToken are present', () => {
      const config = resolve(tokenSettings);
      expect(config).toEqual({
        kind: 'token',
        reportId: 'r-1',
        embedUrl: 'https://embed.example/report',
        accessToken: 'tok-abc',
        tokenType: 'Aad',
      });
    });

    it('defaults tokenType to Aad when unspecified or unknown', () => {
      expect(resolve({ ...tokenSettings, tokenType: undefined })).toMatchObject({
        tokenType: 'Aad',
      });
      expect(resolve({ ...tokenSettings, tokenType: 'nonsense' })).toMatchObject(
        { tokenType: 'Aad' },
      );
    });

    it('honours an explicit Embed tokenType', () => {
      expect(resolve({ ...tokenSettings, tokenType: 'Embed' })).toMatchObject({
        tokenType: 'Embed',
      });
    });

    it('takes precedence over secure-embed settings', () => {
      const config = resolve({
        ...tokenSettings,
        workspaceId: 'ws-1',
        secureEmbedUrl: 'https://app.powerbi.com/reportEmbed?x=1',
      });
      expect(config?.kind).toBe('token');
    });

    it('falls through to secure mode when only one token field is present', () => {
      // embedUrl without accessToken → not token mode; workspaceId → secure.
      const config = resolve({
        reportId: 'r-1',
        embedUrl: 'https://embed.example/report',
        workspaceId: 'ws-1',
      });
      expect(config?.kind).toBe('secure');
    });
  });

  describe('secure mode', () => {
    it('uses an explicit secureEmbedUrl override verbatim', () => {
      const config = resolve({
        reportId: 'r-1',
        secureEmbedUrl: 'https://app.powerbi.com/reportEmbed?custom=1',
      });
      expect(config).toEqual({
        kind: 'secure',
        reportId: 'r-1',
        src: 'https://app.powerbi.com/reportEmbed?custom=1',
      });
    });

    it('prefers an explicit secureEmbedUrl over building from ids', () => {
      const config = resolve({
        reportId: 'r-1',
        workspaceId: 'ws-1',
        secureEmbedUrl: 'https://app.powerbi.com/reportEmbed?custom=1',
      });
      expect(config).toMatchObject({
        kind: 'secure',
        src: 'https://app.powerbi.com/reportEmbed?custom=1',
      });
    });

    it('builds a secure-embed URL from workspaceId + reportId', () => {
      const config = resolve({ reportId: 'r-1', workspaceId: 'ws-1' });
      expect(config?.kind).toBe('secure');
      if (config?.kind === 'secure') {
        const params = new URL(config.src).searchParams;
        expect(params.get('reportId')).toBe('r-1');
        expect(params.get('groupId')).toBe('ws-1');
        expect(params.get('autoAuth')).toBe('true');
        expect(params.has('ctid')).toBe(false);
      }
    });

    it('threads the tenantId into the built URL as ctid', () => {
      const config = resolve({
        reportId: 'r-1',
        workspaceId: 'ws-1',
        tenantId: 't-1',
      });
      if (config?.kind === 'secure') {
        expect(new URL(config.src).searchParams.get('ctid')).toBe('t-1');
      } else {
        throw new Error('expected secure config');
      }
    });
  });
});
