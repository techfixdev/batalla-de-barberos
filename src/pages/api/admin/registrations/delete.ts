import type { Client } from '@libsql/client';

import { createAuthenticatedRegistrationDeletionRoute } from '../../../../lib/server/admin/registration-deletion-route';
import { createRegistrationDeletionRepository } from '../../../../lib/server/admin/registration-deletion-repository';
import { createRegistrationDeletionService } from '../../../../lib/server/admin/registration-deletion-service';
import { createAdminSessionRepository } from '../../../../lib/server/admin/session-repository';

export function createRegistrationDeletionRoute(options: Readonly<{ database?: Client; sessionSecretB64?: string }> = {}) {
  const database = options.database;
  return createAuthenticatedRegistrationDeletionRoute({
    sessionSecretB64: options.sessionSecretB64,
    sessions: database && createAdminSessionRepository(database),
    service: database && createRegistrationDeletionService({ repository: createRegistrationDeletionRepository(database) }),
  });
}

export const POST = async (context: any) => {
  try {
    const { getDatabase } = await import('../../../../lib/database');
    return createRegistrationDeletionRoute({ database: getDatabase(), sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64 })(context);
  } catch {
    return createRegistrationDeletionRoute()(context);
  }
};
