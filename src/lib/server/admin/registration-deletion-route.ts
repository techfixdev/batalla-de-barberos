import type { AdminSessionRecord } from './session-repository';
import { verifyAuthenticatedForm } from './authenticated-form';
import type { RegistrationDeletionInput, RegistrationDeletionResult } from './registration-deletion-service';

const HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

type SessionLookup = Readonly<{ findByTokenHash(value: string): Promise<AdminSessionRecord | null> }>;
type Service = Readonly<{ deleteSelected(input: RegistrationDeletionInput): Promise<RegistrationDeletionResult> }>;
type Locals = Readonly<{ adminSession?: Readonly<{ id: string; expiresAt: string }>; adminCsrfToken?: string }>;
type Context = Readonly<{ request: Request; params: Readonly<Record<string, string | undefined>>; locals: Locals }>;
type Options = Readonly<{ sessionSecretB64?: string; sessions?: SessionLookup; service?: Service }>;

type Parsed = Readonly<{ csrf: string; operationId: string; registrationIds: readonly string[]; confirmation: string; irreversible: string }>;

function response(status: number, message: string, extra: HeadersInit = {}) {
  return new Response(message, { status, headers: { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra } });
}

/** Strict parser retained as the shared selection boundary for later admin operations. */
export async function parseRegistrationDeletionForm(request: Request): Promise<Parsed | Response> {
  if (request.method !== 'POST') return response(405, 'Método no permitido.', { Allow: 'POST' });
  if (request.headers.get('origin') !== new URL(request.url).origin) return response(403, 'Solicitud no válida.');
  if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) {
    return response(400, 'Solicitud no válida.');
  }
  let form: FormData;
  try { form = await request.clone().formData(); } catch { return response(400, 'Solicitud no válida.'); }
  const allowed = new Set(['csrf', 'operationId', 'registrationId', 'confirmation', 'irreversible']);
  for (const [name, value] of form.entries()) {
    if (!allowed.has(name) || typeof value !== 'string') return response(400, 'Solicitud no válida.');
  }
  const one = (name: string) => form.getAll(name);
  const csrf = one('csrf');
  if (csrf.length !== 1 || typeof csrf[0] !== 'string') return response(403, 'Solicitud no válida.');
  const operation = one('operationId'), confirmation = one('confirmation'), irreversible = one('irreversible');
  const ids = one('registrationId');
  if (operation.length !== 1 || confirmation.length !== 1 || irreversible.length !== 1 || ids.length < 1 || ids.length > 50
    || [...operation, ...confirmation, ...irreversible, ...ids].some((value) => typeof value !== 'string')
    || new Set(ids).size !== ids.length || !/^[A-Za-z0-9_-]{16,200}$/.test(operation[0] as string)
    || ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id as string))
    || confirmation[0] !== `ELIMINAR ${ids.length}` || irreversible[0] !== '1') return response(400, 'Solicitud no válida.');
  return { csrf: csrf[0], operationId: operation[0] as string, registrationIds: ids as string[],
    confirmation: confirmation[0] as string, irreversible: irreversible[0] as string };
}

export function createAuthenticatedRegistrationDeletionRoute(options: Options) {
  return async ({ request, locals }: Context): Promise<Response> => {
    const parsed = await parseRegistrationDeletionForm(request);
    if (parsed instanceof Response) return parsed;
    const headers = new Headers(request.headers);
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    const authenticationRequest = new Request(request.url, { method: 'POST', headers, body: new URLSearchParams({ csrf: parsed.csrf }) });
    const verified = await verifyAuthenticatedForm(authenticationRequest, locals, [], options.sessionSecretB64, options.sessions);
    if (verified.kind === 'response') return verified.response;
    if (!options.service) return response(503, 'Servicio no disponible.');
    const outcome = await options.service.deleteSelected({
      registrationIds: parsed.registrationIds, confirmation: parsed.confirmation, irreversible: parsed.irreversible,
      operationId: parsed.operationId, sessionId: verified.sessionId,
    });
    if (outcome.kind === 'deleted' || outcome.kind === 'already_done') {
      return new Response(null, { status: 303, headers: { ...HEADERS, Location: '/admin?deleted=1' } });
    }
    if (outcome.kind === 'conflict') return response(409, 'No se pudo eliminar la selección. Conciliá primero cualquier acuse pendiente o incierto.');
    return response(outcome.kind === 'unavailable' ? 503 : 400,
      outcome.kind === 'unavailable' ? 'Servicio no disponible.' : 'Solicitud no válida.');
  };
}
