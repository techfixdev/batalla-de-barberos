import type { Client } from '@libsql/client';

import { verifyAuthenticatedCsrf } from '../../../lib/server/admin/authenticated-csrf';
import { createAdminSessionRepository, sha256, type AdminSessionRecord } from '../../../lib/server/admin/session-repository';
import { createAdminSessionService, type AdminSession } from '../../../lib/server/admin/session-service';

const SECURITY_HEADERS = { 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
type Clock = () => Date;
type Repository = Readonly<{ findByTokenHash(value: string): Promise<AdminSessionRecord | null> }>;
type Sessions = Readonly<{ resolve(cookie: string, strict?: boolean): Promise<AdminSession | null>; revoke(cookie: string, strict?: boolean): Promise<boolean> }>;
type Options = Readonly<{ database?: Client; repository?: Repository; sessions?: Sessions; sessionSecretB64?: string; production?: boolean; now?: Clock }>;

function response(status: number, message: string, headers: HeadersInit = {}) {
  return new Response(message, { status, headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...headers } });
}

function denied(status: 401 | 403) {
  return response(status, status === 403 ? 'Solicitud no válida.' : 'No autorizado.');
}

function cookie(request: Request, name: string): string | null {
  const values = request.headers.get('cookie')?.split(';').map((value) => value.trim()).filter((value) => value.startsWith(`${name}=`)) ?? [];
  return values.length === 1 ? values[0]!.slice(name.length + 1) : null;
}

async function csrfField(request: Request): Promise<string | null> {
  if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) return null;
  try {
    const values = (await request.formData()).getAll('csrf');
    return values.length === 1 && typeof values[0] === 'string' ? values[0] : null;
  } catch { return null; }
}

function active(record: AdminSessionRecord, now: Date): boolean {
  const expiresAt = new Date(record.expiresAt);
  return record.revokedAt === null && !Number.isNaN(expiresAt.valueOf()) && expiresAt > now;
}

function clearSessionCookie(production: boolean): string {
  const name = production ? '__Host-bdb_admin' : 'bdb_admin';
  return `${name}=; HttpOnly${production ? '; Secure' : ''}; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function createAdminLogout(options: Options = {}) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return response(405, 'Método no permitido.', { Allow: 'POST' });
    const { database, sessionSecretB64, production = false, now = () => new Date() } = options;
    if (!sessionSecretB64 || (!database && !options.repository) || (!database && !options.sessions)) return response(503, 'Servicio no disponible.');
    const field = await csrfField(request), value = cookie(request, production ? '__Host-bdb_admin' : 'bdb_admin');
    if (!field || !value || request.headers.get('origin') !== new URL(request.url).origin) return denied(403);
    const signedProof = verifyAuthenticatedCsrf({ field, cookie: value, sessionSecretB64 });
    if (!signedProof.valid) return denied(403);
    try {
      const repository = options.repository ?? createAdminSessionRepository(database!);
      const record = await repository.findByTokenHash(sha256(signedProof.sessionToken));
      if (!record || !active(record, now())) return denied(401);
      if (!verifyAuthenticatedCsrf({ field, cookie: value, sessionSecretB64, storedCsrfHash: record.csrfHash }).valid) return denied(403);
      const sessions = options.sessions ?? createAdminSessionService({ database: database!, sessionSecretB64, now });
      if (!await sessions.resolve(value, true) || !await sessions.revoke(value, true)) return denied(401);
      return new Response(null, { status: 303, headers: { ...SECURITY_HEADERS, Location: '/admin/login', 'Set-Cookie': clearSessionCookie(production) } });
    } catch { return response(503, 'Servicio no disponible.'); }
  };
}

export const POST = async ({ request }: { request: Request }) => {
  try {
    const { getDatabase } = await import('../../../lib/database');
    return createAdminLogout({ database: getDatabase(), sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64, production: import.meta.env.PROD })(request);
  } catch { return createAdminLogout()(request); }
};

export const GET = ({ request }: { request: Request }) => createAdminLogout()(request);
