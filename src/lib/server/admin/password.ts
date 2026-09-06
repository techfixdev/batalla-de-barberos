import { timingSafeEqual } from 'node:crypto';

import {
  deriveAdminPasswordHash as deriveSharedPasswordHash,
  isValidAdminPasswordHash as isValidSharedAdminPasswordHash,
  parseAdminPasswordHash as parseSharedAdminPasswordHash,
} from '../../../../scripts/admin-password-crypto.mjs';

export function parseAdminPasswordHash(value: string): { salt: Buffer; hash: Buffer } | null {
  return parseSharedAdminPasswordHash(value) as { salt: Buffer; hash: Buffer } | null;
}

export function isValidAdminPasswordHash(value: string | undefined): value is string {
  return typeof value === 'string' && isValidSharedAdminPasswordHash(value);
}

function deriveAdminPasswordHash(password: string, salt: Buffer): Promise<Buffer> {
  return deriveSharedPasswordHash(password, salt) as Promise<Buffer>;
}

export async function verifyAdminPassword(password: string, encodedHash: string): Promise<boolean> {
  const parsed = parseAdminPasswordHash(encodedHash);
  if (!parsed) return false;

  try {
    const derived = await deriveAdminPasswordHash(password, parsed.salt);
    return timingSafeEqual(derived, parsed.hash);
  } catch {
    return false;
  }
}
