import type { Client } from '@libsql/client';

import { createConfirmationSendRoute } from '../../../../../../lib/server/admin/admin-message-route';
import { createAdminMessageRuntime } from '../../../../../../lib/server/admin/admin-message-runtime';
import { createRegistrationReadRepository } from '../../../../../../lib/server/admin/registration-read-repository';
import { createAdminSessionRepository } from '../../../../../../lib/server/admin/session-repository';

export function createRegistrationConfirmationSendRoute(options: Readonly<{ database?: Client; sessionSecretB64?: string; environment?: Record<string, string | undefined> }> = {}) {
  const database = options.database, runtime = database && createAdminMessageRuntime(database, options.environment ?? {}), reads = database && createRegistrationReadRepository(database);
  return createConfirmationSendRoute({ sessionSecretB64: options.sessionSecretB64, sessions: database && createAdminSessionRepository(database),
    service: runtime && 'service' in runtime ? runtime.service : undefined,
    async resolveRegistration(id) { const item = await reads?.findById(id); return item?.phoneE164 && item.termsVersion
      ? { phoneE164: item.phoneE164 as `+${string}`, termsVersion: item.termsVersion, reviewState: item.reviewState } : null; } });
}

export const POST = async (context: any) => {
  try { const { getDatabase } = await import('../../../../../../lib/database'); return createRegistrationConfirmationSendRoute({ database: getDatabase(), sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64, environment: import.meta.env })(context); }
  catch { return createRegistrationConfirmationSendRoute()(context); }
};
