import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';
import { createAdminMessageJobRepository } from '../../src/lib/server/admin/admin-message-job-repository';
import { createAuthenticatedRegistrationDeletionRoute } from '../../src/lib/server/admin/registration-deletion-route';
import { createRegistrationDeletionRepository } from '../../src/lib/server/admin/registration-deletion-repository';
import { createRegistrationDeletionService } from '../../src/lib/server/admin/registration-deletion-service';
import { createReceiptCaption } from '../../src/lib/server/notifications/receipt-caption';
import { createReceiptNotificationRepository, deriveLogicalMessageKey } from '../../src/lib/server/notifications/registration-receipts';
import { signAdminSessionCookie } from '../../src/lib/server/admin/session-crypto';
import { sha256 } from '../../src/lib/server/admin/session-repository';

const databases: Client[] = [];
const directories: string[] = [];
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'] as const;

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'bdb-delete-test-'));
  directories.push(directory);
  const url = pathToFileURL(join(directory, 'fixture.db')).href;
  const database = createClient({ url });
  databases.push(database);
  await migrate(database);
  for (const [index, id] of ids.entries()) {
    await database.execute({ sql: `INSERT INTO barber_signups
      (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at, terms_version, receipt_required)
      VALUES (?, ?, ?, '1', '+5491111111111', 'profesional', 1, ?, 'terms-v1', 1)`,
      args: [id, `Persona ${index}`, `person-${index}@example.test`, `2026-01-0${index + 1}T00:00:00.000Z`] });
  }
  return { database, url };
}

