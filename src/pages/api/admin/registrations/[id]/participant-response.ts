import type { Client } from '@libsql/client';

import { createAuthenticatedLifecycleRoute, type LifecycleService } from '../../../../../lib/server/admin/authenticated-form';
import { createRegistrationLifecycleRepository } from '../../../../../lib/server/admin/registration-lifecycle-repository';
import { createRegistrationManagementService } from '../../../../../lib/server/admin/registration-management-service';
import { createAdminSessionRepository } from '../../../../../lib/server/admin/session-repository';

type Options = Readonly<{
  database?: Client;
  sessionSecretB64?: string;
  sessions?: Pick<ReturnType<typeof createAdminSessionRepository>, 'findByTokenHash'>;
  service?: LifecycleService;
}>;

export function createParticipantResponseRoute(options: Options = {}) {
  const database = options.database;
  return createAuthenticatedLifecycleRoute({
    field: 'participantResponse',
    sessionSecretB64: options.sessionSecretB64,
    sessions: options.sessions ?? (database && createAdminSessionRepository(database)),
    service: options.service ?? (database && createRegistrationManagementService({
      repository: createRegistrationLifecycleRepository(database),
    })),
  });
}

export const POST = async (context: any) => {
  try {
    const { getDatabase } = await import('../../../../../lib/database');
    return createParticipantResponseRoute({ database: getDatabase(), sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64 })(context);
  } catch {
    return createParticipantResponseRoute()(context);
  }
};
