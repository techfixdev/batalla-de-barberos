import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const PREAUTH_TTL_SECONDS = 10 * 60;
const TOKEN_BYTES = 32;
const SIGNATURE_BYTES = 32;
const NAME = 'bdb:admin-preauth-csrf:v1';

type Clock = () => Date;
type Random = () => Buffer;
type Options = Readonly<{ sessionSecretB64: string; now?: Clock; randomBytes?: Random }>;

function decode(value: string, bytes: number): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === bytes && decoded.toString('base64url') === value ? decoded : null;
}

function secret(value: string): Buffer | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  const decoded = Buffer.from(value, 'base64');
  return decoded.length >= TOKEN_BYTES && decoded.toString('base64') === value ? decoded : null;
}

function signature(payload: string, key: Buffer): string {
  return createHmac('sha256', key).update(`${NAME}.${payload}`).digest('base64url');
}

export function hasPreauthConfiguration(sessionSecretB64: string | undefined): boolean {
  return typeof sessionSecretB64 === 'string' && secret(sessionSecretB64) !== null;
}

export function issuePreauthProof({ sessionSecretB64, now = () => new Date(), randomBytes: createRandom = () => randomBytes(TOKEN_BYTES) }: Options) {
  const key = secret(sessionSecretB64);
  const issuedAt = now();
  if (!key || Number.isNaN(issuedAt.valueOf())) return null;
  const token = createRandom().toString('base64url');
  const expiresAt = Math.floor(issuedAt.valueOf() / 1000) + PREAUTH_TTL_SECONDS;
  if (!decode(token, TOKEN_BYTES)) return null;
  const payload = `p1.${token}.${expiresAt}`;
  return { value: `${payload}.${signature(payload, key)}`, expiresAt: new Date(expiresAt * 1000) };
}

export function verifyPreauthProof(value: string, sessionSecretB64: string, now: Clock = () => new Date()): boolean {
  const key = secret(sessionSecretB64);
  const parts = value.split('.');
  if (!key || parts.length !== 4 || parts[0] !== 'p1' || !/^[1-9]\d{0,9}$/.test(parts[2] ?? '')) return false;
  const token = parts[1] ?? '', expiresAt = Number(parts[2]);
  const received = decode(parts[3] ?? '', SIGNATURE_BYTES);
  const payload = `p1.${token}.${parts[2]}`;
  const expected = Buffer.from(signature(payload, key), 'base64url');
  return !!received && !!decode(token, TOKEN_BYTES) && received.length === expected.length && timingSafeEqual(received, expected)
    && Number.isSafeInteger(expiresAt) && expiresAt * 1000 > now().valueOf();
}

export function serializePreauthCookie(value: string, expiresAt: Date, production: boolean): string {
  const name = production ? '__Host-bdb_admin_preauth' : 'bdb_admin_preauth';
  return `${name}=${value}; HttpOnly${production ? '; Secure' : ''}; SameSite=Strict; Path=/; Max-Age=${PREAUTH_TTL_SECONDS}; Expires=${expiresAt.toUTCString()}`;
}

export function clearPreauthCookie(production: boolean): string {
  const name = production ? '__Host-bdb_admin_preauth' : 'bdb_admin_preauth';
  return `${name}=; HttpOnly${production ? '; Secure' : ''}; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
