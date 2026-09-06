import type { IncomingMessage } from 'node:http';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';

import { NodeApp } from 'astro/app/node';
import { describe, expect, it, vi } from 'vitest';

import astroConfig from '../../astro.config.mjs';
import { issuePreauthProof } from '../../src/lib/server/admin/preauth-csrf';
import { createAdminLoginPost } from '../../src/pages/api/admin/login';
import { createAdminMiddleware } from '../../src/middleware';

const CANONICAL_ORIGIN = 'https://batalladebarberos.com.ar';
const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const PASSWORD_HASH = 'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg';
const NOW = new Date('2026-09-05T12:00:00.000Z');

function incoming(path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}): IncomingMessage {
  const request = Readable.from(init.body ? [init.body] : []);
  return Object.assign(request, {
    url: path,
    method: init.method ?? 'GET',
    headers: init.headers ?? {},
    socket: Object.assign(new EventEmitter(), { remoteAddress: '127.0.0.1' }),
  }) as unknown as IncomingMessage;
}

function createVercelRequest(path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  const headers = {
    host: 'batalladebarberos.com.ar',
    'x-forwarded-host': 'batalladebarberos.com.ar',
    'x-forwarded-proto': 'https',
    'x-forwarded-port': '443',
    ...init.headers,
  };
  return NodeApp.createRequest(incoming(path, { ...init, headers }), {
    allowedDomains: astroConfig.security?.allowedDomains,
  });
}

async function adminRedirect(request: Request) {
  return createAdminMiddleware({ sessionSecretB64: SECRET })(
    { request, url: new URL(request.url), locals: {} },
    async () => new Response('unexpected'),
  );
}

describe('Vercel forwarded production host boundary', () => {
  it('keeps the canonical host through NodeApp conversion for admin redirects and login origin checks', async () => {
    const adminRequest = createVercelRequest('/admin');
    expect(adminRequest.url).toBe(`${CANONICAL_ORIGIN}/admin`);
    const redirect = await adminRedirect(adminRequest);
    expect(redirect.headers.get('location')).toBe(`${CANONICAL_ORIGIN}/admin/login`);

    const proof = issuePreauthProof({ sessionSecretB64: SECRET, now: () => NOW, randomBytes: () => Buffer.alloc(32, 7) });
    if (!proof) throw new Error('Expected test proof.');
    const body = new URLSearchParams({ password: 'wrong password', preauth: proof.value }).toString();
    const loginRequest = createVercelRequest('/api/admin/login', {
      method: 'POST', body, headers: {
        origin: CANONICAL_ORIGIN,
        cookie: `__Host-bdb_admin_preauth=${proof.value}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
    });
    const throttle = {
      precheck: vi.fn(async () => ({ allowed: true as const, retryAfterSeconds: 0 as const })),
      recordFailure: vi.fn(async () => ({ allowed: true as const, retryAfterSeconds: 0 as const })),
      recordSuccess: vi.fn(async () => ({ allowed: true as const, retryAfterSeconds: 0 as const })),
    };
    const login = await createAdminLoginPost({
      database: {} as never, passwordHash: PASSWORD_HASH, sessionSecretB64: SECRET,
      production: true, now: () => NOW, throttle,
    })(loginRequest);
    expect(login.status).toBe(401);
    expect(throttle.precheck).toHaveBeenCalledOnce();
  });

  it.each([
    ['host', { host: 'attacker.example', 'x-forwarded-host': 'attacker.example' }, 'https://localhost/admin/login'],
    ['protocol', { host: 'attacker.example', 'x-forwarded-host': 'attacker.example', 'x-forwarded-proto': 'javascript' }, 'http://localhost/admin/login'],
    ['port', { 'x-forwarded-host': 'attacker.example:444', 'x-forwarded-port': '444' }, `${CANONICAL_ORIGIN}/admin/login`],
  ])('does not reflect a spoofed %s variant into redirects', async (_variant, headers, expectedLocation) => {
    const request = createVercelRequest('/admin', { headers });
    const redirect = await adminRedirect(request);
    expect(redirect.headers.get('location')).toBe(expectedLocation);
  });
});
