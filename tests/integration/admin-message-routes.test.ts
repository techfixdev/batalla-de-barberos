import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';
import { parseConfirmationSendForm, parseOrganizationSendForm, parseRetryAdminMessageForm } from '../../src/lib/server/admin/admin-message-route';
import { signAdminSessionCookie } from '../../src/lib/server/admin/session-crypto';
import { sha256 } from '../../src/lib/server/admin/session-repository';
import { parseEvolutionPrivateMediaProfile } from '../../src/lib/server/notifications/evolution-private-media-profile';
import { createRegistrationConfirmationSendRoute } from '../../src/pages/api/admin/registrations/[id]/confirmation/send';
import { createOrganizationListSendRoute } from '../../src/pages/api/admin/registrations/send-organization-list';

function request(path: string, body: string, origin = 'https://admin.test') {
  return new Request(`https://admin.test${path}`, { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body });
}

describe('strict manual admin message forms', () => {
  it('requires a distinct explicit confirmation acceptance and rejects duplicate or unknown fields', async () => {
    const valid = request('/api/admin/registrations/id/confirmation/send', 'csrf=token&operationNonce=operation-confirmation-001&confirmPlace=1');
    expect(await parseConfirmationSendForm(valid)).toMatchObject({ csrf: 'token', confirmPlace: true });
    expect(await parseConfirmationSendForm(request('/x', 'csrf=token&operationNonce=operation-confirmation-001'))).toMatchObject({ status: 400 });
    expect(await parseConfirmationSendForm(request('/x', 'csrf=token&csrf=other&operationNonce=operation-confirmation-001&confirmPlace=1'))).toMatchObject({ status: 400 });
    expect(await parseConfirmationSendForm(request('/x', 'csrf=token&operationNonce=operation-confirmation-001&confirmPlace=1&reviewState=selected'))).toMatchObject({ status: 400 });
  });

  it('accepts a per-send Argentine organization recipient and shared selected/filter scope, with no cursor', async () => {
    const selected = 'csrf=token&operationNonce=operation-org-001&confirmSend=1&recipient=%2B54+9+11+2345-6789&scope=filtered&review=&participant=&receipt=&attention=&registrationId=11111111-1111-4111-8111-111111111111';
    expect(await parseOrganizationSendForm(request('/x', selected))).toMatchObject({ recipientE164: '+5491123456789', registrationIds: ['11111111-1111-4111-8111-111111111111'] });
    expect(await parseOrganizationSendForm(request('/x', `${selected}&cursor=secret`))).toMatchObject({ status: 400 });
    expect(await parseOrganizationSendForm(request('/x', selected.replace('recipient=%2B54+9+11+2345-6789', 'recipient=%2B14155552671')))).toMatchObject({ status: 400 });
    expect(await parseOrganizationSendForm(request('/x', selected, 'https://evil.test'))).toMatchObject({ status: 403 });
  });

  it('requires uncertain acknowledgement and recipient only when explicitly present', async () => {
    expect(await parseRetryAdminMessageForm(request('/x', 'csrf=token&ackUncertain=1&recipient=011+15-2345-6789'))).toMatchObject({ acknowledgeUncertain: true, recipientE164: '+5491123456789' });
    expect(await parseRetryAdminMessageForm(request('/x', 'csrf=token&ackUncertain=1&ackUncertain=1&recipient='))).toMatchObject({ status: 400 });
  });
});

const SESSION_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const RECIPIENT_SECRET = Buffer.alloc(32, 6).toString('base64');
const CSRF = Buffer.alloc(32, 9).toString('base64url');
const SESSION_TOKEN = Buffer.alloc(32, 7).toString('base64url');
const COOKIE = signAdminSessionCookie({ sessionToken: SESSION_TOKEN, csrfToken: CSRF }, SESSION_SECRET)!;
const routeDirectories: string[] = [];
const routeDatabases: ReturnType<typeof createClient>[] = [];

