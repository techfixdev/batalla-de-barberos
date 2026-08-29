import { createClient } from '@libsql/client';

const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;

if (!url || !authToken) {
  console.error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before running migrations.');
  process.exitCode = 1;
} else {
  const database = createClient({ url, authToken });

  await database.executeMultiple(`
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

    CREATE INDEX IF NOT EXISTS barber_signups_created_at_idx
      ON barber_signups (created_at DESC);
  `);

  database.close();
  console.log('Turso migration completed.');
}
