import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createReceiptRecoveryService } from '../../src/lib/server/admin/receipt-recovery-service';
import { signAdminSessionCookie } from '../../src/lib/server/admin/session-crypto';
import { sha256 } from '../../src/lib/server/admin/session-repository';
import { createReceiptReconcileRoute } from '../../src/pages/api/admin/registrations/[id]/receipt/reconcile';
import { createReceiptRetryRoute } from '../../src/pages/api/admin/registrations/[id]/receipt/retry';
import type { ReceiptMessenger, SendReceiptCommand } from '../../src/lib/server/notifications/contracts';
import { createReceiptNotificationRepository } from '../../src/lib/server/notifications/registration-receipts';
import { createRegistrationRepository } from '../../src/lib/server/registrations/repository';
import { getDraftTermsByVersion } from '../../src/lib/terms/draft-terms-manifest';
import { migrate } from '../../scripts/migrate.mjs';

const databases: Client[] = [];
const registrationId = 'registration-1';
const origin = 'https://batalla.test';
const terms = getDraftTermsByVersion('draft-2026-09-v1')!;
const currentTerms = getDraftTermsByVersion('terms-2026-09-v1')!;

async function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  await migrate(client);
  await client.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, experience, accepted_rules, terms_version, receipt_required, created_at)
    VALUES (?, 'Ana', 'ana@example.test', '+54 9 11 2345-6789', '+5491123456789', 'profesional', 1, ?, 1, ?)`, args: [registrationId, terms.version, new Date().toISOString()] });
  return client;
}

async function receipt(client: Client, status: 'failed' | 'uncertain' = 'failed') {
  const notifications = createReceiptNotificationRepository(client);
  await notifications.ensureForRegistration({ registrationId, termsVersion: terms.version, mediaUrl: new URL(terms.publicPath, origin).href, filename: terms.filename, sha256: terms.sha256 });
  const key = (await client.execute('SELECT logical_message_key FROM receipt_notifications')).rows[0]!.logical_message_key as string;
  const attempt = await notifications.claim(key, 'admin_reconcile');
  await notifications.complete(attempt!, { status, errorCode: 'PROVIDER_REJECTED' });
  return notifications;
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('admin receipt recovery', () => {
  it('retries a failed persisted receipt on its original logical notification only', async () => {
    const client = await database();
    const notifications = await receipt(client);
    const sent: SendReceiptCommand[] = [];
    const messenger: ReceiptMessenger = { send: async (command) => {
      sent.push(command);
      return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', httpStatus: 200 };
    } };
    const recovery = createReceiptRecoveryService({ registrations: createRegistrationRepository(client), notifications, messenger, canonicalSiteOrigin: origin, dispatchAvailable: true });

    await expect(recovery.retry({ registrationId, ackUncertain: '1' })).resolves.toEqual({ kind: 'accepted' });
    expect(sent).toHaveLength(1);
    expect((await client.execute('SELECT count(*) AS count FROM barber_signups')).rows).toEqual([{ count: 1 }]);
    expect((await client.execute('SELECT attempt_count, status FROM receipt_notifications')).rows).toEqual([{ attempt_count: 2, status: 'sent' }]);
  });

  it('requires the exact uncertainty acknowledgement and never retries a sent receipt', async () => {
    const client = await database();
    const notifications = await receipt(client, 'uncertain');
    let sends = 0;
    const recovery = createReceiptRecoveryService({ registrations: createRegistrationRepository(client), notifications, canonicalSiteOrigin: origin, dispatchAvailable: true,
      messenger: { send: async () => { sends += 1; return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', httpStatus: 200 }; } } });
    await expect(recovery.retry({ registrationId })).resolves.toEqual({ kind: 'invalid' });
    await expect(recovery.retry({ registrationId, ackUncertain: 'true' })).resolves.toEqual({ kind: 'invalid' });
    await expect(recovery.retry({ registrationId, ackUncertain: '1' })).resolves.toEqual({ kind: 'accepted' });
    await expect(recovery.retry({ registrationId, ackUncertain: '1' })).resolves.toEqual({ kind: 'invalid' });
    expect(sends).toBe(1);
  });

  it('atomically rejects a recovery candidate whose failed status becomes uncertain before claim, then permits an acknowledged retry', async () => {
    const client = await database();
    const notifications = await receipt(client);
    let sends = 0;
    const messenger: ReceiptMessenger = { send: async () => {
      sends += 1;
      return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', httpStatus: 200 };
    } };
    const recovery = createReceiptRecoveryService({ registrations: createRegistrationRepository(client), notifications, messenger, canonicalSiteOrigin: origin, dispatchAvailable: true,
      beforeClaim: async () => {
        const key = (await client.execute('SELECT logical_message_key FROM receipt_notifications')).rows[0]!.logical_message_key as string;
        const intervening = await notifications.claim(key, 'admin_retry');
        await notifications.complete(intervening!, { status: 'uncertain', errorCode: 'PROVIDER_NETWORK' });
      } });

    await expect(recovery.retry({ registrationId, ackUncertain: '1' })).resolves.toEqual({ kind: 'conflict' });
    expect(sends).toBe(0);
    expect((await client.execute('SELECT status, attempt_count FROM receipt_notifications')).rows).toEqual([{ status: 'uncertain', attempt_count: 2 }]);

    const acknowledgedRetry = createReceiptRecoveryService({ registrations: createRegistrationRepository(client), notifications, messenger, canonicalSiteOrigin: origin, dispatchAvailable: true });
    await expect(acknowledgedRetry.retry({ registrationId, ackUncertain: '1' })).resolves.toEqual({ kind: 'accepted' });
    expect(sends).toBe(1);
    expect((await client.execute('SELECT status, attempt_count FROM receipt_notifications')).rows).toEqual([{ status: 'sent', attempt_count: 3 }]);
  });

  it('repairs only a required registration’s missing exact-version snapshot while dispatch is unavailable', async () => {
    const client = await database();
    let sends = 0;
    const recovery = createReceiptRecoveryService({ registrations: createRegistrationRepository(client), notifications: createReceiptNotificationRepository(client), canonicalSiteOrigin: origin, dispatchAvailable: false,
      messenger: { send: async () => { sends += 1; return { kind: 'uncertain', code: 'PROVIDER_NETWORK' }; } } });
    await expect(recovery.reconcile({ registrationId })).resolves.toEqual({ kind: 'unavailable' });
    await expect(recovery.reconcile({ registrationId: 'unknown' })).resolves.toEqual({ kind: 'notfound' });
    expect((await client.execute('SELECT status, attempt_count FROM receipt_notifications')).rows).toEqual([{ status: 'pending', attempt_count: 0 }]);
    expect(sends).toBe(0);
  });

  it('reconciles the current marker-free caption from its resolved terms version', async () => {
    const client = await database();
    await client.execute({ sql: 'UPDATE barber_signups SET terms_version = ? WHERE id = ?', args: [currentTerms.version, registrationId] });
    const notifications = createReceiptNotificationRepository(client);
    const recovery = createReceiptRecoveryService({ registrations: createRegistrationRepository(client), notifications, canonicalSiteOrigin: origin, dispatchAvailable: false,
      messenger: { send: async () => ({ kind: 'uncertain', code: 'PROVIDER_NETWORK' }) } });

    await expect(recovery.reconcile({ registrationId })).resolves.toEqual({ kind: 'unavailable' });
    expect((await client.execute('SELECT media_url, caption_text FROM receipt_notifications')).rows).toEqual([{
      media_url: new URL(currentTerms.publicPath, origin).href,
      caption_text: expect.stringContaining('\n\nAdjuntamos las bases y categorías.\n\n'),
    }]);
  });

  it('rejects unknown manifest versions and non-canonical origins without notification or send side effects', async () => {
    const client = await database();
    await client.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, experience, accepted_rules, terms_version, receipt_required, created_at)
      VALUES ('unknown-terms', 'Ana', 'unknown@example.test', '+54 9 11 2345-6789', '+5491123456789', 'profesional', 1, 'gone', 1, ?)`, args: [new Date().toISOString()] });
    let sends = 0;
    const notifications = await receipt(client);
    const recovery = createReceiptRecoveryService({ registrations: createRegistrationRepository(client), notifications, canonicalSiteOrigin: 'http://batalla.test', dispatchAvailable: true,
      messenger: { send: async () => { sends += 1; return { kind: 'uncertain', code: 'PROVIDER_NETWORK' }; } } });
    await client.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, experience, accepted_rules, receipt_required, created_at)
      VALUES ('not-required', 'Ana', 'old@example.test', '011', 'profesional', 1, 0, ?)`, args: [new Date().toISOString()] });
    await expect(recovery.reconcile({ registrationId: 'unknown-terms' })).resolves.toEqual({ kind: 'invalid' });
    await expect(recovery.reconcile({ registrationId: 'not-required' })).resolves.toEqual({ kind: 'invalid' });
    await expect(recovery.retry({ registrationId, ackUncertain: '1' })).resolves.toEqual({ kind: 'invalid' });
    expect((await client.execute('SELECT registration_id FROM receipt_notifications')).rows).toEqual([{ registration_id: registrationId }]);
    expect(sends).toBe(0);
  });

  it('settles a stale pending attempt before a separate acknowledged retry and allows one concurrent reconcile send', async () => {
    const client = await database();
    const notifications = createReceiptNotificationRepository(client);
    await notifications.ensureForRegistration({ registrationId, termsVersion: terms.version, mediaUrl: new URL(terms.publicPath, origin).href, filename: terms.filename, sha256: terms.sha256 });
    const key = (await client.execute('SELECT logical_message_key FROM receipt_notifications')).rows[0]!.logical_message_key as string;
    await notifications.claim(key);
    await client.execute("UPDATE receipt_notifications SET lease_expires_at = '2000-01-01T00:00:00.000Z'");
    let sends = 0;
    const recovery = createReceiptRecoveryService({ registrations: createRegistrationRepository(client), notifications, canonicalSiteOrigin: origin, dispatchAvailable: true,
      messenger: { send: async () => { sends += 1; return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', httpStatus: 200 }; } } });
    await expect(recovery.reconcile({ registrationId, ackUncertain: '1' })).resolves.toEqual({ kind: 'conflict' });
    expect(sends).toBe(0);
    await expect(recovery.retry({ registrationId, ackUncertain: '1' })).resolves.toEqual({ kind: 'accepted' });
    expect(sends).toBe(1);

    const other = await database();
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    let concurrentSends = 0;
    const concurrent = createReceiptRecoveryService({ registrations: createRegistrationRepository(other), notifications: createReceiptNotificationRepository(other), canonicalSiteOrigin: origin, dispatchAvailable: true,
      messenger: { send: async () => { concurrentSends += 1; await waiting; return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', httpStatus: 200 }; } } });
    const winner = concurrent.reconcile({ registrationId });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const loser = concurrent.reconcile({ registrationId });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(concurrentSends).toBe(1);
    release();
    await expect(Promise.all([winner, loser])).resolves.toEqual([{ kind: 'accepted' }, { kind: 'conflict' }]);
    expect((await other.execute('SELECT count(*) AS count FROM barber_signups')).rows).toEqual([{ count: 1 }]);
  });

  // 3.3c: route bridge verifies the authenticated form before recovery policy is invoked.
  describe('authenticated recovery routes', () => {
    const formSecret = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
    const formCsrf = Buffer.alloc(32, 3).toString('base64url');
    const formCookie = signAdminSessionCookie({ sessionToken: Buffer.alloc(32, 4).toString('base64url'), csrfToken: formCsrf }, formSecret)!;
    const session = { id: 'recovery-session', tokenHash: 'irrelevant', csrfHash: sha256(formCsrf), createdAt: '2026-09-01T00:00:00.000Z', expiresAt: '2026-10-01T00:00:00.000Z', revokedAt: null };
    const locals = { adminSession: { id: session.id, expiresAt: session.expiresAt }, adminCsrfToken: formCsrf };
    const request = (path: string, fields: readonly (readonly [string, string])[], origin = 'https://admin.example.test') => new Request(`https://admin.example.test${path}`, {
      method: 'POST', headers: { Origin: origin, Cookie: `bdb_admin=${formCookie}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields.map(([name, value]) => [name, value])),
    });
    const route = (factory: typeof createReceiptRetryRoute, outcome: any = { kind: 'accepted' }) => {
      const service = { retry: vi.fn(async () => outcome), reconcile: vi.fn(async () => outcome) };
      return { service, handle: factory({ sessionSecretB64: formSecret, sessions: { findByTokenHash: async () => session }, service }) };
    };

    it('rejects invalid CSRF and strict recovery fields before service calls, then redirects only accepted retry', async () => {
      const retry = route(createReceiptRetryRoute);
      const invalid = await retry.handle({ request: request('/api/admin/registrations/recovery-1/receipt/retry', [['csrf', 'wrong']]), params: { id: 'recovery-1' }, locals });
      expect(invalid.status).toBe(403);
      const extra = await retry.handle({ request: request('/api/admin/registrations/recovery-1/receipt/retry', [['csrf', formCsrf], ['ackUncertain', '1'], ['unexpected', '1']]), params: { id: 'recovery-1' }, locals });
      expect(extra.status).toBe(400);
      expect(retry.service.retry).not.toHaveBeenCalled();

      const accepted = await retry.handle({ request: request('/api/admin/registrations/recovery-1/receipt/retry', [['csrf', formCsrf], ['ackUncertain', '1']]), params: { id: 'recovery-1' }, locals });
      expect(accepted.status).toBe(303);
      expect(accepted.headers.get('location')).toBe('/admin/inscripciones/recovery-1');
      expect(retry.service.retry).toHaveBeenCalledWith({ registrationId: 'recovery-1', ackUncertain: '1' });
    });

    it('allows an omitted acknowledgement for failed candidates but never accepts it on reconcile or cross-origin requests', async () => {
      const retry = route(createReceiptRetryRoute);
      const failed = await retry.handle({ request: request('/api/admin/registrations/recovery-1/receipt/retry', [['csrf', formCsrf]]), params: { id: 'recovery-1' }, locals });
      expect(failed.status).toBe(303);
      expect(retry.service.retry).toHaveBeenCalledWith({ registrationId: 'recovery-1' });
      const foreign = await retry.handle({ request: request('/api/admin/registrations/recovery-1/receipt/retry', [['csrf', formCsrf]], 'https://other.example.test'), params: { id: 'recovery-1' }, locals });
      expect(foreign.status).toBe(403);
      const reconcile = route(createReceiptReconcileRoute as typeof createReceiptRetryRoute);
      const extra = await reconcile.handle({ request: request('/api/admin/registrations/recovery-1/receipt/reconcile', [['csrf', formCsrf], ['ackUncertain', '1']]), params: { id: 'recovery-1' }, locals });
      expect(extra.status).toBe(400);
      expect(reconcile.service.reconcile).not.toHaveBeenCalled();
    });

    it.each([['conflict', 409], ['notfound', 404], ['invalid', 400], ['unavailable', 503]] as const)('maps %s without raw service details', async (kind, status) => {
      const reconcile = route(createReceiptReconcileRoute as typeof createReceiptRetryRoute, { kind });
      const response = await reconcile.handle({ request: request('/api/admin/registrations/recovery-1/receipt/reconcile', [['csrf', formCsrf]]), params: { id: 'recovery-1' }, locals });
      expect(response.status).toBe(status);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(await response.text()).not.toContain(kind);
    });
  });
});
