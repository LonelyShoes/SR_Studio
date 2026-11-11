import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DATABASE_URL } from './services/cloud/config.js';

/**
 * Penjaga konfigurasi deploy: header keamanan didefinisikan di tiga tempat
 * (Vercel dari source, Vercel drag & drop, Netlify) dan harus selalu identik.
 */
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const headerValue = (config, key) =>
  config.headers.flatMap((rule) => rule.headers).find((header) => header.key === key)?.value;

describe('konfigurasi deploy', () => {
  const rootConfig = JSON.parse(read('vercel.json'));
  const distConfig = JSON.parse(read('public/vercel.json'));
  const netlifyHeaders = read('public/_headers');
  const csp = headerValue(rootConfig, 'Content-Security-Policy');

  it('vercel.json membangun dari source dengan output dist', () => {
    expect(rootConfig).toMatchObject({ framework: 'vite', buildCommand: 'npm run build', outputDirectory: 'dist' });
  });

  it('header & rewrite identik di semua target deploy', () => {
    expect(distConfig.headers).toEqual(rootConfig.headers);
    expect(distConfig.rewrites).toEqual(rootConfig.rewrites);
    expect(netlifyHeaders).toContain(`Content-Security-Policy: ${csp}`);
    for (const key of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
      expect(netlifyHeaders).toContain(`${key}: ${headerValue(rootConfig, key)}`);
    }
  });

  it('CSP mengizinkan database realtime & font, tanpa skrip inline', () => {
    const databaseHost = new URL(DEFAULT_DATABASE_URL).hostname;
    const suffix = databaseHost.split('.').slice(-2).join('.');
    expect(csp).toContain(`wss://*.${suffix}`);
    expect(csp).toContain(`https://*.${suffix}`);
    expect(csp).toContain('https://fonts.gstatic.com');
    expect(csp).toMatch(/script-src 'self' https:/);
    expect(csp.split(';').find((part) => part.trim().startsWith('script-src'))).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('fallback SPA tidak menelan aset yang hilang, service worker tidak di-cache', () => {
    const rewrite = new RegExp(`^${rootConfig.rewrites[0].source}$`);
    expect(rewrite.test('/proyek/apa-saja')).toBe(true);
    expect(rewrite.test('/assets/index-abc123.js')).toBe(false);
    expect(rewrite.test('/sw.js')).toBe(false);
    const swRule = rootConfig.headers.find((rule) => rule.source === '/sw.js');
    expect(swRule.headers[0].value).toContain('no-cache');
  });

  it('aturan database hanya membuka akar milik aplikasi & membekukan data lama', () => {
    const { rules } = JSON.parse(read('database.rules.json'));
    expect(rules['.read']).toBe(false);
    expect(rules['.write']).toBe(false);
    expect(rules.sr_studio_v3).toEqual({ '.read': true, '.write': true });
    expect(rules.sr_studio_library).toEqual({ '.read': true, '.write': false });
  });
});
