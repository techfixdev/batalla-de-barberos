import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';
import { createAdminLogout } from '../../src/pages/api/admin/logout';
import { issuePreauthProof } from '../../src/lib/server/admin/preauth-csrf';
import { signAdminSessionCookie, verifyAdminSessionCookie } from '../../src/lib/server/admin/session-crypto';
import { createAdminSessionService } from '../../src/lib/server/admin/session-service';
import { sha256 } from '../../src/lib/server/admin/session-repository';
import { createAdminLoginPost } from '../../src/pages/api/admin/login';
import { createAdminMiddleware } from '../../src/middleware';

const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const PASSWORD_HASH = 'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg';
const NOW = new Date('2026-09-05T12:00:00.000Z');
const databases: ReturnType<typeof createClient>[] = [];

async function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  await migrate(client);
  return client;
}

function cookie(response: Response) {
  return response.headers.getSetCookie().find((value) => value.startsWith('bdb_admin='))!.split(';', 1)[0]!.slice('bdb_admin='.length);
}

function request(cookieValue: string, csrf?: string, origin = 'https://admin.example.test', method = 'POST', production = false) {
  return new Request('https://admin.example.test/api/admin/logout', {
    method, headers: { Cookie: `${production ? '__Host-bdb_admin' : 'bdb_admin'}=${cookieValue}`, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    ...(method === 'POST' ? { body: new URLSearchParams(csrf === undefined ? {} : { csrf }).toString() } : {}),
  });
}

function protectedRequest(cookieValue: string) {
  return { request: new Request('https://admin.example.test/api/admin/registrations', { headers: { Cookie: `bdb_admin=${cookieValue}` } }), url: new URL('https://admin.example.test/api/admin/registrations'), locals: {} };
}

async function login(client: Awaited<ReturnType<typeof database>>) {
  const proof = issuePreauthProof({ sessionSecretB64: SECRET, now: () => NOW, randomBytes: () => Buffer.alloc(32, 7) })!;
  const response = await createAdminLoginPost({ database: client, passwordHash: PASSWORD_HASH, sessionSecretB64: SECRET, now: () => NOW })(new Request('https://admin.example.test/api/admin/login', {
    method: 'POST', headers: { Cookie: `bdb_admin_preauth=${proof.value}`, Origin: 'https://admin.example.test', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password: 'correct horse battery staple', preauth: proof.value }).toString(),
  }));
  return cookie(response);
}

