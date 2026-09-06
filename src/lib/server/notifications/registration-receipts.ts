import { createHash, randomUUID } from 'node:crypto';

import type { Client } from '@libsql/client';

import { isValidReceiptDocument, safeErrorCode, safeProviderMessageId, type ReceiptDocument, type SafeErrorCode } from './contracts';
import { createReceiptCaption } from './receipt-caption';

type ReceiptInput = Readonly<{
  registrationId: string; termsVersion: string; mediaUrl: string; filename: string; sha256: string; caption?: string;
}>;
export type ReceiptAttemptTrigger = 'automatic' | 'admin_retry' | 'admin_reconcile';
type ClaimedAttempt = Readonly<{
  notificationId: string; logicalMessageKey: string; attemptKey: string; attemptNo: number; leaseToken: string; toE164: `+54${string}`;
  attachment: ReceiptDocument;
}>;
type Completion = Readonly<{
  status: 'sent' | 'failed' | 'uncertain'; providerMessageId?: string;
  evidence?: 'validated-document-status' | 'document-response-marker'; errorCode?: SafeErrorCode;
}>;
export type StoredReceiptNotification = Readonly<{
  logicalMessageKey: string; termsVersion: string; status: 'pending' | 'sent' | 'failed' | 'uncertain'; attemptCount: number;
  leaseToken: string | null; leaseExpiresAt: string | null; sha256: string; attachment: ReceiptDocument;
}>;
export type ReceiptClaimPreconditions = Readonly<{
  acknowledgeUncertain?: true;
  expected?: Readonly<{
    status: StoredReceiptNotification['status']; attemptCount: number; registrationId: string; termsVersion: string;
    attachment: ReceiptDocument; sha256: string;
  }>;
}>;

export type RegistrationNotificationRepository = Readonly<{ ensureForRegistration(input: ReceiptInput): Promise<void> }>;
export type ReceiptNotificationRepository = RegistrationNotificationRepository & Readonly<{
  getByRegistrationAndVersion(registrationId: string, termsVersion: string): Promise<StoredReceiptNotification | null>;
  claim(logicalMessageKey: string, trigger?: ReceiptAttemptTrigger, preconditions?: ReceiptClaimPreconditions): Promise<ClaimedAttempt | null>;
  complete(attempt: ClaimedAttempt, completion: Completion): Promise<boolean>;
  settleExpired(logicalMessageKey: string): Promise<boolean>;
}>;

export const deriveLogicalMessageKey = (registrationId: string, termsVersion: string) =>
  createHash('sha256').update(`receipt:v1:${registrationId}:${termsVersion}`).digest('hex');

// The provider permits 15 seconds; keep another 15 seconds for database finalization.
export const RECEIPT_LEASE_DURATION_MS = 30_000;
const PROVIDER_ERROR_MESSAGE = 'Error del proveedor al enviar el documento.';
const STALE_ATTEMPT_ERROR_CODE = 'ATTEMPT_BUSY' as const;
const CLAIM_ELIGIBILITY: Readonly<Record<ReceiptAttemptTrigger, string>> = {
  automatic: "status = 'pending' AND attempt_count = 0",
  admin_retry: "status IN ('failed', 'uncertain')",
  admin_reconcile: "status = 'pending' AND attempt_count = 0",
};

