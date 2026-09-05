import { createHmac } from 'node:crypto';

import type { Client } from '@libsql/client';

const ADDRESS_PREFIX = 'bdb:admin-login-throttle:v1:address:';
const GLOBAL_SCOPE = 'bdb:admin-login-throttle:v1:global';
const UNKNOWN_ADDRESS = 'unknown';
const MAX_ADDRESS_BYTES = 128;

export type LoginThrottleKeys = Readonly<{ address: string; global: string }>;
type ThrottleRow = Readonly<{ keyHash: string; blockedUntil: string | null }>;

function secret(value: string): Buffer | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  const decoded = Buffer.from(value, 'base64');
  return decoded.length >= 32 && decoded.toString('base64') === value ? decoded : null;
}

function hmac(value: string, key: Buffer): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

function boundedAddress(value: string | undefined): string {
  return typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= MAX_ADDRESS_BYTES ? value : UNKNOWN_ADDRESS;
}

export function deriveLoginThrottleKeys(clientAddress: string | undefined, sessionSecretB64: string): LoginThrottleKeys {
  const key = secret(sessionSecretB64);
  if (!key) throw new Error('Login throttle configuration is unavailable.');
  return { address: hmac(`${ADDRESS_PREFIX}${boundedAddress(clientAddress)}`, key), global: hmac(GLOBAL_SCOPE, key) };
}

function rows(values: Array<Record<string, unknown>>): ThrottleRow[] {
  return values.flatMap((value) => typeof value.key_hash === 'string' && (value.blocked_until === null || typeof value.blocked_until === 'string')
    ? [{ keyHash: value.key_hash, blockedUntil: value.blocked_until }] : []);
}

export function createLoginThrottleRepository(database: Client) {
  async function read(keys: LoginThrottleKeys): Promise<ThrottleRow[]> {
    const result = await database.execute({ sql: 'SELECT key_hash, blocked_until FROM admin_login_throttle WHERE key_hash IN (?, ?)', args: [keys.address, keys.global] });
    return rows(result.rows as Array<Record<string, unknown>>);
  }

  return {
    read,
    async recordFailure(keys: LoginThrottleKeys, windowStartedAt: string, blockedUntil: string, updatedAt: string, addressLimit: number, globalLimit: number) {
      const statement = (keyHash: string, limit: number) => ({
        sql: `INSERT INTO admin_login_throttle (key_hash, window_started_at, failure_count, blocked_until, updated_at) VALUES (?, ?, 1, NULL, ?)
          ON CONFLICT(key_hash) DO UPDATE SET window_started_at = excluded.window_started_at,
          failure_count = CASE WHEN window_started_at = excluded.window_started_at THEN failure_count + 1 ELSE 1 END,
          blocked_until = CASE WHEN window_started_at = excluded.window_started_at AND failure_count + 1 >= ? THEN ?
            WHEN window_started_at <> excluded.window_started_at AND 1 >= ? THEN ? ELSE NULL END, updated_at = excluded.updated_at`,
        args: [keyHash, windowStartedAt, updatedAt, limit, blockedUntil, limit, blockedUntil],
      });
      await database.batch([statement(keys.address, addressLimit), statement(keys.global, globalLimit)], 'write');
      return read(keys);
    },
    async recordSuccess(keys: LoginThrottleKeys, windowStartedAt: string, updatedAt: string) {
      await database.batch([{
        sql: `DELETE FROM admin_login_throttle WHERE key_hash = ? AND NOT EXISTS (
          SELECT 1 FROM admin_login_throttle
          WHERE key_hash IN (?, ?) AND window_started_at = ? AND blocked_until > ?
        )`,
        args: [keys.address, keys.address, keys.global, windowStartedAt, updatedAt],
      }], 'write');
      return read(keys);
    },
  };
}