async function seedReceipt(database: Client, registrationId = ids[0]) {
  const key = deriveLogicalMessageKey(registrationId, 'terms-v1');
  await database.execute({ sql: `INSERT INTO receipt_notifications
    (id, logical_message_key, registration_id, terms_version, attachment_kind, media_url, media_filename, media_mime_type,
     media_sha256, caption_text, status, created_at, updated_at)
    VALUES ('receipt-test', ?, ?, 'terms-v1', 'document', 'https://example.test/a.pdf', 'a.pdf', 'application/pdf', ?,
      ?, 'pending', '2026-01-01', '2026-01-01')`, args: [key, registrationId, 'a'.repeat(64), createReceiptCaption('https://example.test/a.pdf')] });
  return key;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

afterEach(async () => {
  databases.splice(0).forEach((database) => database.close());
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('permanent selected-registration deletion', () => {
  it('deletes the full selection atomically and stores one PII-free idempotency audit', async () => {
    const { database } = await fixture();
    const service = createRegistrationDeletionService({
      repository: createRegistrationDeletionRepository(database),
      createId: () => 'audit-delete', now: () => '2026-02-01T00:00:00.000Z',
    });
    const input = { registrationIds: ids, confirmation: 'ELIMINAR 2', irreversible: '1', operationId: 'operation-delete-1234567890', sessionId: 'session-1' };

    await expect(service.deleteSelected(input)).resolves.toEqual({ kind: 'deleted', count: 2 });
    await expect(service.deleteSelected(input)).resolves.toEqual({ kind: 'already_done', count: 2 });
    expect((await database.execute('SELECT id FROM barber_signups')).rows).toEqual([]);
    const audit = await database.execute("SELECT registration_id, action, from_value, to_value, request_id FROM admin_audit_events WHERE action = 'registrations_deleted'");
    expect(audit.rows).toEqual([{ registration_id: null, action: 'registrations_deleted', from_value: null, to_value: '2', request_id: input.operationId }]);
    expect(JSON.stringify(audit.rows)).not.toContain('person-');
    expect(JSON.stringify(audit.rows)).not.toContain(ids[0]);
  });

  it('rolls back every child deletion when the aggregate audit insert fails', async () => {
    const { database } = await fixture();
    await database.execute({ sql: `INSERT INTO admin_audit_events
      (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
      VALUES ('duplicate-audit', 'session-1', NULL, 'review_state_changed', 'received', 'selected', 'request-old', '2026-01-01')` });
    const service = createRegistrationDeletionService({ repository: createRegistrationDeletionRepository(database), createId: () => 'duplicate-audit' });
    await expect(service.deleteSelected({ registrationIds: ids, confirmation: 'ELIMINAR 2', irreversible: '1',
      operationId: 'operation-audit-failure-12345', sessionId: 'session-1' })).resolves.toEqual({ kind: 'unavailable' });
    expect((await database.execute('SELECT COUNT(*) AS count FROM barber_signups')).rows).toEqual([{ count: 2 }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM registration_numbers')).rows).toEqual([{ count: 2 }]);
    expect((await database.execute("SELECT COUNT(*) AS count FROM admin_audit_events WHERE action = 'review_state_changed'")).rows).toEqual([{ count: 1 }]);
  });

  it('serializes a real receipt claim against deletion so the claim wins without child loss', async () => {
    const { database, url } = await fixture();
    const key = await seedReceipt(database);
    const claimDatabase = createClient({ url });
    databases.push(claimDatabase);
    const claimCommitted = deferred(), allowClaimReturn = deferred();
    const claimClient = new Proxy(claimDatabase, {
      get(target, property) {
        if (property === 'batch') return async (...args: Parameters<typeof target.batch>) => {
          const result = await target.batch(...args);
          claimCommitted.resolve();
          await allowClaimReturn.promise;
          return result;
        };
        const value = Reflect.get(target, property);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });

    const claim = createReceiptNotificationRepository(claimClient).claim(key);
    await claimCommitted.promise;
    const route = createAuthenticatedRegistrationDeletionRoute({ sessionSecretB64: SECRET,
      sessions: { findByTokenHash: async () => SESSION },
      service: createRegistrationDeletionService({ repository: createRegistrationDeletionRepository(database) }) });
    const deletionResponse = await route({ request: deletionRequest([
      ['csrf', CSRF], ['operationId', 'operation-race-delete-12345'], ['registrationId', ids[0]],
      ['confirmation', 'ELIMINAR 1'], ['irreversible', '1'],
    ]), params: {}, locals: { adminSession: { id: SESSION.id, expiresAt: SESSION.expiresAt }, adminCsrfToken: CSRF } });
    allowClaimReturn.resolve();
    const claimResult = await claim;

    expect(claimResult).not.toBeNull();
    expect(deletionResponse.status).toBe(409);
    expect((await database.execute('SELECT COUNT(*) AS count FROM barber_signups WHERE id = ?', [ids[0]])).rows).toEqual([{ count: 1 }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM registration_numbers WHERE registration_id = ?', [ids[0]])).rows).toEqual([{ count: 1 }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM receipt_notifications WHERE registration_id = ?', [ids[0]])).rows).toEqual([{ count: 1 }]);
    expect((await database.execute("SELECT COUNT(*) AS count FROM receipt_notification_attempts WHERE outcome = 'in_progress'")).rows).toEqual([{ count: 1 }]);
  });

  it('rolls back signup, number, notification, attempt, and audit when a child delete aborts', async () => {
    const { database } = await fixture();
    await seedReceipt(database);
    await database.execute(`INSERT INTO receipt_notification_attempts
      (id, notification_id, attempt_no, attempt_key, trigger, outcome, started_at, completed_at)
      VALUES ('attempt-child', 'receipt-test', 1, 'attempt-key-child', 'automatic', 'sent', '2026-01-01', '2026-01-01')`);
    await database.execute({ sql: `INSERT INTO admin_audit_events
      (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
      VALUES ('audit-child', 'session-1', ?, 'review_state_changed', 'received', 'selected', 'request-child', '2026-01-01')`, args: [ids[0]] });
    await database.execute(`CREATE TEMP TRIGGER abort_attempt_child_delete BEFORE DELETE ON receipt_notification_attempts
      BEGIN SELECT RAISE(ABORT, 'forced child delete failure'); END`);

    const service = createRegistrationDeletionService({ repository: createRegistrationDeletionRepository(database) });
    await expect(service.deleteSelected({ registrationIds: [ids[0]], confirmation: 'ELIMINAR 1', irreversible: '1',
      operationId: 'operation-child-rollback-1234', sessionId: 'session-1' })).resolves.toEqual({ kind: 'unavailable' });
    expect((await database.execute('SELECT COUNT(*) AS count FROM barber_signups WHERE id = ?', [ids[0]])).rows).toEqual([{ count: 1 }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM registration_numbers WHERE registration_id = ?', [ids[0]])).rows).toEqual([{ count: 1 }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM receipt_notifications WHERE registration_id = ?', [ids[0]])).rows).toEqual([{ count: 1 }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM receipt_notification_attempts WHERE notification_id = ?', ['receipt-test'])).rows).toEqual([{ count: 1 }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM admin_audit_events WHERE registration_id = ?', [ids[0]])).rows).toEqual([{ count: 1 }]);
    expect((await database.execute("SELECT COUNT(*) AS count FROM admin_audit_events WHERE action = 'registrations_deleted'")).rows).toEqual([{ count: 0 }]);
  });

  it('accepts and atomically deletes the maximum selection of 50 registrations', async () => {
    const { database } = await fixture();
    const maximumIds = Array.from({ length: 50 }, (_, index) => `50000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
    for (const [index, id] of maximumIds.entries()) {
      await database.execute({ sql: `INSERT INTO barber_signups
        (id, full_name, email, phone, experience, accepted_rules, created_at)
        VALUES (?, ?, ?, '1', 'profesional', 1, ?)`, args: [id, `Máximo ${index}`, `maximum-${index}@example.test`, `2026-02-${String(index + 1).padStart(2, '0')}`] });
    }
    const service = createRegistrationDeletionService({ repository: createRegistrationDeletionRepository(database) });
    await expect(service.deleteSelected({ registrationIds: maximumIds, confirmation: 'ELIMINAR 50', irreversible: '1',
      operationId: 'operation-maximum-50-12345', sessionId: 'session-1' })).resolves.toEqual({ kind: 'deleted', count: 50 });
    expect((await database.execute(`SELECT COUNT(*) AS count FROM barber_signups WHERE id IN (${maximumIds.map(() => '?').join(',')})`, maximumIds)).rows)
      .toEqual([{ count: 0 }]);
  });

  it('removes a whole settled multi-member organization job while preserving unselected registrations', async () => {
    const { database } = await fixture();
    await database.execute(`INSERT INTO admin_sessions (id, token_hash, csrf_hash, created_at, expires_at, last_seen_at)
      VALUES ('message-session', 'message-token', 'message-csrf', '2026-01-01', '2099-01-01', '2026-01-01')`);
    const messages = createAdminMessageJobRepository(database, { recipientHmacSecret: new Uint8Array(Buffer.alloc(32, 8)) });
    const claimed = await messages.claimInitial({ kind: 'organization_list', operationNonce: 'organization-delete-settled-001',
      registrationIds: ids, recipientE164: '+5491199999999', createdBySessionId: 'message-session' });
    expect(claimed.kind).toBe('claimed');
    if (claimed.kind !== 'claimed') return;
    expect(await messages.bindDocumentDigest(claimed.claim, 'b'.repeat(64))).toBe(true);
    expect(await messages.complete(claimed.claim, { state: 'sent', evidence: 'validated-document-status' })).toBe(true);

    const service = createRegistrationDeletionService({ repository: createRegistrationDeletionRepository(database) });
    await expect(service.deleteSelected({ registrationIds: [ids[0]], confirmation: 'ELIMINAR 1', irreversible: '1',
      operationId: 'operation-delete-org-job-001', sessionId: 'session-1' })).resolves.toEqual({ kind: 'deleted', count: 1 });
    expect((await database.execute('SELECT id FROM barber_signups ORDER BY id')).rows).toEqual([{ id: ids[1] }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM admin_message_jobs')).rows).toEqual([{ count: 0 }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM admin_message_job_registrations')).rows).toEqual([{ count: 0 }]);
    expect((await database.execute('SELECT COUNT(*) AS count FROM admin_message_job_attempts')).rows).toEqual([{ count: 0 }]);
  });

  it('blocks deletion while a linked admin message lease and attempt are active', async () => {
    const { database } = await fixture();
    await database.execute(`INSERT INTO admin_sessions (id, token_hash, csrf_hash, created_at, expires_at, last_seen_at)
      VALUES ('message-session', 'message-token', 'message-csrf', '2026-01-01', '2099-01-01', '2026-01-01')`);
    const messages = createAdminMessageJobRepository(database, { recipientHmacSecret: new Uint8Array(Buffer.alloc(32, 8)) });
    expect((await messages.claimInitial({ kind: 'organization_list', operationNonce: 'organization-delete-active-001',
      registrationIds: ids, recipientE164: '+5491199999999', createdBySessionId: 'message-session' })).kind).toBe('claimed');
    const service = createRegistrationDeletionService({ repository: createRegistrationDeletionRepository(database) });
    await expect(service.deleteSelected({ registrationIds: [ids[0]], confirmation: 'ELIMINAR 1', irreversible: '1',
      operationId: 'operation-block-active-job-001', sessionId: 'session-1' })).resolves.toEqual({ kind: 'conflict' });
    expect((await database.execute('SELECT COUNT(*) AS count FROM barber_signups')).rows).toEqual([{ count: 2 }]);
  });

  it('blocks the whole selection when any current notification is uncertain or has in-progress work', async () => {
    const { database } = await fixture();
    await database.execute({ sql: `INSERT INTO receipt_notifications
      (id, logical_message_key, registration_id, terms_version, attachment_kind, media_url, media_filename, media_mime_type,
       media_sha256, caption_text, status, created_at, updated_at)
      VALUES ('receipt-blocked', 'key-blocked', ?, 'v1', 'document', 'https://example.test/a.pdf', 'a.pdf', 'application/pdf', ?, 'caption', 'uncertain', '2026-01-01', '2026-01-01')`,
      args: [ids[0], 'a'.repeat(64)] });
    const service = createRegistrationDeletionService({ repository: createRegistrationDeletionRepository(database) });
    await expect(service.deleteSelected({ registrationIds: ids, confirmation: 'ELIMINAR 2', irreversible: '1', operationId: 'operation-blocked-123456789', sessionId: 'session-1' }))
      .resolves.toEqual({ kind: 'conflict' });
    expect((await database.execute('SELECT COUNT(*) AS count FROM barber_signups')).rows).toEqual([{ count: 2 }]);
    expect((await database.execute("SELECT COUNT(*) AS count FROM admin_audit_events WHERE action = 'registrations_deleted'")).rows).toEqual([{ count: 0 }]);
  });

  it.each([
    [[], 'ELIMINAR 0', '1'], [ids, 'ELIMINAR 1', '1'], [ids, 'ELIMINAR 2', ''],
    [[ids[0], ids[0]], 'ELIMINAR 2', '1'], [Array.from({ length: 51 }, (_, index) => `${index}`), 'ELIMINAR 51', '1'],
  ])('rejects malformed selection/confirmation without writes', async (registrationIds, confirmation, irreversible) => {
    const { database } = await fixture();
    const service = createRegistrationDeletionService({ repository: createRegistrationDeletionRepository(database) });
    await expect(service.deleteSelected({ registrationIds, confirmation, irreversible, operationId: 'operation-invalid-123456789', sessionId: 'session-1' }))
      .resolves.toEqual({ kind: 'invalid' });
    expect((await database.execute('SELECT COUNT(*) AS count FROM barber_signups')).rows).toEqual([{ count: 2 }]);
  });
});

const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const CSRF = Buffer.alloc(32, 9).toString('base64url');
const COOKIE = signAdminSessionCookie({ sessionToken: Buffer.alloc(32, 7).toString('base64url'), csrfToken: CSRF }, SECRET)!;
const SESSION = { id: 'session-route', tokenHash: 'token-hash', csrfHash: sha256(CSRF), createdAt: '2026-01-01', expiresAt: '2099-01-01', revokedAt: null };

function deletionRequest(fields: readonly (readonly [string, string])[], origin = 'https://admin.example.test') {
  return new Request('https://admin.example.test/api/admin/registrations/delete', {
    method: 'POST', headers: { Origin: origin, Cookie: `bdb_admin=${COOKIE}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields.map(([name, value]) => [name, value])),
  });
}

describe('registration deletion route parser', () => {
  const valid = [['csrf', CSRF], ['operationId', 'operation-route-123456789'], ['registrationId', ids[0]],
    ['registrationId', ids[1]], ['confirmation', 'ELIMINAR 2'], ['irreversible', '1']] as const;
  function route() {
    const service = { deleteSelected: async () => ({ kind: 'deleted' as const, count: 2 }) };
    return { handle: createAuthenticatedRegistrationDeletionRoute({ sessionSecretB64: SECRET,
      sessions: { findByTokenHash: async () => SESSION }, service }) };
  }

  it('accepts repeated unique IDs and redirects without putting selections in the URL', async () => {
    const tested = route();
    const response = await tested.handle({ request: deletionRequest(valid), params: {},
      locals: { adminSession: { id: SESSION.id, expiresAt: SESSION.expiresAt }, adminCsrfToken: CSRF } });
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/admin?deleted=1');
    expect(response.headers.get('location')).not.toContain(ids[0]);
  });

  it.each([
    ['missing selection', valid.filter(([name]) => name !== 'registrationId'), 'https://admin.example.test', 400],
    ['duplicate selection', valid.map(([name, value]) => [name, name === 'registrationId' ? ids[0] : value] as const), 'https://admin.example.test', 400],
    ['duplicate csrf', [...valid, ['csrf', CSRF]], 'https://admin.example.test', 403],
    ['cross origin', valid, 'https://evil.example.test', 403],
    ['bad confirmation', valid.map(([name, value]) => [name, name === 'confirmation' ? 'ELIMINAR 1' : value] as const), 'https://admin.example.test', 400],
  ] as const)('rejects %s', async (_label, fields, origin, status) => {
    const tested = route();
    const response = await tested.handle({ request: deletionRequest(fields, origin), params: {},
      locals: { adminSession: { id: SESSION.id, expiresAt: SESSION.expiresAt }, adminCsrfToken: CSRF } });
    expect(response.status).toBe(status);
  });
});
