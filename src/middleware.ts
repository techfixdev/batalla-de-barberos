import type { MiddlewareHandler } from 'astro';

import { verifyAdminSessionCookie } from './lib/server/admin/session-crypto';
import type { AdminSession } from './lib/server/admin/session-service';

const LOGIN_PATHS = new Set(['/admin/login', '/api/admin/login']);
const MAX_PATH_DECODES = 2;
const SECURITY_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

type Context = Readonly<{ request: Request; url: URL; locals: App.Locals }>;
type Next = () => Promise<Response>;
type ResolveSession = (cookie: string) => Promise<AdminSession | null>;
type MiddlewareOptions = Readonly<{ sessionSecretB64?: string; resolveSession?: ResolveSession }>;

function canonicalPathname(pathname: string): string | null {
  let canonical = pathname;
  for (let attempt = 0; attempt < MAX_PATH_DECODES && canonical.includes('%'); attempt += 1) {
    try {
      canonical = decodeURIComponent(canonical);
    } catch {
      return null;
    }
  }
  return canonical.includes('%') ? null : canonical;
}

function adminRoute(pathname: string) {
  const canonical = canonicalPathname(pathname);
  if (canonical === null) return { api: false, invalid: true, login: false, protectedRoute: false };

  const api = canonical === '/api/admin' || canonical.startsWith('/api/admin/');
  const protectedRoute = api || canonical === '/admin' || canonical.startsWith('/admin/');
  return { api, invalid: false, login: LOGIN_PATHS.has(pathname), protectedRoute };
}

function sessionCookie(request: Request): string | null {
  const name = import.meta.env.PROD ? '__Host-bdb_admin' : 'bdb_admin';
  const entry = request.headers.get('cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return entry?.slice(name.length + 1) || null;
}

function protect(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.append('Content-Security-Policy', "frame-ancestors 'none'");
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function invalidPath(): Response {
  return protect(new Response('Bad Request', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
}

function denied(context: Context, api: boolean): Response {
  if (api) {
    return protect(new Response(JSON.stringify({ message: 'No autorizado.' }), {
      status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }));
  }
  return protect(Response.redirect(new URL('/admin/login', context.url), 302));
}

async function resolveLiveSession(cookie: string, secret: string): Promise<AdminSession | null> {
  const [{ getDatabase }, { createAdminSessionService }] = await Promise.all([
    import('./lib/database'), import('./lib/server/admin/session-service'),
  ]);
  return createAdminSessionService({ database: getDatabase(), sessionSecretB64: secret }).resolve(cookie);
}

export function createAdminMiddleware({ sessionSecretB64 = import.meta.env.ADMIN_SESSION_SECRET_B64, resolveSession }: MiddlewareOptions = {}) {
  return async (context: Context, next: Next): Promise<Response> => {
    const route = adminRoute(context.url.pathname);
    if (route.invalid) return invalidPath();
    if (!route.protectedRoute || route.login) return next();

    const cookie = sessionCookie(context.request);
    const secret = sessionSecretB64;
    if (!cookie || !secret) return denied(context, route.api);
    const verified = verifyAdminSessionCookie(cookie, secret);
    if (!verified.valid) return denied(context, route.api);

    try {
      const session = await (resolveSession ?? ((value) => resolveLiveSession(value, secret)))(cookie);
      if (!session) return denied(context, route.api);
      context.locals.adminSession = { id: session.id, expiresAt: session.expiresAt };
      context.locals.adminCsrfToken = verified.tokens.csrfToken;
      return protect(await next());
    } catch {
      return denied(context, route.api);
    }
  };
}

export const onRequest: MiddlewareHandler = (context, next) => createAdminMiddleware()(context, () => next());
