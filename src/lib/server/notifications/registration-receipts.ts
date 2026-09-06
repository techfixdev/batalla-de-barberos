import { createHash, randomUUID } from 'node:crypto';

import type { Client } from '@libsql/client';

import { isValidReceiptDocument, type ReceiptDocument, type SafeErrorCode } from './contracts';
import { createReceiptCaption } from './receipt-caption';

type ReceiptInput = Readonly<{
  registrationId: string; termsVersion: string; mediaUrl: string; filename: string; sha256: string; caption?: string;
}>;
type ClaimedAttempt = Readonly<{
  notificationId: string; logicalMessageKey: string; attemptKey: string; leaseToken: string; toE164: `+54${string}`;
  attachment: ReceiptDocument;
}>;
type Completion = Readonly<{
  status: 'sent' | 'failed' | 'uncertain'; providerMessageId?: string;
  evidence?: 'validated-document-status' | 'document-response-marker'; errorCode?: SafeErrorCode;
}>;

export type RegistrationNotificationRepository = Readonly<{ ensureForRegistration(input: ReceiptInput): Promise<void> }>;
export type ReceiptNotificationRepository = RegistrationNotificationRepository & Readonly<{
  claim(logicalMessageKey: string): Promise<ClaimedAttempt | null>;
  complete(attempt: ClaimedAttempt, completion: Completion): Promise<void>;
}>;

export const deriveLogicalMessageKey = (registrationId: string, termsVersion: string) =>
  createHash('sha256').update(`receipt:v1:${registrationId}:${termsVersion}`).digest('hex');
const PROVIDER_ERROR_MESSAGE = 'Error del proveedor al enviar el documento.';

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
    async claim(key) {
      const selected = await database.execute({ sql: `SELECT n.id, n.logical_message_key, n.attempt_count, n.attachment_kind, n.media_url, n.media_filename, n.media_mime_type, n.caption_text, b.phone_e164
        FROM receipt_notifications n JOIN barber_signups b ON b.id = n.registration_id WHERE n.logical_message_key = ?`, args: [key] });
      const row = selected.rows[0] as Record<string, unknown> | undefined;
      const attachment = { kind: row?.attachment_kind, mediaUrl: row?.media_url, filename: row?.media_filename,
        mimeType: row?.media_mime_type, caption: row?.caption_text };
      if (!row || typeof row.phone_e164 !== 'string' || !isValidReceiptDocument(attachment)) return null;
      const now = new Date().toISOString(), leaseToken = randomUUID(), number = Number(row.attempt_count) + 1;
      const keyForAttempt = randomUUID(), expiresAt = new Date(Date.now() + 12_000).toISOString();
      const claims = await database.batch([
        { sql: `UPDATE receipt_notifications SET attempt_count = ?, lease_token = ?, lease_expires_at = ?, last_attempt_at = ?, updated_at = ?
          WHERE id = ? AND status IN ('pending', 'failed', 'uncertain') AND (lease_expires_at IS NULL OR lease_expires_at <= ?)`,
          args: [number, leaseToken, expiresAt, now, now, String(row.id), now] },
        { sql: `INSERT INTO receipt_notification_attempts (id, notification_id, attempt_no, attempt_key, trigger, outcome, started_at)
          SELECT ?, id, ?, ?, 'automatic', 'in_progress', ? FROM receipt_notifications WHERE id = ? AND lease_token = ?`,
          args: [randomUUID(), number, keyForAttempt, now, String(row.id), leaseToken] },
      ], 'write');
      if (claims[0]?.rowsAffected !== 1 || claims[1]?.rowsAffected !== 1) return null;
      return { notificationId: String(row.id), logicalMessageKey: String(row.logical_message_key), attemptKey: keyForAttempt, leaseToken,
        toE164: row.phone_e164 as `+54${string}`, attachment };
    },
    async complete(attempt, completion) {
      const now = new Date().toISOString();
      const updates = await database.batch([
        { sql: `UPDATE receipt_notifications SET status = ?, provider_message_id = ?, last_error_code = ?, last_error_message = ?, sent_at = ?, lease_token = NULL, lease_expires_at = NULL, updated_at = ? WHERE id = ? AND lease_token = ?`,
          args: [completion.status, completion.providerMessageId ?? null, completion.errorCode ?? null, completion.errorCode ? PROVIDER_ERROR_MESSAGE : null, completion.status === 'sent' ? now : null, now, attempt.notificationId, attempt.leaseToken] },
        { sql: `UPDATE receipt_notification_attempts SET outcome = ?, provider_message_id = ?, acceptance_evidence = ?, error_code = ?, error_message = ?, completed_at = ? WHERE notification_id = ? AND attempt_key = ? AND outcome = 'in_progress'`,
          args: [completion.status, completion.providerMessageId ?? null, completion.evidence ?? null, completion.errorCode ?? null, completion.errorCode ? PROVIDER_ERROR_MESSAGE : null, now, attempt.notificationId, attempt.attemptKey] },
      ], 'write');
      if (updates[0]?.rowsAffected !== 1 || updates[1]?.rowsAffected !== 1) throw new Error('Receipt attempt completion is ambiguous.');
    },
  };
}

export function createRegistrationNotificationRepository(database: Client): RegistrationNotificationRepository {
  const repository = createReceiptNotificationRepository(database);
  return {
    async ensureForRegistration(input) {
      await repository.ensureForRegistration(input);
      await repository.claim(deriveLogicalMessageKey(input.registrationId, input.termsVersion));
    },
  };
}
