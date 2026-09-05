import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';
import { deriveLoginThrottleKeys } from '../../src/lib/server/admin/login-throttle-repository';
import { LOGIN_THROTTLE_DENIAL, createLoginThrottleService } from '../../src/lib/server/admin/login-throttle-service';

const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const databases: Array<ReturnType<typeof createClient>> = [];

function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  return client;
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('admin login throttle', () => {
  it('persists only HMAC address keys and blocks the fifth failure for the fixed window', async () => {
    const client = database();
    await migrate(client);
    const now = new Date('2026-04-19T00:01:20.000Z');
    const service = createLoginThrottleService({ database: client, sessionSecretB64: SECRET, now: () => now });

    for (let index = 0; index < 4; index += 1) expect(await service.recordFailure('203.0.113.9')).toMatchObject({ allowed: true });
    expect(await service.recordFailure('203.0.113.9')).toEqual({
      allowed: false, retryAfterSeconds: 820, message: LOGIN_THROTTLE_DENIAL, diagnostic: 'LOGIN_THROTTLED',
    });

    const keys = deriveLoginThrottleKeys('203.0.113.9', SECRET);
    const rows = await client.execute('SELECT key_hash FROM admin_login_throttle ORDER BY key_hash');
    expect(rows.rows).toEqual(expect.arrayContaining([{ key_hash: keys.address }, { key_hash: keys.global }]));
    expect(JSON.stringify(rows.rows)).not.toContain('203.0.113.9');
    expect(JSON.stringify(rows.rows)).not.toContain(SECRET);
  });

  it('keeps global failures separate, shares a bounded unknown bucket, and clears only a successful address', async () => {
    const client = database();
    await migrate(client);
    const now = new Date('2026-04-19T00:01:20.000Z');
    const service = createLoginThrottleService({ database: client, sessionSecretB64: SECRET, now: () => now });
    const address = '198.51.100.7';

    for (let index = 0; index < 4; index += 1) await service.recordFailure(address);
    expect(await service.recordSuccess(address)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await service.recordFailure(address)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    const keys = deriveLoginThrottleKeys(address, SECRET);
    const saved = await client.execute({ sql: 'SELECT key_hash, failure_count FROM admin_login_throttle WHERE key_hash = ?', args: [keys.global] });
    expect(saved.rows).toEqual([{ key_hash: keys.global, failure_count: 5 }]);

    const unknown = deriveLoginThrottleKeys(undefined, SECRET).address;
    expect(deriveLoginThrottleKeys('x'.repeat(129), SECRET).address).toBe(unknown);
    await service.recordFailure();
    await service.recordFailure('x'.repeat(129));
    expect((await client.execute({ sql: 'SELECT failure_count FROM admin_login_throttle WHERE key_hash = ?', args: [unknown] })).rows)
      .toEqual([{ failure_count: 2 }]);
    for (let index = 0; index < 52; index += 1) await service.recordFailure(`198.51.100.${index}`);
    expect(await service.precheck(address)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    await service.recordFailure('198.51.100.60');
    const globalDenied = await service.precheck(address);
    expect(globalDenied).toMatchObject({ allowed: false, message: LOGIN_THROTTLE_DENIAL, diagnostic: 'LOGIN_THROTTLED' });
    expect(globalDenied.retryAfterSeconds).toBe(820);
    const attacker = deriveLoginThrottleKeys('bdb:admin-login-throttle:v1:global', SECRET);
    expect(attacker.address).not.toBe(keys.global);
    expect(attacker.global).toBe(keys.global);
  });

  it('fails closed with static diagnostics when the throttle store is unavailable', async () => {
    const client = database();
    await migrate(client);
    const service = createLoginThrottleService({ database: client, sessionSecretB64: SECRET });
    const malformed = createLoginThrottleService({ database: client, sessionSecretB64: 'not-base64' });
    expect(await malformed.precheck('192.0.2.1')).toMatchObject({ allowed: false, diagnostic: 'THROTTLE_UNAVAILABLE' });
    expect(await malformed.recordFailure('192.0.2.1')).toMatchObject({ allowed: false, diagnostic: 'THROTTLE_UNAVAILABLE' });
    client.close();

    for (const decision of await Promise.all([service.precheck('192.0.2.1'), service.recordFailure('192.0.2.1'), service.recordSuccess('192.0.2.1')])) {
      expect(decision).toEqual({ allowed: false, retryAfterSeconds: 1, message: LOGIN_THROTTLE_DENIAL, diagnostic: 'THROTTLE_UNAVAILABLE' });
    }
  });

  it('makes concurrent threshold decisions atomic and expires exactly at the next fixed window', async () => {
    const client = database();
    await migrate(client);
    let now = new Date('2026-04-19T00:01:20.000Z');
    const service = createLoginThrottleService({ database: client, sessionSecretB64: SECRET, now: () => now });

    const decisions = await Promise.all(Array.from({ length: 5 }, () => service.recordFailure('192.0.2.8')));
    expect(decisions.every((decision) => !decision.allowed && decision.diagnostic === 'LOGIN_THROTTLED')).toBe(true);
    const keys = deriveLoginThrottleKeys('192.0.2.8', SECRET);
    expect((await client.execute({ sql: 'SELECT failure_count FROM admin_login_throttle WHERE key_hash = ?', args: [keys.address] })).rows)
      .toEqual([{ failure_count: 5 }]);
    now = new Date('2026-04-19T00:15:00.000Z');
    expect(await service.precheck('192.0.2.8')).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await service.recordFailure('192.0.2.8')).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it('does not clear an address after an allowed precheck is overtaken by a global block', async () => {
    const client = database();
    await migrate(client);
    const now = new Date('2026-04-19T00:01:20.000Z');
    const service = createLoginThrottleService({ database: client, sessionSecretB64: SECRET, now: () => now });
    const address = '192.0.2.80';

    await service.recordFailure(address);
    expect(await service.precheck(address)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    await Promise.all(Array.from({ length: 59 }, (_, index) => service.recordFailure(`198.51.100.${index}`)));

    expect(await service.recordSuccess(address)).toMatchObject({ allowed: false, diagnostic: 'LOGIN_THROTTLED', retryAfterSeconds: 820 });
    const keys = deriveLoginThrottleKeys(address, SECRET);
    expect((await client.execute({ sql: 'SELECT failure_count FROM admin_login_throttle WHERE key_hash = ?', args: [keys.address] })).rows)
      .toEqual([{ failure_count: 1 }]);
  });


  it('rolls back both failure counters when the real database rejects the second statement', async () => {
    const client = database();
    await migrate(client);
    const failingSecondStatement = new Proxy(client, {
      get(target, property, receiver) {
        if (property === 'batch') {
          return (statements: Parameters<typeof client.batch>[0], mode?: Parameters<typeof client.batch>[1]) => target.batch(
            statements.map((statement, index) => index === 1 ? { sql: 'INSERT INTO missing_throttle_table VALUES (1)', args: [] } : statement), mode,
          );
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const service = createLoginThrottleService({ database: failingSecondStatement, sessionSecretB64: SECRET });
    const keys = deriveLoginThrottleKeys('192.0.2.81', SECRET);

    expect(await service.recordFailure('192.0.2.81')).toMatchObject({ allowed: false, diagnostic: 'THROTTLE_UNAVAILABLE' });
    expect((await client.execute({ sql: 'SELECT key_hash, failure_count FROM admin_login_throttle WHERE key_hash IN (?, ?)', args: [keys.address, keys.global] })).rows)
      .toEqual([]);
  });

});
