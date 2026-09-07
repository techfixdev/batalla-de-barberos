import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';

const databases: Array<ReturnType<typeof createClient>> = [];
const now = '2026-04-19T00:00:00.000Z';

function legacyDatabase() {
  const database = createClient({ url: 'file::memory:' });
  databases.push(database);
  return database;
}

async function createLegacySignup(database: ReturnType<typeof createClient>) {
  await database.executeMultiple(`
    CREATE TABLE barber_signups (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL, barbershop TEXT, experience TEXT NOT NULL,
      accepted_rules INTEGER NOT NULL CHECK (accepted_rules = 1),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO barber_signups (id, full_name, email, phone, barbershop, experience, accepted_rules)
    VALUES ('historic-1', 'Registro anterior', 'historic@example.com', '011 15 2345 6789', NULL, 'profesional', 1);
  `);
}

function insertNotification(database: ReturnType<typeof createClient>, id: string, key: string, registrationId: string, termsVersion: string) {
  return database.execute({
    sql: `INSERT INTO receipt_notifications (id, logical_message_key, registration_id, terms_version, attachment_kind, media_url, media_filename, media_mime_type, media_sha256, caption_text, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'document', 'https://example.test/terms.pdf', 'terms.pdf', 'application/pdf', ?, 'Acuse', 'pending', ?, ?)`,
    args: [id, key, registrationId, termsVersion, 'a'.repeat(64), now, now],
  });
}

function insertAttempt(database: ReturnType<typeof createClient>, id: string, key: string, number: number) {
  return database.execute({
    sql: `INSERT INTO receipt_notification_attempts (id, notification_id, attempt_no, attempt_key, trigger, outcome, started_at)
      VALUES (?, 'receipt-1', ?, ?, 'automatic', 'in_progress', ?)`,
    args: [id, number, key, now],
  });
}

afterEach(() => databases.splice(0).forEach((database) => database.close()));

