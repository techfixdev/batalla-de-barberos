import { createHash, randomUUID } from 'node:crypto';

import type { Client } from '@libsql/client';

export type AdminSessionRecord = Readonly<{
  id: string;
  tokenHash: string;
  csrfHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}>;

type NewAdminSession = Readonly<{
  tokenHash: string;
  csrfHash: string;
  createdAt: string;
  expiresAt: string;
}>;

export type AdminSessionRepository = Readonly<{
  create(input: NewAdminSession): Promise<AdminSessionRecord>;
  findByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null>;
  revokeByTokenHash(tokenHash: string, revokedAt: string): Promise<boolean>;
}>;

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function record(value: Record<string, unknown> | undefined): AdminSessionRecord | null {
  if (!value || typeof value.id !== 'string' || typeof value.token_hash !== 'string' || typeof value.csrf_hash !== 'string'
    || typeof value.created_at !== 'string' || typeof value.expires_at !== 'string'
    || (value.revoked_at !== null && typeof value.revoked_at !== 'string')) return null;
  return { id: value.id, tokenHash: value.token_hash, csrfHash: value.csrf_hash, createdAt: value.created_at,
    expiresAt: value.expires_at, revokedAt: value.revoked_at };
}

export function createAdminSessionRepository(database: Client): AdminSessionRepository {
  return {
    async create(input) {
      const id = randomUUID();
      await database.execute({
        sql: `INSERT INTO admin_sessions (id, token_hash, csrf_hash, created_at, expires_at, last_seen_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, input.tokenHash, input.csrfHash, input.createdAt, input.expiresAt, input.createdAt],
      });
      return { id, ...input, revokedAt: null };
    },
    async findByTokenHash(tokenHash) {
      const result = await database.execute({
        sql: `SELECT id, token_hash, csrf_hash, created_at, expires_at, revoked_at
          FROM admin_sessions WHERE token_hash = ?`, args: [tokenHash],
      });
      return record(result.rows[0] as Record<string, unknown> | undefined);
    },
    async revokeByTokenHash(tokenHash, revokedAt) {
      const result = await database.execute({
        sql: 'UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', args: [revokedAt, tokenHash],
      });
      return result.rowsAffected === 1;
    },
  };
}
