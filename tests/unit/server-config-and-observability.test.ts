import { describe, expect, it } from 'vitest';

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
});
