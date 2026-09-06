import type { Client } from '@libsql/client';
import type { APIRoute } from 'astro';

import { validateSignup } from '../../lib/barber-signups';
import { getDatabase } from '../../lib/database';
import { consumeSignupAttempt } from '../../lib/rate-limit';
import { loadServerConfig } from '../../lib/server/config';
import { createSafeDiagnostic } from '../../lib/server/safe-diagnostics';
import type { ReceiptMessenger } from '../../lib/server/notifications/contracts';
import type { DispatchConfiguration } from '../../lib/server/notifications/evolution-document-wire-profile';
import { EvolutionDocumentHttpMessenger } from '../../lib/server/notifications/evolution-document-http-messenger';
import { createReceiptNotificationRepository } from '../../lib/server/notifications/registration-receipts';
import { createReceiptService } from '../../lib/server/notifications/receipt-service';
import { createSignupOrchestrator, type RegistrationNotificationRepository } from '../../lib/server/registrations/signup-orchestrator';

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

export type SignupDispatchDiagnostic = ReturnType<typeof createSafeDiagnostic>;

type Dependencies = {
  database: Client;
  notificationRepository?: RegistrationNotificationRepository;
  receiptMessenger?: ReceiptMessenger;
  dispatchConfiguration?: DispatchConfiguration;
  diagnosticSink?: (diagnostic: SignupDispatchDiagnostic) => void;
  environment?: Record<string, string | undefined>;
};

export function createSignupPost({ database, notificationRepository, receiptMessenger, dispatchConfiguration, diagnosticSink, environment = process.env }: Dependencies) {
  const report = () => (diagnosticSink ?? console.warn)(createSafeDiagnostic({ event: 'receipt-reconciliation-required', outcome: 'reconciliation-required' }));
  const receiptRepository = createReceiptNotificationRepository(database);
  const register = createSignupOrchestrator(database, notificationRepository ?? receiptRepository, report);

  async function dispatchReceipt(email: string, configuration: DispatchConfiguration, messenger: ReceiptMessenger): Promise<void> {
    if (configuration.kind !== 'ready') return;
    let key: unknown;
    try {
      const result = await database.execute({
        sql: `SELECT n.logical_message_key FROM receipt_notifications n
          JOIN barber_signups b ON b.id = n.registration_id WHERE b.email = ? LIMIT 1`,
        args: [email],
      });
      key = result.rows[0]?.logical_message_key;
    } catch {
      return report();
    }
    if (typeof key !== 'string') return report();
    try {
      if (await createReceiptService(receiptRepository, messenger).dispatch(key) === 'reconciliation-required') report();
    } catch {
      // Registration is durable; this static signal leaves post-commit work reconcilable.
      report();
    }
  }

  return async ({ request, clientAddress }: Pick<Parameters<APIRoute>[0], 'request' | 'clientAddress'>): Promise<Response> => {
    const serverConfig = loadServerConfig(environment, { fallbackOrigin: new URL(request.url).origin });
    if (serverConfig.signup.kind !== 'ready') return json({ message: 'El servicio de inscripciones no está disponible.' }, 503);
    const configuration = dispatchConfiguration ?? serverConfig.whatsappDispatch;
    const messenger = receiptMessenger ?? new EvolutionDocumentHttpMessenger(configuration);
    const rateLimit = consumeSignupAttempt(clientAddress || 'unknown');
    if (!rateLimit.allowed) return new Response(JSON.stringify({ message: 'Demasiados intentos. Esperá unos minutos y volvé a probar.' }), { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': String(rateLimit.retryAfterSeconds) } });
    let payload: unknown;
    try { payload = await request.json(); } catch { return json({ message: 'La solicitud no tiene un formato válido.' }, 400); }
    const validation = validateSignup(payload);
    if (!validation.success) return json({ message: 'Revisá los campos marcados.', errors: validation.errors }, 422);
    let outcome: Awaited<ReturnType<typeof register>>;
    try {
      outcome = await register(validation.data, request.headers.get('Idempotency-Key'), serverConfig.signup.canonicalSiteOrigin);
    } catch {
      return json({ message: 'No pudimos guardar tu inscripción. Intentá nuevamente.' }, 500);
    }
    if (outcome === 'idempotency_conflict') return json({ message: 'La clave de idempotencia corresponde a otra inscripción.' }, 409);
    if (outcome === 'duplicate_email') return json({ message: 'Ese correo electrónico ya está inscripto.' }, 409);
    await dispatchReceipt(validation.data.email, configuration, messenger);
    return json({ message: 'Guardamos tu inscripción. Intentaremos enviar un acuse por WhatsApp con el PDF adjunto; si no lo recibís, no invalida la inscripción guardada. La selección la decide más adelante la organización y la respuesta posterior de la persona participante se registra por separado. El acuse no constituye consentimiento legal ni confirma selección o participación.' }, outcome === 'created' ? 201 : 200);
  };
}

export function createConfiguredSignupPost({ database, environment = process.env }: Readonly<{ database: () => Client; environment?: Record<string, string | undefined> }>) {
  return async (context: Parameters<APIRoute>[0]): Promise<Response> => {
    const config = loadServerConfig(environment, { fallbackOrigin: new URL(context.request.url).origin });
    if (config.signup.kind !== 'ready') return json({ message: 'El servicio de inscripciones no está disponible.' }, 503);
    return createSignupPost({ database: database(), environment })(context);
  };
}

export const POST: APIRoute = (context) => createConfiguredSignupPost({ database: getDatabase })(context);
