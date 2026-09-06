import { randomUUID, timingSafeEqual } from 'node:crypto';

import { verifyAuthenticatedCsrf } from './authenticated-csrf';
import { sha256, type AdminSessionRecord } from './session-repository';

const HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

type SessionLookup = Readonly<{
  findByTokenHash(value: string): Promise<AdminSessionRecord | null>;
}>;
type Locals = Readonly<{
  adminSession?: Readonly<{ id: string; expiresAt: string }>;
  adminCsrfToken?: string;
}>;
type FormResult =
  | Readonly<{ kind: 'ok'; fields: Readonly<Record<string, string>>; sessionId: string }>
  | Readonly<{ kind: 'response'; response: Response }>;

export type LifecycleService = Readonly<{
  changeReview(input: unknown): Promise<{ kind: string }>;
  changeParticipantResponse(input: unknown): Promise<{ kind: string }>;
}>;
type LifecycleRouteOptions = Readonly<{
  field: 'reviewState' | 'participantResponse';
  sessionSecretB64?: string;
  sessions?: SessionLookup;
  service?: LifecycleService;
  createRequestId?: () => string;
}>;
type Context = Readonly<{
  request: Request;
  params: Readonly<{ id?: string }>;
  locals: Locals;
}>;

function response(status: number, message: string, extra: HeadersInit = {}) {
  return new Response(message, {
    status,
    headers: { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra },
  });
}

function same(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookie(request: Request) {
  const name = import.meta.env.PROD ? '__Host-bdb_admin' : 'bdb_admin';
  const values = request.headers.get('cookie')?.split(';').map((value) => value.trim())
    .filter((value) => value.startsWith(`${name}=`)) ?? [];
  return values.length === 1 ? values[0]!.slice(name.length + 1) : null;
}

function active(session: AdminSessionRecord) {
  const expires = new Date(session.expiresAt);
  return session.revokedAt === null && !Number.isNaN(expires.valueOf()) && expires > new Date();
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

/** Reusable authenticated form bridge for lifecycle and later admin mutations. */
export async function verifyAuthenticatedForm(
  request: Request,
  locals: Locals,
  fields: readonly string[],
  sessionSecretB64?: string,
  sessions?: SessionLookup,
): Promise<FormResult> {
  if (request.method !== 'POST') {
    return { kind: 'response', response: response(405, 'Método no permitido.', { Allow: 'POST' }) };
  }
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return { kind: 'response', response: response(403, 'Solicitud no válida.') };
  }
  if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) {
    return { kind: 'response', response: response(400, 'Solicitud no válida.') };
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { kind: 'response', response: response(400, 'Solicitud no válida.') };
  }
  const allowed = new Set(['csrf', ...fields]);
  for (const [name, value] of form.entries()) {
    if (!allowed.has(name) || typeof value !== 'string') {
      return { kind: 'response', response: response(400, 'Solicitud no válida.') };
    }
  }
  const values: Record<string, string> = {};
  for (const name of ['csrf', ...fields]) {
    const value = form.getAll(name);
    if (value.length !== 1 || typeof value[0] !== 'string') {
      return { kind: 'response', response: response(name === 'csrf' ? 403 : 400, 'Solicitud no válida.') };
    }
    values[name] = value[0];
  }

  const signedCookie = cookie(request);
  if (!sessionSecretB64 || !sessions) {
    return { kind: 'response', response: response(503, 'Servicio no disponible.') };
  }
  if (!signedCookie || !locals.adminSession || !locals.adminCsrfToken || !same(values.csrf!, locals.adminCsrfToken)) {
    return { kind: 'response', response: response(403, 'Solicitud no válida.') };
  }
  const proof = verifyAuthenticatedCsrf({ field: values.csrf!, cookie: signedCookie, sessionSecretB64 });
  if (!proof.valid) return { kind: 'response', response: response(403, 'Solicitud no válida.') };

  try {
    const session = await sessions.findByTokenHash(sha256(proof.sessionToken));
    if (!session || !active(session) || session.id !== locals.adminSession.id) {
      return { kind: 'response', response: response(401, 'No autorizado.') };
    }
    const storedProof = verifyAuthenticatedCsrf({
      field: values.csrf!, cookie: signedCookie, sessionSecretB64, storedCsrfHash: session.csrfHash,
    });
    if (!storedProof.valid) return { kind: 'response', response: response(403, 'Solicitud no válida.') };
    return { kind: 'ok', fields: values, sessionId: session.id };
  } catch {
    return { kind: 'response', response: response(503, 'Servicio no disponible.') };
  }
}

export function createAuthenticatedLifecycleRoute(options: LifecycleRouteOptions) {
  return async ({ request, params, locals }: Context): Promise<Response> => {
    const verified = await verifyAuthenticatedForm(
      request, locals, ['stateVersion', options.field], options.sessionSecretB64, options.sessions,
    );
    if (verified.kind === 'response') return verified.response;

    const version = verified.fields.stateVersion!;
    if (!validId(params.id) || !/^(0|[1-9]\d*)$/.test(version) || !Number.isSafeInteger(Number(version))) {
      return response(400, 'Solicitud no válida.');
    }
    if (!options.service) return response(503, 'Servicio no disponible.');

    const input = {
      registrationId: params.id,
      expectedStateVersion: Number(version),
      nextState: verified.fields[options.field],
      sessionId: verified.sessionId,
      requestId: (options.createRequestId ?? randomUUID)(),
    };
    const outcome = options.field === 'reviewState'
      ? await options.service.changeReview(input)
      : await options.service.changeParticipantResponse(input);
    if (outcome.kind === 'success') {
      return new Response(null, {
        status: 303,
        headers: { ...HEADERS, Location: `/admin/inscripciones/${encodeURIComponent(params.id)}` },
      });
    }
    const status = outcome.kind === 'conflict' ? 409 : outcome.kind === 'notfound' ? 404
      : outcome.kind === 'safe_unavailable' ? 503 : 400;
    const message = outcome.kind === 'notfound' ? 'Inscripción no encontrada.'
      : outcome.kind === 'safe_unavailable' ? 'Servicio no disponible.' : 'Solicitud no válida.';
    return response(status, message);
  };
}
