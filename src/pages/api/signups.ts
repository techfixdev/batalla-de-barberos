import type { Client } from '@libsql/client';
import type { APIRoute } from 'astro';

import { validateSignup } from '../../lib/barber-signups';
import { getDatabase } from '../../lib/database';
import { consumeSignupAttempt } from '../../lib/rate-limit';
import { createSignupOrchestrator, type RegistrationNotificationRepository } from '../../lib/server/registrations/signup-orchestrator';

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

type Dependencies = { database: Client; notificationRepository?: RegistrationNotificationRepository };
export function createSignupPost({ database, notificationRepository }: Dependencies) {
  const register = createSignupOrchestrator(database, notificationRepository);
  return async ({ request, clientAddress }: Pick<Parameters<APIRoute>[0], 'request' | 'clientAddress'>): Promise<Response> => {
    const rateLimit = consumeSignupAttempt(clientAddress || 'unknown');
    if (!rateLimit.allowed) return new Response(JSON.stringify({ message: 'Demasiados intentos. Esperá unos minutos y volvé a probar.' }), { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': String(rateLimit.retryAfterSeconds) } });
    let payload: unknown;
    try { payload = await request.json(); } catch { return json({ message: 'La solicitud no tiene un formato válido.' }, 400); }
    const validation = validateSignup(payload);
    if (!validation.success) return json({ message: 'Revisá los campos marcados.', errors: validation.errors }, 422);
    try {
      const outcome = await register(validation.data, request.headers.get('Idempotency-Key'), new URL(request.url).origin);
      if (outcome === 'idempotency_conflict') return json({ message: 'La clave de idempotencia corresponde a otra inscripción.' }, 409);
      if (outcome === 'duplicate_email') return json({ message: 'Ese correo electrónico ya está inscripto.' }, 409);
      return json({ message: 'Guardamos tu inscripción. Intentaremos enviar un acuse por WhatsApp con el PDF adjunto; si no lo recibís, no invalida la inscripción guardada. La selección la decide más adelante la organización y la respuesta posterior de la persona participante se registra por separado. El acuse no constituye consentimiento legal ni confirma selección o participación.' }, outcome === 'created' ? 201 : 200);
    } catch { return json({ message: 'No pudimos guardar tu inscripción. Intentá nuevamente.' }, 500); }
  };
}

export const POST: APIRoute = (context) => createSignupPost({ database: getDatabase() })(context);
