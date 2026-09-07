import { verifyAuthenticatedForm } from './authenticated-form';
import { parseRegistrationScopeFields, type RegistrationExportFormError } from './registration-export-form';
import { normalizeArgentinaPhone } from '../phone/argentina';
import type { AdminMessageService } from './admin-message-service';
import type { AdminSessionRecord } from './session-repository';

const HEADERS = { 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
const NONCE = /^[A-Za-z0-9._:-]{16,200}$/;
type ErrorResult = RegistrationExportFormError;
type Sessions = Readonly<{ findByTokenHash(value: string): Promise<AdminSessionRecord | null> }>;
type Context = Readonly<{ request: Request; params: Readonly<{ id?: string }>; locals: Readonly<{ adminSession?: Readonly<{ id: string; expiresAt: string }>; adminCsrfToken?: string }> }>;

function response(status: number, message: string, extra: HeadersInit = {}) {
  return new Response(message, { status, headers: { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra } });
}
function error(status: 400 | 403 | 413, message = 'Solicitud no válida.'): ErrorResult { return { status, message }; }
async function strictForm(request: Request, allowed: readonly string[], singleton: readonly string[]): Promise<URLSearchParams | ErrorResult> {
  if (request.method !== 'POST') return error(400, 'Método no permitido.');
  if (request.headers.get('origin') !== new URL(request.url).origin) return error(403);
  if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) return error(400);
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > 128_000) return error(413, 'La selección es demasiado grande.');
  let body: string; try { body = await request.clone().text(); } catch { return error(400); }
  if (Buffer.byteLength(body) > 128_000) return error(413, 'La selección es demasiado grande.');
  const form = new URLSearchParams(body), accepted = new Set(allowed);
  if ([...form.keys()].some((key) => !accepted.has(key)) || singleton.some((key) => form.getAll(key).length !== 1)) return error(400);
  return form;
}

export async function parseConfirmationSendForm(request: Request) {
  const form = await strictForm(request, ['csrf', 'operationNonce', 'confirmPlace'], ['csrf', 'operationNonce', 'confirmPlace']);
  if ('status' in form) return form;
  const csrf = form.get('csrf')!, operationNonce = form.get('operationNonce')!;
  return csrf && NONCE.test(operationNonce) && form.get('confirmPlace') === '1'
    ? Object.freeze({ csrf, operationNonce, confirmPlace: true as const }) : error(400);
}

export async function parseOrganizationSendForm(request: Request) {
  const singleton = ['csrf', 'operationNonce', 'confirmSend', 'recipient', 'scope', 'review', 'participant', 'receipt', 'attention'] as const;
  const form = await strictForm(request, [...singleton, 'registrationId'], singleton);
  if ('status' in form) return form;
  const csrf = form.get('csrf')!, operationNonce = form.get('operationNonce')!, recipientE164 = normalizeArgentinaPhone(form.get('recipient')!) as `+${string}` | null;
  if (!csrf || !NONCE.test(operationNonce) || form.get('confirmSend') !== '1' || !recipientE164) return error(400);
  const scope = parseRegistrationScopeFields(form);
  return 'status' in scope ? scope : Object.freeze({ csrf, operationNonce, recipientE164, ...scope });
}

export async function parseRetryAdminMessageForm(request: Request) {
  const form = await strictForm(request, ['csrf', 'ackUncertain', 'recipient'], ['csrf', 'ackUncertain', 'recipient']);
  if ('status' in form) return form;
  const csrf = form.get('csrf')!, rawRecipient = form.get('recipient')!, normalizedRecipient = rawRecipient ? normalizeArgentinaPhone(rawRecipient) as `+${string}` | null : null;
  if (!csrf || (rawRecipient && !normalizedRecipient) || !['', '1'].includes(form.get('ackUncertain')!)) return error(400);
  const recipientE164 = normalizedRecipient ?? undefined;
  return Object.freeze({ csrf, recipientE164, ...(form.get('ackUncertain') === '1' ? { acknowledgeUncertain: true as const } : {}) });
}

