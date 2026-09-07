import type { Client } from '@libsql/client';

export type RegistrationDeletionWrite = Readonly<{
  registrationIds: readonly string[];
  operationId: string;
  auditId: string;
  sessionId: string;
  createdAt: string;
}>;

export type RegistrationDeletionRepository = Readonly<{
  deleteSelected(input: RegistrationDeletionWrite): Promise<
    Readonly<{ kind: 'deleted' | 'already_done'; count: number }> | Readonly<{ kind: 'conflict' }>
  >;
}>;

function placeholders(length: number) {
  return Array.from({ length }, () => '?').join(', ');
}

export function createRegistrationDeletionRepository(database: Client): RegistrationDeletionRepository {
  return {
    async deleteSelected(input) {
      const transaction = await database.transaction('write');
      try {
        const replay = await transaction.execute({
          sql: `SELECT to_value FROM admin_audit_events WHERE action = 'registrations_deleted' AND request_id = ?`,
          args: [input.operationId],
        });
        if (replay.rows.length === 1) {
          const count = Number(replay.rows[0]?.to_value);
          await transaction.rollback();
          return { kind: 'already_done', count: Number.isSafeInteger(count) && count > 0 ? count : input.registrationIds.length };
        }

        const marks = placeholders(input.registrationIds.length);
        const existing = await transaction.execute({
          sql: `SELECT COUNT(*) AS count FROM barber_signups WHERE id IN (${marks})`, args: [...input.registrationIds],
        });
        if (Number(existing.rows[0]?.count) !== input.registrationIds.length) {
          await transaction.rollback();
          return { kind: 'conflict' };
        }

        const safeMessageJob = `j.state <> 'uncertain' AND j.lease_token IS NULL AND j.lease_expires_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM admin_message_job_attempts active WHERE active.job_id = j.id AND active.outcome = 'in_progress')`;
        const blockedMessageJob = await transaction.execute({ sql: `SELECT 1 FROM admin_message_jobs j
          JOIN admin_message_job_registrations m ON m.job_id = j.id WHERE m.registration_id IN (${marks}) AND NOT (${safeMessageJob}) LIMIT 1`,
          args: [...input.registrationIds] });
        if (blockedMessageJob.rows.length > 0) { await transaction.rollback(); return { kind: 'conflict' }; }
        const removableMessageJobs = await transaction.execute({ sql: `SELECT DISTINCT j.id FROM admin_message_jobs j
          JOIN admin_message_job_registrations m ON m.job_id = j.id WHERE m.registration_id IN (${marks}) AND ${safeMessageJob}`,
          args: [...input.registrationIds] });
        const messageJobIds = removableMessageJobs.rows.map((row) => String(row.id));
        if (messageJobIds.length) {
          const jobMarks = placeholders(messageJobIds.length);
          await transaction.execute({ sql: `DELETE FROM admin_message_job_attempts WHERE job_id IN (${jobMarks})`, args: messageJobIds });
          await transaction.execute({ sql: `DELETE FROM admin_message_job_registrations WHERE job_id IN (${jobMarks})`, args: messageJobIds });
          await transaction.execute({ sql: `DELETE FROM admin_message_jobs WHERE id IN (${jobMarks})`, args: messageJobIds });
        }

        const safeNotification = `n.registration_id IN (${marks})
          AND n.status <> 'uncertain' AND n.lease_token IS NULL AND n.lease_expires_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM receipt_notification_attempts active
            WHERE active.notification_id = n.id AND active.outcome = 'in_progress')`;
        const blocked = await transaction.execute({
          sql: `SELECT 1 FROM receipt_notifications n WHERE n.registration_id IN (${marks}) AND NOT (${safeNotification}) LIMIT 1`,
          args: [...input.registrationIds, ...input.registrationIds],
        });
        if (blocked.rows.length > 0) {
          await transaction.rollback();
          return { kind: 'conflict' };
        }

        await transaction.execute({
          sql: `DELETE FROM receipt_notification_attempts WHERE notification_id IN
            (SELECT n.id FROM receipt_notifications n WHERE ${safeNotification})`,
          args: [...input.registrationIds],
        });
        await transaction.execute({
          sql: `DELETE FROM receipt_notifications WHERE id IN
            (SELECT n.id FROM receipt_notifications n WHERE ${safeNotification})`,
          args: [...input.registrationIds],
        });
        await transaction.execute({ sql: `DELETE FROM admin_audit_events WHERE registration_id IN (${marks})`, args: [...input.registrationIds] });
        await transaction.execute({ sql: `DELETE FROM registration_numbers WHERE registration_id IN (${marks})`, args: [...input.registrationIds] });
        const deleted = await transaction.execute({
          sql: `DELETE FROM barber_signups WHERE id IN (${marks})
            AND NOT EXISTS (SELECT 1 FROM receipt_notifications n WHERE n.registration_id = barber_signups.id
              AND (n.status = 'uncertain' OR n.lease_token IS NOT NULL OR n.lease_expires_at IS NOT NULL
                OR EXISTS (SELECT 1 FROM receipt_notification_attempts active
                  WHERE active.notification_id = n.id AND active.outcome = 'in_progress')))`,
          args: [...input.registrationIds],
        });
        if (deleted.rowsAffected !== input.registrationIds.length) throw new Error('Registration deletion count mismatch.');
        await transaction.execute({
          sql: `INSERT INTO admin_audit_events
            (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
            VALUES (?, ?, NULL, 'registrations_deleted', NULL, ?, ?, ?)`,
          args: [input.auditId, input.sessionId, String(input.registrationIds.length), input.operationId, input.createdAt],
        });
        await transaction.commit();
        return { kind: 'deleted', count: input.registrationIds.length };
      } catch (error) {
        if (!transaction.closed) await transaction.rollback();
        throw error;
      } finally {
        transaction.close();
      }
    },
  };
}
