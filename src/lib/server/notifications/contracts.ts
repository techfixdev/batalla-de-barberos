import { createReceiptCaption } from './receipt-caption';

export const SAFE_ERROR_CODES = [
  'CONFIG_INVALID', 'PROVIDER_TIMEOUT', 'PROVIDER_NETWORK', 'PROVIDER_AUTH',
  'PROVIDER_RATE_LIMIT', 'PROVIDER_REJECTED', 'PROVIDER_MEDIA_REJECTED',
  'PROVIDER_MEDIA_FETCH_FAILED', 'PROVIDER_ATTACHMENT_NOT_ACCEPTED',
  'PROVIDER_SERVER', 'PROVIDER_MALFORMED_RESPONSE', 'PROVIDER_RESPONSE_TOO_LARGE', 'ATTEMPT_BUSY',
] as const;

export type SafeErrorCode = (typeof SAFE_ERROR_CODES)[number];
export type ReceiptDocument = Readonly<{
  kind: 'document'; mediaUrl: string; filename: string; mimeType: 'application/pdf'; caption: string;
}>;
export type SendReceiptCommand = Readonly<{
  logicalMessageKey: string; attemptKey: string; toE164: `+54${string}`; attachment: ReceiptDocument;
}>;
export type SendReceiptResult =
  | Readonly<{ kind: 'accepted'; acceptedArtifact: 'document'; evidence: 'validated-document-status' | 'document-response-marker'; providerMessageId?: string; httpStatus: number }>
  | Readonly<{ kind: 'rejected'; code: SafeErrorCode; httpStatus?: number }>
  | Readonly<{ kind: 'uncertain'; code: SafeErrorCode; httpStatus?: number }>;

export interface ReceiptMessenger { send(command: SendReceiptCommand): Promise<SendReceiptResult>; }

function isImmutablePdfUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname.endsWith('.pdf');
  } catch { return false; }
}

export function isValidReceiptDocument(value: unknown): value is ReceiptDocument {
  if (typeof value !== 'object' || value === null) return false;
  const document = value as Partial<ReceiptDocument>;
  if (document.kind !== 'document' || typeof document.mediaUrl !== 'string' || typeof document.filename !== 'string'
    || document.mimeType !== 'application/pdf' || typeof document.caption !== 'string') return false;
  return document.filename.endsWith('.pdf') && isImmutablePdfUrl(document.mediaUrl)
    && document.caption === createReceiptCaption(document.mediaUrl);
}

export function safeErrorCode(value: string): SafeErrorCode {
  return (SAFE_ERROR_CODES as readonly string[]).includes(value) ? value as SafeErrorCode : 'PROVIDER_REJECTED';
}

export function safeProviderMessageId(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,200}$/.test(value) ? value : null;
}
