import type { Client } from '@libsql/client';

import { loadServerConfig } from '../config';
import { EvolutionPrivateMediaMessenger, type PrivateMediaMessenger } from '../notifications/evolution-private-media-messenger';
import { createAdminMessageJobRepository } from './admin-message-job-repository';
import { createOrganizationListPdf, loadHistoricalConfirmationPdf } from './admin-message-document-loader';
import { createAdminMessageService } from './admin-message-service';

export function createAdminMessageRuntime(database: Client, environment: Record<string, unknown>, messenger?: PrivateMediaMessenger) {
  const stringEnvironment = Object.fromEntries(Object.entries(environment).flatMap(([key, value]) =>
    typeof value === 'string' ? [[key, value]] : typeof value === 'boolean' ? [[key, String(value)]] : []));
  const config = loadServerConfig(stringEnvironment);
  const ready = config.whatsappPrivateMedia.kind === 'ready' && config.adminMessageRecipientHmac.kind === 'ready';
  if (config.adminMessageRecipientHmac.kind !== 'ready') return Object.freeze({ ready: false as const, reason: 'recipient-hmac-secret-invalid' as const });
  const repository = createAdminMessageJobRepository(database, { recipientHmacSecret: config.adminMessageRecipientHmac.secret });
  const service = createAdminMessageService({ ready, repository,
    messenger: messenger ?? new EvolutionPrivateMediaMessenger(config.whatsappPrivateMedia),
    loadConfirmationDocument: loadHistoricalConfirmationPdf, createOrganizationDocument: createOrganizationListPdf });
  if (!ready) return Object.freeze({ ready: false as const, reason: config.whatsappPrivateMedia.kind === 'blocked' ? config.whatsappPrivateMedia.reason : 'private-media-disabled' as const, repository, service });
  return Object.freeze({ ready: true as const, repository, service });
}
