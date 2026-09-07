import { randomUUID } from 'node:crypto';

import type { Client } from '@libsql/client';

import { safeErrorCode, safeProviderMessageId } from '../notifications/contracts';
import {
  fingerprintAdminMessageRecipient, immutableAdminMessageInputSha256, normalizeAdminMessageRecipient,
  type AdminMessageAttemptClaim, type AdminMessageCompletion, type AdminMessageCreateInput,
  type AdminMessageJobSummary, type AdminMessageRetryInput, type AdminMessageState,
} from './admin-message-contracts';
import { createRegistrationReadRepository, type RegistrationExportRecord } from './registration-read-repository';

export const ADMIN_MESSAGE_LEASE_DURATION_MS = 30_000;
const PROVIDER_ERROR_MESSAGE = 'Error del proveedor al enviar el documento.';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Row = Record<string, unknown>;
export type AdminMessageClaimResult =
  | Readonly<{ kind: 'claimed'; claim: AdminMessageAttemptClaim }>
  | Readonly<{ kind: 'already_exists'; jobId: string; state: AdminMessageState }>
  | Readonly<{ kind: 'conflict' | 'invalid' | 'busy' | 'sent' | 'acknowledgement_required' }>;
export type AdminMessageJobRepository = Readonly<{
  claimInitial(input: AdminMessageCreateInput): Promise<AdminMessageClaimResult>;
  claimRetry(input: AdminMessageRetryInput): Promise<AdminMessageClaimResult>;
  bindDocumentDigest(claim: AdminMessageAttemptClaim, sha256: string): Promise<boolean>;
  complete(claim: AdminMessageAttemptClaim, completion: AdminMessageCompletion): Promise<boolean>;
  reconcileExpired(jobId: string): Promise<boolean>;
  get(jobId: string): Promise<AdminMessageJobSummary | null>;
  getConfirmationRecipient(jobId: string): Promise<`+${string}` | null>;
  list(limit?: number): Promise<readonly AdminMessageJobSummary[]>;
}>;

type Options = Readonly<{ recipientHmacSecret: Uint8Array; createId?: () => string; now?: () => Date }>;
function validSelection(ids: readonly string[]) {
  return ids.length <= 1000 && new Set(ids).size === ids.length && ids.every((id) => UUID.test(id));
}
function frozen<T extends RegistrationExportRecord>(records: readonly T[]): readonly T[] {
  return Object.freeze(records.map((record) => Object.freeze(record)));
}
function sqliteBusy(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'SQLITE_BUSY';
}
function jobState(row: Row): AdminMessageState | null {
  return typeof row.state === 'string' && ['pending', 'sent', 'failed', 'uncertain'].includes(row.state) ? row.state as AdminMessageState : null;
}

