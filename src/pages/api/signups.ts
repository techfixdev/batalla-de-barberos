import type { APIRoute } from 'astro';
import { LibsqlError } from '@libsql/client';
import { createSignup, validateSignup } from '../../lib/barber-signups';
import { consumeSignupAttempt } from '../../lib/rate-limit';

export const prerender = false;

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const rateLimit = consumeSignupAttempt(clientAddress || 'unknown');
  if (!rateLimit.allowed) {
    return json(
      { message: 'Demasiados intentos. Esperá unos minutos y volvé a probar.' },
      429,
      { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ message: 'La solicitud no tiene un formato válido.' }, 400);
  }

  const validation = validateSignup(payload);
  if (!validation.success) {
    return json({ message: 'Revisá los campos marcados.', errors: validation.errors }, 422);
  }

  try {
    await createSignup(validation.data);
    return json({ message: '¡Inscripción recibida! Pronto nos vamos a comunicar con vos.' }, 201);
  } catch (error) {
    if (error instanceof LibsqlError && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return json({ message: 'Ese correo electrónico ya está inscripto.' }, 409);
    }

    console.error('Unable to create barber signup', error);
    return json({ message: 'No pudimos guardar tu inscripción. Intentá nuevamente.' }, 500);
  }
};
