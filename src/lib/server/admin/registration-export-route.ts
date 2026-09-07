import type { AdminSessionRecord } from './session-repository';
import { verifyAuthenticatedForm } from './authenticated-form';
import { parseRegistrationExportForm } from './registration-export-form';
import type { RegistrationExportServiceInput, RegistrationExportServiceResult } from './registration-export-service';

const HEADERS = { 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
type SessionLookup = Readonly<{ findByTokenHash(value: string): Promise<AdminSessionRecord | null> }>;
type Context = Readonly<{ request: Request; locals: Readonly<{ adminSession?: Readonly<{ id: string; expiresAt: string }>; adminCsrfToken?: string }> }>;
type Service = (input: RegistrationExportServiceInput) => Promise<RegistrationExportServiceResult>;

function response(status: number, message: string, extra: HeadersInit = {}) {
  return new Response(message, { status, headers: { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra } });
}

export function createAuthenticatedRegistrationExportRoute(options: Readonly<{ sessionSecretB64?: string; sessions?: SessionLookup; service?: Service; now?: () => Date }>) {
  return async ({ request, locals }: Context): Promise<Response> => {
    if (request.method !== 'POST') return response(405, 'Método no permitido.', { Allow: 'POST' });
    const parsed = await parseRegistrationExportForm(request);
    if ('status' in parsed) return response(parsed.status, parsed.message);
    const headers = new Headers(request.headers); headers.set('Content-Type', 'application/x-www-form-urlencoded'); headers.delete('Content-Length');
    const authenticationRequest = new Request(request.url, { method: 'POST', headers, body: new URLSearchParams({ csrf: parsed.csrf }) });
    const verified = await verifyAuthenticatedForm(authenticationRequest, locals, [], options.sessionSecretB64, options.sessions);
    if (verified.kind === 'response') return verified.response;
    if (!options.service) return response(503, 'Servicio no disponible.');
    let outcome: RegistrationExportServiceResult;
    try { outcome = await options.service({ format: parsed.format, filters: parsed.filters, registrationIds: parsed.registrationIds }); }
    catch { return response(503, 'No se pudo generar la exportación.'); }
    if (outcome.kind === 'conflict') return response(409, 'La selección cambió. Actualizá la página e intentá nuevamente.');
    if (outcome.kind === 'too_many') return response(413, 'La exportación supera el máximo de 1000 inscripciones. Aplicá filtros más específicos.');
    if (outcome.kind === 'empty') return response(422, 'No hay inscripciones para exportar.');
    const extension = outcome.format, date = (options.now ?? (() => new Date()))().toISOString().slice(0, 10);
    const type = extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
    return new Response(new Uint8Array(outcome.bytes), { status: 200, headers: { ...HEADERS, 'Content-Type': type, 'Content-Disposition': `attachment; filename="inscripciones-entre-cortes-${date}.${extension}"`, 'X-Content-Type-Options': 'nosniff' } });
  };
}
