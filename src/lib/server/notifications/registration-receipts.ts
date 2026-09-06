import { createHash } from 'node:crypto';

import type { Client } from '@libsql/client';

type ReceiptInput = Readonly<{
  registrationId: string;
  termsVersion: string;
  mediaUrl: string;
  filename: string;
  sha256: string;
}>;

export type RegistrationNotificationRepository = Readonly<{
  ensureForRegistration(input: ReceiptInput): Promise<void>;
}>;

export function createRegistrationNotificationRepository(database: Client): RegistrationNotificationRepository {
  return {
    async ensureForRegistration(input) {
      const now = new Date().toISOString();
      const logicalMessageKey = createHash('sha256').update(`receipt:v1:${input.registrationId}:${input.termsVersion}`).digest('hex');
      await database.execute({
        sql: `INSERT INTO receipt_notifications (id, logical_message_key, registration_id, terms_version, attachment_kind, media_url, media_filename, media_mime_type, media_sha256, caption_text, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'document', ?, ?, 'application/pdf', ?, '', 'pending', ?, ?)
          ON CONFLICT(registration_id, terms_version) DO NOTHING`,
        args: [crypto.randomUUID(), logicalMessageKey, input.registrationId, input.termsVersion, input.mediaUrl, input.filename, input.sha256, now, now],
      });
      const notification = await database.execute({
        sql: 'SELECT id FROM receipt_notifications WHERE registration_id = ? AND terms_version = ?',
        args: [input.registrationId, input.termsVersion],
      });
      const id = notification.rows[0]?.id as string | undefined;
      if (!id) throw new Error('Receipt notification was not persisted.');

      const token = crypto.randomUUID();
      const leaseExpiresAt = new Date(Date.now() + 12_000).toISOString();
      const claims = await database.batch([
        {
          sql: `UPDATE receipt_notifications SET attempt_count = 1, lease_token = ?, lease_expires_at = ?, last_attempt_at = ?, updated_at = ?
            WHERE id = ? AND status = 'pending' AND attempt_count = 0
              AND (lease_expires_at IS NULL OR lease_expires_at <= ?)`,
          args: [token, leaseExpiresAt, now, now, id, now],
        },
        {
          sql: `INSERT INTO receipt_notification_attempts (id, notification_id, attempt_no, attempt_key, trigger, outcome, started_at)
            SELECT ?, id, 1, ?, 'automatic', 'in_progress', ?
            FROM receipt_notifications
            WHERE id = ? AND status = 'pending' AND attempt_count = 1 AND lease_token = ?`,
          args: [crypto.randomUUID(), token, now, id, token],
        },
      ], 'write');
      if (claims[0]?.rowsAffected !== 1) return;
    },
  };
}
