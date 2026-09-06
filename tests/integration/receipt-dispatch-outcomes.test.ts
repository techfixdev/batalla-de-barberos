import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';

import { createSignupPost } from '../../src/pages/api/signups';
import { loadServerConfig } from '../../src/lib/server/config';
import { EvolutionDocumentHttpMessenger } from '../../src/lib/server/notifications/evolution-document-http-messenger';
import type { ReceiptMessenger } from '../../src/lib/server/notifications/contracts';
import { startEvolutionDocumentServer, type EvolutionDocumentServer } from '../fixtures/evolution-document-server';
import { migrate } from '../../scripts/migrate.mjs';

const databases: Client[] = [];
const servers: EvolutionDocumentServer[] = [];
const payload = { fullName: 'Ana Barbera', email: 'ana@example.com', phone: '+54 9 11 2345-6789', barbershop: '', experience: 'profesional', acceptedRules: true };

async function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  await migrate(client);
  return client;
}

async function submit(post: ReturnType<typeof createSignupPost>, key = crypto.randomUUID()) {
  return post({
    request: new Request('https://signup.test/api/signups', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(payload) }),
    clientAddress: crypto.randomUUID(),
  } as never);
}

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    WHATSAPP_DISPATCH_ENABLED: 'true',
    EVOLUTION_API_BASE_URL: 'https://evolution.example.test', EVOLUTION_API_INSTANCE: 'barberos', EVOLUTION_API_KEY: 'test-key',
    EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE: '/message/sendMedia/{instance}', EVOLUTION_API_AUTH_HEADER: 'apikey', EVOLUTION_API_AUTH_SCHEME: 'raw',
    EVOLUTION_API_DESTINATION_FIELD_PATH: 'number', EVOLUTION_API_MEDIA_URL_FIELD_PATH: 'media.url', EVOLUTION_API_FILENAME_FIELD_PATH: 'media.filename',
    EVOLUTION_API_MIME_TYPE_FIELD_PATH: 'media.mimetype', EVOLUTION_API_CAPTION_FIELD_PATH: 'media.caption', EVOLUTION_API_DESTINATION_FORMAT: 'digits',
    EVOLUTION_API_ACCEPTED_HTTP_STATUSES: '200', EVOLUTION_API_SUCCESS_MODE: 'json-value', EVOLUTION_API_RESULT_FIELD_PATH: 'result.document',
    EVOLUTION_API_ACCEPTED_VALUES: 'accepted', EVOLUTION_API_MEDIA_REJECTED_VALUES: 'media-rejected,media-fetch-failed', EVOLUTION_API_URL_ONLY_VALUES: 'url-only',
    EVOLUTION_API_MESSAGE_ID_PATH: 'result.id',
    ...overrides,
  };
}

function readyConfiguration(overrides: Record<string, string | undefined> = {}) {
  const fingerprint = loadServerConfig(environment(overrides)).profileFingerprint;
  return loadServerConfig(environment({ ...overrides, EVOLUTION_API_VALIDATED_PROFILE_SHA256: fingerprint })).whatsappDispatch;
}

function localMessenger(configuration: ReturnType<typeof readyConfiguration>, server: EvolutionDocumentServer): ReceiptMessenger {
  return new EvolutionDocumentHttpMessenger(configuration, (input, init) => fetch(`${server.url}${new URL(input).pathname}`, init));
}

async function fixture() {
  const server = await startEvolutionDocumentServer();
  servers.push(server);
  return server;
}

async function receipt(client: Client) {
  return (await client.execute('SELECT status, attempt_count, last_error_code, provider_message_id, lease_token FROM receipt_notifications')).rows[0];
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  databases.splice(0).forEach((client) => client.close());
});

