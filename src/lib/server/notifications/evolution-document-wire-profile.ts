import { createHash } from 'node:crypto';

export type DispatchConfiguration =
  | Readonly<{ kind: 'blocked'; reason: 'dispatch-disabled' | 'invalid-profile' | 'profile-fingerprint-mismatch'; fingerprint?: string }>
  | Readonly<{ kind: 'ready'; profile: EvolutionDocumentWireProfile }>;

export type EvolutionDocumentWireProfile = Readonly<{
  baseUrl: string;
  instance: string;
  pathTemplate: string;
  authorization: Readonly<{ header: string; scheme: 'raw' | 'bearer'; value: string }>;
  fields: Readonly<{ destination: string[]; mediaUrl: string[]; filename: string[]; mimeType: string[]; caption: string[]; mediaKind?: Readonly<{ path: string[]; value: string }> }>;
  destinationFormat: 'e164' | 'digits';
  acceptedHttpStatuses: number[];
  success: Readonly<{ mode: 'status-only' } | { mode: 'json-value'; resultPath: string[]; acceptedValues: string[]; mediaRejectedValues: string[]; urlOnlyValues: string[] }>;
  messageIdPath?: string[];
  idempotencyHeader?: string;
  timeoutMs: number;
  fingerprint: string;
}>;

type Environment = Record<string, string | undefined>;
const dangerousSegments = new Set(['__proto__', 'prototype', 'constructor']);
const headerPattern = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const segmentPattern = /^[A-Za-z_$][A-Za-z0-9_$-]*$/;

function value(environment: Environment, name: string): string | null {
  const candidate = environment[name]?.trim();
  return candidate ? candidate : null;
}

function path(environment: Environment, name: string, required = true): string[] | null {
  const candidate = value(environment, name);
  if (!candidate) return required ? null : [];
  const parts = candidate.split('.');
  return parts.every((part) => segmentPattern.test(part) && !dangerousSegments.has(part)) ? parts : null;
}

function scalarList(environment: Environment, name: string, required = false): string[] | null {
  const candidate = value(environment, name);
  if (!candidate) return required ? null : [];
  const entries = candidate.split(',').map((entry) => entry.trim());
  return entries.every((entry) => entry && entry.length <= 200) && new Set(entries).size === entries.length ? entries.sort() : null;
}

function statuses(environment: Environment): number[] | null {
  const entries = scalarList(environment, 'EVOLUTION_API_ACCEPTED_HTTP_STATUSES', true);
  if (!entries) return null;
  const values = entries.map(Number);
  return entries.every((entry) => /^\d{3}$/.test(entry)) && values.every((status) => status >= 200 && status < 300)
    && new Set(values).size === values.length ? values.sort((a, b) => a - b) : null;
}

function pathsCollide(left: string[], right: string[]): boolean {
  return left.join('.') === right.join('.') || left.every((segment, index) => segment === right[index]) || right.every((segment, index) => segment === left[index]);
}

function requestPaths(environment: Environment): EvolutionDocumentWireProfile['fields'] | null {
  const destination = path(environment, 'EVOLUTION_API_DESTINATION_FIELD_PATH');
  const mediaUrl = path(environment, 'EVOLUTION_API_MEDIA_URL_FIELD_PATH');
  const filename = path(environment, 'EVOLUTION_API_FILENAME_FIELD_PATH');
  const mimeType = path(environment, 'EVOLUTION_API_MIME_TYPE_FIELD_PATH');
  const caption = path(environment, 'EVOLUTION_API_CAPTION_FIELD_PATH');
  const kindPath = path(environment, 'EVOLUTION_API_MEDIA_KIND_FIELD_PATH', false);
  const kindValue = value(environment, 'EVOLUTION_API_MEDIA_KIND_VALUE');
  if (!destination || !mediaUrl || !filename || !mimeType || !caption || kindPath === null || Boolean(kindPath.length) !== Boolean(kindValue)) return null;
  const all = [destination, mediaUrl, filename, mimeType, caption, ...(kindPath.length ? [kindPath] : [])];
  if (all.some((current, index) => all.some((other, otherIndex) => index !== otherIndex && pathsCollide(current, other)))) return null;
  return { destination, mediaUrl, filename, mimeType, caption, ...(kindPath.length && kindValue ? { mediaKind: { path: kindPath, value: kindValue } } : {}) };
}

