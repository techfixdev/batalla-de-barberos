import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';
import { createAdminMessageJobRepository } from '../../src/lib/server/admin/admin-message-job-repository';

const databases: Client[] = [];
const directories: string[] = [];
const registrationId = '11111111-1111-4111-8111-111111111111';
const secret = new Uint8Array(Buffer.alloc(32, 7));

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'bdb-message-jobs-'));
  directories.push(directory);
  const database = createClient({ url: pathToFileURL(join(directory, 'fixture.db')).href });
  databases.push(database);
  await migrate(database);
  await database.execute(`INSERT INTO admin_sessions (id, token_hash, csrf_hash, created_at, expires_at, last_seen_at)
    VALUES ('session-1', 'token', 'csrf', '2026-01-01', '2099-01-01', '2026-01-01')`);
  await database.execute({ sql: `INSERT INTO barber_signups
    (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at, terms_version, receipt_required, review_state)
    VALUES (?, 'Ana', 'ana@example.test', '1', '+5491123456789', 'profesional', 1, '2026-01-01', 'terms-v1', 1, 'selected')`, args: [registrationId] });
  let id = 0;
  let current = new Date('2026-02-01T00:00:00.000Z');
  const repository = createAdminMessageJobRepository(database, { recipientHmacSecret: secret,
    createId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`, now: () => current });
  return { database, repository, advance(milliseconds: number) { current = new Date(current.valueOf() + milliseconds); } };
}
afterEach(async () => {
  databases.splice(0).forEach((database) => database.close());
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('generic admin message job ledger', () => {
  it('claims before generation, persists only HMAC/membership metadata, binds digest, and completes with lease CAS', async () => {
    const { database, repository } = await fixture();
    const input = { kind: 'confirmation' as const, operationNonce: 'operation-confirmation-001', registrationIds: [registrationId],
      recipientE164: '+5491123456789' as const, termsVersion: 'terms-v1', createdBySessionId: 'session-1' };
    const result = await repository.claimInitial(input);
    expect(result.kind).toBe('claimed');
    if (result.kind !== 'claimed') return;
    expect(result.claim.registrations[0]).toMatchObject({ fullName: 'Ana', phone: '+5491123456789', review: 'selected' });
    expect(Object.isFrozen(result.claim.registrations)).toBe(true);
    expect(Object.isFrozen(result.claim.registrations[0])).toBe(true);
    expect((await database.execute('SELECT registration_id FROM admin_message_job_registrations ORDER BY ordinal')).rows)
      .toEqual([{ registration_id: registrationId }]);
    const storedBefore = await database.execute('SELECT recipient_fingerprint, document_sha256, attempt_count, lease_token FROM admin_message_jobs');
    expect(storedBefore.rows[0]).toMatchObject({ recipient_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/), document_sha256: null, attempt_count: 1 });
    expect(JSON.stringify(storedBefore.rows)).not.toContain('+5491123456789');
    expect(await repository.bindDocumentDigest(result.claim, 'a'.repeat(64))).toBe(true);
    expect(await repository.complete(result.claim, { state: 'sent', evidence: 'validated-document-status', providerMessageId: 'provider-1' })).toBe(true);
    expect(await repository.complete(result.claim, { state: 'sent', evidence: 'validated-document-status' })).toBe(false);
    await expect(repository.claimRetry({ jobId: result.claim.jobId, recipientE164: input.recipientE164 })).resolves.toEqual({ kind: 'sent' });
  });

  it('prevents a second logical confirmation with a fresh nonce', async () => {
    const { repository } = await fixture();
    const input = { kind: 'confirmation' as const, operationNonce: 'operation-confirmation-first', registrationIds: [registrationId],
      recipientE164: '+5491123456789' as const, termsVersion: 'terms-v1', createdBySessionId: 'session-1' };
    const first = await repository.claimInitial(input);
    expect(first.kind).toBe('claimed');
    if (first.kind !== 'claimed') return;
    expect(await repository.claimInitial({ ...input, operationNonce: 'operation-confirmation-second' })).toEqual({ kind: 'already_exists', jobId: first.claim.jobId, state: 'pending' });
  });

  it('binds nonce replay to the same immutable input and rejects changed recipient payloads', async () => {
    const { repository } = await fixture();
    const input = { kind: 'confirmation' as const, operationNonce: 'operation-confirmation-002', registrationIds: [registrationId],
      recipientE164: '+5491123456789' as const, termsVersion: 'terms-v1', createdBySessionId: 'session-1' };
    const first = await repository.claimInitial(input);
    expect(first.kind).toBe('claimed');
    const replay = await repository.claimInitial(input);
    expect(replay).toMatchObject({ kind: 'already_exists' });
    await expect(repository.claimInitial({ ...input, recipientE164: '+5491199999999' })).resolves.toEqual({ kind: 'conflict' });
  });

  it('requires acknowledgement after an uncertain result and preserves digest/HMAC on retry', async () => {
    const { database, repository } = await fixture();
    const initial = await repository.claimInitial({ kind: 'confirmation', operationNonce: 'operation-confirmation-retry', registrationIds: [registrationId],
      recipientE164: '+5491123456789', termsVersion: 'terms-v1', createdBySessionId: 'session-1' });
    expect(initial.kind).toBe('claimed'); if (initial.kind !== 'claimed') return;
    expect(await repository.bindDocumentDigest(initial.claim, 'c'.repeat(64))).toBe(true);
    expect(await repository.complete(initial.claim, { state: 'uncertain', errorCode: 'PROVIDER_NETWORK' })).toBe(true);
    await expect(repository.claimRetry({ jobId: initial.claim.jobId, recipientE164: '+5491123456789' })).resolves.toEqual({ kind: 'acknowledgement_required' });
    await expect(repository.claimRetry({ jobId: initial.claim.jobId, recipientE164: '+5491199999999', acknowledgeUncertain: true })).resolves.toEqual({ kind: 'conflict' });
    const retry = await repository.claimRetry({ jobId: initial.claim.jobId, recipientE164: '+5491123456789', acknowledgeUncertain: true });
    expect(retry.kind).toBe('claimed'); if (retry.kind !== 'claimed') return;
    expect(retry.claim.expectedDocumentSha256).toBe('c'.repeat(64));
    expect(await repository.bindDocumentDigest(retry.claim, 'd'.repeat(64))).toBe(false);
    expect(await repository.complete(retry.claim, { state: 'failed', errorCode: 'PROVIDER_MEDIA_REJECTED' })).toBe(true);
    const finalRetry = await repository.claimRetry({ jobId: initial.claim.jobId, recipientE164: '+5491123456789' });
    expect(finalRetry.kind).toBe('claimed'); if (finalRetry.kind !== 'claimed') return;
    expect(finalRetry.claim.expectedDocumentSha256).toBe('c'.repeat(64));
    expect(await repository.bindDocumentDigest(finalRetry.claim, 'c'.repeat(64))).toBe(true);
    expect(await repository.complete(finalRetry.claim, { state: 'sent', evidence: 'validated-document-status' })).toBe(true);
    await expect(repository.claimRetry({ jobId: initial.claim.jobId, recipientE164: '+5491123456789' })).resolves.toEqual({ kind: 'sent' });
    expect((await database.execute('SELECT lease_token, lease_expires_at, state, attempt_count FROM admin_message_jobs')).rows)
      .toEqual([{ lease_token: null, lease_expires_at: null, state: 'sent', attempt_count: 3 }]);
  });

  it('reconciles only an expired lease to uncertain without creating another attempt', async () => {
    const { database, repository, advance } = await fixture();
    const initial = await repository.claimInitial({ kind: 'confirmation', operationNonce: 'operation-confirmation-expiry', registrationIds: [registrationId],
      recipientE164: '+5491123456789', termsVersion: 'terms-v1', createdBySessionId: 'session-1' });
    expect(initial.kind).toBe('claimed'); if (initial.kind !== 'claimed') return;
    await expect(repository.reconcileExpired(initial.claim.jobId)).resolves.toBe(false);
    advance(30_001);
    await expect(repository.reconcileExpired(initial.claim.jobId)).resolves.toBe(true);
    expect((await database.execute('SELECT state, attempt_count, lease_token FROM admin_message_jobs')).rows).toEqual([{ state: 'uncertain', attempt_count: 1, lease_token: null }]);
    expect((await database.execute('SELECT outcome FROM admin_message_job_attempts')).rows).toEqual([{ outcome: 'uncertain' }]);
  });

  it('serializes concurrent fresh confirmation nonces to exactly one claim winner', async () => {
    const { repository } = await fixture();
    const base = { kind: 'confirmation' as const, registrationIds: [registrationId], recipientE164: '+5491123456789' as const,
      termsVersion: 'terms-v1', createdBySessionId: 'session-1' };
    const results = await Promise.all([
      repository.claimInitial({ ...base, operationNonce: 'operation-concurrent-first' }),
      repository.claimInitial({ ...base, operationNonce: 'operation-concurrent-second' }),
    ]);
    expect(results.filter((result) => result.kind === 'claimed')).toHaveLength(1);
    expect(results.filter((result) => result.kind === 'already_exists')).toHaveLength(1);
  });
});
