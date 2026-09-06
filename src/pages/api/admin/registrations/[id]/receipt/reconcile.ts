import type { Client } from '@libsql/client';

import { createAuthenticatedReceiptRecoveryRoute, createConfiguredReceiptRecoveryService, type ReceiptRecoveryRouteService } from '../../../../../../lib/server/admin/receipt-recovery-route';
import { createAdminSessionRepository } from '../../../../../../lib/server/admin/session-repository';

type Options = Readonly<{
  database?: Client;
  sessionSecretB64?: string;
  sessions?: Pick<ReturnType<typeof createAdminSessionRepository>, 'findByTokenHash'>;
  service?: ReceiptRecoveryRouteService;
}>;

export function createReceiptReconcileRoute(options: Options = {}) {
  const database = options.database;
  return createAuthenticatedReceiptRecoveryRoute({
    action: 'reconcile', sessionSecretB64: options.sessionSecretB64,
    sessions: options.sessions ?? (database && createAdminSessionRepository(database)),
    service: options.service ?? (database && createConfiguredReceiptRecoveryService(database, import.meta.env as Record<string, string | undefined>)),
  });
}

export const POST = async (context: any) => {
  let database: Client;
  try {
    const { getDatabase } = await import('../../../../../../lib/database');
    database = getDatabase();
  } catch {
    return createReceiptReconcileRoute()(context);
  }
  return createReceiptReconcileRoute({ database, sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64 })(context);
};