function baseUrl(environment: Environment): string | null {
  const candidate = value(environment, 'EVOLUTION_API_BASE_URL');
  if (!candidate || /[?#]/.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' ? url.toString() : null;
  } catch { return null; }
}

function pathTemplate(environment: Environment): string | null {
  const candidate = value(environment, 'EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE');
  return candidate && candidate.startsWith('/') && !candidate.startsWith('//') && !/[?#\\]/.test(candidate)
    && candidate.split('{instance}').length === 2 && !candidate.split('/').some((part) => part === '.' || part === '..') ? candidate : null;
}

function unsafeHeader(candidate: string): boolean {
  return !headerPattern.test(candidate) || candidate.toLowerCase() === 'content-type';
}

function timeout(environment: Environment): number | null {
  const candidate = value(environment, 'EVOLUTION_API_TIMEOUT_MS');
  if (!candidate) return 7000;
  const milliseconds = Number(candidate);
  return /^\d+$/.test(candidate) && Number.isInteger(milliseconds) && milliseconds >= 1000 && milliseconds <= 15000 ? milliseconds : null;
}

function fingerprint({ authorization, ...profile }: Omit<EvolutionDocumentWireProfile, 'fingerprint'>): string {
  const { value: _secret, ...authorizationShape } = authorization;
  return createHash('sha256').update(JSON.stringify({ ...profile, authorization: authorizationShape })).digest('hex');
}

export function parseEvolutionDocumentWireProfile(environment: Environment): DispatchConfiguration {
  if (value(environment, 'WHATSAPP_DISPATCH_ENABLED') !== 'true') return { kind: 'blocked', reason: 'dispatch-disabled' };
  const base = baseUrl(environment);
  const template = pathTemplate(environment);
  const instance = value(environment, 'EVOLUTION_API_INSTANCE');
  const key = value(environment, 'EVOLUTION_API_KEY');
  const header = value(environment, 'EVOLUTION_API_AUTH_HEADER');
  const scheme = value(environment, 'EVOLUTION_API_AUTH_SCHEME');
  const fields = requestPaths(environment);
  const destinationFormat = value(environment, 'EVOLUTION_API_DESTINATION_FORMAT');
  const acceptedHttpStatuses = statuses(environment);
  const mode = value(environment, 'EVOLUTION_API_SUCCESS_MODE');
  const messageIdPath = path(environment, 'EVOLUTION_API_MESSAGE_ID_PATH', false);
  const idempotencyHeader = value(environment, 'EVOLUTION_API_IDEMPOTENCY_HEADER');
  const timeoutMs = timeout(environment);
  if (!base || !template || !instance || !/^[A-Za-z0-9._-]{1,100}$/.test(instance) || !key || !header || unsafeHeader(header)
    || (scheme !== 'raw' && scheme !== 'bearer') || !fields || (destinationFormat !== 'e164' && destinationFormat !== 'digits')
    || !acceptedHttpStatuses || !timeoutMs || (mode !== 'status-only' && mode !== 'json-value') || messageIdPath === null
    || (idempotencyHeader !== null && (unsafeHeader(idempotencyHeader) || idempotencyHeader.toLowerCase() === header.toLowerCase()))) return { kind: 'blocked', reason: 'invalid-profile' };
  const resultPath = path(environment, 'EVOLUTION_API_RESULT_FIELD_PATH', false);
  const acceptedValues = scalarList(environment, 'EVOLUTION_API_ACCEPTED_VALUES', mode === 'json-value');
  const mediaRejectedValues = scalarList(environment, 'EVOLUTION_API_MEDIA_REJECTED_VALUES');
  const urlOnlyValues = scalarList(environment, 'EVOLUTION_API_URL_ONLY_VALUES');
  if (resultPath === null || !acceptedValues || !mediaRejectedValues || !urlOnlyValues || (mode === 'json-value' && !resultPath.length)
    || (mode === 'status-only' && (resultPath.length || acceptedValues.length || mediaRejectedValues.length || urlOnlyValues.length))) return { kind: 'blocked', reason: 'invalid-profile' };
  const profile = {
    baseUrl: base, instance, pathTemplate: template, authorization: { header, scheme, value: key }, fields, destinationFormat, timeoutMs,
    acceptedHttpStatuses, success: mode === 'status-only' ? { mode } : { mode, resultPath, acceptedValues, mediaRejectedValues, urlOnlyValues },
    ...(messageIdPath.length ? { messageIdPath } : {}), ...(idempotencyHeader ? { idempotencyHeader } : {}),
  } as Omit<EvolutionDocumentWireProfile, 'fingerprint'>;
  const calculatedFingerprint = fingerprint(profile);
  return value(environment, 'EVOLUTION_API_VALIDATED_PROFILE_SHA256') === calculatedFingerprint
    ? { kind: 'ready', profile: { ...profile, fingerprint: calculatedFingerprint } }
    : { kind: 'blocked', reason: 'profile-fingerprint-mismatch', fingerprint: calculatedFingerprint };
}

export function formatEvolutionAuthorization(profile: EvolutionDocumentWireProfile): string {
  return profile.authorization.scheme === 'bearer' ? `Bearer ${profile.authorization.value}` : profile.authorization.value;
}

export function resolveEvolutionDocumentUrl(configuration: DispatchConfiguration, instance: string): string | null {
  if (configuration.kind !== 'ready' || !/^[A-Za-z0-9._-]{1,100}$/.test(instance)) return null;
  const base = new URL(configuration.profile.baseUrl);
  const url = new URL(configuration.profile.pathTemplate.replace('{instance}', encodeURIComponent(instance)), base);
  return url.protocol === 'https:' && url.origin === base.origin ? url.toString() : null;
}
