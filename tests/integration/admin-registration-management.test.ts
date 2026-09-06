import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRegistrationLifecycleRepository } from '../../src/lib/server/admin/registration-lifecycle-repository';
import { createRegistrationManagementService } from '../../src/lib/server/admin/registration-management-service';
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

  it('changes only review state, increments its version, and appends one matching audit event', async () => {
    const client = await database();
    await seedRegistration(client, 'review-change', '2026-09-05T10:00:00.000Z');
    await seedReceipt(client, 'review-change', 'sent');
    const service = createRegistrationManagementService({
      repository: createRegistrationLifecycleRepository(client),
      now: () => '2026-09-05T11:00:00.000Z',
      createId: () => 'audit-review-change',
    });

    await expect(service.changeReview({ registrationId: 'review-change', expectedStateVersion: 0, nextState: 'selected',
      sessionId: 'session-internal', requestId: 'request-internal' })).resolves.toEqual({ kind: 'success', stateVersion: 1 });
    expect(await client.execute({ sql: `SELECT review_state, participant_response_state, state_version FROM barber_signups WHERE id = ?`, args: ['review-change'] }))
      .toMatchObject({ rows: [{ review_state: 'selected', participant_response_state: 'not_requested', state_version: 1 }] });
    expect(await client.execute({ sql: `SELECT action, from_value, to_value, session_id, registration_id, request_id, created_at FROM admin_audit_events WHERE registration_id = ?`, args: ['review-change'] }))
      .toMatchObject({ rows: [{ action: 'review_state_changed', from_value: 'received', to_value: 'selected', session_id: 'session-internal', registration_id: 'review-change', request_id: 'request-internal', created_at: '2026-09-05T11:00:00.000Z' }] });
    expect((await createRegistrationReadRepository(client).findById('review-change'))?.receipt?.status).toBe('sent');
  });

  it('keeps participant response independent and rejects invalid, missing, stale, and no-op writes without audits', async () => {
    const client = await database();
    await seedRegistration(client, 'participant-change', '2026-09-05T10:00:00.000Z');
    const service = createRegistrationManagementService({ repository: createRegistrationLifecycleRepository(client),
      now: () => '2026-09-05T11:00:00.000Z', createId: () => 'audit-participant-change' });
    const context = { registrationId: 'participant-change', expectedStateVersion: 0, sessionId: 'session-internal', requestId: 'request-internal' };

    await expect(service.changeReview({ ...context, nextState: 'sent' })).resolves.toEqual({ kind: 'invalid' });
    await expect(service.changeReview({ ...context, expectedStateVersion: Infinity, nextState: 'selected' })).resolves.toEqual({ kind: 'invalid' });
    await expect(service.changeReview({ ...context, registrationId: 'missing-registration', nextState: 'selected' })).resolves.toEqual({ kind: 'notfound' });
    await expect(service.changeParticipantResponse({ ...context, nextState: 'not_requested' })).resolves.toEqual({ kind: 'noop' });
    await expect(service.changeParticipantResponse({ ...context, nextState: 'confirmed' })).resolves.toEqual({ kind: 'success', stateVersion: 1 });
    await expect(service.changeReview({ ...context, nextState: 'selected' })).resolves.toEqual({ kind: 'conflict' });

    expect(await client.execute({ sql: `SELECT review_state, participant_response_state, state_version FROM barber_signups WHERE id = ?`, args: ['participant-change'] }))
      .toMatchObject({ rows: [{ review_state: 'received', participant_response_state: 'confirmed', state_version: 1 }] });
    expect(await client.execute({ sql: `SELECT action, from_value, to_value FROM admin_audit_events WHERE registration_id = ?`, args: ['participant-change'] }))
      .toMatchObject({ rows: [{ action: 'participant_response_changed', from_value: 'not_requested', to_value: 'confirmed' }] });
  });

  it('allows exactly one concurrent versioned write and rolls back a forced audit insert failure', async () => {
    const client = await database();
    await seedRegistration(client, 'concurrent-change', '2026-09-05T10:00:00.000Z');
    const repository = createRegistrationLifecycleRepository(client);
    const makeService = (auditId: string) => createRegistrationManagementService({ repository, now: () => '2026-09-05T11:00:00.000Z', createId: () => auditId });
    const input = { registrationId: 'concurrent-change', expectedStateVersion: 0, sessionId: 'session-internal', requestId: 'request-internal' };
    const outcomes = await Promise.all([makeService('audit-concurrent-one').changeReview({ ...input, nextState: 'selected' }),
      makeService('audit-concurrent-two').changeReview({ ...input, nextState: 'rejected' })]);
    expect(outcomes).toEqual(expect.arrayContaining([{ kind: 'success', stateVersion: 1 }, { kind: 'conflict' }]));
    expect(await client.execute({ sql: `SELECT state_version FROM barber_signups WHERE id = ?`, args: ['concurrent-change'] })).toMatchObject({ rows: [{ state_version: 1 }] });
    expect(await client.execute({ sql: `SELECT COUNT(*) AS count FROM admin_audit_events WHERE registration_id = ?`, args: ['concurrent-change'] })).toMatchObject({ rows: [{ count: 1 }] });

    await seedRegistration(client, 'audit-rollback', '2026-09-05T10:00:00.000Z');
    await client.execute({ sql: `INSERT INTO admin_audit_events (id, session_id, registration_id, action, request_id, created_at)
      VALUES ('duplicate-audit-id', 'session-internal', 'concurrent-change', 'review_state_changed', 'request-internal', '2026-09-05T11:00:00.000Z')` });
    await expect(makeService('duplicate-audit-id').changeReview({ registrationId: 'audit-rollback', expectedStateVersion: 0, nextState: 'selected',
      sessionId: 'session-internal', requestId: 'request-internal' })).resolves.toEqual({ kind: 'safe_unavailable' });
    expect(await client.execute({ sql: `SELECT review_state, state_version FROM barber_signups WHERE id = ?`, args: ['audit-rollback'] }))
      .toMatchObject({ rows: [{ review_state: 'received', state_version: 0 }] });
    expect(await client.execute({ sql: `SELECT COUNT(*) AS count FROM admin_audit_events WHERE registration_id = ?`, args: ['audit-rollback'] })).toMatchObject({ rows: [{ count: 0 }] });
  });

  it('writes one audit when same-target races lose on either lifecycle axis', async () => {
    const client = await database();
    const repository = createRegistrationLifecycleRepository(client);
    const runSameTargetRace = async (axis: 'review' | 'participant', registrationId: string, nextState: 'selected' | 'confirmed') => {
      await seedRegistration(client, registrationId, '2026-09-05T10:00:00.000Z');
      const makeService = (auditId: string) => createRegistrationManagementService({ repository,
        now: () => '2026-09-05T11:00:00.000Z', createId: () => auditId });
      const input = { registrationId, expectedStateVersion: 0, sessionId: 'session-internal' };
      const change = axis === 'review'
        ? (service: ReturnType<typeof makeService>, requestId: string) => service.changeReview({ ...input, nextState, requestId })
        : (service: ReturnType<typeof makeService>, requestId: string) => service.changeParticipantResponse({ ...input, nextState, requestId });

      await expect(Promise.all([
        change(makeService(`audit-${axis}-one`), `request-${axis}-one`),
        change(makeService(`audit-${axis}-two`), `request-${axis}-two`),
      ])).resolves.toEqual(expect.arrayContaining([{ kind: 'success', stateVersion: 1 }, { kind: 'conflict' }]));
      expect(await client.execute({ sql: `SELECT COUNT(*) AS count FROM admin_audit_events WHERE registration_id = ?`, args: [registrationId] }))
        .toMatchObject({ rows: [{ count: 1 }] });
    };

    await runSameTargetRace('review', 'same-review-target', 'selected');
    await runSameTargetRace('participant', 'same-participant-target', 'confirmed');
  });

  it('permits every allowlisted target state while preserving each other lifecycle axis', async () => {
    const client = await database();
    const repository = createRegistrationLifecycleRepository(client);
    let audit = 0;
    const service = createRegistrationManagementService({ repository, now: () => '2026-09-05T11:00:00.000Z', createId: () => `audit-allowlisted-${audit += 1}` });
    const reviewTargets = ['received', 'under_review', 'selected', 'rejected', 'withdrawn'] as const;
    const participantTargets = ['not_requested', 'pending', 'confirmed', 'declined'] as const;

    for (const [index, nextState] of reviewTargets.entries()) {
      const registrationId = `review-target-${index}`;
      await seedRegistration(client, registrationId, '2026-09-05T10:00:00.000Z', { reviewState: nextState === 'received' ? 'under_review' : 'received' });
      await expect(service.changeReview({ registrationId, expectedStateVersion: 0, nextState, sessionId: 'session-internal', requestId: 'request-internal' }))
        .resolves.toEqual({ kind: 'success', stateVersion: 1 });
      expect(await repository.findById(registrationId)).toMatchObject({ reviewState: nextState, participantResponseState: 'not_requested', stateVersion: 1 });
    }
    for (const [index, nextState] of participantTargets.entries()) {
      const registrationId = `participant-target-${index}`;
      await seedRegistration(client, registrationId, '2026-09-05T10:00:00.000Z', { participantState: nextState === 'not_requested' ? 'pending' : 'not_requested' });
      await expect(service.changeParticipantResponse({ registrationId, expectedStateVersion: 0, nextState, sessionId: 'session-internal', requestId: 'request-internal' }))
        .resolves.toEqual({ kind: 'success', stateVersion: 1 });
      expect(await repository.findById(registrationId)).toMatchObject({ reviewState: 'received', participantResponseState: nextState, stateVersion: 1 });
    }
    expect(await client.execute({ sql: `SELECT COUNT(*) AS count FROM admin_audit_events`, args: [] })).toMatchObject({ rows: [{ count: 9 }] });
  });
});

