import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';

import { createRegistrationReadRepository } from '../../src/lib/server/admin/registration-read-repository';
import { presentRegistration } from '../../src/lib/server/admin/registration-presentation';
import { migrate } from '../../scripts/migrate.mjs';

const databases: Client[] = [];
const termsVersion = 'draft-2026-09-v1';

async function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  await migrate(client);
  return client;
}

async function seedRegistration(client: Client, id: string, createdAt: string, options: Partial<{
  phoneE164: string | null; reviewState: string; participantState: string; receiptRequired: number;
}> = {}) {
  await client.execute({
    sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at,
      terms_version, review_state, participant_response_state, receipt_required)
      VALUES (?, ?, ?, ?, ?, 'profesional', 1, ?, ?, ?, ?, ?)`,
    args: [id, `Persona ${id}`, `${id}@example.test`, '+54 9 11 2345-6789', 'phoneE164' in options ? options.phoneE164! : '+5491123456789', createdAt,
      termsVersion, options.reviewState ?? 'received', options.participantState ?? 'not_requested', options.receiptRequired ?? 1],
  });
}

async function seedReceipt(client: Client, registrationId: string, status: 'pending' | 'sent' | 'failed' | 'uncertain', suffix = registrationId, receiptTermsVersion = termsVersion) {
  await client.execute({
    sql: `INSERT INTO receipt_notifications (id, logical_message_key, registration_id, terms_version, attachment_kind,
      media_url, media_filename, media_mime_type, media_sha256, caption_text, status, attempt_count, last_error_code,
      last_error_message, last_attempt_at, sent_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'document', ?, ?, 'application/pdf', ?, 'Acuse de inscripción', ?, 2, 'PROVIDER_TIMEOUT',
      'Error del proveedor al enviar el documento.', ?, ?, ?, ?)`,
    args: [`receipt-${suffix}`, `key-${suffix}`, registrationId, receiptTermsVersion, `https://batalla.test/${suffix}.pdf`, `${suffix}.pdf`,
      'a'.repeat(64), status, '2026-09-05T10:00:00.000Z', status === 'sent' ? '2026-09-05T10:01:00.000Z' : null,
      '2026-09-05T09:00:00.000Z', '2026-09-05T10:01:00.000Z'],
  });
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('submitted-registration-only admin read model', () => {
  it('lists and counts only persisted signups with a stable 50-row keyset and matching filters', async () => {
    const client = await database();
    // This expected-person fixture is intentionally not inserted into any table.
    const expectedPerson = { id: 'expected-person', fullName: 'Nunca se inscribió' };
    for (let index = 1; index <= 51; index += 1) {
      await seedRegistration(client, `registration-${String(index).padStart(2, '0')}`, '2026-09-05T12:00:00.000Z', {
        reviewState: index === 51 ? 'selected' : 'received', participantState: index === 51 ? 'confirmed' : 'not_requested',
      });
    }
    await seedReceipt(client, 'registration-51', 'failed');
    const repository = createRegistrationReadRepository(client);

    const first = await repository.list();
    expect(first.registrations).toHaveLength(50);
    expect(first.registrations[0]?.id).toBe('registration-51');
    expect(first.registrations.at(-1)?.id).toBe('registration-02');
    expect(first.nextCursor).toEqual(expect.any(String));
    if (!first.nextCursor) throw new Error('Expected a next-page cursor.');
    expect(await repository.count()).toBe(51);
    expect((await repository.list({ cursor: first.nextCursor })).registrations.map(({ id }) => id)).toEqual(['registration-01']);
    expect(await repository.count({ reviewState: 'received' })).toBe(50);
    expect(JSON.stringify(first)).not.toContain(expectedPerson.id);
    expect(JSON.stringify(first)).not.toContain(expectedPerson.fullName);
  });

  it('joins only the persisted terms receipt, validates untrusted inputs, and presents independent Spanish axes safely', async () => {
    const client = await database();
    await seedRegistration(client, 'historical', '2026-09-04T10:00:00.000Z', { phoneE164: null, receiptRequired: 0 });
    await seedRegistration(client, 'missing-receipt', '2026-09-04T11:00:00.000Z');
    await seedRegistration(client, 'attention-pending', '2026-09-04T12:00:00.000Z', { reviewState: 'under_review', participantState: 'pending' });
    await seedRegistration(client, 'attention-failed', '2026-09-04T13:00:00.000Z', { reviewState: 'selected', participantState: 'confirmed' });
    await seedRegistration(client, 'attention-uncertain', '2026-09-04T14:00:00.000Z', { reviewState: 'rejected', participantState: 'declined' });
    await seedRegistration(client, 'sent', '2026-09-04T15:00:00.000Z');
    await seedReceipt(client, 'attention-pending', 'pending');
    await seedReceipt(client, 'attention-failed', 'failed');
    await seedReceipt(client, 'attention-uncertain', 'uncertain');
    await seedReceipt(client, 'sent', 'sent');
    // A different terms version must not duplicate or replace the persisted-signup receipt projection.
    await seedReceipt(client, 'sent', 'failed', 'other-terms', 'draft-older');
    await client.execute({
      sql: `INSERT INTO receipt_notification_attempts (id, notification_id, attempt_no, attempt_key, trigger, outcome, error_code,
        error_message, started_at, completed_at) VALUES ('attempt-sent', 'receipt-sent', 2, 'attempt-key', 'automatic', 'sent',
        'raw-secret', 'raw provider response', '2026-09-05T10:00:00.000Z', '2026-09-05T10:01:00.000Z')`,
    });
    await client.execute({
      sql: `INSERT INTO admin_audit_events (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
        VALUES ('audit-sent', 'session-internal', 'sent', 'review_state_changed', 'received', 'selected', 'request-internal', '2026-09-05T10:02:00.000Z')`,
    });
    await client.execute({ sql: "UPDATE receipt_notifications SET last_error_message = 'raw provider secret' WHERE id = 'receipt-attention-failed'" });
    const repository = createRegistrationReadRepository(client);

    const attention = await repository.list({ attention: '1' });
    expect(attention.registrations.map(({ id }) => id)).toEqual(['attention-uncertain', 'attention-failed', 'attention-pending', 'missing-receipt']);
    expect(await repository.count({ attention: '1' })).toBe(4);
    expect(await repository.count({ reviewState: 'selected', participantResponseState: 'confirmed', receiptStatus: 'failed' })).toBe(1);
    expect(await repository.count({ reviewState: 'under_review', participantResponseState: 'pending', receiptStatus: 'pending' })).toBe(1);
    expect(await repository.count({ reviewState: 'rejected', participantResponseState: 'declined', receiptStatus: 'uncertain' })).toBe(1);
    await expect(repository.list({ reviewState: "selected' OR 1=1 --" })).rejects.toThrow('Invalid registration filter.');
    await expect(repository.list({ cursor: 'not-an-opaque-cursor' })).rejects.toThrow('Invalid registration cursor.');
    await expect(repository.count({ cursor: 'not-an-opaque-cursor' })).rejects.toThrow('Invalid registration cursor.');

    const detail = await repository.findById('sent');
    expect(detail?.receipt).toMatchObject({ status: 'sent', termsVersion, mediaUrl: 'https://batalla.test/sent.pdf', attemptCount: 2 });
    expect((await repository.findById('attention-failed'))?.receipt).toMatchObject({ lastErrorCode: 'PROVIDER_TIMEOUT', lastErrorMessage: 'Error del proveedor al enviar el documento.' });
    expect(JSON.stringify(await repository.findById('attention-failed'))).not.toContain('raw provider secret');
    expect(detail?.receipt?.attempts).toEqual([expect.objectContaining({ outcome: 'sent', errorCode: null, errorMessage: null })]);
    expect(detail?.auditEvents).toEqual([{ action: 'review_state_changed', fromValue: 'received', toValue: 'selected', createdAt: '2026-09-05T10:02:00.000Z' }]);
    expect(await repository.findById('expected-person')).toBeNull();
    expect(presentRegistration((await repository.findById('historical'))!)).toMatchObject({
      phone: 'No disponible (registro anterior)', review: { heading: 'Revisión de inscripción' },
      participantResponse: { heading: 'Respuesta del participante' }, receipt: { heading: 'Acuse documental por WhatsApp' },
    });
    expect(presentRegistration(detail!).receipt.label).toBe('Documento aceptado por el proveedor; entrega no verificada');
    expect(presentRegistration((await repository.findById('missing-receipt'))!).receipt.label)
      .toBe('Inscripción recibida; acuse pendiente de conciliación');
  });

  it('retains only audit values from the action’s lifecycle axis', async () => {
    const client = await database();
    await seedRegistration(client, 'audit-values', '2026-09-05T10:00:00.000Z');
    await client.batch([
      { sql: `INSERT INTO admin_audit_events (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
        VALUES ('audit-tainted', 'session-internal', 'audit-values', 'review_state_changed', 'ana@example.test', '+5491100000000', 'request-internal', '2026-09-05T10:02:00.000Z')` },
      { sql: `INSERT INTO admin_audit_events (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
        VALUES ('audit-cross-axis', 'session-internal', 'audit-values', 'participant_response_changed', 'received', 'selected', 'request-internal', '2026-09-05T10:03:00.000Z')` },
      { sql: `INSERT INTO admin_audit_events (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
        VALUES ('audit-valid', 'session-internal', 'audit-values', 'participant_response_changed', 'pending', 'confirmed', 'request-internal', '2026-09-05T10:04:00.000Z')` },
      { sql: `INSERT INTO admin_audit_events (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
        VALUES ('audit-partial', 'session-internal', 'audit-values', 'review_state_changed', 'received', 'private-id', 'request-internal', '2026-09-05T10:05:00.000Z')` },
    ], 'write');

    const detail = await createRegistrationReadRepository(client).findById('audit-values');
    expect(detail?.auditEvents).toEqual([
      { action: 'review_state_changed', fromValue: 'received', toValue: null, createdAt: '2026-09-05T10:05:00.000Z' },
      { action: 'participant_response_changed', fromValue: 'pending', toValue: 'confirmed', createdAt: '2026-09-05T10:04:00.000Z' },
      { action: 'participant_response_changed', fromValue: null, toValue: null, createdAt: '2026-09-05T10:03:00.000Z' },
      { action: 'review_state_changed', fromValue: null, toValue: null, createdAt: '2026-09-05T10:02:00.000Z' },
    ]);
    expect(JSON.stringify(detail)).not.toContain('ana@example.test');
    expect(JSON.stringify(detail)).not.toContain('+5491100000000');
    expect(JSON.stringify(detail)).not.toContain('private-id');
  });
});
