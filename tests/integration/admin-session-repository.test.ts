import { createHash } from 'node:crypto';

import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';
import { signAdminSessionCookie, verifyAdminSessionCookie } from '../../src/lib/server/admin/session-crypto';
import { createAdminSessionService } from '../../src/lib/server/admin/session-service';

const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const databases: Array<ReturnType<typeof createClient>> = [];

function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  return client;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('admin session persistence', () => {
  it('persists only independent SHA-256 token hashes before returning an eight-hour session', async () => {
    const client = database();
    await migrate(client);
    const now = new Date('2026-04-19T00:00:00.000Z');
    const service = createAdminSessionService({ database: client, sessionSecretB64: SECRET, now: () => now });

    const created = await service.create();
    const cookie = verifyAdminSessionCookie(created.cookie, SECRET);
    const rows = await client.execute('SELECT token_hash, csrf_hash, created_at, expires_at, last_seen_at FROM admin_sessions');

    expect(cookie).toEqual({ valid: true, tokens: expect.any(Object) });
    if (!cookie.valid) throw new Error('Expected a signed test cookie.');
    expect(cookie.tokens.sessionToken).not.toBe(cookie.tokens.csrfToken);
    expect(rows.rows).toEqual([{
      token_hash: sha256(cookie.tokens.sessionToken), csrf_hash: sha256(cookie.tokens.csrfToken),
      created_at: now.toISOString(), expires_at: '2026-04-19T08:00:00.000Z', last_seen_at: now.toISOString(),
    }]);
    expect(JSON.stringify(rows.rows)).not.toContain(cookie.tokens.sessionToken);
    expect(JSON.stringify(rows.rows)).not.toContain(cookie.tokens.csrfToken);
  });

  it('fails closed for expired, missing, revoked, and CSRF-hash-mismatched signed sessions', async () => {
    const client = database();
    await migrate(client);
    let now = new Date('2026-04-19T00:00:00.000Z');
    const service = createAdminSessionService({ database: client, sessionSecretB64: SECRET, now: () => now });
    const first = await service.create();
    const second = await service.create();
    const firstCookie = verifyAdminSessionCookie(first.cookie, SECRET);
    const secondCookie = verifyAdminSessionCookie(second.cookie, SECRET);
    if (!firstCookie.valid || !secondCookie.valid) throw new Error('Expected signed test cookies.');

    expect(await service.resolve(first.cookie)).toMatchObject({ expiresAt: '2026-04-19T08:00:00.000Z' });
    const mismatchedCsrfCookie = signAdminSessionCookie({
      sessionToken: firstCookie.tokens.sessionToken, csrfToken: secondCookie.tokens.csrfToken,
    }, SECRET);
    expect(await service.resolve(mismatchedCsrfCookie!)).toBeNull();
    expect(await service.resolve(signAdminSessionCookie({
      sessionToken: Buffer.alloc(32, 1).toString('base64url'), csrfToken: firstCookie.tokens.csrfToken,
    }, SECRET)!)).toBeNull();

    expect(await service.revoke(first.cookie)).toBe(true);
    expect(await service.resolve(first.cookie)).toBeNull();
    expect(await service.resolve(second.cookie)).toMatchObject({ expiresAt: '2026-04-19T08:00:00.000Z' });
    now = new Date('2026-04-19T08:00:00.000Z');
    expect(await service.resolve(second.cookie)).toBeNull();
  });

  it('verifies the signature before lookup and fails closed when the session store is unavailable', async () => {
    const client = database();
    await migrate(client);
    const service = createAdminSessionService({ database: client, sessionSecretB64: SECRET, now: () => new Date('2026-04-19T00:00:00.000Z') });
    const created = await service.create();
    const execute = vi.spyOn(client, 'execute');

    expect(await service.resolve(`${created.cookie}tampered`)).toBeNull();
    expect(execute).not.toHaveBeenCalled();
    execute.mockRejectedValueOnce(new Error('store unavailable'));
    expect(await service.resolve(created.cookie)).toBeNull();
  });
});
