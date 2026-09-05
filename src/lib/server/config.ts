import {
  parseEvolutionDocumentWireProfile,
  resolveEvolutionDocumentUrl as resolveDocumentUrl,
  type DispatchConfiguration,
} from './notifications/evolution-document-wire-profile';

export type ServerConfig = Readonly<{
  whatsappDispatch: DispatchConfiguration;
  profileFingerprint?: string;
}>;

export function loadServerConfig(environment: Record<string, string | undefined> = process.env): ServerConfig {
  const whatsappDispatch = parseEvolutionDocumentWireProfile(environment);
  return {
    whatsappDispatch,
    ...(whatsappDispatch.kind === 'ready'
      ? { profileFingerprint: whatsappDispatch.profile.fingerprint }
      : whatsappDispatch.fingerprint ? { profileFingerprint: whatsappDispatch.fingerprint } : {}),
  };
}

export function resolveEvolutionDocumentUrl(configuration: DispatchConfiguration, instance: string): string | null {
  return resolveDocumentUrl(configuration, instance);
}