export function createReceiptNotificationRepository(database: Client): ReceiptNotificationRepository {
  return {
    async ensureForRegistration(input) {
      const attachment = { kind: 'document' as const, mediaUrl: input.mediaUrl, filename: input.filename,
        mimeType: 'application/pdf' as const, caption: input.caption ?? createReceiptCaption(input.mediaUrl) };
      if (!isValidReceiptDocument(attachment)) throw new Error('Invalid immutable receipt snapshot.');
      const now = new Date().toISOString();
      await database.execute({
        sql: `INSERT INTO receipt_notifications (id, logical_message_key, registration_id, terms_version, attachment_kind, media_url, media_filename, media_mime_type, media_sha256, caption_text, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'document', ?, ?, 'application/pdf', ?, ?, 'pending', ?, ?)
          ON CONFLICT(registration_id, terms_version) DO NOTHING`,
        args: [randomUUID(), deriveLogicalMessageKey(input.registrationId, input.termsVersion), input.registrationId, input.termsVersion, attachment.mediaUrl, attachment.filename, input.sha256, attachment.caption, now, now],
      });
    },
    async getByRegistrationAndVersion(registrationId, termsVersion) {
      const result = await database.execute({ sql: `SELECT logical_message_key, terms_version, status, attempt_count, lease_token, lease_expires_at, media_sha256,
        attachment_kind, media_url, media_filename, media_mime_type, caption_text FROM receipt_notifications WHERE registration_id = ? AND terms_version = ?`, args: [registrationId, termsVersion] });
      const row = result.rows[0] as Record<string, unknown> | undefined;
      const attachment = { kind: row?.attachment_kind, mediaUrl: row?.media_url, filename: row?.media_filename, mimeType: row?.media_mime_type, caption: row?.caption_text };
      if (!row || typeof row.logical_message_key !== 'string' || typeof row.terms_version !== 'string' || typeof row.status !== 'string' || !isValidReceiptDocument(attachment)
        || typeof row.media_sha256 !== 'string') return null;
      return { logicalMessageKey: row.logical_message_key, termsVersion: row.terms_version, status: row.status as StoredReceiptNotification['status'], attemptCount: Number(row.attempt_count),
        leaseToken: typeof row.lease_token === 'string' ? row.lease_token : null, leaseExpiresAt: typeof row.lease_expires_at === 'string' ? row.lease_expires_at : null,
        sha256: row.media_sha256, attachment };
    },
    async claim(key, trigger = 'automatic', preconditions) {
      const selected = await database.execute({ sql: `SELECT n.id, n.logical_message_key, n.attempt_count, n.attachment_kind, n.media_url, n.media_filename, n.media_mime_type, n.caption_text, b.phone_e164
        FROM receipt_notifications n JOIN barber_signups b ON b.id = n.registration_id WHERE n.logical_message_key = ?`, args: [key] });
      const row = selected.rows[0] as Record<string, unknown> | undefined;
      const attachment = { kind: row?.attachment_kind, mediaUrl: row?.media_url, filename: row?.media_filename,
        mimeType: row?.media_mime_type, caption: row?.caption_text };
      if (!row || typeof row.phone_e164 !== 'string' || !isValidReceiptDocument(attachment)) return null;

      const now = new Date().toISOString(), leaseToken = randomUUID(), attemptNo = Number(row.attempt_count) + 1;
      const attemptKey = randomUUID(), expiresAt = new Date(Date.now() + RECEIPT_LEASE_DURATION_MS).toISOString();
      const expected = preconditions?.expected;
      const eligibility = trigger === 'admin_retry'
        ? "(status = 'failed' OR (status = 'uncertain' AND ? = 1))" : CLAIM_ELIGIBILITY[trigger];
      const eligibilityArgs = trigger === 'admin_retry' ? [preconditions?.acknowledgeUncertain === true ? 1 : 0] : [];
      const expectedSql = expected ? ` AND status = ? AND attempt_count = ? AND registration_id = ? AND terms_version = ?
        AND media_url = ? AND media_filename = ? AND media_mime_type = ? AND media_sha256 = ? AND caption_text = ?
        AND EXISTS (SELECT 1 FROM barber_signups b WHERE b.id = registration_id AND b.receipt_required = 1 AND b.terms_version = ?)` : '';
      const expectedArgs = expected ? [expected.status, expected.attemptCount, expected.registrationId, expected.termsVersion,
        expected.attachment.mediaUrl, expected.attachment.filename, expected.attachment.mimeType, expected.sha256, expected.attachment.caption, expected.termsVersion] : [];
      const claims = await database.batch([
        { sql: `UPDATE receipt_notifications SET attempt_count = ?, lease_token = ?, lease_expires_at = ?, last_attempt_at = ?, updated_at = ?
          WHERE id = ? AND attempt_count = ? AND lease_token IS NULL AND lease_expires_at IS NULL AND ${eligibility}${expectedSql}`,
          args: [attemptNo, leaseToken, expiresAt, now, now, String(row.id), Number(row.attempt_count), ...eligibilityArgs, ...expectedArgs] },
        { sql: `INSERT INTO receipt_notification_attempts (id, notification_id, attempt_no, attempt_key, trigger, outcome, started_at)
          SELECT ?, id, ?, ?, ?, 'in_progress', ? FROM receipt_notifications
          WHERE id = ? AND lease_token = ? AND lease_expires_at = ?`,
          args: [randomUUID(), attemptNo, attemptKey, trigger, now, String(row.id), leaseToken, expiresAt] },
      ], 'write');
      if (claims[0]?.rowsAffected !== 1 || claims[1]?.rowsAffected !== 1) return null;
      return { notificationId: String(row.id), logicalMessageKey: String(row.logical_message_key), attemptKey, attemptNo, leaseToken,
        toE164: row.phone_e164 as `+54${string}`, attachment };
    },
    async complete(attempt, completion) {
      const now = new Date().toISOString();
      const providerMessageId = safeProviderMessageId(completion.providerMessageId);
      const errorCode = completion.errorCode ? safeErrorCode(completion.errorCode) : null;
      const errorMessage = errorCode ? PROVIDER_ERROR_MESSAGE : null;
      const updates = await database.batch([
        { sql: `UPDATE receipt_notifications SET status = ?, provider_message_id = ?, last_error_code = ?, last_error_message = ?, sent_at = ?, lease_token = NULL, lease_expires_at = NULL, updated_at = ?
          WHERE id = ? AND attempt_count = ? AND lease_token = ? AND status IN ('pending', 'failed', 'uncertain') AND lease_expires_at > ?
            AND EXISTS (SELECT 1 FROM receipt_notification_attempts WHERE notification_id = ? AND attempt_no = ? AND attempt_key = ? AND outcome = 'in_progress')`,
          args: [completion.status, providerMessageId, errorCode, errorMessage, completion.status === 'sent' ? now : null, now,
            attempt.notificationId, attempt.attemptNo, attempt.leaseToken, now, attempt.notificationId, attempt.attemptNo, attempt.attemptKey] },
        { sql: `UPDATE receipt_notification_attempts SET outcome = ?, provider_message_id = ?, acceptance_evidence = ?, error_code = ?, error_message = ?, completed_at = ?
          WHERE notification_id = ? AND attempt_no = ? AND attempt_key = ? AND outcome = 'in_progress'
            AND EXISTS (SELECT 1 FROM receipt_notifications WHERE id = ? AND attempt_count = ? AND status = ? AND lease_token IS NULL
              AND lease_expires_at IS NULL AND updated_at = ?)`,
          args: [completion.status, providerMessageId, completion.evidence ?? null, errorCode, errorMessage, now,
            attempt.notificationId, attempt.attemptNo, attempt.attemptKey, attempt.notificationId, attempt.attemptNo, completion.status, now] },
      ], 'write');
      return updates[0]?.rowsAffected === 1 && updates[1]?.rowsAffected === 1;
    },
    async settleExpired(key) {
      const now = new Date().toISOString();
      const selected = await database.execute({ sql: `SELECT n.id, n.attempt_count, n.lease_token, a.attempt_key
        FROM receipt_notifications n JOIN receipt_notification_attempts a ON a.notification_id = n.id
        WHERE n.logical_message_key = ? AND n.status = 'pending' AND n.lease_token IS NOT NULL AND n.lease_expires_at <= ?
          AND a.attempt_no = n.attempt_count AND a.outcome = 'in_progress'`, args: [key, now] });
      const row = selected.rows[0] as Record<string, unknown> | undefined;
      if (!row || typeof row.lease_token !== 'string' || typeof row.attempt_key !== 'string') return false;

      const errorMessage = PROVIDER_ERROR_MESSAGE;
      const updates = await database.batch([
        { sql: `UPDATE receipt_notifications SET status = 'uncertain', provider_message_id = NULL, last_error_code = ?, last_error_message = ?, sent_at = NULL,
            lease_token = NULL, lease_expires_at = NULL, updated_at = ?
          WHERE id = ? AND status = 'pending' AND attempt_count = ? AND lease_token = ? AND lease_expires_at <= ?
            AND EXISTS (SELECT 1 FROM receipt_notification_attempts WHERE notification_id = ? AND attempt_no = ? AND attempt_key = ? AND outcome = 'in_progress')`,
          args: [STALE_ATTEMPT_ERROR_CODE, errorMessage, now, String(row.id), Number(row.attempt_count), row.lease_token, now,
            String(row.id), Number(row.attempt_count), row.attempt_key] },
        { sql: `UPDATE receipt_notification_attempts SET outcome = 'uncertain', provider_message_id = NULL, acceptance_evidence = NULL,
            error_code = ?, error_message = ?, completed_at = ?
          WHERE notification_id = ? AND attempt_no = ? AND attempt_key = ? AND outcome = 'in_progress'
            AND EXISTS (SELECT 1 FROM receipt_notifications WHERE id = ? AND attempt_count = ? AND status = 'uncertain'
              AND lease_token IS NULL AND lease_expires_at IS NULL AND updated_at = ?)`,
          args: [STALE_ATTEMPT_ERROR_CODE, errorMessage, now, String(row.id), Number(row.attempt_count), row.attempt_key,
            String(row.id), Number(row.attempt_count), now] },
      ], 'write');
      return updates[0]?.rowsAffected === 1 && updates[1]?.rowsAffected === 1;
    },
  };
}

export function createRegistrationNotificationRepository(database: Client): RegistrationNotificationRepository {
  const repository = createReceiptNotificationRepository(database);
  return { ensureForRegistration: (input) => repository.ensureForRegistration(input) };
}
