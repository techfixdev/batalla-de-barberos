import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';
import { signAdminSessionCookie } from '../../src/lib/server/admin/session-crypto';
import { createAdminSessionService } from '../../src/lib/server/admin/session-service';
import { createAdminMiddleware } from '../../src/middleware';

const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const databases: Array<ReturnType<typeof createClient>> = [];

type MiddlewareContext = {
  request: Request;
  url: URL;
  locals: Record<string, unknown>;
};

function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  return client;
}

function context(path: string, cookie?: string): MiddlewareContext {
  const url = new URL(path, 'https://admin.example.test');
  return {
    request: new Request(url, { headers: cookie ? { Cookie: `bdb_admin=${cookie}` } : {} }),
    url,
    locals: {},
  };
}

function next(status = 200) {
  return vi.fn(async () => new Response(status === 204 ? null : 'protected content', { status, headers: { 'X-Original': 'preserved' } }));
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('admin route security', () => {
  it('redirects unauthenticated HTML and denies APIs without calling next or exposing data', async () => {
    const resolveSession = vi.fn(async () => null);
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession });
    const htmlNext = next();
    const apiNext = next();

    const html = await middleware(context('/admin'), htmlNext);
    const api = await middleware(context('/api/admin/registrations'), apiNext);

    expect(html.status).toBe(302);
    expect(html.headers.get('location')).toBe('https://admin.example.test/admin/login');
    expect(await html.text()).not.toContain('protected content');
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ message: 'No autorizado.' });
    expect(html.headers.get('referrer-policy')).toBe('same-origin');
    expect(api.headers.get('referrer-policy')).toBe('no-referrer');
    expect(htmlNext).not.toHaveBeenCalled();
    expect(apiNext).not.toHaveBeenCalled();
  });

  it('leaves only exact login paths and public paths untouched without resolving a session', async () => {
    const resolveSession = vi.fn(async () => ({ id: 'session-1', expiresAt: '2026-04-19T08:00:00.000Z' }));
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession });

    for (const path of ['/admin/login', '/api/admin/login', '/participacion']) {
      const passThrough = next(204);
      const response = await middleware(context(path), passThrough);
      expect(response.status).toBe(204);
      expect(response.headers.get('cache-control')).toBeNull();
      expect(passThrough).toHaveBeenCalledOnce();
    }
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it('fails closed for login suffixes, encoded paths, invalid cookies, and session-store errors', async () => {
    const resolveSession = vi.fn(async () => { throw new Error('store unavailable'); });
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession });

    for (const path of ['/admin/login/', '/admin/login-anything', '/admin/%6cogin', '/api/admin/login/']) {
      const passThrough = next();
      const response = await middleware(context(path, 'tampered'), passThrough);
      expect([302, 401]).toContain(response.status);
      expect(passThrough).not.toHaveBeenCalled();
    }
    expect(resolveSession).not.toHaveBeenCalled();
    const signedCookie = signAdminSessionCookie({
      sessionToken: Buffer.alloc(32, 3).toString('base64url'), csrfToken: Buffer.alloc(32, 4).toString('base64url'),
    }, SECRET)!;
    const outage = await middleware(context('/api/admin/registrations', signedCookie), next());
    expect(outage.status).toBe(401);
    expect(resolveSession).toHaveBeenCalledExactlyOnceWith(signedCookie);
  });

  it('accepts a separately signed cookie through the injected session boundary only after signature validation', async () => {
    const cookie = signAdminSessionCookie({
      sessionToken: Buffer.alloc(32, 1).toString('base64url'), csrfToken: Buffer.alloc(32, 2).toString('base64url'),
    }, SECRET)!;
    const resolveSession = vi.fn(async () => ({ id: 'session-2', expiresAt: '2026-04-19T08:00:00.000Z' }));
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession });
    const request = context('/api/admin/registrations', cookie);

    const response = await middleware(request, next());
    expect(response.status).toBe(200);
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(resolveSession).toHaveBeenCalledExactlyOnceWith(cookie);
    expect(request.locals).toEqual({ adminSession: { id: 'session-2', expiresAt: '2026-04-19T08:00:00.000Z' }, adminCsrfToken: Buffer.alloc(32, 2).toString('base64url') });
  });

  it('uses a real migrated local session service, places only allowlisted data in locals, and protects successful responses', async () => {
    const client = database();
    await migrate(client);
    const service = createAdminSessionService({ database: client, sessionSecretB64: SECRET, now: () => new Date('2026-04-19T00:00:00.000Z') });
    const created = await service.create();
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession: service.resolve });
    const protectedNext = next();
    const request = context('/admin', created.cookie);

    const response = await middleware(request, protectedNext);

    expect(response.status).toBe(200);
    expect(request.locals).toMatchObject({ adminSession: { id: expect.any(String), expiresAt: '2026-04-19T08:00:00.000Z' }, adminCsrfToken: expect.any(String) });
    expect(JSON.stringify(request.locals)).not.toContain(created.cookie);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('content-security-policy')).toBe("frame-ancestors 'none'");
    expect(response.headers.get('referrer-policy')).toBe('same-origin');
    expect(response.headers.get('x-original')).toBe('preserved');
  });

  it('denies encoded, double-encoded, and encoded-login admin paths without changing valid encoded public paths', async () => {
    const resolveSession = vi.fn(async () => ({ id: 'session-encoded', expiresAt: '2026-04-19T08:00:00.000Z' }));
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession });

    for (const [path, status] of [
      ['/%61dmin', 302], ['/api/%61dmin', 401], ['/admin%2Fregistrations', 302],
      ['/api%2Fadmin%2Fregistrations', 401], ['/admin%252Fregistrations', 302],
      ['/admin%2Flogin', 302], ['/api%2Fadmin%2Flogin', 401],
    ] as const) {
      const passThrough = next();
      expect((await middleware(context(path), passThrough)).status).toBe(status);
      expect(passThrough).not.toHaveBeenCalled();
    }

    const publicNext = next(204);
    expect((await middleware(context('/%70articipacion'), publicNext)).status).toBe(204);
    expect(publicNext).toHaveBeenCalledOnce();
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it('fails closed with security headers before session lookup for malformed or over-decoded paths', async () => {
    const resolveSession = vi.fn(async () => ({ id: 'session-invalid-path', expiresAt: '2026-04-19T08:00:00.000Z' }));
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession });

    for (const path of [
      '/admin%C0%AFregistrations', '/api/admin%C0%AFregistrations', '/%252561dmin',
      '/api%25252Fadmin%25252Fregistrations', '/%', '/%C0%AF',
    ]) {
      const passThrough = next();
      const response = await middleware(context(path), passThrough);
      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('referrer-policy')).toBe('same-origin');
      expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
      expect(await response.text()).not.toContain('protected content');
      expect(passThrough).not.toHaveBeenCalled();
    }
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it('appends an independent frame-ancestors policy without rewriting existing CSP directives', async () => {
    const cookie = signAdminSessionCookie({
      sessionToken: Buffer.alloc(32, 5).toString('base64url'), csrfToken: Buffer.alloc(32, 6).toString('base64url'),
    }, SECRET)!;
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession: async () => ({ id: 'session-csp', expiresAt: '2026-04-19T08:00:00.000Z' }) });
    const response = await middleware(context('/admin', cookie), async () => new Response('protected content', {
      headers: { 'Content-Security-Policy': "default-src 'self'; script-src 'nonce-test'; frame-ancestors https://trusted.example" },
    }));

    expect(response.headers.get('content-security-policy')).toBe("default-src 'self'; script-src 'nonce-test'; frame-ancestors https://trusted.example, frame-ancestors 'none'");
  });

  it('appends frame ancestors none to a CSP that lacks it', async () => {
    const cookie = signAdminSessionCookie({
      sessionToken: Buffer.alloc(32, 7).toString('base64url'), csrfToken: Buffer.alloc(32, 8).toString('base64url'),
    }, SECRET)!;
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession: async () => ({ id: 'session-csp-default', expiresAt: '2026-04-19T08:00:00.000Z' }) });
    const response = await middleware(context('/admin', cookie), async () => new Response('protected content', {
      headers: { 'Content-Security-Policy': "default-src 'self'" },
    }));

    expect(response.headers.get('content-security-policy')).toBe("default-src 'self', frame-ancestors 'none'");
  });

  it('denies tampered, expired, and revoked real session cookies with the same protected headers', async () => {
    const client = database();
    await migrate(client);
    let now = new Date('2026-04-19T00:00:00.000Z');
    const service = createAdminSessionService({ database: client, sessionSecretB64: SECRET, now: () => now });
    const created = await service.create();
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession: service.resolve });

    for (const cookie of [`${created.cookie}tampered`, created.cookie]) {
      if (cookie === created.cookie) now = new Date('2026-04-19T08:00:00.000Z');
      const response = await middleware(context('/api/admin/registrations', cookie), next());
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    now = new Date('2026-04-19T00:00:00.000Z');
    expect(await service.revoke(created.cookie)).toBe(true);
    expect((await middleware(context('/admin', created.cookie), next())).status).toBe(302);
  });
});

describe('middleware authenticated form locals', () => {
  it('exposes only the verified csrf field after a live session resolves', async () => {
    const sessionToken = Buffer.alloc(32, 12).toString('base64url');
    const csrfToken = Buffer.alloc(32, 13).toString('base64url');
    const signed = signAdminSessionCookie({ sessionToken, csrfToken }, SECRET)!;
    const request = context('/admin', signed);
    const response = await createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession: async () => ({ id: 'session-form-local', expiresAt: '2026-04-19T08:00:00.000Z' }) })(request, next());
    expect(response.status).toBe(200);
    expect(request.locals).toEqual({ adminSession: { id: 'session-form-local', expiresAt: '2026-04-19T08:00:00.000Z' }, adminCsrfToken: csrfToken });
    expect(JSON.stringify(request.locals)).not.toContain(signed);
    expect(JSON.stringify(request.locals)).not.toContain(sessionToken);
  });
});