export function createAdminMessageJobRepository(database: Client, options: Options): AdminMessageJobRepository {
  if (options.recipientHmacSecret.byteLength < 32) throw new Error('Invalid recipient HMAC secret.');
  const createId = options.createId ?? randomUUID;
  const nowDate = options.now ?? (() => new Date());
  const reads = createRegistrationReadRepository(database);

  async function beginWriteTransaction() {
    for (let attempt = 0; ; attempt += 1) {
      try { return await database.transaction('write'); }
      catch (error) {
        if (!sqliteBusy(error) || attempt >= 19) throw error;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
  }

  async function claimExisting(jobId: string, recipient: `+${string}`, acknowledgeUncertain?: true): Promise<AdminMessageClaimResult> {
    const transaction = await beginWriteTransaction();
    try {
      const selected = await transaction.execute({ sql: `SELECT * FROM admin_message_jobs WHERE id = ?`, args: [jobId] });
      const row = selected.rows[0] as Row | undefined;
      const state = row && jobState(row);
      if (!row || !state) { await transaction.rollback(); return { kind: 'conflict' }; }
      if (state === 'sent') { await transaction.rollback(); return { kind: 'sent' }; }
      if (typeof row.lease_token === 'string' || typeof row.lease_expires_at === 'string') { await transaction.rollback(); return { kind: 'busy' }; }
      if (state === 'uncertain' && acknowledgeUncertain !== true) { await transaction.rollback(); return { kind: 'acknowledgement_required' }; }
      if (state === 'pending') { await transaction.rollback(); return { kind: 'busy' }; }
      const fingerprint = fingerprintAdminMessageRecipient(recipient, options.recipientHmacSecret);
      if (row.recipient_fingerprint !== fingerprint) { await transaction.rollback(); return { kind: 'conflict' }; }
      const membership = await transaction.execute({ sql: `SELECT registration_id FROM admin_message_job_registrations WHERE job_id = ? ORDER BY ordinal`, args: [jobId] });
      const ids = membership.rows.map((item) => String(item.registration_id));
      const records = frozen(await reads.listForExport({}, ids, { includeInternalId: true, executor: transaction }));
      if (records.length !== ids.length) { await transaction.rollback(); return { kind: 'conflict' }; }
      const now = nowDate(), nowIso = now.toISOString(), attemptNo = Number(row.attempt_count) + 1;
      const leaseToken = createId(), attemptKey = createId(), leaseExpiresAt = new Date(now.getTime() + ADMIN_MESSAGE_LEASE_DURATION_MS).toISOString();
      const attemptId = createId();
      const updates = await transaction.execute({ sql: `UPDATE admin_message_jobs SET state = 'pending', attempt_count = ?, lease_token = ?, lease_expires_at = ?,
        last_attempt_at = ?, updated_at = ? WHERE id = ? AND state = ? AND attempt_count = ? AND lease_token IS NULL AND lease_expires_at IS NULL`,
        args: [attemptNo, leaseToken, leaseExpiresAt, nowIso, nowIso, jobId, state, Number(row.attempt_count)] });
      if (updates.rowsAffected !== 1) { await transaction.rollback(); return { kind: 'busy' }; }
      await transaction.execute({ sql: `INSERT INTO admin_message_job_attempts
        (id, job_id, attempt_no, attempt_key, trigger, outcome, started_at) VALUES (?, ?, ?, ?, 'admin_retry', 'in_progress', ?)`,
        args: [attemptId, jobId, attemptNo, attemptKey, nowIso] });
      await transaction.commit();
      return { kind: 'claimed', claim: Object.freeze({ jobId, kind: row.kind as AdminMessageAttemptClaim['kind'], state,
        operationNonce: String(row.operation_nonce), attemptNo, attemptKey, leaseToken, leaseExpiresAt, createdAt: String(row.created_at), recipientE164: recipient,
        recipientFingerprint: fingerprint, termsVersion: typeof row.terms_version === 'string' ? row.terms_version : null,
        expectedDocumentSha256: typeof row.document_sha256 === 'string' ? row.document_sha256 : null, registrations: records }) };
    } catch (error) {
      if (!transaction.closed) await transaction.rollback();
      throw error;
    } finally { transaction.close(); }
  }

  return {
    async claimInitial(input) {
      const recipient = normalizeAdminMessageRecipient(input.recipientE164);
      if (!recipient || !validSelection(input.registrationIds) || input.operationNonce.length < 16 || input.operationNonce.length > 200
        || !/^[A-Za-z0-9._:-]+$/.test(input.operationNonce) || !input.createdBySessionId || (input.kind === 'confirmation' && input.registrationIds.length !== 1)) return { kind: 'invalid' };
      const transaction = await beginWriteTransaction();
      try {
        const records = frozen(await reads.listForExport(input.filters ?? {}, input.registrationIds,
          { includeInternalId: true, executor: transaction }));
        if (!records.length || records.length > 1000) { await transaction.rollback(); return { kind: 'conflict' }; }
        if (input.kind === 'confirmation') {
          const record = records[0]!;
          const persisted = normalizeAdminMessageRecipient(record.phone);
          const terms = await transaction.execute({ sql: `SELECT terms_version FROM barber_signups WHERE id = ? AND review_state = 'selected'`, args: [record.id] });
          if (!persisted || persisted !== recipient || terms.rows.length !== 1 || typeof terms.rows[0]?.terms_version !== 'string'
            || !input.termsVersion || terms.rows[0]?.terms_version !== input.termsVersion) { await transaction.rollback(); return { kind: 'conflict' }; }
          const logical = await transaction.execute({ sql: `SELECT j.id, j.state FROM admin_message_jobs j
            JOIN admin_message_job_registrations m ON m.job_id = j.id
            WHERE j.kind = 'confirmation' AND m.registration_id = ? ORDER BY j.created_at DESC LIMIT 1`, args: [record.id] });
          if (logical.rows.length) {
            const existing = logical.rows[0] as Row, state = jobState(existing);
            await transaction.rollback();
            return state ? { kind: 'already_exists', jobId: String(existing.id), state } : { kind: 'conflict' };
          }
        }
        const ids = records.map((record) => record.id);
        const recipientFingerprint = fingerprintAdminMessageRecipient(recipient, options.recipientHmacSecret);
        const immutableInput = immutableAdminMessageInputSha256({ kind: input.kind, registrationIds: ids, recipientFingerprint,
          termsVersion: input.termsVersion, filters: input.filters });
        const replay = await transaction.execute({ sql: `SELECT id, state, immutable_input_sha256 FROM admin_message_jobs WHERE operation_nonce = ?`, args: [input.operationNonce] });
        if (replay.rows.length) {
          const existing = replay.rows[0] as Row, state = jobState(existing);
          await transaction.rollback();
          return existing.immutable_input_sha256 === immutableInput && state
            ? { kind: 'already_exists', jobId: String(existing.id), state } : { kind: 'conflict' };
        }
        const now = nowDate(), nowIso = now.toISOString(), leaseExpiresAt = new Date(now.getTime() + ADMIN_MESSAGE_LEASE_DURATION_MS).toISOString();
        const jobId = createId(), leaseToken = createId(), attemptKey = createId();
        await transaction.execute({ sql: `INSERT INTO admin_message_jobs
          (id, kind, state, operation_nonce, immutable_input_sha256, recipient_fingerprint, document_format, terms_version, attempt_count,
           lease_token, lease_expires_at, last_attempt_at, created_by_session_id, created_at, updated_at)
          VALUES (?, ?, 'pending', ?, ?, ?, 'pdf', ?, 1, ?, ?, ?, ?, ?, ?)`, args: [jobId, input.kind, input.operationNonce,
          immutableInput, recipientFingerprint, input.termsVersion ?? null, leaseToken, leaseExpiresAt, nowIso, input.createdBySessionId, nowIso, nowIso] });
        for (const [ordinal, registrationId] of ids.entries()) await transaction.execute({ sql: `INSERT INTO admin_message_job_registrations
          (job_id, registration_id, ordinal, purpose) VALUES (?, ?, ?, ?)`, args: [jobId, registrationId, ordinal,
          input.kind === 'confirmation' ? 'confirmation_recipient' : 'organization_list_member'] });
        await transaction.execute({ sql: `INSERT INTO admin_message_job_attempts
          (id, job_id, attempt_no, attempt_key, trigger, outcome, started_at) VALUES (?, ?, 1, ?, 'initial', 'in_progress', ?)`,
          args: [createId(), jobId, attemptKey, nowIso] });
        await transaction.commit();
        return { kind: 'claimed', claim: Object.freeze({ jobId, kind: input.kind, state: 'pending', operationNonce: input.operationNonce,
          attemptNo: 1, attemptKey, leaseToken, leaseExpiresAt, createdAt: nowIso, recipientE164: recipient,
          recipientFingerprint, termsVersion: input.termsVersion ?? null, expectedDocumentSha256: null, registrations: records }) };
      } catch (error) {
        if (!transaction.closed) await transaction.rollback();
        throw error;
      } finally { transaction.close(); }
    },
    async claimRetry(input) {
      const recipient = normalizeAdminMessageRecipient(input.recipientE164);
      return recipient ? claimExisting(input.jobId, recipient, input.acknowledgeUncertain) : { kind: 'invalid' };
    },
    async bindDocumentDigest(claim, sha256) {
      if (!/^[a-f0-9]{64}$/.test(sha256)) return false;
      const result = await database.execute({ sql: `UPDATE admin_message_jobs SET document_sha256 = COALESCE(document_sha256, ?), updated_at = updated_at
        WHERE id = ? AND attempt_count = ? AND lease_token = ? AND lease_expires_at > ? AND state = 'pending'
          AND (document_sha256 IS NULL OR document_sha256 = ?) AND EXISTS (SELECT 1 FROM admin_message_job_attempts
            WHERE job_id = ? AND attempt_no = ? AND attempt_key = ? AND outcome = 'in_progress')`,
        args: [sha256, claim.jobId, claim.attemptNo, claim.leaseToken, nowDate().toISOString(), sha256,
          claim.jobId, claim.attemptNo, claim.attemptKey] });
      return result.rowsAffected === 1;
    },
    async complete(claim, completion) {
      const now = nowDate().toISOString(), providerMessageId = safeProviderMessageId(completion.providerMessageId), errorCode = completion.errorCode ? safeErrorCode(completion.errorCode) : null;
      const transaction = await beginWriteTransaction();
      try {
        const job = await transaction.execute({ sql: `UPDATE admin_message_jobs SET state = ?, provider_message_id = ?, acceptance_evidence = ?,
          last_error_code = ?, last_error_message = ?, sent_at = ?, lease_token = NULL, lease_expires_at = NULL, updated_at = ?
          WHERE id = ? AND state = 'pending' AND attempt_count = ? AND lease_token = ? AND lease_expires_at > ?
            AND (? = 'failed' OR document_sha256 IS NOT NULL) AND EXISTS (SELECT 1 FROM admin_message_job_attempts WHERE job_id = ? AND attempt_no = ? AND attempt_key = ? AND outcome = 'in_progress')`,
          args: [completion.state, providerMessageId, completion.state === 'sent' ? completion.evidence ?? null : null, errorCode,
            errorCode ? PROVIDER_ERROR_MESSAGE : null, completion.state === 'sent' ? now : null, now, claim.jobId, claim.attemptNo, claim.leaseToken, now,
            completion.state, claim.jobId, claim.attemptNo, claim.attemptKey] });
        if (job.rowsAffected !== 1) { await transaction.rollback(); return false; }
        const attempt = await transaction.execute({ sql: `UPDATE admin_message_job_attempts SET outcome = ?, provider_message_id = ?, acceptance_evidence = ?, error_code = ?, error_message = ?, completed_at = ?
          WHERE job_id = ? AND attempt_no = ? AND attempt_key = ? AND outcome = 'in_progress'`, args: [completion.state, providerMessageId,
          completion.state === 'sent' ? completion.evidence ?? null : null, errorCode, errorCode ? PROVIDER_ERROR_MESSAGE : null, now,
          claim.jobId, claim.attemptNo, claim.attemptKey] });
        if (attempt.rowsAffected !== 1) { await transaction.rollback(); return false; }
        await transaction.commit(); return true;
      } catch (error) { if (!transaction.closed) await transaction.rollback(); throw error; } finally { transaction.close(); }
    },
    async reconcileExpired(jobId) {
      const now = nowDate().toISOString();
      const transaction = await beginWriteTransaction();
      try {
        const selected = await transaction.execute({ sql: `SELECT attempt_count, lease_token FROM admin_message_jobs WHERE id = ? AND state = 'pending' AND lease_expires_at <= ?`, args: [jobId, now] });
        const row = selected.rows[0] as Row | undefined;
        if (!row || typeof row.lease_token !== 'string') { await transaction.rollback(); return false; }
        const job = await transaction.execute({ sql: `UPDATE admin_message_jobs SET state = 'uncertain', lease_token = NULL, lease_expires_at = NULL,
          last_error_code = 'ATTEMPT_BUSY', last_error_message = ?, updated_at = ? WHERE id = ? AND state = 'pending' AND attempt_count = ? AND lease_token = ? AND lease_expires_at <= ?`,
          args: [PROVIDER_ERROR_MESSAGE, now, jobId, Number(row.attempt_count), row.lease_token, now] });
        const attempt = await transaction.execute({ sql: `UPDATE admin_message_job_attempts SET outcome = 'uncertain', error_code = 'ATTEMPT_BUSY', error_message = ?, completed_at = ?
          WHERE job_id = ? AND attempt_no = ? AND outcome = 'in_progress'`, args: [PROVIDER_ERROR_MESSAGE, now, jobId, Number(row.attempt_count)] });
        if (job.rowsAffected !== 1 || attempt.rowsAffected !== 1) { await transaction.rollback(); return false; }
        await transaction.commit(); return true;
      } catch (error) { if (!transaction.closed) await transaction.rollback(); throw error; } finally { transaction.close(); }
    },
    async get(jobId) { return (await this.list(1000)).find((job) => job.id === jobId) ?? null; },
    async getConfirmationRecipient(jobId) {
      const result = await database.execute({ sql: `SELECT b.phone_e164 FROM admin_message_jobs j
        JOIN admin_message_job_registrations m ON m.job_id = j.id JOIN barber_signups b ON b.id = m.registration_id
        WHERE j.id = ? AND j.kind = 'confirmation' AND m.purpose = 'confirmation_recipient'`, args: [jobId] });
      return result.rows.length === 1 && typeof result.rows[0]?.phone_e164 === 'string'
        ? normalizeAdminMessageRecipient(result.rows[0].phone_e164) : null;
    },
    async list(limit = 50) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid job list limit.');
      const result = await database.execute({ sql: `SELECT j.*, group_concat(rn.number, ',') AS registration_numbers FROM admin_message_jobs j
        JOIN admin_message_job_registrations m ON m.job_id = j.id JOIN registration_numbers rn ON rn.registration_id = m.registration_id
        GROUP BY j.id ORDER BY j.created_at DESC, j.id DESC LIMIT ?`, args: [limit] });
      const jobs: AdminMessageJobSummary[] = [];
      for (const raw of result.rows) {
        const row = raw as Row, state = jobState(row);
        if (!state || (row.kind !== 'confirmation' && row.kind !== 'organization_list')) continue;
        const attempts = await database.execute({ sql: `SELECT attempt_no, trigger, outcome, started_at, completed_at, error_code
          FROM admin_message_job_attempts WHERE job_id = ? ORDER BY attempt_no`, args: [String(row.id)] });
        jobs.push(Object.freeze({ id: String(row.id), kind: row.kind, state, operationNonce: String(row.operation_nonce),
          registrationNumbers: Object.freeze(String(row.registration_numbers).split(',').map(Number)), attemptCount: Number(row.attempt_count),
          documentSha256: typeof row.document_sha256 === 'string' ? row.document_sha256 : null,
          termsVersion: typeof row.terms_version === 'string' ? row.terms_version : null,
          lastErrorCode: typeof row.last_error_code === 'string' ? safeErrorCode(row.last_error_code) : null,
          leaseExpiresAt: typeof row.lease_expires_at === 'string' ? row.lease_expires_at : null,
          createdAt: String(row.created_at), updatedAt: String(row.updated_at), sentAt: typeof row.sent_at === 'string' ? row.sent_at : null,
          attempts: Object.freeze(attempts.rows.map((attempt) => Object.freeze({ attemptNo: Number(attempt.attempt_no),
            trigger: String(attempt.trigger) as AdminMessageJobSummary['attempts'][number]['trigger'], outcome: String(attempt.outcome),
            startedAt: String(attempt.started_at), completedAt: typeof attempt.completed_at === 'string' ? attempt.completed_at : null,
            errorCode: typeof attempt.error_code === 'string' ? safeErrorCode(attempt.error_code) : null }))) }));
      }
      return Object.freeze(jobs);
    },
  };
}
