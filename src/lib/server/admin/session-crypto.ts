import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_BYTES = 32;
const SIGNATURE_BYTES = 32;
const COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

export type AdminSessionTokens = Readonly<{
  sessionToken: string;
  csrfToken: string;
}>;

export type AdminSessionCookieVerification =
  | Readonly<{ valid: true; tokens: AdminSessionTokens }>
  | Readonly<{ valid: false }>;

function decodeBase64Url(value: string, expectedBytes: number): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === expectedBytes && decoded.toString('base64url') === value ? decoded : null;
}

function decodeSessionSecret(value: string): Buffer | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;

  const decoded = Buffer.from(value, 'base64');
  return decoded.length >= TOKEN_BYTES && decoded.toString('base64') === value ? decoded : null;
}

function payloadFor(tokens: AdminSessionTokens): string | null {
  return decodeBase64Url(tokens.sessionToken, TOKEN_BYTES) && decodeBase64Url(tokens.csrfToken, TOKEN_BYTES)
    ? `v1.${tokens.sessionToken}.${tokens.csrfToken}`
    : null;
}

function signatureFor(payload: string, secret: Buffer): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function generateAdminSessionTokens(): AdminSessionTokens {
  const sessionToken = randomBytes(TOKEN_BYTES).toString('base64url');
  const csrfToken = randomBytes(TOKEN_BYTES).toString('base64url');
  return { sessionToken, csrfToken };
}

export function signAdminSessionCookie(tokens: AdminSessionTokens, sessionSecretB64: string): string | null {
  const secret = decodeSessionSecret(sessionSecretB64);
  const payload = payloadFor(tokens);
  return secret && payload ? `${payload}.${signatureFor(payload, secret)}` : null;
}

export function verifyAdminSessionCookie(value: string, sessionSecretB64: string): AdminSessionCookieVerification {
  const secret = decodeSessionSecret(sessionSecretB64);
  const parts = value.split('.');
  if (!secret || parts.length !== 4 || parts[0] !== 'v1') return { valid: false };

  const sessionToken = parts[1] ?? '';
  const csrfToken = parts[2] ?? '';
  const signature = decodeBase64Url(parts[3] ?? '', SIGNATURE_BYTES);
  const payload = `v1.${sessionToken}.${csrfToken}`;
  const expectedSignature = Buffer.from(signatureFor(payload, secret), 'base64url');

  if (!signature || !timingSafeEqual(signature, expectedSignature)) return { valid: false };
  const tokens = { sessionToken, csrfToken };
  return payloadFor(tokens) ? { valid: true, tokens } : { valid: false };
}

export function serializeAdminSessionCookie(value: string, production: boolean): string {
  const name = production ? '__Host-bdb_admin' : 'bdb_admin';
  const secure = production ? '; Secure' : '';
  return `${name}=${value}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}`;
}
