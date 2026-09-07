import type { Client } from '@libsql/client';

import { createRegistrationXlsx, createRegistrationPdf } from '../../../../lib/server/admin/registration-export-documents';
import { loadRegistrationExportAssets } from '../../../../lib/server/admin/registration-export-assets';
import { createRegistrationReadRepository } from '../../../../lib/server/admin/registration-read-repository';
import { createAuthenticatedRegistrationExportRoute } from '../../../../lib/server/admin/registration-export-route';
import { createRegistrationExportService } from '../../../../lib/server/admin/registration-export-service';
import { createAdminSessionRepository } from '../../../../lib/server/admin/session-repository';

export function createRegistrationExportRoute(options: Readonly<{ database?: Client; sessionSecretB64?: string }> = {}) {
  const database = options.database;
  return createAuthenticatedRegistrationExportRoute({
    sessionSecretB64: options.sessionSecretB64,
    sessions: database && createAdminSessionRepository(database),
    service: database && createRegistrationExportService({ repository: createRegistrationReadRepository(database), loadAssets: loadRegistrationExportAssets,
      createXlsx: createRegistrationXlsx, createPdf: createRegistrationPdf }),
  });
}

export const POST = async (context: any) => {
  try {
    const { getDatabase } = await import('../../../../lib/database');
    return createRegistrationExportRoute({ database: getDatabase(), sessionSecretB64: import.meta.env.ADMIN_SESSION_SECRET_B64 })(context);
  } catch { return createRegistrationExportRoute()(context); }
};
