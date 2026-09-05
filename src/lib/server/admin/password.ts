import { scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_PARAMETERS = 'N=32768,r=8,p=1';
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const MAX_MEMORY = 64 * 1024 * 1024;

function decodeBase64Url(value: string, expectedBytes: number): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === expectedBytes && decoded.toString('base64url') === value ? decoded : null;
}

export function parseAdminPasswordHash(value: string): { salt: Buffer; hash: Buffer } | null {
  const parts = value.split('$');
  if (parts.length !== 5 || parts[0] !== 'scrypt' || parts[1] !== 'v1' || parts[2] !== SCRYPT_PARAMETERS) return null;

  const salt = decodeBase64Url(parts[3] ?? '', SALT_BYTES);
  const hash = decodeBase64Url(parts[4] ?? '', HASH_BYTES);
  return salt && hash ? { salt, hash } : null;
}

export function isValidAdminPasswordHash(value: string | undefined): value is string {
  return typeof value === 'string' && parseAdminPasswordHash(value) !== null;
}

function derivePasswordHash(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, HASH_BYTES, { N: 32768, r: 8, p: 1, maxmem: MAX_MEMORY }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function verifyAdminPassword(password: string, encodedHash: string): Promise<boolean> {
  const parsed = parseAdminPasswordHash(encodedHash);
  if (!parsed) return false;

  try {
    const derived = await derivePasswordHash(password, parsed.salt);
    return timingSafeEqual(derived, parsed.hash);
  } catch {
    return false;
  }
}