describe('versioned registration migrations', () => {
  it('preserves historical registrations with explicit safe defaults and one recorded migration', async () => {
    const database = legacyDatabase();
    await createLegacySignup(database);
    await migrate(database);
    await migrate(database);

    const history = await database.execute({
      sql: `SELECT phone, phone_e164, review_state, participant_response_state, receipt_required, terms_version, state_version
        FROM barber_signups WHERE id = ?`, args: ['historic-1'],
    });
    expect(history.rows).toEqual([{
      phone: '011 15 2345 6789', phone_e164: null, review_state: 'received',
      participant_response_state: 'not_requested', receipt_required: 0, terms_version: null, state_version: 0,
    }]);
    expect((await database.execute('SELECT version FROM schema_migrations ORDER BY version')).rows)
      .toEqual([{ version: '002_admin_whatsapp' }, { version: '003_registration_numbers_and_deletion' }, { version: '004_admin_message_jobs' }]);
    expect((await database.execute('SELECT id FROM receipt_notifications WHERE registration_id = ?', ['historic-1'])).rows).toEqual([]);
  });

  it('creates every required index and enforces registration terms notification uniqueness', async () => {
    const database = legacyDatabase();
    await createLegacySignup(database);
    await migrate(database);

    const indexes = await Promise.all([
      'barber_signups', 'receipt_notifications', 'receipt_notification_attempts', 'admin_sessions', 'admin_message_jobs',
    ].map(async (table) => (await database.execute(`SELECT name FROM pragma_index_list('${table}')`)).rows.map(({ name }) => name)));
    expect(indexes.flat()).toEqual(expect.arrayContaining([
      'barber_signups_created_at_id_idx', 'barber_signups_submission_key_unique_idx', 'barber_signups_review_state_idx',
      'barber_signups_participant_response_state_idx', 'receipt_notifications_status_updated_at_idx',
      'receipt_notification_attempts_notification_attempt_no_idx', 'admin_sessions_expires_at_idx', 'admin_message_jobs_state_updated_at_idx',
    ]));
    await insertNotification(database, 'receipt-1', 'logical-1', 'historic-1', 'draft-1');
    await expect(insertNotification(database, 'receipt-2', 'logical-2', 'historic-1', 'draft-1')).rejects.toThrow();
  });

  it('rejects every migration uniqueness boundary without changing historical rows', async () => {
    const database = legacyDatabase();
    await createLegacySignup(database);
    await migrate(database);
    const signup = (id: string, email: string, key: string) => database.execute({
      sql: `INSERT INTO barber_signups (id, full_name, email, phone, experience, accepted_rules, submission_key)
        VALUES (?, 'Nueva inscripción', ?, '+54 9 11 2345 6789', 'profesional', 1, ?)`, args: [id, email, key],
    });

    await signup('new-1', 'new-1@example.com', 'submission-key');
    await expect(signup('new-2', 'new-2@example.com', 'submission-key')).rejects.toThrow();
    await signup('new-2', 'new-2@example.com', 'other-submission-key');
    await insertNotification(database, 'receipt-1', 'logical-key', 'new-1', 'draft-1');
    await expect(insertNotification(database, 'receipt-2', 'logical-key', 'new-2', 'draft-2')).rejects.toThrow();
    await insertAttempt(database, 'attempt-1', 'attempt-key', 1);
    await expect(insertAttempt(database, 'attempt-2', 'attempt-key', 2)).rejects.toThrow();
    await expect(insertAttempt(database, 'attempt-2', 'other-attempt-key', 1)).rejects.toThrow();
    const session = (id: string, token: string) => database.execute({
      sql: `INSERT INTO admin_sessions (id, token_hash, csrf_hash, created_at, expires_at, last_seen_at)
        VALUES (?, ?, 'csrf', ?, ?, ?)`, args: [id, token, now, now, now],
    });
    await session('session-1', 'token-hash');
    await expect(session('session-2', 'token-hash')).rejects.toThrow();
    expect((await database.execute('SELECT receipt_required FROM barber_signups WHERE id = ?', ['historic-1'])).rows)
      .toEqual([{ receipt_required: 0 }]);
  });

  it('assigns stable positive registration numbers in creation order and never reuses a deleted number', async () => {
    const database = legacyDatabase();
    await createLegacySignup(database);
    await database.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, experience, accepted_rules, created_at)
      VALUES ('historic-2', 'Segundo', 'historic-2@example.com', '2', 'profesional', 1, '2026-01-01T00:00:00.000Z')` });
    await database.execute({ sql: `UPDATE barber_signups SET created_at = '2026-01-01T00:00:00.000Z' WHERE id = 'historic-1'` });

    await migrate(database);
    expect((await database.execute('SELECT number, registration_id FROM registration_numbers ORDER BY number')).rows)
      .toEqual([{ number: 1, registration_id: 'historic-1' }, { number: 2, registration_id: 'historic-2' }]);
    await migrate(database);
    expect((await database.execute('SELECT COUNT(*) AS count FROM registration_numbers')).rows).toEqual([{ count: 2 }]);

    await database.execute("DELETE FROM barber_signups WHERE id = 'historic-2'");
    await database.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, experience, accepted_rules)
      VALUES ('new-3', 'Tercero', 'new-3@example.com', '3', 'profesional', 1)` });
    expect((await database.execute("SELECT number FROM registration_numbers WHERE registration_id = 'new-3'")).rows)
      .toEqual([{ number: 3 }]);
  });

  it('rolls back a signup when automatic registration-number allocation fails', async () => {
    const database = legacyDatabase();
    await migrate(database);
    await database.execute('DROP TABLE registration_numbers');
    await expect(database.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, experience, accepted_rules)
      VALUES ('trigger-failure', 'Falla', 'failure@example.com', '3', 'profesional', 1)` })).rejects.toThrow();
    expect((await database.execute("SELECT id FROM barber_signups WHERE id = 'trigger-failure'")).rows).toEqual([]);
  });
});