function readyEnvironment() {
  const base = {
    WHATSAPP_DISPATCH_ENABLED: 'true', WHATSAPP_PRIVATE_MEDIA_ENABLED: 'true', EVOLUTION_API_BASE_URL: 'https://evolution.example.test/',
    EVOLUTION_API_INSTANCE: 'local-fixture', EVOLUTION_API_KEY: 'dummy-local-secret', EVOLUTION_API_AUTH_HEADER: 'apikey',
    EVOLUTION_API_AUTH_SCHEME: 'raw', EVOLUTION_API_ACCEPTED_HTTP_STATUSES: '200', EVOLUTION_API_TIMEOUT_MS: '1000',
    ADMIN_MESSAGE_RECIPIENT_HMAC_SECRET_B64: RECIPIENT_SECRET,
  };
  const parsed = parseEvolutionPrivateMediaProfile(base);
  if (!('fingerprint' in parsed) || !parsed.fingerprint) throw new Error('Fixture profile did not produce a fingerprint.');
  return { ...base, EVOLUTION_API_PRIVATE_MEDIA_VALIDATED_PROFILE_SHA256: parsed.fingerprint };
}

async function databaseFixture(reviewState = 'selected') {
  const directory = await mkdtemp(join(tmpdir(), 'bdb-message-route-'));
  routeDirectories.push(directory);
  const database = createClient({ url: pathToFileURL(join(directory, 'fixture.db')).href });
  routeDatabases.push(database);
  await migrate(database);
  await database.execute({ sql: `INSERT INTO admin_sessions (id, token_hash, csrf_hash, created_at, expires_at, last_seen_at)
    VALUES ('session-route', ?, ?, '2026-01-01', '2099-01-01', '2026-01-01')`, args: [sha256(SESSION_TOKEN), sha256(CSRF)] });
  for (const [index, id] of ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'].entries()) {
    await database.execute({ sql: `INSERT INTO barber_signups
      (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at, terms_version, review_state, participant_response_state, receipt_required)
      VALUES (?, ?, ?, ?, ?, 'profesional', 1, ?, 'draft-2026-09-v1', ?, 'not_requested', 0)`,
    args: [id, `Persona ${index + 1}`, `person-${index + 1}@example.test`, `011 15-2345-678${index}`, `+549112345678${index}`, `2026-01-0${index + 1}`, reviewState] });
  }
  return database;
}

function authenticatedRequest(path: string, fields: readonly (readonly [string, string])[], options: { origin?: string; cookie?: string; method?: string } = {}) {
  const origin = options.origin ?? 'https://admin.test';
  return new Request(`https://admin.test${path}`, { method: options.method ?? 'POST', headers: {
    Origin: origin, Cookie: options.cookie ?? `bdb_admin=${COOKIE}`, 'Content-Type': 'application/x-www-form-urlencoded',
  }, ...(options.method === 'GET' ? {} : { body: new URLSearchParams(fields.map(([key, value]) => [key, value])) }) });
}
const locals = { adminSession: { id: 'session-route', expiresAt: '2099-01-01' }, adminCsrfToken: CSRF };

