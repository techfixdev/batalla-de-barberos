import type { Client } from '@libsql/client';

import { createAdminMessageRetryRoute } from '../../../../../lib/server/admin/admin-message-route';
import { createAdminMessageRuntime } from '../../../../../lib/server/admin/admin-message-runtime';
import { createAdminSessionRepository } from '../../../../../lib/server/admin/session-repository';

export function createMessageRetryRoute(options: Readonly<{ database?: Client; sessionSecretB64?: string; environment?: Record<string, string | undefined> }> = {}) {
  const database = options.database, runtime = database && createAdminMessageRuntime(database, options.environment ?? {});
  return createAdminMessageRetryRoute({ sessionSecretB64: options.sessionSecretB64, sessions: database && createAdminSessionRepository(database), service: runtime && 'service' in runtime ? runtime.service : undefined,
    async resolveRecipient(jobId, supplied) {
      if (!runtime || !('repository' in runtime)) return null;
      const job = await runtime.repository.get(jobId); if (!job) return null;
      return job.kind === 'confirmation' ? runtime.repository.getConfirmationRecipient(jobId) : supplied ?? null;
    } });
}
export const POST = async (context: any) => {
  try { const { getDatabase } = await import('../../../../../lib/database'); return createMessageRetryRoute({ database: getDatabase(), sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64, environment: import.meta.env })(context); }
  catch { return createMessageRetryRoute()(context); }
};
