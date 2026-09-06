import type { Client } from '@libsql/client';
import type { APIRoute } from 'astro';

import { validateSignup } from '../../lib/barber-signups';
import { getDatabase } from '../../lib/database';
import { consumeSignupAttempt } from '../../lib/rate-limit';
import { loadServerConfig } from '../../lib/server/config';
import { type DispatchConfiguration } from '../../lib/server/notifications/evolution-document-wire-profile';
import { EvolutionDocumentHttpMessenger } from '../../lib/server/notifications/evolution-document-http-messenger';
import { type ReceiptMessenger } from '../../lib/server/notifications/contracts';
import { createReceiptNotificationRepository } from '../../lib/server/notifications/registration-receipts';
import { createReceiptService } from '../../lib/server/notifications/receipt-service';
import { createSignupOrchestrator, type RegistrationNotificationRepository } from '../../lib/server/registrations/signup-orchestrator';

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

export type SignupDispatchDiagnostic = Readonly<{
  event: 'receipt-reconciliation-required';
  reason: 'notification-persistence-failed' | 'dispatch-lookup-failed' | 'logical-notification-missing' | 'dispatch-operation-failed' | 'finalization-unresolved';
}>;

type Dependencies = {
  database: Client;
  notificationRepository?: RegistrationNotificationRepository;
  receiptMessenger?: ReceiptMessenger;
  dispatchConfiguration?: DispatchConfiguration;
  diagnosticSink?: (diagnostic: SignupDispatchDiagnostic) => void;
};

export function createSignupPost({ database, notificationRepository, receiptMessenger, dispatchConfiguration, diagnosticSink }: Dependencies) {
  const report = (reason: SignupDispatchDiagnostic['reason']) => (diagnosticSink ?? console.warn)({ event: 'receipt-reconciliation-required', reason });
  const receiptRepository = createReceiptNotificationRepository(database);
  const register = createSignupOrchestrator(database, notificationRepository ?? receiptRepository, () => report('notification-persistence-failed'));
  const configuration = dispatchConfiguration ?? loadServerConfig().whatsappDispatch;
  const messenger = receiptMessenger ?? new EvolutionDocumentHttpMessenger(configuration);
  const receiptService = createReceiptService(receiptRepository, messenger);

  async function dispatchReceipt(email: string): Promise<void> {
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
      return report('dispatch-lookup-failed');
    }
    if (typeof key !== 'string') return report('logical-notification-missing');
    try {
      if (await receiptService.dispatch(key) === 'reconciliation-required') report('finalization-unresolved');
    } catch {
      // Registration is durable; this static signal leaves post-commit work reconcilable.
      report('dispatch-operation-failed');
    }
  }

  return async ({ request, clientAddress }: Pick<Parameters<APIRoute>[0], 'request' | 'clientAddress'>): Promise<Response> => {
    const rateLimit = consumeSignupAttempt(clientAddress || 'unknown');
    if (!rateLimit.allowed) return new Response(JSON.stringify({ message: 'Demasiados intentos. Esperá unos minutos y volvé a probar.' }), { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': String(rateLimit.retryAfterSeconds) } });
    let payload: unknown;
    try { payload = await request.json(); } catch { return json({ message: 'La solicitud no tiene un formato válido.' }, 400); }
    const validation = validateSignup(payload);
    if (!validation.success) return json({ message: 'Revisá los campos marcados.', errors: validation.errors }, 422);
    let outcome: Awaited<ReturnType<typeof register>>;
    try {
      outcome = await register(validation.data, request.headers.get('Idempotency-Key'), new URL(request.url).origin);
    } catch {
      return json({ message: 'No pudimos guardar tu inscripción. Intentá nuevamente.' }, 500);
    }
    if (outcome === 'idempotency_conflict') return json({ message: 'La clave de idempotencia corresponde a otra inscripción.' }, 409);
    if (outcome === 'duplicate_email') return json({ message: 'Ese correo electrónico ya está inscripto.' }, 409);
    await dispatchReceipt(validation.data.email);
    return json({ message: 'Guardamos tu inscripción. Intentaremos enviar un acuse por WhatsApp con el PDF adjunto; si no lo recibís, no invalida la inscripción guardada. La selección la decide más adelante la organización y la respuesta posterior de la persona participante se registra por separado. El acuse no constituye consentimiento legal ni confirma selección o participación.' }, outcome === 'created' ? 201 : 200);
  };
}

export const POST: APIRoute = (context) => createSignupPost({ database: getDatabase() })(context);