describe('signup receipt dispatch outcomes', () => {
  it.each([
    ['disabled', loadServerConfig({ WHATSAPP_DISPATCH_ENABLED: 'false' }).whatsappDispatch],
    ['malformed', loadServerConfig({ WHATSAPP_DISPATCH_ENABLED: 'true' }).whatsappDispatch],
    ['unvalidated', loadServerConfig(environment()).whatsappDispatch],
  ])('keeps %s dispatch pending with zero attempts and no provider request', async (_name, configuration) => {
    const client = await database();
    const server = await fixture();

    expect((await submit(createSignupPost({ database: client, receiptMessenger: localMessenger(readyConfiguration(), server), dispatchConfiguration: configuration }))).status).toBe(201);
    expect(await receipt(client)).toMatchObject({ status: 'pending', attempt_count: 0, lease_token: null });
    expect(server.requests).toHaveLength(0);
  });

  it('awaits a known accepted document receipt and persists only allowlisted evidence', async () => {
    const client = await database();
    const server = await fixture();
    server.respond({ body: JSON.stringify({ result: { document: 'accepted', id: 'provider-42' } }) });

    expect((await submit(createSignupPost({ database: client, receiptMessenger: localMessenger(readyConfiguration(), server), dispatchConfiguration: readyConfiguration() }))).status).toBe(201);
    expect(await receipt(client)).toMatchObject({ status: 'sent', attempt_count: 1, provider_message_id: 'provider-42' });
    expect((await client.execute('SELECT outcome, acceptance_evidence FROM receipt_notification_attempts')).rows)
      .toEqual([{ outcome: 'sent', acceptance_evidence: 'document-response-marker' }]);
    expect(server.requests).toHaveLength(1);
  });

  it.each([
    ['media rejection', { body: JSON.stringify({ result: { document: 'media-rejected' } }) }, 'PROVIDER_MEDIA_REJECTED'],
    ['media fetch failure', { body: JSON.stringify({ result: { document: 'media-fetch-failed' } }) }, 'PROVIDER_MEDIA_FETCH_FAILED'],
    ['URL-only acceptance', { body: JSON.stringify({ result: { document: 'url-only' } }) }, 'PROVIDER_ATTACHMENT_NOT_ACCEPTED'],
  ])('records known %s as failed while retaining the saved registration', async (_name, response, errorCode) => {
    const client = await database();
    const server = await fixture();
    server.respond(response);

    expect((await submit(createSignupPost({ database: client, receiptMessenger: localMessenger(readyConfiguration(), server), dispatchConfiguration: readyConfiguration() }))).status).toBe(201);
    expect(await receipt(client)).toMatchObject({ status: 'failed', attempt_count: 1, last_error_code: errorCode });
    expect((await client.execute('SELECT id FROM barber_signups')).rows).toHaveLength(1);
  });

  it.each([
    ['malformed 2xx', { body: '{' }, undefined, 'PROVIDER_MALFORMED_RESPONSE'],
    ['5xx', { status: 503, body: '{}' }, undefined, 'PROVIDER_SERVER'],
    ['oversized response', { body: 'x'.repeat(64 * 1024 + 1) }, undefined, 'PROVIDER_RESPONSE_TOO_LARGE'],
    ['network failure', undefined, async () => { throw new TypeError('offline'); }, 'PROVIDER_NETWORK'],
  ])('records %s as uncertain without invalidating the registration', async (_name, response, send, errorCode) => {
    const client = await database();
    const server = await fixture();
    if (response) server.respond(response);
    const messenger = send ? { send } : localMessenger(readyConfiguration(), server);

    expect((await submit(createSignupPost({ database: client, receiptMessenger: messenger, dispatchConfiguration: readyConfiguration() }))).status).toBe(201);
    expect(await receipt(client)).toMatchObject({ status: 'uncertain', attempt_count: 1, last_error_code: errorCode });
    expect((await client.execute('SELECT id FROM barber_signups')).rows).toHaveLength(1);
  });

  it('awaits a timeout within the signup request and preserves the uncertain outcome', async () => {
    const client = await database();
    const server = await fixture();
    const configuration = readyConfiguration({ EVOLUTION_API_TIMEOUT_MS: '1000' });
    server.respond({ bodyDelayMs: 1100, body: '{}' });

    expect((await submit(createSignupPost({ database: client, receiptMessenger: localMessenger(configuration, server), dispatchConfiguration: configuration }))).status).toBe(201);
    expect(await receipt(client)).toMatchObject({ status: 'uncertain', attempt_count: 1, last_error_code: 'PROVIDER_TIMEOUT' });
    expect(server.requests).toHaveLength(1);
  });

  it('leaves an expired post-send lease and finalization error visible for reconciliation', async () => {
    const client = await database();
    const diagnostics: unknown[] = [];
    const staleMessenger: ReceiptMessenger = { send: async () => {
      await client.execute("UPDATE receipt_notifications SET lease_expires_at = '2000-01-01T00:00:00.000Z'");
      return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', httpStatus: 200 };
    } };

    expect((await submit(createSignupPost({ database: client, receiptMessenger: staleMessenger, dispatchConfiguration: readyConfiguration(), diagnosticSink: (diagnostic) => diagnostics.push(diagnostic) }))).status).toBe(201);
    expect(await receipt(client)).toMatchObject({ status: 'pending', attempt_count: 1 });
    expect((await client.execute('SELECT outcome FROM receipt_notification_attempts')).rows).toEqual([{ outcome: 'in_progress' }]);
    expect(diagnostics).toEqual([{ event: 'receipt-reconciliation-required', outcome: 'reconciliation-required' }]);
  });

  it('keeps a ready-profile replay after sent to one attempt and one provider request', async () => {
    const client = await database();
    const server = await fixture();
    server.respond({ body: JSON.stringify({ result: { document: 'accepted', id: 'provider-42' } }) });
    const post = createSignupPost({ database: client, receiptMessenger: localMessenger(readyConfiguration(), server), dispatchConfiguration: readyConfiguration() });
    const key = crypto.randomUUID();
    const concurrent = await Promise.all([submit(post, key), submit(post, key)]);
    expect(concurrent.map(({ status }) => status).sort()).toEqual([200, 201]);
    expect((await submit(post, key)).status).toBe(200);
    expect(await receipt(client)).toMatchObject({ status: 'sent', attempt_count: 1 });
    expect((await client.execute('SELECT id FROM barber_signups')).rows).toHaveLength(1);
    expect(server.requests).toHaveLength(1);
  });

  it.each([
    ['failed', { body: JSON.stringify({ result: { document: 'media-rejected' } }) }, 'failed'],
    ['uncertain', { status: 503, body: '{}' }, 'uncertain'],
  ])('does not automatically send or add an attempt on a replay after %s dispatch', async (_name, response, status) => {
    const client = await database();
    const server = await fixture();
    server.respond(response);
    const post = createSignupPost({ database: client, receiptMessenger: localMessenger(readyConfiguration(), server), dispatchConfiguration: readyConfiguration() });
    const key = crypto.randomUUID();

    expect((await submit(post, key)).status).toBe(201);
    expect((await submit(post, key)).status).toBe(200);
    expect(await receipt(client)).toMatchObject({ status, attempt_count: 1 });
    expect((await client.execute('SELECT trigger, outcome FROM receipt_notification_attempts')).rows)
      .toEqual([{ trigger: 'automatic', outcome: status }]);
    expect(server.requests).toHaveLength(1);
  });

  it('reports a static lookup diagnostic without sending or exposing the lookup error', async () => {
    const client = await database();
    const diagnostics: unknown[] = [];
    const tainted = 'lookup-secret ana@example.com +5491123456789';
    const lookupFailingDatabase = new Proxy(client, {
      get(target, property, receiver) {
        if (property === 'execute') return async (statement: unknown) => {
          if (typeof statement === 'object' && statement !== null && 'sql' in statement && statement.sql === `SELECT n.logical_message_key FROM receipt_notifications n
          JOIN barber_signups b ON b.id = n.registration_id WHERE b.email = ? LIMIT 1`) throw new Error(tainted);
          return target.execute(statement as never);
        };
        return Reflect.get(target, property, receiver);
      },
    });
    let sends = 0;
    const messenger: ReceiptMessenger = { send: async () => { sends += 1; throw new Error('send must not run'); } };

    const response = await submit(createSignupPost({ database: lookupFailingDatabase, receiptMessenger: messenger, dispatchConfiguration: readyConfiguration(), diagnosticSink: (diagnostic) => diagnostics.push(diagnostic) }));

    expect(response.status).toBe(201);
    expect(sends).toBe(0);
    expect(await response.json()).toEqual({ message: 'Guardamos tu inscripción. Intentaremos enviar un acuse por WhatsApp con el PDF adjunto; si no lo recibís, no invalida la inscripción guardada. La selección la decide más adelante la organización y la respuesta posterior de la persona participante se registra por separado. El acuse no constituye consentimiento legal ni confirma selección o participación.' });
    expect(await receipt(client)).toMatchObject({ status: 'pending', attempt_count: 0 });
    expect((await client.execute('SELECT id FROM receipt_notification_attempts')).rows).toEqual([]);
    expect(diagnostics).toEqual([{ event: 'receipt-reconciliation-required', outcome: 'reconciliation-required' }]);
    expect(JSON.stringify(diagnostics)).not.toContain(tainted);
  });

  it('reports a static reconciliation diagnostic when a claim fails without exposing its error', async () => {
    const client = await database();
    const diagnostics: unknown[] = [];
    const tainted = 'provider-secret ana@example.com +5491123456789';
    await client.execute(`CREATE TRIGGER reject_claim BEFORE INSERT ON receipt_notification_attempts BEGIN SELECT RAISE(ABORT, '${tainted}'); END`);
    try {
      expect((await submit(createSignupPost({ database: client, dispatchConfiguration: readyConfiguration(), diagnosticSink: (diagnostic) => diagnostics.push(diagnostic) }))).status).toBe(201);
      expect(diagnostics).toEqual([{ event: 'receipt-reconciliation-required', outcome: 'reconciliation-required' }]);
      expect(JSON.stringify(diagnostics)).not.toContain(tainted);
    } finally {
      await client.execute('DROP TRIGGER reject_claim');
    }
  });

  it('persists only a static diagnostic when a provider throws tainted content', async () => {
    const client = await database();
    const tainted = 'Bearer key cookie=csrf Ana +5491123456789 203.0.113.2 raw provider body';
    const messenger: ReceiptMessenger = { send: async () => { throw new Error(tainted); } };

    expect((await submit(createSignupPost({ database: client, receiptMessenger: messenger, dispatchConfiguration: readyConfiguration() }))).status).toBe(201);
    const stored = await client.execute('SELECT last_error_code, last_error_message FROM receipt_notifications');
    expect(stored.rows).toEqual([{ last_error_code: 'PROVIDER_NETWORK', last_error_message: 'Error del proveedor al enviar el documento.' }]);
    expect(JSON.stringify(stored.rows)).not.toContain(tainted);
  });
});
