import {
  formatEvolutionAuthorization,
  resolveEvolutionDocumentUrl,
  type DispatchConfiguration,
  type EvolutionDocumentWireProfile,
} from './evolution-document-wire-profile';
import {
  isValidReceiptDocument,
  safeProviderMessageId,
  type ReceiptMessenger,
  type SendReceiptCommand,
  type SendReceiptResult,
} from './contracts';

const MAX_RESPONSE_BYTES = 64 * 1024;

type FetchTransport = (input: string, init: RequestInit) => Promise<Response>;

function setPath(target: Record<string, unknown>, path: readonly string[], value: string): void {
  let current = target;
  for (const segment of path.slice(0, -1)) {
    const existing = current[segment];
    const next = existing && typeof existing === 'object' && !Array.isArray(existing)
      ? existing as Record<string, unknown>
      : {};
    current[segment] = next;
    current = next;
  }
  const leaf = path.at(-1);
  if (!leaf) throw new Error('validated path must not be empty');
  current[leaf] = value;
}

function valueAtPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function requestBody(profile: EvolutionDocumentWireProfile, command: SendReceiptCommand): string {
  const body: Record<string, unknown> = {};
  setPath(body, profile.fields.destination, profile.destinationFormat === 'digits' ? command.toE164.slice(1) : command.toE164);
  setPath(body, profile.fields.mediaUrl, command.attachment.mediaUrl);
  setPath(body, profile.fields.filename, command.attachment.filename);
  setPath(body, profile.fields.mimeType, command.attachment.mimeType);
  setPath(body, profile.fields.caption, command.attachment.caption);
  if (profile.fields.mediaKind) setPath(body, profile.fields.mediaKind.path, profile.fields.mediaKind.value);
  return JSON.stringify(body);
}

async function readBoundedBody(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new RangeError('response-too-large');
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function parseJson(body: string): unknown | null {
  try { return JSON.parse(body) as unknown; } catch { return null; }
}

function isRedirectError(error: unknown): boolean {
  const cause = error && typeof error === 'object' ? (error as { cause?: unknown }).cause : undefined;
  return [error, cause].some((candidate) => candidate instanceof Error && /redirect/i.test(candidate.message));
}

function rejectedStatus(status: number): SendReceiptResult {
  if (status === 401 || status === 403) return { kind: 'rejected', code: 'PROVIDER_AUTH', httpStatus: status };
  if (status === 429) return { kind: 'rejected', code: 'PROVIDER_RATE_LIMIT', httpStatus: status };
  return { kind: 'rejected', code: 'PROVIDER_REJECTED', httpStatus: status };
}

function configuredJsonRejection(profile: EvolutionDocumentWireProfile, parsed: unknown, status: number): SendReceiptResult | null {
  if (profile.success.mode !== 'json-value') return null;
  const result = valueAtPath(parsed, profile.success.resultPath);
  if (typeof result !== 'string') return null;
  if (profile.success.mediaRejectedValues.includes(result)) return { kind: 'rejected', code: 'PROVIDER_MEDIA_REJECTED', httpStatus: status };
  if (profile.success.urlOnlyValues.includes(result)) return { kind: 'rejected', code: 'PROVIDER_ATTACHMENT_NOT_ACCEPTED', httpStatus: status };
  return null;
}

function resultFromResponse(profile: EvolutionDocumentWireProfile, response: Response, body: string): SendReceiptResult {
  const parsed = body ? parseJson(body) : null;
  const providerMessageId = profile.messageIdPath ? safeProviderMessageId(valueAtPath(parsed, profile.messageIdPath)) ?? undefined : undefined;
  if (response.status === 408 || response.status === 409) return { kind: 'uncertain', code: 'PROVIDER_NETWORK', httpStatus: response.status };
  if (response.status >= 400 && response.status < 500) return configuredJsonRejection(profile, parsed, response.status) ?? rejectedStatus(response.status);
  if (response.status >= 500) return { kind: 'uncertain', code: 'PROVIDER_SERVER', httpStatus: response.status };
  if (!profile.acceptedHttpStatuses.includes(response.status)) {
    return response.status >= 200 && response.status < 300
      ? { kind: 'uncertain', code: 'PROVIDER_MALFORMED_RESPONSE', httpStatus: response.status }
      : { kind: 'rejected', code: 'PROVIDER_REJECTED', httpStatus: response.status };
  }
  if (profile.success.mode === 'status-only') {
    return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'validated-document-status', providerMessageId, httpStatus: response.status };
  }
  const result = valueAtPath(parsed, profile.success.resultPath);
  if (typeof result !== 'string') return { kind: 'uncertain', code: 'PROVIDER_MALFORMED_RESPONSE', httpStatus: response.status };
  if (profile.success.acceptedValues.includes(result)) {
    return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', providerMessageId, httpStatus: response.status };
  }
  if (profile.success.mediaRejectedValues.includes(result)) return { kind: 'rejected', code: 'PROVIDER_MEDIA_REJECTED', httpStatus: response.status };
  if (profile.success.urlOnlyValues.includes(result)) return { kind: 'rejected', code: 'PROVIDER_ATTACHMENT_NOT_ACCEPTED', httpStatus: response.status };
  return { kind: 'uncertain', code: 'PROVIDER_MALFORMED_RESPONSE', httpStatus: response.status };
}

export class EvolutionDocumentHttpMessenger implements ReceiptMessenger {
  constructor(private readonly configuration: DispatchConfiguration, private readonly transport: FetchTransport = fetch) {}

  async send(command: SendReceiptCommand): Promise<SendReceiptResult> {
    if (this.configuration.kind !== 'ready' || !isValidReceiptDocument(command.attachment)) {
      return { kind: 'rejected', code: 'CONFIG_INVALID' };
    }
    const { profile } = this.configuration;
    const endpoint = resolveEvolutionDocumentUrl(this.configuration, profile.instance);
    if (!endpoint) return { kind: 'rejected', code: 'CONFIG_INVALID' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), profile.timeoutMs);
    try {
      const headers: Record<string, string> = {
        [profile.authorization.header]: formatEvolutionAuthorization(profile),
        'content-type': 'application/json',
      };
      if (profile.idempotencyHeader) headers[profile.idempotencyHeader] = command.logicalMessageKey;
      const response = await this.transport(endpoint, {
        method: 'POST', headers, body: requestBody(profile, command), signal: controller.signal, redirect: 'error',
      });
      const body = await readBoundedBody(response);
      return resultFromResponse(profile, response, body);
    } catch (error) {
      if (error instanceof RangeError) return { kind: 'uncertain', code: 'PROVIDER_RESPONSE_TOO_LARGE' };
      if (controller.signal.aborted) return { kind: 'uncertain', code: 'PROVIDER_TIMEOUT' };
      if (isRedirectError(error)) return { kind: 'rejected', code: 'PROVIDER_REJECTED' };
      return { kind: 'uncertain', code: 'PROVIDER_NETWORK' };
    } finally {
      clearTimeout(timeout);
    }
  }
}
