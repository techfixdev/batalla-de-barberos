import type { Client } from '@libsql/client';

import { createLoginThrottleRepository, deriveLoginThrottleKeys, type LoginThrottleKeys } from './login-throttle-repository';

const WINDOW_MS = 15 * 60 * 1000;
const ADDRESS_LIMIT = 5;
const GLOBAL_LIMIT = 60;

export const LOGIN_THROTTLE_DENIAL = 'No se pudo iniciar sesión. Intentá nuevamente más tarde.';
export type LoginThrottleDecision = Readonly<{ allowed: true; retryAfterSeconds: 0 }>
  | Readonly<{ allowed: false; retryAfterSeconds: number; message: typeof LOGIN_THROTTLE_DENIAL; diagnostic: 'LOGIN_THROTTLED' | 'THROTTLE_UNAVAILABLE' }>;

type Clock = () => Date;
type Options = Readonly<{ database: Client; sessionSecretB64: string; now?: Clock }>;
type Row = Readonly<{ keyHash: string; blockedUntil: string | null }>;

function windowFor(now: Date) {
  const started = Math.floor(now.valueOf() / WINDOW_MS) * WINDOW_MS;
  return { startedAt: new Date(started).toISOString(), blockedUntil: new Date(started + WINDOW_MS).toISOString() };
}

function denial(until: string | null, now: Date, diagnostic: 'LOGIN_THROTTLED' | 'THROTTLE_UNAVAILABLE'): LoginThrottleDecision {
  const milliseconds = until ? new Date(until).valueOf() - now.valueOf() : 1000;
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(milliseconds / 1000)), message: LOGIN_THROTTLE_DENIAL, diagnostic };
}

function blocked(rows: Row[], keys: LoginThrottleKeys, now: Date): LoginThrottleDecision {
  const row = rows.find((value) => (value.keyHash === keys.address || value.keyHash === keys.global)
    && value.blockedUntil && new Date(value.blockedUntil) > now);
  return row?.blockedUntil ? denial(row.blockedUntil, now, 'LOGIN_THROTTLED') : { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Login 3.1e calls precheck after CSRF/origin validation, recordFailure after a failed password,
 * and recordSuccess after a verified password, requiring its allowed result before issuing a session.
 * Precheck is not an in-flight reservation; callers must honor recordFailure's final decision when concurrent failures reach a threshold.
 */
export function createLoginThrottleService({ database, sessionSecretB64, now = () => new Date() }: Options) {
  const repository = createLoginThrottleRepository(database);
  const keysFor = (address: string | undefined) => deriveLoginThrottleKeys(address, sessionSecretB64);

  return {
    async precheck(clientAddress?: string): Promise<LoginThrottleDecision> {
      const current = now();
      try {
        const keys = keysFor(clientAddress);
        return blocked(await repository.read(keys), keys, current);
      } catch { return denial(null, current, 'THROTTLE_UNAVAILABLE'); }
    },
    async recordFailure(clientAddress?: string): Promise<LoginThrottleDecision> {
      const current = now(), window = windowFor(current);
      try {
        const keys = keysFor(clientAddress);
        return blocked(await repository.recordFailure(keys, window.startedAt, window.blockedUntil, current.toISOString(), ADDRESS_LIMIT, GLOBAL_LIMIT), keys, current);
      } catch { return denial(null, current, 'THROTTLE_UNAVAILABLE'); }
    },
    async recordSuccess(clientAddress?: string): Promise<LoginThrottleDecision> {
      const current = now(), window = windowFor(current);
      try {
        const keys = keysFor(clientAddress);
        return blocked(await repository.recordSuccess(keys, window.startedAt, current.toISOString()), keys, current);
      } catch { return denial(null, current, 'THROTTLE_UNAVAILABLE'); }
    },
  };
}
