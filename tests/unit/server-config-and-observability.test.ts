import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { verifyAdminPassword } from '../../src/lib/server/admin/password';
import { loadServerConfig } from '../../src/lib/server/config';
import { createSafeDiagnostic, safeStaticDiagnostic } from '../../src/lib/server/safe-diagnostics';

const PASSWORD_HASH = 'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg';
const SESSION_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';

function productionEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'production',
    CANONICAL_SITE_ORIGIN: 'https://Public.Example.test/',
    ADMIN_PASSWORD_HASH: PASSWORD_HASH,
    ADMIN_SESSION_SECRET_B64: SESSION_SECRET,
    WHATSAPP_DISPATCH_ENABLED: 'false',
    ...overrides,
  };
}

function runPasswordHashUtility(input: string, arguments_: string[] = []): Promise<Readonly<{ code: number | null; stdout: string; stderr: string }>> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, ['scripts/generate-admin-password-hash.mjs', ...arguments_], {
      cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolveResult({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

const DOCUMENTED_ENVIRONMENT_NAMES = [
  'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ADMIN_PASSWORD_HASH', 'ADMIN_SESSION_SECRET_B64', 'CANONICAL_SITE_ORIGIN',
  'WHATSAPP_DISPATCH_ENABLED', 'WHATSAPP_PRIVATE_MEDIA_ENABLED', 'ADMIN_MESSAGE_RECIPIENT_HMAC_SECRET_B64',
  'EVOLUTION_API_BASE_URL', 'EVOLUTION_API_INSTANCE', 'EVOLUTION_API_KEY',
  'EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE', 'EVOLUTION_API_AUTH_HEADER', 'EVOLUTION_API_AUTH_SCHEME',
  'EVOLUTION_API_DESTINATION_FIELD_PATH', 'EVOLUTION_API_MEDIA_URL_FIELD_PATH', 'EVOLUTION_API_FILENAME_FIELD_PATH',
  'EVOLUTION_API_MIME_TYPE_FIELD_PATH', 'EVOLUTION_API_CAPTION_FIELD_PATH', 'EVOLUTION_API_MEDIA_KIND_FIELD_PATH',
  'EVOLUTION_API_MEDIA_KIND_VALUE', 'EVOLUTION_API_DESTINATION_FORMAT', 'EVOLUTION_API_ACCEPTED_HTTP_STATUSES',
  'EVOLUTION_API_SUCCESS_MODE', 'EVOLUTION_API_RESULT_FIELD_PATH', 'EVOLUTION_API_ACCEPTED_VALUES',
  'EVOLUTION_API_MEDIA_REJECTED_VALUES', 'EVOLUTION_API_URL_ONLY_VALUES', 'EVOLUTION_API_MESSAGE_ID_PATH',
  'EVOLUTION_API_IDEMPOTENCY_HEADER', 'EVOLUTION_API_TIMEOUT_MS', 'EVOLUTION_API_VALIDATED_PROFILE_SHA256',
  'EVOLUTION_API_PRIVATE_MEDIA_VALIDATED_PROFILE_SHA256',
] as const;

describe('server configuration and observability', () => {
  it('canonicalizes a configured production origin while keeping admin, database, and dispatch readiness independent', () => {
    const config = loadServerConfig(productionEnvironment());

    expect(config.signup).toEqual({ kind: 'ready', canonicalSiteOrigin: 'https://public.example.test' });
    expect(config.admin).toEqual({ kind: 'ready' });
    expect(config.database).toEqual({ kind: 'blocked', reason: 'database-credentials-invalid' });
    expect(config.whatsappDispatch).toEqual({ kind: 'blocked', reason: 'dispatch-disabled' });
  });

  it.each(['https://example.test/path', 'https://example.test/%2e', 'https://example.test?', 'https://example.test#', 'https://user@example.test'])
  ('fails closed for an unsafe production canonical origin %s', (origin) => {
    expect(loadServerConfig(productionEnvironment({ CANONICAL_SITE_ORIGIN: origin })).signup)
      .toEqual({ kind: 'blocked', reason: 'canonical-site-origin-invalid' });
  });

  it('permits only an explicitly injected local fallback outside production', () => {
    expect(loadServerConfig({ NODE_ENV: 'test', WHATSAPP_DISPATCH_ENABLED: 'false' }, { fallbackOrigin: 'http://localhost:4321' }).signup)
      .toEqual({ kind: 'ready', canonicalSiteOrigin: 'http://localhost:4321' });
    expect(loadServerConfig({ NODE_ENV: 'production', WHATSAPP_DISPATCH_ENABLED: 'false' }, { fallbackOrigin: 'http://localhost:4321' }).signup)
      .toEqual({ kind: 'blocked', reason: 'canonical-site-origin-invalid' });
  });

  it('keeps public signup available when only admin or provider configuration is missing', () => {
    const config = loadServerConfig(productionEnvironment({
      ADMIN_PASSWORD_HASH: undefined, ADMIN_SESSION_SECRET_B64: undefined, WHATSAPP_DISPATCH_ENABLED: 'true',
    }));

    expect(config.signup).toEqual({ kind: 'ready', canonicalSiteOrigin: 'https://public.example.test' });
    expect(config.admin).toEqual({ kind: 'blocked', reason: 'admin-credentials-invalid' });
    expect(config.whatsappDispatch).toEqual({ kind: 'blocked', reason: 'invalid-profile' });
  });

  it('serializes only allowlisted runtime diagnostic fields and static safe messages', () => {
    const tainted = 'Bearer secret; cookie=csrf; Ana +5491123456789 203.0.113.2 raw provider body';
    const record = createSafeDiagnostic({
      event: 'receipt-dispatch', requestId: 'request_123', registrationId: 'registration_123', attemptId: 'attempt_123',
      outcome: 'uncertain', durationMs: 42, httpStatus: 503, errorCode: 'PROVIDER_SERVER',
      headers: { authorization: tainted }, phone: tainted, name: tainted, body: tainted, error: new Error(tainted),
    });

    expect(record).toEqual({
      event: 'receipt-dispatch', requestId: 'request_123', registrationId: 'registration_123', attemptId: 'attempt_123',
      outcome: 'uncertain', durationMs: 42, httpStatus: 503, errorCode: 'PROVIDER_SERVER',
    });
    expect(JSON.stringify(record)).not.toContain(tainted);
    expect(safeStaticDiagnostic('PROVIDER_SERVER')).toBe('El proveedor no está disponible.');
  });

  it('generates a bounded stdin-only hash without exposing the supplied fixture', async () => {
    const fixturePassword = 'non-production-fixture-password';
    const generated = await runPasswordHashUtility(fixturePassword);
    const encodedHash = generated.stdout.trim();

    expect(generated).toEqual(expect.objectContaining({ code: 0, stderr: '' }));
    expect(encodedHash).toMatch(/^scrypt\$v1\$N=32768,r=8,p=1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
    await expect(verifyAdminPassword(fixturePassword, encodedHash)).resolves.toBe(true);

    for (const rejected of [
      await runPasswordHashUtility('', [`--password=${fixturePassword}`]),
      await runPasswordHashUtility('\n'),
      await runPasswordHashUtility(`${fixturePassword}\nsecond-value\n`),
      await runPasswordHashUtility(`${'a'.repeat(1025)}\n`),
    ]) {
      expect(rejected.code).toBe(1);
      expect(rejected.stdout).toBe('');
      expect(rejected.stderr).not.toContain(fixturePassword);
    }
  });

  it('accepts one final CRLF delimiter without treating it as password content', async () => {
    const fixturePassword = 'non-production-crlf-fixture';
    const generated = await runPasswordHashUtility(`${fixturePassword}\r\n`);

    expect(generated).toEqual(expect.objectContaining({ code: 0, stderr: '' }));
    await expect(verifyAdminPassword(fixturePassword, generated.stdout.trim())).resolves.toBe(true);
  });

  it('declares only real server variables and delivery headers without broad cache restrictions', async () => {
    const [environmentExample, vercelJson, middleware] = await Promise.all([
      readFile(resolve(process.cwd(), 'environment.example'), 'utf8'),
      readFile(resolve(process.cwd(), 'vercel.json'), 'utf8'),
      readFile(resolve(process.cwd(), 'src/middleware.ts'), 'utf8'),
    ]);
    const environment = new Map(environmentExample.split('\n').flatMap((line) => {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
      return match ? [[match[1], match[2]]] : [];
    }));
    const headers = JSON.parse(vercelJson) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
    const globalHeaders = headers.headers.find((rule) => rule.source === '/(.*)')?.headers ?? [];
    const v1PdfHeaders = headers.headers.find((rule) => rule.source === '/documentos/bases-y-categorias/borrador-2026-09-v1.pdf')?.headers ?? [];
    const v2PdfHeaders = headers.headers.find((rule) => rule.source === '/documentos/bases-y-categorias/borrador-2026-09-v2.pdf')?.headers ?? [];
    const v3PdfHeaders = headers.headers.find((rule) => rule.source === '/documentos/bases-y-categorias/borrador-2026-09-v3.pdf')?.headers ?? [];
    const currentPdfHeaders = headers.headers.find((rule) => rule.source === '/documentos/bases-y-categorias/bases-2026-09-v1.pdf')?.headers ?? [];

    expect([...environment.keys()]).toEqual(DOCUMENTED_ENVIRONMENT_NAMES);
    expect(environment.get('WHATSAPP_DISPATCH_ENABLED')).toBe('false');
    expect(environment.get('WHATSAPP_PRIVATE_MEDIA_ENABLED')).toBe('false');
    expect(environment.has('ADMIN_THROTTLE_SECRET')).toBe(false);
    expect(globalHeaders).toEqual(expect.arrayContaining([
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
    ]));
    expect(globalHeaders.find((header) => header.key === 'Cache-Control')).toBeUndefined();
    for (const pdfHeaders of [v1PdfHeaders, v2PdfHeaders, v3PdfHeaders, currentPdfHeaders]) {
      expect(pdfHeaders).toEqual(expect.arrayContaining([
        { key: 'Content-Type', value: 'application/pdf' },
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ]));
    }
    expect(middleware).toContain("'Cache-Control': 'private, no-store'");
    expect(middleware).toContain("'X-Frame-Options': 'DENY'");
    expect(middleware).toContain("const API_REFERRER_POLICY = 'no-referrer'");
    expect(middleware).toContain("const HTML_REFERRER_POLICY = 'same-origin'");
  });

  it('links local setup to canonical safe operations instead of a two-variable migration shortcut', async () => {
    const readme = await readFile(resolve(process.cwd(), 'README.md'), 'utf8');
    const earlySetup = readme.slice(readme.indexOf('## Local setup'), readme.indexOf('## Deployment'));
    expect(earlySetup).toContain('[Operación segura](#operación-segura)');
    expect(earlySetup).not.toContain('set a Turso database URL and auth token');
    expect(earlySetup).not.toContain('| `TURSO_AUTH_TOKEN` | Server-only Turso authentication token |');
    expect(earlySetup).toContain('take a backup or branch');
    expect(earlySetup).toContain('explicitly selected target');
  });

  it('documents complete safe deployment and the tested Node 22 runtime', async () => {
    const [readme, packageJson] = await Promise.all([
      readFile(resolve(process.cwd(), 'README.md'), 'utf8'),
      readFile(resolve(process.cwd(), 'package.json'), 'utf8'),
    ]);

    expect(readme).not.toContain('Import the repository into Vercel, configure the two environment variables, run `pnpm migrate` against the production database once, and deploy.');
    expect(readme).toContain('[Operación segura](#operación-segura)');
    expect(readme).toContain('explicitly selected target');
    expect(readme).toContain('Do not deploy with a partial configuration.');
    expect(readme).toContain('Node.js 22.x is the tested production runtime');
    expect((JSON.parse(packageJson) as { engines: { node: string } }).engines.node).toBe('22.x');
  });

  it('keeps deployment guidance on the complete configuration and confirmed migration target', async () => {
    const readme = await readFile(resolve(process.cwd(), 'README.md'), 'utf8');
    const deployment = readme.slice(readme.indexOf('## Deployment'), readme.indexOf('## Data flow'));

    expect(deployment).toContain('Configure every listed server variable in Vercel');
    expect(deployment).toContain('`WHATSAPP_DISPATCH_ENABLED=false` for preview and local environments');
    expect(deployment).toContain('select and confirm the intended database target');
    expect(deployment).toContain('take its backup or branch');
  });
});
