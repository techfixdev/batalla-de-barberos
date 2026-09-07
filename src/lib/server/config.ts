import { isValidAdminPasswordHash } from './admin/password';
import {
  parseEvolutionDocumentWireProfile,
  resolveEvolutionDocumentUrl as resolveDocumentUrl,
  type DispatchConfiguration,
} from './notifications/evolution-document-wire-profile';
import { parseEvolutionPrivateMediaProfile, type PrivateMediaConfiguration } from './notifications/evolution-private-media-profile';

type Environment = Record<string, string | undefined>;
type Readiness = Readonly<{ kind: 'ready' }> | Readonly<{ kind: 'blocked'; reason: 'admin-credentials-invalid' | 'database-credentials-invalid' }>;
export type SignupConfiguration = Readonly<{ kind: 'ready'; canonicalSiteOrigin: string }> | Readonly<{ kind: 'blocked'; reason: 'canonical-site-origin-invalid' }>;

export type AdminMessageRecipientHmacConfiguration =
  | Readonly<{ kind: 'ready'; secret: Uint8Array }>
  | Readonly<{ kind: 'blocked'; reason: 'recipient-hmac-secret-invalid' }>;

export type ServerConfig = Readonly<{
  signup: SignupConfiguration;
  admin: Readiness;
  database: Readiness;
  whatsappDispatch: DispatchConfiguration;
  whatsappPrivateMedia: PrivateMediaConfiguration;
  adminMessageRecipientHmac: AdminMessageRecipientHmacConfiguration;
  profileFingerprint?: string;
  privateMediaProfileFingerprint?: string;
}>;

function value(environment: Environment, name: string): string | null {
  const candidate = environment[name]?.trim();
  return candidate ? candidate : null;
}

function isCanonicalBase64(value: string): boolean {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
  return Buffer.from(value, 'base64').toString('base64') === value;
}

function canonicalOrigin(candidate: string, allowHttp: boolean): string | null {
  if (!/^https?:\/\/[^/?#]+\/?$/i.test(candidate) || /^https?:\/\/[^/?#]*@/i.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    const allowedProtocol = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
    return allowedProtocol && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash ? url.origin : null;
  } catch {
    return null;
  }
}

function localFallback(candidate: string | undefined): string | null {
  return candidate ? canonicalOrigin(candidate, true) : null;
}

function signupConfiguration(environment: Environment, fallbackOrigin?: string): SignupConfiguration {
  const production = environment.NODE_ENV === 'production';
  const configured = value(environment, 'CANONICAL_SITE_ORIGIN');
  const origin = configured ? canonicalOrigin(configured, !production) : !production ? localFallback(fallbackOrigin) : null;
  return origin ? { kind: 'ready', canonicalSiteOrigin: origin } : { kind: 'blocked', reason: 'canonical-site-origin-invalid' };
}

function adminReadiness(environment: Environment): Readiness {
  const secret = value(environment, 'ADMIN_SESSION_SECRET_B64');
  return isValidAdminPasswordHash(value(environment, 'ADMIN_PASSWORD_HASH') ?? undefined) && !!secret
    && isCanonicalBase64(secret) && Buffer.from(secret, 'base64').length >= 32
    ? { kind: 'ready' } : { kind: 'blocked', reason: 'admin-credentials-invalid' };
}

function databaseReadiness(environment: Environment): Readiness {
  const url = value(environment, 'TURSO_DATABASE_URL');
  const token = value(environment, 'TURSO_AUTH_TOKEN');
  try {
    return url && token && ['libsql:', 'https:', 'file:'].includes(new URL(url).protocol)
      ? { kind: 'ready' } : { kind: 'blocked', reason: 'database-credentials-invalid' };
  } catch {
    return { kind: 'blocked', reason: 'database-credentials-invalid' };
  }
}

function recipientHmacConfiguration(environment: Environment): AdminMessageRecipientHmacConfiguration {
  const encoded = value(environment, 'ADMIN_MESSAGE_RECIPIENT_HMAC_SECRET_B64');
  return encoded && isCanonicalBase64(encoded) && Buffer.from(encoded, 'base64').length >= 32
    ? { kind: 'ready', secret: new Uint8Array(Buffer.from(encoded, 'base64')) }
    : { kind: 'blocked', reason: 'recipient-hmac-secret-invalid' };
}

export function loadServerConfig(environment: Environment = process.env, options: Readonly<{ fallbackOrigin?: string }> = {}): ServerConfig {
  const whatsappDispatch = parseEvolutionDocumentWireProfile(environment);
  const whatsappPrivateMedia = parseEvolutionPrivateMediaProfile(environment);
  return {
    signup: signupConfiguration(environment, options.fallbackOrigin),
    admin: adminReadiness(environment),
    database: databaseReadiness(environment),
    whatsappDispatch,
    whatsappPrivateMedia,
    adminMessageRecipientHmac: recipientHmacConfiguration(environment),
    ...(whatsappDispatch.kind === 'ready'
      ? { profileFingerprint: whatsappDispatch.profile.fingerprint }
      : whatsappDispatch.fingerprint ? { profileFingerprint: whatsappDispatch.fingerprint } : {}),
    ...(whatsappPrivateMedia.kind === 'ready'
      ? { privateMediaProfileFingerprint: whatsappPrivateMedia.profile.fingerprint }
      : whatsappPrivateMedia.fingerprint ? { privateMediaProfileFingerprint: whatsappPrivateMedia.fingerprint } : {}),
  };
}

export function resolveEvolutionDocumentUrl(configuration: DispatchConfiguration, instance: string): string | null {
  return resolveDocumentUrl(configuration, instance);
}
