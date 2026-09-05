import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyAdminPassword } from '../../src/lib/server/admin/password';
import {
  generateAdminSessionTokens,
  serializeAdminSessionCookie,
  signAdminSessionCookie,
  verifyAdminSessionCookie,
} from '../../src/lib/server/admin/session-crypto';

const PASSWORD_HASH = 'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg';
const SESSION_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const TOKENS = {
  sessionToken: 'ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8',
  csrfToken: 'QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl8',
};
const SIGNED_COOKIE = 'v1.ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8.QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl8.tOBj4nESCOQwFRrf2bI6LH4-mlE25iCTpdKUEIR49JI';

describe('admin password and session crypto primitives', () => {
  it('verifies an independent known scrypt vector and fails malformed or mismatched hashes closed', async () => {
    await expect(verifyAdminPassword('correct horse battery staple', PASSWORD_HASH)).resolves.toBe(true);
    await expect(verifyAdminPassword('wrong password', PASSWORD_HASH)).resolves.toBe(false);
    await expect(verifyAdminPassword('correct horse battery staple', 'scrypt$v1$N=1,r=8,p=1$bad$bad')).resolves.toBe(false);
    await expect(verifyAdminPassword('correct horse battery staple', PASSWORD_HASH.replace('$eo40', '$!eo40'))).resolves.toBe(false);
  });

  it('generates independent canonical 32-byte session and CSRF tokens', () => {
    const tokens = generateAdminSessionTokens();

    expect(tokens.sessionToken).not.toBe(tokens.csrfToken);
    expect(Buffer.from(tokens.sessionToken, 'base64url')).toHaveLength(32);
    expect(Buffer.from(tokens.csrfToken, 'base64url')).toHaveLength(32);
    expect(signAdminSessionCookie(tokens, SESSION_SECRET)).toMatch(/^v1\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
  });

  it('matches an independently generated signed-cookie vector and exposes tokens only after a valid signature', () => {
    expect(signAdminSessionCookie(TOKENS, SESSION_SECRET)).toBe(SIGNED_COOKIE);
    expect(verifyAdminSessionCookie(SIGNED_COOKIE, SESSION_SECRET)).toEqual({ valid: true, tokens: TOKENS });

    expect(verifyAdminSessionCookie(SIGNED_COOKIE.replace('v1.', 'v2.'), SESSION_SECRET)).toEqual({ valid: false });
    expect(verifyAdminSessionCookie(SIGNED_COOKIE.replace('tOBj', 'uOBj'), SESSION_SECRET)).toEqual({ valid: false });
    expect(verifyAdminSessionCookie(`v1.${TOKENS.sessionToken}.${TOKENS.csrfToken}.not-base64url!`, SESSION_SECRET)).toEqual({ valid: false });
  });

  it('rejects malformed, oversized, and unsupported encodings with safe results', async () => {
    const oversizedToken = 'a'.repeat(44);
    const malformedSecret = 'not base64';

    await expect(verifyAdminPassword('password', `${PASSWORD_HASH}$extra`)).resolves.toBe(false);
    expect(signAdminSessionCookie({ ...TOKENS, sessionToken: oversizedToken }, SESSION_SECRET)).toBeNull();
    expect(signAdminSessionCookie(TOKENS, malformedSecret)).toBeNull();
    expect(verifyAdminSessionCookie(SIGNED_COOKIE, malformedSecret)).toEqual({ valid: false });
  });

  it('rejects a correctly signed payload whose token encoding is not exactly 32 canonical bytes', () => {
    const shortSessionToken = Buffer.alloc(31, 0x20).toString('base64url');
    const payload = `v1.${shortSessionToken}.${TOKENS.csrfToken}`;
    const signature = createHmac('sha256', Buffer.from(SESSION_SECRET, 'base64')).update(payload).digest('base64url');

    expect(verifyAdminSessionCookie(`${payload}.${signature}`, SESSION_SECRET)).toEqual({ valid: false });
  });

  it('serializes the eight-hour production and local cookie policy without a timestamp payload', () => {
    const production = serializeAdminSessionCookie(SIGNED_COOKIE, true);
    const local = serializeAdminSessionCookie(SIGNED_COOKIE, false);

    expect(production).toBe(`__Host-bdb_admin=${SIGNED_COOKIE}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`);
    expect(local).toBe(`bdb_admin=${SIGNED_COOKIE}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
    expect(production).not.toContain('Domain=');
    expect(production).not.toContain('Expires=');
  });
});
