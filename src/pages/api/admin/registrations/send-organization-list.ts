import type { Client } from '@libsql/client';

import { createOrganizationSendRoute } from '../../../../lib/server/admin/admin-message-route';
import { createAdminMessageRuntime } from '../../../../lib/server/admin/admin-message-runtime';
import { createAdminSessionRepository } from '../../../../lib/server/admin/session-repository';

export function createOrganizationListSendRoute(options: Readonly<{ database?: Client; sessionSecretB64?: string; environment?: Record<string, string | undefined> }> = {}) {
  const database = options.database, runtime = database && createAdminMessageRuntime(database, options.environment ?? {});
  return createOrganizationSendRoute({ sessionSecretB64: options.sessionSecretB64, sessions: database && createAdminSessionRepository(database), service: runtime && 'service' in runtime ? runtime.service : undefined });
}
export const POST = async (context: any) => {
  try { const { getDatabase } = await import('../../../../lib/database'); return createOrganizationListSendRoute({ database: getDatabase(), sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64, environment: import.meta.env })(context); }
  catch { return createOrganizationListSendRoute()(context); }
};
