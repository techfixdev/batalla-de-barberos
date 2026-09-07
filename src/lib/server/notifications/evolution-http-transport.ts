import type { SafeErrorCode, SendReceiptResult } from './contracts';

export const EVOLUTION_MAX_RESPONSE_BYTES = 64 * 1024;
export type FetchTransport = (input: string, init: RequestInit) => Promise<Response>;

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
      if (size > EVOLUTION_MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new RangeError('response-too-large');
      }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function isRedirectError(error: unknown): boolean {
  const cause = error && typeof error === 'object' ? (error as { cause?: unknown }).cause : undefined;
  return [error, cause].some((candidate) => candidate instanceof Error && /redirect/i.test(candidate.message));
}

export type EvolutionAcceptedResponse = Readonly<{ kind: 'accepted'; body: string; response: Response }>;
export type EvolutionHttpOutcome = EvolutionAcceptedResponse | Exclude<SendReceiptResult, { kind: 'accepted' }>;

/** Performs the common bounded, non-redirecting Evolution request. It never returns provider response text on an error. */
export async function executeEvolutionHttpRequest(input: Readonly<{
  endpoint: string; headers: Readonly<Record<string, string>>; body: string; timeoutMs: number;
  acceptedHttpStatuses: readonly number[]; transport?: FetchTransport;
}>): Promise<EvolutionHttpOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await (input.transport ?? fetch)(input.endpoint, {
      method: 'POST', headers: { ...input.headers, 'content-type': 'application/json' }, body: input.body,
      signal: controller.signal, redirect: 'error',
    });
    const body = await readBoundedBody(response);
    if (response.status === 408 || response.status === 409) return { kind: 'uncertain', code: 'PROVIDER_NETWORK', httpStatus: response.status };
    if (response.status === 401 || response.status === 403) return { kind: 'rejected', code: 'PROVIDER_AUTH', httpStatus: response.status };
    if (response.status === 429) return { kind: 'rejected', code: 'PROVIDER_RATE_LIMIT', httpStatus: response.status };
    if (response.status >= 400 && response.status < 500) return { kind: 'rejected', code: 'PROVIDER_REJECTED', httpStatus: response.status };
    if (response.status >= 500) return { kind: 'uncertain', code: 'PROVIDER_SERVER', httpStatus: response.status };
    if (!input.acceptedHttpStatuses.includes(response.status)) return response.status >= 200 && response.status < 300
      ? { kind: 'uncertain', code: 'PROVIDER_MALFORMED_RESPONSE', httpStatus: response.status }
      : { kind: 'rejected', code: 'PROVIDER_REJECTED', httpStatus: response.status };
    return { kind: 'accepted', body, response };
  } catch (error) {
    if (error instanceof RangeError) return { kind: 'uncertain', code: 'PROVIDER_RESPONSE_TOO_LARGE' };
    if (controller.signal.aborted) return { kind: 'uncertain', code: 'PROVIDER_TIMEOUT' };
    if (isRedirectError(error)) return { kind: 'rejected', code: 'PROVIDER_REJECTED' };
    return { kind: 'uncertain', code: 'PROVIDER_NETWORK' };
  } finally { clearTimeout(timer); }
}

export function safeEvolutionErrorCode(value: unknown): SafeErrorCode {
  return typeof value === 'string' ? value as SafeErrorCode : 'PROVIDER_REJECTED';
}
