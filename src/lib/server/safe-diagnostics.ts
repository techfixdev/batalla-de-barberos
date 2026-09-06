import { SAFE_ERROR_CODES, type SafeErrorCode } from './notifications/contracts';

const STATIC_DIAGNOSTICS: Readonly<Record<SafeErrorCode, string>> = {
  CONFIG_INVALID: 'La configuración del acuse no es válida.',
  PROVIDER_TIMEOUT: 'El proveedor agotó el tiempo de respuesta.',
  PROVIDER_NETWORK: 'No se pudo contactar al proveedor.',
  PROVIDER_AUTH: 'El proveedor rechazó la autenticación.',
  PROVIDER_RATE_LIMIT: 'El proveedor limitó la solicitud.',
  PROVIDER_REJECTED: 'El proveedor rechazó el documento.',
  PROVIDER_MEDIA_REJECTED: 'El proveedor rechazó el documento adjunto.',
  PROVIDER_MEDIA_FETCH_FAILED: 'El proveedor no pudo recuperar el documento.',
  PROVIDER_ATTACHMENT_NOT_ACCEPTED: 'El proveedor no aceptó el documento adjunto.',
  PROVIDER_SERVER: 'El proveedor no está disponible.',
  PROVIDER_MALFORMED_RESPONSE: 'La respuesta del proveedor no pudo verificarse.',
  PROVIDER_RESPONSE_TOO_LARGE: 'La respuesta del proveedor excedió el límite.',
  ATTEMPT_BUSY: 'El intento anterior requiere conciliación.',
};

const EVENT_NAMES = new Set(['receipt-dispatch', 'receipt-reconciliation-required']);
const OUTCOMES = new Set(['accepted', 'failed', 'uncertain', 'reconciliation-required']);
const EVIDENCE = new Set(['validated-document-status', 'document-response-marker']);
const INTERNAL_ID = /^[A-Za-z0-9_-]{1,200}$/;

type SafeDiagnostic = Readonly<{
  event: 'receipt-dispatch' | 'receipt-reconciliation-required';
  requestId?: string;
  registrationId?: string;
  notificationId?: string;
  attemptId?: string;
  outcome?: 'accepted' | 'failed' | 'uncertain' | 'reconciliation-required';
  durationMs?: number;
  httpStatus?: number;
  acceptanceEvidence?: 'validated-document-status' | 'document-response-marker';
  errorCode?: SafeErrorCode;
}>;

function id(value: unknown): string | undefined {
  return typeof value === 'string' && INTERNAL_ID.test(value) ? value : undefined;
}

function safeErrorCode(value: unknown): SafeErrorCode | undefined {
  return typeof value === 'string' && (SAFE_ERROR_CODES as readonly string[]).includes(value) ? value as SafeErrorCode : undefined;
}

/** Copies only known scalar metadata; untrusted errors and request content are never serialized. */
export function createSafeDiagnostic(input: unknown): SafeDiagnostic {
  const value = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const event = typeof value.event === 'string' && EVENT_NAMES.has(value.event) ? value.event as SafeDiagnostic['event'] : 'receipt-dispatch';
  const outcome = typeof value.outcome === 'string' && OUTCOMES.has(value.outcome) ? value.outcome as SafeDiagnostic['outcome'] : undefined;
  const evidence = typeof value.acceptanceEvidence === 'string' && EVIDENCE.has(value.acceptanceEvidence)
    ? value.acceptanceEvidence as SafeDiagnostic['acceptanceEvidence'] : undefined;
  const durationMs = typeof value.durationMs === 'number' && Number.isInteger(value.durationMs) && value.durationMs >= 0 && value.durationMs <= 60_000 ? value.durationMs : undefined;
  const httpStatus = typeof value.httpStatus === 'number' && Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599 ? value.httpStatus : undefined;
  const requestId = id(value.requestId), registrationId = id(value.registrationId), notificationId = id(value.notificationId), attemptId = id(value.attemptId);
  const errorCode = safeErrorCode(value.errorCode);
  return {
    event, ...(requestId ? { requestId } : {}), ...(registrationId ? { registrationId } : {}), ...(notificationId ? { notificationId } : {}), ...(attemptId ? { attemptId } : {}),
    ...(outcome ? { outcome } : {}), ...(durationMs !== undefined ? { durationMs } : {}), ...(httpStatus !== undefined ? { httpStatus } : {}),
    ...(evidence ? { acceptanceEvidence: evidence } : {}), ...(errorCode ? { errorCode } : {}),
  };
}

export function safeStaticDiagnostic(errorCode: SafeErrorCode): string {
  return STATIC_DIAGNOSTICS[errorCode];
}
