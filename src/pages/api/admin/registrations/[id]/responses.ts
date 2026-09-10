import { randomUUID } from 'node:crypto';

import type { Client } from '@libsql/client';

import { verifyAuthenticatedForm } from '../../../../../lib/server/admin/authenticated-form';
import { createRegistrationResponseEditor, type RegistrationResponseEditor } from '../../../../../lib/server/admin/registration-response-edit';
import { createAdminSessionRepository } from '../../../../../lib/server/admin/session-repository';

const HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};
const FIELDS = ['stateVersion', 'fullName', 'email', 'phone', 'barbershop', 'experience'] as const;

type Options = Readonly<{
  database?: Client;
  sessionSecretB64?: string;
  sessions?: Pick<ReturnType<typeof createAdminSessionRepository>, 'findByTokenHash'>;
  editor?: RegistrationResponseEditor;
  createRequestId?: () => string;
}>;

type Context = Readonly<{
  request: Request;
  params: Readonly<{ id?: string }>;
  locals: Readonly<{ adminSession?: Readonly<{ id: string; expiresAt: string }>; adminCsrfToken?: string }>;
}>;

function response(status: number, message: string) {
  return new Response(message, { status, headers: { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8' } });
}

export function createRegistrationResponsesRoute(options: Options = {}) {
  const database = options.database;
  const editor = options.editor ?? (database && createRegistrationResponseEditor({ database }));
  return async ({ request, params, locals }: Context): Promise<Response> => {
    const verified = await verifyAuthenticatedForm(
      request,
      locals,
      FIELDS,
      options.sessionSecretB64,
      options.sessions ?? (database && createAdminSessionRepository(database)),
    );
    if (verified.kind === 'response') return verified.response;
    const version = verified.fields.stateVersion!;
    if (!params.id || !/^[A-Za-z0-9_-]{1,200}$/.test(params.id) || !/^(0|[1-9]\d*)$/.test(version)
      || !Number.isSafeInteger(Number(version))) return response(400, 'Solicitud no válida.');
    if (!editor) return response(503, 'Servicio no disponible.');

    const outcome = await editor.update({
      registrationId: params.id,
      expectedStateVersion: Number(version),
      sessionId: verified.sessionId,
      requestId: (options.createRequestId ?? randomUUID)(),
      responses: Object.fromEntries(FIELDS.filter((field) => field !== 'stateVersion').map((field) => [field, verified.fields[field]])),
    });
    if (outcome.kind === 'success') {
      return new Response(null, { status: 303, headers: { ...HEADERS, Location: `/admin/inscripciones/${encodeURIComponent(params.id)}?updated=1` } });
    }
    if (outcome.kind === 'email_conflict') return response(409, 'Ese correo electrónico ya está registrado.');
    const status = outcome.kind === 'conflict' ? 409 : outcome.kind === 'notfound' ? 404 : outcome.kind === 'safe_unavailable' ? 503 : 400;
    const message = outcome.kind === 'notfound' ? 'Inscripción no encontrada.' : outcome.kind === 'safe_unavailable' ? 'Servicio no disponible.' : 'Solicitud no válida.';
    return response(status, message);
  };
}

export const POST = async (context: any) => {
  try {
    const { getDatabase } = await import('../../../../../lib/database');
    return createRegistrationResponsesRoute({ database: getDatabase(), sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64 })(context);
  } catch {
    return createRegistrationResponsesRoute()(context);
  }
};
