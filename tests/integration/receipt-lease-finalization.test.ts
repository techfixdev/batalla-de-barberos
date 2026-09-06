import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';

import type { ReceiptMessenger, SendReceiptCommand } from '../../src/lib/server/notifications/contracts';
import { createReceiptNotificationRepository } from '../../src/lib/server/notifications/registration-receipts';
import { createReceiptService } from '../../src/lib/server/notifications/receipt-service';
import { migrate } from '../../scripts/migrate.mjs';

const databases: Client[] = [];
const mediaUrl = 'https://batalla.test/documentos/bases-y-categorias/borrador-2026-09-v1.pdf';
const filename = 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v1.pdf';

async function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  await migrate(client);
  await client.execute({
    sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at)
      VALUES ('registration-1', 'Ana', 'ana@example.test', '+54 9 11 2345-6789', '+5491123456789', 'profesional', 1, ?)`,
    args: [new Date().toISOString()],
  });
  return client;
}

async function notification(client: Client) {
  const repository = createReceiptNotificationRepository(client);
  await repository.ensureForRegistration({
    registrationId: 'registration-1', termsVersion: 'draft-2026-09-v1', mediaUrl, filename, sha256: 'a'.repeat(64),
  });
  const key = (await client.execute('SELECT logical_message_key FROM receipt_notifications')).rows[0]?.logical_message_key as string;
  return { repository, key };
}

function accepted() {
  return { status: 'sent' as const, providerMessageId: 'provider-123', evidence: 'document-response-marker' as const };
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('receipt lease-owned finalization', () => {
  it('atomically claims one attempt, so a concurrent loser sends nothing', async () => {
    const client = await database();
    const { repository, key } = await notification(client);
    const commands: SendReceiptCommand[] = [];
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    const messenger: ReceiptMessenger = { send: async (command) => {
      commands.push(command);
      await waiting;
      return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', httpStatus: 202 };
    } };

    const service = createReceiptService(repository, messenger);
    const first = service.dispatch(key);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = service.dispatch(key);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(commands).toHaveLength(1);
    expect((await client.execute('SELECT attempt_count FROM receipt_notifications')).rows).toEqual([{ attempt_count: 1 }]);
    expect((await client.execute("SELECT outcome FROM receipt_notification_attempts")).rows).toEqual([{ outcome: 'in_progress' }]);

    release();
    await Promise.all([first, second]);
    expect((await client.execute('SELECT status FROM receipt_notifications')).rows).toEqual([{ status: 'sent' }]);
  });

  it('settles a stale latest lease before an explicit retry and rejects its old owner', async () => {
    const client = await database();
    const { repository, key } = await notification(client);
    const stale = await repository.claim(key, 'automatic');
    expect(stale).not.toBeNull();
    await client.execute({ sql: 'UPDATE receipt_notifications SET lease_expires_at = ?', args: ['2000-01-01T00:00:00.000Z'] });

    await expect(repository.claim(key)).resolves.toBeNull();
    await expect(repository.settleExpired(key)).resolves.toBe(true);
    await expect(repository.complete(stale!, accepted())).resolves.toBe(false);
    expect((await client.execute('SELECT status, attempt_count, lease_token, lease_expires_at, last_error_code FROM receipt_notifications')).rows)
      .toEqual([{ status: 'uncertain', attempt_count: 1, lease_token: null, lease_expires_at: null, last_error_code: 'ATTEMPT_BUSY' }]);
    expect((await client.execute('SELECT attempt_no, trigger, outcome, error_code FROM receipt_notification_attempts ORDER BY attempt_no')).rows)
      .toEqual([{ attempt_no: 1, trigger: 'automatic', outcome: 'uncertain', error_code: 'ATTEMPT_BUSY' }]);

    await expect(repository.claim(key, 'admin_retry')).resolves.toBeNull();
    const replacement = await repository.claim(key, 'admin_retry', { acknowledgeUncertain: true });
    expect(replacement).not.toBeNull();
    expect((await client.execute('SELECT attempt_no, trigger, outcome FROM receipt_notification_attempts ORDER BY attempt_no')).rows)
      .toEqual([{ attempt_no: 1, trigger: 'automatic', outcome: 'uncertain' }, { attempt_no: 2, trigger: 'admin_retry', outcome: 'in_progress' }]);
  });

  it('records an explicit reconcile trigger and reserves automatic dispatch for the first pending attempt', async () => {
    const client = await database();
    const { repository, key } = await notification(client);
    const reconcile = await repository.claim(key, 'admin_reconcile');
    expect(reconcile).not.toBeNull();
    await repository.complete(reconcile!, { status: 'failed', errorCode: 'PROVIDER_REJECTED' });

    await expect(repository.claim(key)).resolves.toBeNull();
    const retry = await repository.claim(key, 'admin_retry');
    expect(retry).not.toBeNull();
    await repository.complete(retry!, { status: 'uncertain', errorCode: 'PROVIDER_NETWORK' });

    expect((await client.execute('SELECT trigger, outcome FROM receipt_notification_attempts ORDER BY attempt_no')).rows)
      .toEqual([{ trigger: 'admin_reconcile', outcome: 'failed' }, { trigger: 'admin_retry', outcome: 'uncertain' }]);
    await expect(repository.claim(key, 'automatic')).resolves.toBeNull();
  });

  it('rolls back stale settlement when its matching attempt cannot be finalized', async () => {
    const client = await database();
    const { repository, key } = await notification(client);
    const attempt = await repository.claim(key, 'automatic');
    expect(attempt).not.toBeNull();
    await client.execute({ sql: "UPDATE receipt_notifications SET lease_expires_at = '2000-01-01T00:00:00.000Z'" });
    await client.execute(`CREATE TRIGGER reject_stale_settlement BEFORE UPDATE ON receipt_notification_attempts
      WHEN NEW.outcome = 'uncertain' BEGIN SELECT RAISE(ABORT, 'attempt-finalization-blocked'); END`);

    try {
      await expect(repository.settleExpired(key)).rejects.toThrow('attempt-finalization-blocked');
    } finally {
      await client.execute('DROP TRIGGER reject_stale_settlement');
    }
    expect((await client.execute('SELECT status, lease_token, lease_expires_at, last_error_code FROM receipt_notifications')).rows)
      .toEqual([{ status: 'pending', lease_token: attempt!.leaseToken, lease_expires_at: '2000-01-01T00:00:00.000Z', last_error_code: null }]);
    expect((await client.execute('SELECT outcome, error_code FROM receipt_notification_attempts')).rows)
      .toEqual([{ outcome: 'in_progress', error_code: null }]);
  });

  it('permits exactly one result when two finalizers race for the same lease', async () => {
    const client = await database();
    const { repository, key } = await notification(client);
    const attempt = await repository.claim(key, 'automatic');
    expect(attempt).not.toBeNull();

    const results = await Promise.all([repository.complete(attempt!, accepted()), repository.complete(attempt!, accepted())]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await client.execute('SELECT status, provider_message_id FROM receipt_notifications')).rows)
      .toEqual([{ status: 'sent', provider_message_id: 'provider-123' }]);
    expect((await client.execute('SELECT outcome, acceptance_evidence FROM receipt_notification_attempts')).rows)
      .toEqual([{ outcome: 'sent', acceptance_evidence: 'document-response-marker' }]);
  });

  it('treats an expired post-send lease as uncertain rather than blindly marking the receipt sent', async () => {
    const client = await database();
    const { repository, key } = await notification(client);
    const attempt = await repository.claim(key, 'automatic');
    expect(attempt).not.toBeNull();
    await client.execute({ sql: 'UPDATE receipt_notifications SET lease_expires_at = ?', args: ['2000-01-01T00:00:00.000Z'] });

    await expect(repository.complete(attempt!, accepted())).resolves.toBe(false);
    expect((await client.execute('SELECT status, provider_message_id, sent_at FROM receipt_notifications')).rows)
      .toEqual([{ status: 'pending', provider_message_id: null, sent_at: null }]);
    expect((await client.execute('SELECT outcome FROM receipt_notification_attempts')).rows).toEqual([{ outcome: 'in_progress' }]);
  });

  it('maps URL-only and untrusted provider details to safe failed or uncertain diagnostics', async () => {
    const client = await database();
    const { repository, key } = await notification(client);
    const raw = 'Ana ana@example.test +5491123456789 token=super-secret Authorization: Bearer secret {"caption":"private","body":"raw"}';
    const sent: SendReceiptCommand[] = [];
    const messenger: ReceiptMessenger = { send: async (command) => {
      sent.push(command);
      if (sent.length === 1) {
        return { kind: 'accepted', acceptedArtifact: 'url' as never, evidence: 'document-response-marker', providerMessageId: raw, httpStatus: 200 };
      }
      if (sent.length === 2) return { kind: 'uncertain', code: raw as never };
      return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', providerMessageId: raw, httpStatus: 202 };
    } };

    const service = createReceiptService(repository, messenger);
    await service.dispatch(key);
    await service.dispatch(key, 'admin_retry');
    await service.dispatch(key, 'admin_retry', { acknowledgeUncertain: true });
    expect(sent).toHaveLength(3);
    const notificationRow = await client.execute('SELECT status, provider_message_id, last_error_code, last_error_message FROM receipt_notifications');
    const attempts = await client.execute('SELECT provider_message_id, error_code, error_message FROM receipt_notification_attempts ORDER BY attempt_no');
    expect(notificationRow.rows).toEqual([{ status: 'sent', provider_message_id: null, last_error_code: null, last_error_message: null }]);
    expect(attempts.rows).toEqual([
      { provider_message_id: null, error_code: 'PROVIDER_ATTACHMENT_NOT_ACCEPTED', error_message: 'Error del proveedor al enviar el documento.' },
      { provider_message_id: null, error_code: 'PROVIDER_REJECTED', error_message: 'Error del proveedor al enviar el documento.' },
      { provider_message_id: null, error_code: null, error_message: null },
    ]);
    expect(JSON.stringify([notificationRow.rows, attempts.rows])).not.toContain(raw);
    expect(JSON.stringify([notificationRow.rows, attempts.rows])).not.toContain('super-secret');
  });
});
