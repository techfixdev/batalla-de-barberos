import { timingSafeEqual } from 'node:crypto';

import type { Client } from '@libsql/client';

import { createAdminSessionRepository, sha256, type AdminSessionRecord } from './session-repository';
import { generateAdminSessionTokens, signAdminSessionCookie, verifyAdminSessionCookie } from './session-crypto';

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

type Clock = () => Date;
type SessionServiceOptions = Readonly<{ database: Client; sessionSecretB64: string; now?: Clock }>;
export type AdminSession = Readonly<{ id: string; expiresAt: string }>;
export type CreatedAdminSession = Readonly<{ cookie: string; expiresAt: string }>;

function sameHash(left: string, right: string): boolean {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === 32 && b.length === 32 && timingSafeEqual(a, b);
}

function active(record: AdminSessionRecord, now: Date): AdminSession | null {
  const expiresAt = new Date(record.expiresAt);
  if (record.revokedAt !== null || Number.isNaN(expiresAt.valueOf()) || expiresAt <= now) return null;
  return { id: record.id, expiresAt: record.expiresAt };
}

export function createAdminSessionService({ database, sessionSecretB64, now = () => new Date() }: SessionServiceOptions) {
  const sessions = createAdminSessionRepository(database);

  return {
    async create(): Promise<CreatedAdminSession> {
      const createdAt = now();
      const expiresAt = new Date(createdAt.valueOf() + SESSION_LIFETIME_MS);
      const tokens = generateAdminSessionTokens();
      const cookie = signAdminSessionCookie(tokens, sessionSecretB64);
      if (!cookie) throw new Error('Admin session configuration is unavailable.');
      const persisted = await sessions.create({ tokenHash: sha256(tokens.sessionToken), csrfHash: sha256(tokens.csrfToken),
        createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString() });
      return { cookie, expiresAt: persisted.expiresAt };
    },
    async resolve(cookie: string, strict = false): Promise<AdminSession | null> {
      const verified = verifyAdminSessionCookie(cookie, sessionSecretB64);
      if (!verified.valid) return null;
      try {
        const session = await sessions.findByTokenHash(sha256(verified.tokens.sessionToken));
        return session && sameHash(session.csrfHash, sha256(verified.tokens.csrfToken)) ? active(session, now()) : null;
      } catch (error) {
        if (strict) throw error;
        return null;
      }
    },
    async revoke(cookie: string, strict = false): Promise<boolean> {
      const verified = verifyAdminSessionCookie(cookie, sessionSecretB64);
      if (!verified.valid) return false;
      try {
        return await sessions.revokeByTokenHash(sha256(verified.tokens.sessionToken), now().toISOString());
      } catch (error) {
        if (strict) throw error;
        return false;
      }
    },
  };
}
