import { createHash } from 'node:crypto';

export const EVOLUTION_PRIVATE_MEDIA_MAX_RAW_BYTES = 4 * 1024 * 1024;
export const EVOLUTION_PRIVATE_MEDIA_MAX_REQUEST_BYTES = 6 * 1024 * 1024;

export type EvolutionPrivateMediaProfile = Readonly<{
  baseUrl: string;
  instance: string;
  authorization: Readonly<{ header: string; scheme: 'raw' | 'bearer'; value: string }>;
  acceptedHttpStatuses: readonly number[];
  timeoutMs: number;
  fingerprint: string;
}>;
export type PrivateMediaConfiguration =
  | Readonly<{ kind: 'ready'; profile: EvolutionPrivateMediaProfile }>
  | Readonly<{ kind: 'blocked'; reason: 'dispatch-disabled' | 'private-media-disabled' | 'invalid-profile' | 'profile-fingerprint-mismatch'; fingerprint?: string }>;

type Environment = Record<string, string | undefined>;
const HEADER = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const INSTANCE = /^[A-Za-z0-9._-]{1,100}$/;

function value(environment: Environment, name: string): string | null {
  const candidate = environment[name]?.trim();
  return candidate ? candidate : null;
}
function baseUrl(environment: Environment): string | null {
  const candidate = value(environment, 'EVOLUTION_API_BASE_URL');
  if (!candidate || /[?#]/.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' ? url.toString() : null;
  } catch { return null; }
}
function statuses(environment: Environment): number[] | null {
  const raw = value(environment, 'EVOLUTION_API_ACCEPTED_HTTP_STATUSES');
  if (!raw) return null;
  const entries = raw.split(',').map((item) => item.trim());
  const parsed = entries.map(Number);
  return entries.every((item) => /^\d{3}$/.test(item)) && parsed.every((item) => item >= 200 && item < 300)
    && new Set(parsed).size === parsed.length ? parsed.sort((a, b) => a - b) : null;
}
function timeout(environment: Environment): number | null {
  const raw = value(environment, 'EVOLUTION_API_TIMEOUT_MS') ?? '7000';
  const parsed = Number(raw);
  return /^\d+$/.test(raw) && Number.isInteger(parsed) && parsed >= 1000 && parsed <= 15_000 ? parsed : null;
}
function fingerprint(profile: Omit<EvolutionPrivateMediaProfile, 'fingerprint'>): string {
  const { value: _secret, ...authorization } = profile.authorization;
  return createHash('sha256').update(JSON.stringify({
    version: 'evolution-2.3.7-private-document-v1', baseUrl: profile.baseUrl, instance: profile.instance,
    authorization, acceptedHttpStatuses: profile.acceptedHttpStatuses, timeoutMs: profile.timeoutMs,
    endpoint: '/message/sendMedia/{instance}', destinationFormat: 'digits', fields: ['number', 'mediatype', 'mimetype', 'media', 'fileName', 'caption'],
    maxRawBytes: EVOLUTION_PRIVATE_MEDIA_MAX_RAW_BYTES, maxRequestBytes: EVOLUTION_PRIVATE_MEDIA_MAX_REQUEST_BYTES,
  })).digest('hex');
}

export function parseEvolutionPrivateMediaProfile(environment: Environment): PrivateMediaConfiguration {
  if (value(environment, 'WHATSAPP_DISPATCH_ENABLED') !== 'true') return { kind: 'blocked', reason: 'dispatch-disabled' };
  if (value(environment, 'WHATSAPP_PRIVATE_MEDIA_ENABLED') !== 'true') return { kind: 'blocked', reason: 'private-media-disabled' };
  const base = baseUrl(environment), instance = value(environment, 'EVOLUTION_API_INSTANCE'), key = value(environment, 'EVOLUTION_API_KEY');
  const header = value(environment, 'EVOLUTION_API_AUTH_HEADER'), scheme = value(environment, 'EVOLUTION_API_AUTH_SCHEME');
  const acceptedHttpStatuses = statuses(environment), timeoutMs = timeout(environment);
  if (!base || !instance || !INSTANCE.test(instance) || !key || !header || !HEADER.test(header) || header.toLowerCase() === 'content-type'
    || (scheme !== 'raw' && scheme !== 'bearer') || !acceptedHttpStatuses || !timeoutMs) return { kind: 'blocked', reason: 'invalid-profile' };
  const candidate: Omit<EvolutionPrivateMediaProfile, 'fingerprint'> = {
    baseUrl: base, instance, authorization: { header, scheme, value: key }, acceptedHttpStatuses, timeoutMs,
  };
  const calculated = fingerprint(candidate);
  return value(environment, 'EVOLUTION_API_PRIVATE_MEDIA_VALIDATED_PROFILE_SHA256') === calculated
    ? { kind: 'ready', profile: { ...candidate, fingerprint: calculated } }
    : { kind: 'blocked', reason: 'profile-fingerprint-mismatch', fingerprint: calculated };
}

export function resolveEvolutionPrivateMediaUrl(configuration: PrivateMediaConfiguration): string | null {
  if (configuration.kind !== 'ready') return null;
  const url = new URL(`/message/sendMedia/${encodeURIComponent(configuration.profile.instance)}`, configuration.profile.baseUrl);
  return url.origin === new URL(configuration.profile.baseUrl).origin && url.protocol === 'https:' ? url.toString() : null;
}
