import { createClient } from '@libsql/client';
import { pathToFileURL } from 'node:url';

import { ADMIN_WHATSAPP_STATEMENTS, ADMIN_WHATSAPP_VERSION } from './migrations/002_admin_whatsapp.mjs';
import { REGISTRATION_DELETION_STATEMENTS, REGISTRATION_DELETION_VERSION } from './migrations/003_registration_numbers_and_deletion.mjs';
import { ADMIN_MESSAGE_JOBS_STATEMENTS, ADMIN_MESSAGE_JOBS_VERSION } from './migrations/004_admin_message_jobs.mjs';

const BASE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS barber_signups (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    barbershop TEXT,
    experience TEXT NOT NULL,
    accepted_rules INTEGER NOT NULL CHECK (accepted_rules = 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS barber_signups_created_at_idx ON barber_signups (created_at DESC);
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`;

export async function migrate(database) {
  await database.executeMultiple(BASE_SCHEMA);
  const migrations = [
    [ADMIN_WHATSAPP_VERSION, ADMIN_WHATSAPP_STATEMENTS],
    [REGISTRATION_DELETION_VERSION, REGISTRATION_DELETION_STATEMENTS],
    [ADMIN_MESSAGE_JOBS_VERSION, ADMIN_MESSAGE_JOBS_STATEMENTS],
  ];
  for (const [version, statements] of migrations) {
    const applied = await database.execute({ sql: 'SELECT version FROM schema_migrations WHERE version = ?', args: [version] });
    if (applied.rows.length > 0) continue;
    await database.batch([
      ...statements.map((sql) => ({ sql })),
      { sql: 'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', args: [version, new Date().toISOString()] },
    ], 'write');
  }
}

async function runFromCommandLine() {
  const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;
  if (!url) throw new Error('Set TURSO_DATABASE_URL to an explicitly selected database before running migrations.');

  const database = createClient(authToken ? { url, authToken } : { url });
  try {
    await migrate(database);
    console.log('Versioned migration completed.');
  } finally {
    database.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runFromCommandLine();
}
