import { timingSafeEqual } from 'node:crypto';

import { sha256 } from './session-repository';
import { verifyAdminSessionCookie } from './session-crypto';

type VerifiedProof = Readonly<{ valid: true; sessionToken: string }> | Readonly<{ valid: false }>;
type Options = Readonly<{ field: string | null; cookie: string; sessionSecretB64: string; storedCsrfHash?: string }>;

function token(value: string | null): Buffer | null {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === 32 && decoded.toString('base64url') === value ? decoded : null;
}

function same(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function sameStoredHash(value: string, stored: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(stored)) return false;
  return same(Buffer.from(sha256(value), 'hex'), Buffer.from(stored, 'hex'));
}

export function verifyAuthenticatedCsrf({ field, cookie, sessionSecretB64, storedCsrfHash }: Options): VerifiedProof {
  const signed = verifyAdminSessionCookie(cookie, sessionSecretB64);
  if (!signed.valid) return { valid: false };
  const submitted = token(field), signedToken = token(signed.tokens.csrfToken);
  if (!submitted || !signedToken || !same(submitted, signedToken)) return { valid: false };
  return storedCsrfHash === undefined || sameStoredHash(field!, storedCsrfHash)
    ? { valid: true, sessionToken: signed.tokens.sessionToken }
    : { valid: false };
}
