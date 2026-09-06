import type { Client } from '@libsql/client';

import { isValidAdminPasswordHash, verifyAdminPassword } from '../../../lib/server/admin/password';
import { clearPreauthCookie, hasPreauthConfiguration, verifyPreauthProof } from '../../../lib/server/admin/preauth-csrf';
import { serializeAdminSessionCookie } from '../../../lib/server/admin/session-crypto';
import { createAdminSessionService, type CreatedAdminSession } from '../../../lib/server/admin/session-service';
import { createLoginThrottleService, LOGIN_THROTTLE_DENIAL, type LoginThrottleDecision } from '../../../lib/server/admin/login-throttle-service';

const SECURITY_HEADERS = { 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
const LOGIN_FAILURE = 'No se pudo iniciar sesión.';
type Clock = () => Date;
type Throttle = Readonly<{ precheck(address?: string): Promise<LoginThrottleDecision>; recordFailure(address?: string): Promise<LoginThrottleDecision>; recordSuccess(address?: string): Promise<LoginThrottleDecision> }>;
type Sessions = Readonly<{ create(): Promise<CreatedAdminSession> }>;
type Options = Readonly<{ database?: Client; passwordHash?: string; sessionSecretB64?: string; production?: boolean; now?: Clock; throttle?: Throttle; sessions?: Sessions; clientAddress?: (request: Request) => string | undefined }>;

function response(status: number, message: string, extra: HeadersInit = {}): Response {
  return new Response(message, { status, headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra } });
}

function cookie(request: Request, name: string): string | null {
  const values = request.headers.get('cookie')?.split(';').map((item) => item.trim()).filter((item) => item.startsWith(`${name}=`)) ?? [];
  return values.length === 1 ? values[0]!.slice(name.length + 1) : null;
}

function validOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}

function formContentType(request: Request): boolean {
  return /^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '');
}

export function requestAddress(request: Request): string | undefined {
  const value = request.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim();
  return value || undefined;
}

async function fields(request: Request): Promise<{ password: string; preauth: string | null } | null> {
  if (!formContentType(request)) return null;
  try {
    const form = await request.formData();
    const password = form.getAll('password'), preauth = form.getAll('preauth');
    if (password.length !== 1 || typeof password[0] !== 'string') return null;
    return { password: password[0], preauth: preauth.length === 1 && typeof preauth[0] === 'string' ? preauth[0] : null };
  } catch { return null; }
}

function denied(decision: LoginThrottleDecision): Response {
  return response(decision.allowed ? 401 : 429, decision.allowed ? LOGIN_FAILURE : LOGIN_THROTTLE_DENIAL, decision.allowed ? {} : { 'Retry-After': String(decision.retryAfterSeconds) });
}

export function createAdminLoginPost(options: Options = {}) {
  return async (request: Request): Promise<Response> => {
    const { database, passwordHash, sessionSecretB64, production = false, now = () => new Date() } = options;
    if (!database || !isValidAdminPasswordHash(passwordHash) || !sessionSecretB64 || !hasPreauthConfiguration(sessionSecretB64)) return response(503, 'Servicio no disponible.');
    const input = await fields(request);
    if (!input) return response(400, 'Solicitud no válida.');
    const preauthName = production ? '__Host-bdb_admin_preauth' : 'bdb_admin_preauth';
    const preauthCookie = cookie(request, preauthName);
    if (!validOrigin(request) || !preauthCookie || preauthCookie !== input.preauth || !verifyPreauthProof(input.preauth, sessionSecretB64, now)) return response(403, 'Solicitud no válida.');
    const address = options.clientAddress?.(request);
    const throttle = options.throttle ?? createLoginThrottleService({ database, sessionSecretB64, now });
    const sessions = options.sessions ?? createAdminSessionService({ database, sessionSecretB64, now });
    const before = await throttle.precheck(address);
    if (!before.allowed) return denied(before);
    if (!await verifyAdminPassword(input.password, passwordHash)) return denied(await throttle.recordFailure(address));
    const after = await throttle.recordSuccess(address);
    if (!after.allowed) return denied(after);
    try {
      const session = await sessions.create();
      const headers = new Headers(SECURITY_HEADERS);
      headers.set('Location', '/admin');
      headers.append('Set-Cookie', serializeAdminSessionCookie(session.cookie, production));
      headers.append('Set-Cookie', clearPreauthCookie(production));
      return new Response(null, { status: 303, headers });
    } catch { return response(503, 'Servicio no disponible.'); }
  };
}

export const POST = async ({ request }: { request: Request }) => {
  try {
    const { getDatabase } = await import('../../../lib/database');
    return createAdminLoginPost({
      database: getDatabase(), passwordHash: import.meta.env.ADMIN_PASSWORD_HASH, sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64, production: import.meta.env.PROD, clientAddress: requestAddress,
    })(request);
  } catch { return createAdminLoginPost()(request); }
};