function failingDatabase(client: Client, failure: 'first lookup' | 'second lookup' | 'revoke'): Client {
  let lookups = 0;
  return new Proxy(client, { get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (property !== 'execute' || typeof value !== 'function') return value;
    return async (statement: string | { sql: string; args?: unknown[] }) => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      if (sql.startsWith('SELECT id, token_hash')) lookups += 1;
      if ((failure === 'first lookup' && lookups === 1) || (failure === 'second lookup' && lookups === 2)
        || (failure === 'revoke' && sql.startsWith('UPDATE admin_sessions SET revoked_at'))) throw new Error('store unavailable');
      return target.execute(statement as Parameters<Client['execute']>[0]);
    };
  } }) as Client;
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('authenticated CSRF logout', () => {
  it('rejects bad field, signed, stored, and origin proofs before mutation and leaves GET harmless', async () => {
    const client = await database();
    const sessions = createAdminSessionService({ database: client, sessionSecretB64: SECRET, now: () => NOW });
    const active = await sessions.create();
    const decoded = verifyAdminSessionCookie(active.cookie, SECRET);
    const other = await sessions.create();
    const otherDecoded = verifyAdminSessionCookie(other.cookie, SECRET);
    if (!decoded.valid || !otherDecoded.valid) throw new Error('Expected signed test cookies.');
    const storedMismatch = signAdminSessionCookie({ sessionToken: decoded.tokens.sessionToken, csrfToken: otherDecoded.tokens.csrfToken }, SECRET)!;
    const logout = createAdminLogout({ database: client, sessionSecretB64: SECRET, now: () => NOW });

    for (const input of [request(active.cookie), request(active.cookie, 'invalid'), request(`${active.cookie}tampered`, decoded.tokens.csrfToken), request(storedMismatch, otherDecoded.tokens.csrfToken), request(active.cookie, decoded.tokens.csrfToken, 'https://evil.example.test')]) {
      expect((await logout(input)).status).toBe(403);
      expect(await sessions.resolve(active.cookie)).not.toBeNull();
    }
    expect((await logout(request(active.cookie, decoded.tokens.csrfToken, undefined, 'GET'))).status).toBe(405);
    expect(await sessions.resolve(active.cookie)).not.toBeNull();
    const production = await createAdminLogout({ database: client, sessionSecretB64: SECRET, production: true, now: () => NOW })(request(active.cookie, decoded.tokens.csrfToken, undefined, 'POST', true));
    expect(production.headers.getSetCookie().join('\n')).toContain('__Host-bdb_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    const outage = createAdminLogout({ sessionSecretB64: SECRET, repository: { findByTokenHash: async () => { throw new Error('store unavailable'); } }, sessions: { resolve: async () => null, revoke: async () => false } });
    expect((await outage(request(active.cookie, decoded.tokens.csrfToken))).status).toBe(503);
  });

  it('returns 503 without expiring a valid cookie when each logout store operation fails', async () => {
    const client = await database();
    const sessions = createAdminSessionService({ database: client, sessionSecretB64: SECRET, now: () => NOW });
    const active = await sessions.create();
    const decoded = verifyAdminSessionCookie(active.cookie, SECRET);
    if (!decoded.valid) throw new Error('Expected signed test cookie.');

    for (const failure of ['first lookup', 'second lookup', 'revoke'] as const) {
      const response = await createAdminLogout({ database: failingDatabase(client, failure), sessionSecretB64: SECRET, now: () => NOW })(request(active.cookie, decoded.tokens.csrfToken));
      expect(response.status).toBe(503);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(await sessions.resolve(active.cookie)).not.toBeNull();
    }
  });

  it('keeps expired and revoked sessions unauthorized without clearing their cookies', async () => {
    const client = await database();
    const sessions = createAdminSessionService({ database: client, sessionSecretB64: SECRET, now: () => NOW });
    const expired = await sessions.create();
    const revoked = await sessions.create();
    const expiredProof = verifyAdminSessionCookie(expired.cookie, SECRET);
    const revokedProof = verifyAdminSessionCookie(revoked.cookie, SECRET);
    if (!expiredProof.valid || !revokedProof.valid) throw new Error('Expected signed test cookies.');
    await client.execute({ sql: 'UPDATE admin_sessions SET expires_at = ? WHERE token_hash = ?', args: ['2026-09-05T11:59:59.999Z', sha256(expiredProof.tokens.sessionToken)] });
    await sessions.revoke(revoked.cookie);

    for (const [value, proof] of [[expired.cookie, expiredProof], [revoked.cookie, revokedProof]] as const) {
      const response = await createAdminLogout({ database: client, sessionSecretB64: SECRET, now: () => NOW })(request(value, proof.tokens.csrfToken));
      expect(response.status).toBe(401);
      expect(response.headers.get('set-cookie')).toBeNull();
    }
  });

  it('uses local-db login, middleware, and awaited revocation to deny the old cookie without disclosure', async () => {
    const client = await database();
    const active = await login(client);
    const csrf = verifyAdminSessionCookie(active, SECRET);
    if (!csrf.valid) throw new Error('Expected signed session.');
    const sessions = createAdminSessionService({ database: client, sessionSecretB64: SECRET, now: () => NOW });
    const middleware = createAdminMiddleware({ sessionSecretB64: SECRET, resolveSession: sessions.resolve });
    expect((await middleware(protectedRequest(active), async () => new Response('protected'))).status).toBe(200);

    const logout = createAdminLogout({ database: client, sessionSecretB64: SECRET, now: () => NOW });
    const response = await logout(request(active, csrf.tokens.csrfToken));
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/admin/login');
    expect(response.headers.getSetCookie().join('\n')).toContain('bdb_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    expect((await client.execute({ sql: 'SELECT revoked_at FROM admin_sessions WHERE token_hash = ?', args: [sha256(csrf.tokens.sessionToken)] })).rows).toEqual([{ revoked_at: NOW.toISOString() }]);
    expect((await middleware(protectedRequest(active), async () => new Response('protected'))).status).toBe(401);
    expect((await logout(request(active, csrf.tokens.csrfToken))).status).toBe(401);
  });
});