type Common = Readonly<{ sessionSecretB64?: string; sessions?: Sessions; service?: AdminMessageService }>;
async function authenticate(request: Request, locals: Context['locals'], csrf: string, options: Common) {
  const headers = new Headers(request.headers); headers.set('Content-Type', 'application/x-www-form-urlencoded'); headers.delete('Content-Length');
  return verifyAuthenticatedForm(new Request(request.url, { method: 'POST', headers, body: new URLSearchParams({ csrf }) }), locals, [], options.sessionSecretB64, options.sessions);
}
function redirect(jobId: string) { return new Response(null, { status: 303, headers: { ...HEADERS, Location: `/admin/envios/${encodeURIComponent(jobId)}` } }); }
function serviceResponse(outcome: Awaited<ReturnType<AdminMessageService['retry']>>) {
  if ('jobId' in outcome) return redirect(outcome.jobId);
  const status = outcome.kind === 'blocked' ? 503 : outcome.kind === 'conflict' || outcome.kind === 'sent' ? 409 : outcome.kind === 'acknowledgement_required' ? 422 : 400;
  const message = outcome.kind === 'blocked' ? 'El envío privado todavía no está habilitado: requiere validación humana controlada.' : 'No se pudo iniciar el envío.';
  return response(status, message);
}

export function createConfirmationSendRoute(options: Common & Readonly<{ resolveRegistration(id: string): Promise<Readonly<{ phoneE164: `+${string}`; termsVersion: string; reviewState: string }> | null> }>) {
  return async ({ request, params, locals }: Context) => {
    const parsed = await parseConfirmationSendForm(request); if ('status' in parsed) return response(parsed.status, parsed.message);
    const verified = await authenticate(request, locals, parsed.csrf, options); if (verified.kind === 'response') return verified.response;
    if (!options.service || !params.id) return response(503, 'Servicio no disponible.');
    const registration = await options.resolveRegistration(params.id);
    if (!registration || registration.reviewState !== 'selected') return response(409, 'Solo se puede confirmar una inscripción seleccionada.');
    return serviceResponse(await options.service.sendConfirmation({ registrationId: params.id, recipientE164: registration.phoneE164,
      termsVersion: registration.termsVersion, operationNonce: parsed.operationNonce, sessionId: verified.sessionId }));
  };
}

export function createOrganizationSendRoute(options: Common) {
  return async ({ request, locals }: Context) => {
    const parsed = await parseOrganizationSendForm(request); if ('status' in parsed) return response(parsed.status, parsed.message);
    const verified = await authenticate(request, locals, parsed.csrf, options); if (verified.kind === 'response') return verified.response;
    if (!options.service) return response(503, 'Servicio no disponible.');
    return serviceResponse(await options.service.sendOrganizationList({ registrationIds: parsed.registrationIds, filters: parsed.filters,
      recipientE164: parsed.recipientE164, operationNonce: parsed.operationNonce, sessionId: verified.sessionId }));
  };
}

export function createAdminMessageRetryRoute(options: Common & Readonly<{ resolveRecipient(jobId: string, supplied?: `+${string}`): Promise<`+${string}` | null> }>) {
  return async ({ request, params, locals }: Context) => {
    const parsed = await parseRetryAdminMessageForm(request); if ('status' in parsed) return response(parsed.status, parsed.message);
    const verified = await authenticate(request, locals, parsed.csrf, options); if (verified.kind === 'response') return verified.response;
    if (!options.service || !params.id) return response(503, 'Servicio no disponible.');
    const recipient = await options.resolveRecipient(params.id, parsed.recipientE164); if (!recipient) return response(409, 'El destinatario no coincide con el envío original.');
    return serviceResponse(await options.service.retry({ jobId: params.id, recipientE164: recipient, acknowledgeUncertain: parsed.acknowledgeUncertain }));
  };
}

export function createAdminMessageReconcileRoute(options: Common) {
  return async ({ request, params, locals }: Context) => {
    const verified = await verifyAuthenticatedForm(request, locals, [], options.sessionSecretB64, options.sessions); if (verified.kind === 'response') return verified.response;
    if (!options.service || !params.id) return response(503, 'Servicio no disponible.');
    return serviceResponse(await options.service.reconcile(params.id));
  };
}