import { signAdminSessionCookie } from '../../src/lib/server/admin/session-crypto';
import { sha256 } from '../../src/lib/server/admin/session-repository';
import { createParticipantResponseRoute } from '../../src/pages/api/admin/registrations/[id]/participant-response';
import { createReviewStateRoute } from '../../src/pages/api/admin/registrations/[id]/review-state';

const FORM_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const FORM_CSRF = Buffer.alloc(32, 9).toString('base64url');
const FORM_COOKIE = signAdminSessionCookie({ sessionToken: Buffer.alloc(32, 7).toString('base64url'), csrfToken: FORM_CSRF }, FORM_SECRET)!;
const formSession = { id: 'session-form', csrfHash: sha256(FORM_CSRF), createdAt: '2026-09-01T00:00:00.000Z', expiresAt: '2026-10-01T00:00:00.000Z', revokedAt: null };

type FormRoute = ReturnType<typeof createReviewStateRoute>;
function formRequest(fields: readonly (readonly [string, string])[], origin = 'https://admin.example.test') {
  return new Request('https://admin.example.test/api/admin/registrations/registration-1/review-state', {
    method: 'POST', headers: { Origin: origin, Cookie: `bdb_admin=${FORM_COOKIE}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields.map(([name, value]) => [name, value])),
  });
}
function route(factory: (options: any) => FormRoute, outcome: any = { kind: 'success', stateVersion: 1 }, session = formSession) {
  const service = { changeReview: vi.fn(async () => outcome), changeParticipantResponse: vi.fn(async () => outcome) };
  return { service, handle: factory({ sessionSecretB64: FORM_SECRET, sessions: { findByTokenHash: async () => session }, service, createRequestId: () => 'request-form' }) };
}

// 3.2c: direct route contracts keep auth/form parsing outside lifecycle persistence.
describe('authenticated lifecycle form routes', () => {
  it('updates only the requested axis and returns an encoded detail PRG redirect', async () => {
    const review = route(createReviewStateRoute), participant = route(createParticipantResponseRoute);
    const locals = { adminSession: { id: formSession.id, expiresAt: formSession.expiresAt }, adminCsrfToken: FORM_CSRF };
    const reviewResponse = await review.handle({ request: formRequest([['csrf', FORM_CSRF], ['stateVersion', '0'], ['reviewState', 'selected']]), params: { id: 'registration-1' }, locals });
    const participantResponse = await participant.handle({ request: formRequest([['csrf', FORM_CSRF], ['stateVersion', '0'], ['participantResponse', 'confirmed']]), params: { id: 'registration-1' }, locals });
    expect(reviewResponse.status).toBe(303); expect(reviewResponse.headers.get('location')).toBe('/admin/inscripciones/registration-1');
    expect(participantResponse.status).toBe(303); expect(review.service.changeReview).toHaveBeenCalledOnce(); expect(review.service.changeParticipantResponse).not.toHaveBeenCalled();
    expect(participant.service.changeParticipantResponse).toHaveBeenCalledOnce(); expect(participant.service.changeReview).not.toHaveBeenCalled();
  });

  it.each([
    ['missing csrf', [['stateVersion', '0'], ['reviewState', 'selected']], 'https://admin.example.test', 403],
    ['cross-origin', [['csrf', FORM_CSRF], ['stateVersion', '0'], ['reviewState', 'selected']], 'https://other.example.test', 403],
    ['duplicate field', [['csrf', FORM_CSRF], ['stateVersion', '0'], ['stateVersion', '0'], ['reviewState', 'selected']], 'https://admin.example.test', 400],
    ['cross axis', [['csrf', FORM_CSRF], ['stateVersion', '0'], ['participantResponse', 'confirmed']], 'https://admin.example.test', 400],
    ['noncanonical version', [['csrf', FORM_CSRF], ['stateVersion', '00'], ['reviewState', 'selected']], 'https://admin.example.test', 400],
  ] as const)('rejects %s before lifecycle mutation or audit', async (_name, fields, origin, status) => {
    const tested = route(createReviewStateRoute); const response = await tested.handle({ request: formRequest(fields, origin), params: { id: 'registration-1' }, locals: { adminSession: { id: formSession.id, expiresAt: formSession.expiresAt }, adminCsrfToken: FORM_CSRF } });
    expect(response.status).toBe(status); expect(tested.service.changeReview).not.toHaveBeenCalled(); expect(await response.text()).not.toContain(FORM_CSRF);
  });

  it.each([[{ ...formSession, csrfHash: sha256('wrong') }, 403], [{ ...formSession, id: 'another-session' }, 401]] as const)('rejects persisted csrf or middleware-session mismatches without raw errors', async (session, status) => {
    const tested = route(createReviewStateRoute, { kind: 'safe_unavailable' }, session);
    const response = await tested.handle({ request: formRequest([['csrf', FORM_CSRF], ['stateVersion', '0'], ['reviewState', 'selected']]), params: { id: 'registration-1' }, locals: { adminSession: { id: formSession.id, expiresAt: formSession.expiresAt }, adminCsrfToken: FORM_CSRF } });
    expect(response.status).toBe(status); expect(tested.service.changeReview).not.toHaveBeenCalled(); expect(await response.text()).not.toContain('safe_unavailable');
  });

  it.each([['conflict', 409], ['noop', 400], ['notfound', 404], ['invalid', 400], ['safe_unavailable', 503]] as const)('maps safe %s outcomes without leaking diagnostics', async (kind, status) => {
    const tested = route(createReviewStateRoute, { kind }); const response = await tested.handle({ request: formRequest([['csrf', FORM_CSRF], ['stateVersion', '0'], ['reviewState', 'selected']]), params: { id: 'registration-1' }, locals: { adminSession: { id: formSession.id, expiresAt: formSession.expiresAt }, adminCsrfToken: FORM_CSRF } });
    expect(response.status).toBe(status); expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(await response.text()).not.toContain(kind);
  });
});

describe('authenticated lifecycle form storage outage', () => {
  it('returns only a static 503 before a lifecycle write when the live-session lookup fails', async () => {
    const service = { changeReview: vi.fn(), changeParticipantResponse: vi.fn() };
    const handle = createReviewStateRoute({ sessionSecretB64: FORM_SECRET, sessions: { findByTokenHash: async () => { throw new Error('database password leaked'); } }, service });
    const response = await handle({ request: formRequest([['csrf', FORM_CSRF], ['stateVersion', '0'], ['reviewState', 'selected']]), params: { id: 'registration-1' }, locals: { adminSession: { id: formSession.id, expiresAt: formSession.expiresAt }, adminCsrfToken: FORM_CSRF } });
    expect(response.status).toBe(503); expect(service.changeReview).not.toHaveBeenCalled(); expect(await response.text()).toBe('Servicio no disponible.');
  });
});
