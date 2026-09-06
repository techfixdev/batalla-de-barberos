import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';
import { createAdminLoginPost, requestAddress } from '../../src/pages/api/admin/login';
import { issuePreauthProof } from '../../src/lib/server/admin/preauth-csrf';

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

function proof() {
  const issued = issuePreauthProof({ sessionSecretB64: SECRET, now: () => NOW, randomBytes: () => Buffer.alloc(32, 9) });
  if (!issued) throw new Error('Expected test proof.');
  return issued;
}

function request(fields: Record<string, string>, cookie?: string, options: RequestInit = {}) {
  const body = new URLSearchParams(fields).toString();
  const headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://admin.example.test', ...(cookie ? { Cookie: cookie } : {}) });
  new Headers(options.headers).forEach((value, name) => headers.set(name, value));
  return new Request('https://admin.example.test/api/admin/login', { ...options, method: 'POST', body, headers });
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('admin login route', () => {
  it('uses only the first forwarded address and otherwise falls back to the bounded unknown bucket', () => {
    expect(requestAddress(new Request('https://admin.example.test', { headers: { 'X-Forwarded-For': '192.0.2.10, 198.51.100.3' } }))).toBe('192.0.2.10');
    expect(requestAddress(new Request('https://admin.example.test'))).toBeUndefined();
  });

  it('rejects missing or cross-origin pre-auth proof before throttle, password, or session mutations', async () => {
    const client = await database();
    const throttle = { precheck: vi.fn(), recordFailure: vi.fn(), recordSuccess: vi.fn() };
    const sessions = { create: vi.fn() };
    const post = createAdminLoginPost({ database: client, passwordHash: PASSWORD_HASH, sessionSecretB64: SECRET, now: () => NOW, throttle, sessions });

    const preauth = proof();
    const missingOrigin = request({ password: 'wrong', preauth: preauth.value }, `bdb_admin_preauth=${preauth.value}`);
    missingOrigin.headers.delete('origin');
    for (const input of [
      request({ password: 'wrong' }),
      missingOrigin,
      request({ password: 'wrong', preauth: preauth.value }, `bdb_admin_preauth=${preauth.value}`, { headers: { Origin: 'null' } }),
      request({ password: 'wrong', preauth: preauth.value }, `bdb_admin_preauth=${preauth.value}`, { headers: { Origin: 'https://evil.example.test' } }),
    ]) {
      const response = await post(input);
      expect(response.status).toBe(403);
      expect(await response.text()).toBe('Solicitud no válida.');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(throttle.precheck).not.toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('uses the real migrated throttle/session services and issues a session only after proof, origin, password, and final success recording', async () => {
    const client = await database();
    const preauth = proof();
    const post = createAdminLoginPost({ database: client, passwordHash: PASSWORD_HASH, sessionSecretB64: SECRET, now: () => NOW });

    const wrong = await post(request({ password: 'wrong password', preauth: preauth.value }, `bdb_admin_preauth=${preauth.value}`));
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toBe('No se pudo iniciar sesión.');
    expect((await client.execute('SELECT failure_count FROM admin_login_throttle')).rows).toEqual([{ failure_count: 1 }, { failure_count: 1 }]);
    expect((await client.execute('SELECT id FROM admin_sessions')).rows).toEqual([]);

    const response = await post(request({ password: 'correct horse battery staple', preauth: preauth.value }, `bdb_admin_preauth=${preauth.value}`));
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/admin');
    expect(response.headers.getSetCookie().join('\n')).toContain('bdb_admin=');
    expect(response.headers.getSetCookie().join('\n')).toContain('bdb_admin_preauth=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    expect((await client.execute('SELECT id FROM admin_sessions')).rows).toHaveLength(1);
    expect((await client.execute('SELECT key_hash, failure_count FROM admin_login_throttle')).rows).toEqual([expect.objectContaining({ failure_count: 1 })]);
  });

  it('sets distinct production cookies after a matching hidden proof and HttpOnly cookie are verified', async () => {
    const client = await database();
    const preauth = proof();
    const post = createAdminLoginPost({ database: client, passwordHash: PASSWORD_HASH, sessionSecretB64: SECRET, production: true, now: () => NOW });

    const response = await post(request({ password: 'correct horse battery staple', preauth: preauth.value }, `__Host-bdb_admin_preauth=${preauth.value}`));
    const cookies = response.headers.getSetCookie().join('\n');
    expect(response.status).toBe(303);
    expect(cookies).toContain('__Host-bdb_admin=');
    expect(cookies).toContain('__Host-bdb_admin_preauth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
    expect(cookies).not.toContain('Domain=');
  });

  it('fails closed before throttle or session actions when the configured scrypt hash is malformed', async () => {
    const preauth = proof();
    for (const passwordHash of [
      'scrypt$v1$N=32768,r=8,p=1$not-base64$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg',
      'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$not-base64',
      'scrypt$v1$N=16384,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg',
    ]) {
      const throttle = { precheck: vi.fn(), recordFailure: vi.fn(), recordSuccess: vi.fn() };
      const sessions = { create: vi.fn() };
      const post = createAdminLoginPost({ database: {} as Client, passwordHash, sessionSecretB64: SECRET, now: () => NOW, throttle, sessions });
      expect((await post(request({ password: 'wrong password', preauth: preauth.value }, `bdb_admin_preauth=${preauth.value}`))).status).toBe(503);
      expect(throttle.precheck).not.toHaveBeenCalled();
      expect(throttle.recordFailure).not.toHaveBeenCalled();
      expect(sessions.create).not.toHaveBeenCalled();
    }
  });

  it('fails closed with static responses for expired proof, malformed form content, and missing server credentials', async () => {
    const client = await database();
    const expired = issuePreauthProof({ sessionSecretB64: SECRET, now: () => new Date(NOW.valueOf() - 11 * 60 * 1000), randomBytes: () => Buffer.alloc(32, 8) });
    const tampered = proof();
    const post = createAdminLoginPost({ database: client, passwordHash: PASSWORD_HASH, sessionSecretB64: SECRET, now: () => NOW });
    if (!expired) throw new Error('Expected expired test proof.');

    expect((await post(request({ password: 'correct horse battery staple', preauth: expired.value }, `bdb_admin_preauth=${expired.value}`))).status).toBe(403);
    expect((await post(request({ password: 'correct horse battery staple', preauth: `${tampered.value}x` }, `bdb_admin_preauth=${tampered.value}x`))).status).toBe(403);
    expect((await post(request({ password: 'wrong' }, undefined, { headers: { 'Content-Type': 'text/plain' } }))).status).toBe(400);
    expect((await createAdminLoginPost({ database: client })(request({ password: 'wrong' }))).status).toBe(503);
  });
});