afterEach(async () => {
  vi.unstubAllGlobals();
  routeDatabases.splice(0).forEach((database) => database.close());
  await Promise.all(routeDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('actual authenticated admin message route with file database', () => {
  it('enforces session, origin, CSRF, method, strict fields, and selected eligibility before any provider request', async () => {
    const database = await databaseFixture('under_review');
    const provider = vi.fn(async () => new Response('{"key":{"id":"provider-local"}}', { status: 200 }));
    vi.stubGlobal('fetch', provider);
    const handle = createRegistrationConfirmationSendRoute({ database, sessionSecretB64: SESSION_SECRET, environment: readyEnvironment() });
    const valid = [['csrf', CSRF], ['operationNonce', 'operation-confirmation-route-001'], ['confirmPlace', '1']] as const;
    const contexts = [
      { request: authenticatedRequest('/x', valid, { cookie: '' }), locals: {} },
      { request: authenticatedRequest('/x', valid.map(([key, value]) => [key, key === 'csrf' ? 'wrong' : value])), locals },
      { request: authenticatedRequest('/x', valid, { origin: 'https://evil.test' }), locals },
      { request: authenticatedRequest('/x', valid, { method: 'GET' }), locals },
      { request: authenticatedRequest('/x', [...valid, ['unknown', '1']]), locals },
    ];
    for (const context of contexts) {
      const response = await handle({ ...context, params: { id: '11111111-1111-4111-8111-111111111111' } });
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
    const notSelected = await handle({ request: authenticatedRequest('/x', valid), params: { id: '11111111-1111-4111-8111-111111111111' }, locals });
    expect(notSelected.status).toBe(409);
    expect(provider).not.toHaveBeenCalled();
    expect((await database.execute('SELECT COUNT(*) AS count FROM admin_message_jobs')).rows).toEqual([{ count: 0 }]);
  });

  it('uses historical v1 PDF bytes and deduplicates replay and a new confirmation action', async () => {
    const database = await databaseFixture();
    const requests: Array<{ url: string; body: Record<string, string> }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, string>; requests.push({ url: String(input), body });
      return new Response('{"key":{"id":"provider-local"}}', { status: 200 });
    }));
    const handle = createRegistrationConfirmationSendRoute({ database, sessionSecretB64: SESSION_SECRET, environment: readyEnvironment() });
    const fields = [['csrf', CSRF], ['operationNonce', 'operation-confirmation-route-002'], ['confirmPlace', '1']] as const;
    const makeContext = (operationNonce: string = fields[1][1]) => ({ request: authenticatedRequest('/x', fields.map(([key, value]) => [key, key === 'operationNonce' ? operationNonce : value])), params: { id: '11111111-1111-4111-8111-111111111111' }, locals });
    expect((await handle(makeContext())).status).toBe(303);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toBe('https://evolution.example.test/message/sendMedia/local-fixture');
    expect(requests[0]!.body).toMatchObject({ number: '5491123456780', mediatype: 'document', mimetype: 'application/pdf', fileName: 'bases-draft-2026-09-v1.pdf' });
    expect(Buffer.from(requests[0]!.body.media!, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
    expect(requests[0]!.body.media).not.toContain('https://');
    expect((await handle(makeContext())).status).toBe(303);
    expect((await handle(makeContext('operation-confirmation-route-NEW'))).status).toBe(303);
    expect(requests).toHaveLength(1);
    expect((await database.execute('SELECT state, terms_version, attempt_count FROM admin_message_jobs')).rows).toEqual([{ state: 'sent', terms_version: 'draft-2026-09-v1', attempt_count: 1 }]);
    expect((await database.execute('SELECT review_state, participant_response_state FROM barber_signups WHERE id = ?', ['11111111-1111-4111-8111-111111111111'])).rows)
      .toEqual([{ review_state: 'selected', participant_response_state: 'not_requested' }]);
  });

  it('creates zero jobs and provider requests while private readiness is disabled', async () => {
    const database = await databaseFixture();
    const provider = vi.fn(); vi.stubGlobal('fetch', provider);
    const handle = createRegistrationConfirmationSendRoute({ database, sessionSecretB64: SESSION_SECRET, environment: { ...readyEnvironment(), WHATSAPP_PRIVATE_MEDIA_ENABLED: 'false' } });
    const response = await handle({ request: authenticatedRequest('/x', [['csrf', CSRF], ['operationNonce', 'operation-disabled-route-001'], ['confirmPlace', '1']]), params: { id: '11111111-1111-4111-8111-111111111111' }, locals });
    expect(response.status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
    expect((await database.execute('SELECT COUNT(*) AS count FROM admin_message_jobs')).rows).toEqual([{ count: 0 }]);
  });

  it('honors selected versus filtered organization scope and sends private PDF bytes only', async () => {
    const database = await databaseFixture();
    const payloads: Record<string, string>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_input: unknown, init?: RequestInit) => { payloads.push(JSON.parse(String(init?.body))); return new Response('{"id":"provider-org"}', { status: 200 }); }));
    const handle = createOrganizationListSendRoute({ database, sessionSecretB64: SESSION_SECRET, environment: readyEnvironment() });
    const common = [['csrf', CSRF], ['confirmSend', '1'], ['recipient', '011 15-2345-6789'], ['scope', 'filtered'], ['review', ''], ['participant', ''], ['receipt', ''], ['attention', '']] as const;
    expect((await handle({ request: authenticatedRequest('/x', [...common, ['operationNonce', 'operation-organization-selected'], ['registrationId', '11111111-1111-4111-8111-111111111111']]), params: {}, locals })).status).toBe(303);
    expect((await handle({ request: authenticatedRequest('/x', [...common, ['operationNonce', 'operation-organization-filtered']]), params: {}, locals })).status).toBe(303);
    expect(payloads.map((payload) => payload.fileName)).toEqual(['listado-inscripciones-1.pdf', 'listado-inscripciones-2.pdf']);
    expect(payloads.every((payload) => Buffer.from(payload.media!, 'base64').subarray(0, 5).toString() === '%PDF-')).toBe(true);
    expect((await database.execute('SELECT job_id, COUNT(*) AS count FROM admin_message_job_registrations GROUP BY job_id ORDER BY count')).rows.map((row) => Number(row.count))).toEqual([1, 2]);
  });
});
