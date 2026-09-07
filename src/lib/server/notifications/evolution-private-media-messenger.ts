import { createHash } from 'node:crypto';

import { safeProviderMessageId, type SafeErrorCode } from './contracts';
import { executeEvolutionHttpRequest, type FetchTransport } from './evolution-http-transport';
import {
  EVOLUTION_PRIVATE_MEDIA_MAX_RAW_BYTES, EVOLUTION_PRIVATE_MEDIA_MAX_REQUEST_BYTES,
  resolveEvolutionPrivateMediaUrl, type PrivateMediaConfiguration,
} from './evolution-private-media-profile';

export type PrivatePdfDocument = Readonly<{
  kind: 'private-document'; bytes: Uint8Array; byteLength: number; sha256: string;
  filename: string; mimeType: 'application/pdf'; caption: string;
}>;
export type SendPrivateMediaCommand = Readonly<{
  logicalMessageKey: string; attemptKey: string; toE164: `+${string}`; attachment: PrivatePdfDocument;
}>;
export type SendPrivateMediaResult =
  | Readonly<{ kind: 'accepted'; acceptedArtifact: 'document'; evidence: 'validated-document-status'; providerMessageId?: string; httpStatus: number }>
  | Readonly<{ kind: 'rejected'; code: SafeErrorCode; httpStatus?: number }>
  | Readonly<{ kind: 'uncertain'; code: SafeErrorCode; httpStatus?: number }>;
export interface PrivateMediaMessenger { send(command: SendPrivateMediaCommand): Promise<SendPrivateMediaResult>; }

function validDocument(document: PrivatePdfDocument): boolean {
  if (document.kind !== 'private-document' || document.mimeType !== 'application/pdf'
    || !(document.bytes instanceof Uint8Array) || document.byteLength !== document.bytes.byteLength
    || document.byteLength < 5 || document.byteLength > EVOLUTION_PRIVATE_MEDIA_MAX_RAW_BYTES
    || !document.filename.endsWith('.pdf') || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,126}\.pdf$/.test(document.filename)
    || document.caption.length < 1 || document.caption.length > 1000 || /[\u0000-\u001f\u007f]/.test(document.caption)
    || !Buffer.from(document.bytes.subarray(0, 5)).equals(Buffer.from('%PDF-'))) return false;
  return /^[a-f0-9]{64}$/.test(document.sha256)
    && createHash('sha256').update(document.bytes).digest('hex') === document.sha256;
}
function providerId(body: string): string | undefined {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as { key?: { id?: unknown }; id?: unknown };
    return safeProviderMessageId(parsed.key?.id ?? parsed.id) ?? undefined;
  } catch { return undefined; }
}

export class EvolutionPrivateMediaMessenger implements PrivateMediaMessenger {
  constructor(private readonly configuration: PrivateMediaConfiguration, private readonly transport: FetchTransport = fetch) {}

  async send(command: SendPrivateMediaCommand): Promise<SendPrivateMediaResult> {
    if (this.configuration.kind !== 'ready' || !/^\+[1-9]\d{7,14}$/.test(command.toE164) || !validDocument(command.attachment)) {
      return { kind: 'rejected', code: 'CONFIG_INVALID' };
    }
    const endpoint = resolveEvolutionPrivateMediaUrl(this.configuration);
    if (!endpoint) return { kind: 'rejected', code: 'CONFIG_INVALID' };
    const profile = this.configuration.profile;
    const body = JSON.stringify({
      number: command.toE164.slice(1), mediatype: 'document', mimetype: 'application/pdf',
      media: Buffer.from(command.attachment.bytes).toString('base64'), fileName: command.attachment.filename,
      caption: command.attachment.caption,
    });
    if (Buffer.byteLength(body) > EVOLUTION_PRIVATE_MEDIA_MAX_REQUEST_BYTES) return { kind: 'rejected', code: 'CONFIG_INVALID' };
    const authorization = profile.authorization.scheme === 'bearer' ? `Bearer ${profile.authorization.value}` : profile.authorization.value;
    const result = await executeEvolutionHttpRequest({ endpoint, body, timeoutMs: profile.timeoutMs,
      acceptedHttpStatuses: profile.acceptedHttpStatuses, headers: { [profile.authorization.header]: authorization }, transport: this.transport });
    if (result.kind !== 'accepted') return result;
    return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'validated-document-status',
      providerMessageId: providerId(result.body), httpStatus: result.response.status };
  }
}
