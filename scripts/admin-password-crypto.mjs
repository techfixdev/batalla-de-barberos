import { randomBytes, scrypt } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const ADMIN_PASSWORD_SCRYPT_PARAMETERS = 'N=32768,r=8,p=1';
export const ADMIN_PASSWORD_SALT_BYTES = 16;
export const ADMIN_PASSWORD_HASH_BYTES = 32;
export const ADMIN_PASSWORD_MAX_MEMORY = 64 * 1024 * 1024;

function decodeBase64Url(value, expectedBytes) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === expectedBytes && decoded.toString('base64url') === value ? decoded : null;
}

export function parseAdminPasswordHash(value) {
  const parts = value.split('$');
  if (parts.length !== 5 || parts[0] !== 'scrypt' || parts[1] !== 'v1' || parts[2] !== ADMIN_PASSWORD_SCRYPT_PARAMETERS) return null;

  const salt = decodeBase64Url(parts[3] ?? '', ADMIN_PASSWORD_SALT_BYTES);
  const hash = decodeBase64Url(parts[4] ?? '', ADMIN_PASSWORD_HASH_BYTES);
  return salt && hash ? { salt, hash } : null;
}

export function isValidAdminPasswordHash(value) {
  return typeof value === 'string' && parseAdminPasswordHash(value) !== null;
}

export function deriveAdminPasswordHash(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, ADMIN_PASSWORD_HASH_BYTES, {
      N: 32768, r: 8, p: 1, maxmem: ADMIN_PASSWORD_MAX_MEMORY,
    }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function createAdminPasswordHash(password) {
  const salt = randomBytes(ADMIN_PASSWORD_SALT_BYTES);
  const hash = await deriveAdminPasswordHash(password, salt);
  return `scrypt$v1$${ADMIN_PASSWORD_SCRYPT_PARAMETERS}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}
