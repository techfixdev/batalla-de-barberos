import { parseRegistrationListInput, type RegistrationListInput } from './registration-read-repository';

export type RegistrationExportFormat = 'xlsx' | 'pdf';
export type RegistrationExportForm = Readonly<{ csrf: string; format: RegistrationExportFormat; filters: RegistrationListInput; registrationIds: readonly string[] }>;
export type RegistrationExportFormError = Readonly<{ status: 400 | 403 | 413; message: string }>;
export type RegistrationScope = Readonly<{ filters: RegistrationListInput; registrationIds: readonly string[] }>;

export function parseRegistrationScopeFields(form: URLSearchParams): RegistrationScope | RegistrationExportFormError {
  const ids = form.getAll('registrationId');
  if (ids.length > 1000) return { status: 413, message: 'La selección supera el máximo de 1000 inscripciones.' };
  if (new Set(ids).size !== ids.length || ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) return { status: 400, message: 'Solicitud no válida.' };
  if (form.get('scope') !== 'filtered') return { status: 400, message: 'Solicitud no válida.' };
  const filters = Object.freeze({ reviewState: form.get('review') || undefined, participantResponseState: form.get('participant') || undefined,
    receiptStatus: form.get('receipt') || undefined, attention: form.get('attention') || undefined });
  try { parseRegistrationListInput(filters); } catch { return { status: 400, message: 'Solicitud no válida.' }; }
  return Object.freeze({ registrationIds: Object.freeze(ids), filters });
}

export async function parseRegistrationExportForm(request: Request): Promise<RegistrationExportForm | RegistrationExportFormError> {
  if (request.method !== 'POST') return { status: 400, message: 'Método no permitido.' };
  if (request.headers.get('origin') !== new URL(request.url).origin) return { status: 403, message: 'Solicitud no válida.' };
  if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) return { status: 400, message: 'Solicitud no válida.' };
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > 128_000) return { status: 413, message: 'La selección es demasiado grande.' };
  let body: string;
  try { body = await request.clone().text(); } catch { return { status: 400, message: 'Solicitud no válida.' }; }
  if (Buffer.byteLength(body) > 128_000) return { status: 413, message: 'La selección es demasiado grande.' };
  const form = new URLSearchParams(body);
  const allowed = new Set(['csrf', 'scope', 'format', 'review', 'participant', 'receipt', 'attention', 'registrationId']);
  if ([...form.keys()].some((key) => !allowed.has(key))) return { status: 400, message: 'Solicitud no válida.' };
  const singleton = ['csrf', 'scope', 'format', 'review', 'participant', 'receipt', 'attention'] as const;
  if (singleton.some((key) => form.getAll(key).length !== 1)) return { status: 400, message: 'Solicitud no válida.' };
  const csrf = form.get('csrf')!, format = form.get('format');
  if (!csrf || (format !== 'xlsx' && format !== 'pdf')) return { status: 400, message: 'Solicitud no válida.' };
  const scope = parseRegistrationScopeFields(form);
  if ('status' in scope) return scope;
  return Object.freeze({ csrf, format, registrationIds: scope.registrationIds, filters: scope.filters });
}
