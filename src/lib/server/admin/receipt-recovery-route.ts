import type { Client } from '@libsql/client';

import { loadServerConfig } from '../config';
import { EvolutionDocumentHttpMessenger } from '../notifications/evolution-document-http-messenger';
import { createReceiptNotificationRepository } from '../notifications/registration-receipts';
import { createRegistrationRepository } from '../registrations/repository';
import { verifyAuthenticatedForm } from './authenticated-form';
import { createReceiptRecoveryService } from './receipt-recovery-service';
import type { AdminSessionRecord } from './session-repository';

const HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

type SessionLookup = Readonly<{ findByTokenHash(value: string): Promise<AdminSessionRecord | null> }>;
type Locals = Readonly<{ adminSession?: Readonly<{ id: string; expiresAt: string }>; adminCsrfToken?: string }>;
type Context = Readonly<{ request: Request; params: Readonly<{ id?: string }>; locals: Locals }>;
type RecoveryOutcome = Readonly<{ kind: 'accepted' | 'conflict' | 'notfound' | 'invalid' | 'unavailable' }>;

export type ReceiptRecoveryRouteService = Readonly<{
  retry(input: Readonly<{ registrationId: string; ackUncertain?: string }>): Promise<RecoveryOutcome>;
  reconcile(input: Readonly<{ registrationId: string }>): Promise<RecoveryOutcome>;
}>;
export type ReceiptRecoveryRouteOptions = Readonly<{
  action: 'retry' | 'reconcile';
  sessionSecretB64?: string;
  sessions?: SessionLookup;
  service?: ReceiptRecoveryRouteService;
}>;

function response(status: number, message: string, extra: HeadersInit = {}) {
  return new Response(message, { status, headers: { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra } });
}

function canonicalOrigin(environment: Record<string, string | undefined>): string | null {
  try {
    const origin = new URL(environment.CANONICAL_SITE_ORIGIN ?? '');
    return origin.protocol === 'https:' && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash ? origin.href : null;
  } catch { return null; }
}

export function createConfiguredReceiptRecoveryService(database: Client, environment: Record<string, string | undefined>): ReceiptRecoveryRouteService {
  const config = loadServerConfig(environment).whatsappDispatch;
  const origin = canonicalOrigin(environment);
  return createReceiptRecoveryService({
    registrations: createRegistrationRepository(database), notifications: createReceiptNotificationRepository(database),
    messenger: new EvolutionDocumentHttpMessenger(config), canonicalSiteOrigin: origin ?? 'https://invalid.example',
    dispatchAvailable: config.kind === 'ready' && origin !== null,
  });
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

async function recoveryFields(request: Request, action: 'retry' | 'reconcile') {
  let form: FormData;
  try { form = await request.clone().formData(); } catch { return { response: response(400, 'Solicitud no válida.') } as const; }
  const allowed = new Set(action === 'retry' ? ['csrf', 'ackUncertain'] : ['csrf']);
  for (const [name, value] of form.entries()) {
    if (!allowed.has(name) || typeof value !== 'string') return { response: response(400, 'Solicitud no válida.') } as const;
  }
  const csrf = form.getAll('csrf');
  if (csrf.length !== 1 || typeof csrf[0] !== 'string') return { response: response(403, 'Solicitud no válida.') } as const;
  const ack = form.getAll('ackUncertain');
  if (ack.length > 1 || (ack.length === 1 && typeof ack[0] !== 'string')) return { response: response(400, 'Solicitud no válida.') } as const;
  return { csrf: csrf[0], ackUncertain: ack[0] as string | undefined } as const;
}

/** Reuses the authenticated-form guard while allowing acknowledgement only on retry. */
export function createAuthenticatedReceiptRecoveryRoute(options: ReceiptRecoveryRouteOptions) {
  return async ({ request, params, locals }: Context): Promise<Response> => {
    const fields = await recoveryFields(request, options.action);
    if ('response' in fields) return fields.response!;
    if (!locals.adminCsrfToken || fields.csrf !== locals.adminCsrfToken) return response(403, 'Solicitud no válida.');
    const verified = await verifyAuthenticatedForm(
      request, locals, fields.ackUncertain === undefined ? [] : ['ackUncertain'], options.sessionSecretB64, options.sessions,
    );
    if (verified.kind === 'response') return verified.response;
    if (!validId(params.id)) return response(400, 'Solicitud no válida.');
    if (!options.service) return response(503, 'Servicio no disponible.');

    const outcome = options.action === 'retry'
      ? await options.service.retry({ registrationId: params.id, ...(fields.ackUncertain ? { ackUncertain: fields.ackUncertain } : {}) })
      : await options.service.reconcile({ registrationId: params.id });
    if (outcome.kind === 'accepted') {
      return new Response(null, { status: 303, headers: { ...HEADERS, Location: `/admin/inscripciones/${encodeURIComponent(params.id)}` } });
    }
    const status = outcome.kind === 'conflict' ? 409 : outcome.kind === 'notfound' ? 404 : outcome.kind === 'unavailable' ? 503 : 400;
    return response(status, outcome.kind === 'notfound' ? 'Inscripción no encontrada.' : outcome.kind === 'unavailable' ? 'Servicio no disponible.' : 'Solicitud no válida.');
  };
}
