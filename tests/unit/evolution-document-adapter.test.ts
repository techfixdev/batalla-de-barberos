import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadServerConfig } from '../../src/lib/server/config';
import { createReceiptCaption } from '../../src/lib/server/notifications/receipt-caption';
import { EvolutionDocumentHttpMessenger } from '../../src/lib/server/notifications/evolution-document-http-messenger';
import { startEvolutionDocumentServer, type EvolutionDocumentServer } from '../fixtures/evolution-document-server';

const mediaUrl = 'https://batalla.example.test/documentos/bases.pdf';
const command = {
  logicalMessageKey: 'logical-key',
  attemptKey: 'attempt-key',
  toE164: '+5491123456789' as const,
  attachment: {
    kind: 'document' as const,
    mediaUrl,
    filename: 'bases.pdf',
    mimeType: 'application/pdf' as const,
    caption: createReceiptCaption(mediaUrl),
  },
};
const servers: EvolutionDocumentServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    WHATSAPP_DISPATCH_ENABLED: 'true',
    EVOLUTION_API_BASE_URL: 'https://evolution.example.test',
    EVOLUTION_API_INSTANCE: 'barberos',
    EVOLUTION_API_KEY: 'test-key',
    EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE: '/message/sendMedia/{instance}',
    EVOLUTION_API_AUTH_HEADER: 'apikey',
    EVOLUTION_API_AUTH_SCHEME: 'raw',
    EVOLUTION_API_DESTINATION_FIELD_PATH: 'number',
    EVOLUTION_API_MEDIA_URL_FIELD_PATH: 'media.url',
    EVOLUTION_API_FILENAME_FIELD_PATH: 'media.filename',
    EVOLUTION_API_MIME_TYPE_FIELD_PATH: 'media.mimetype',
    EVOLUTION_API_CAPTION_FIELD_PATH: 'media.caption',
    EVOLUTION_API_DESTINATION_FORMAT: 'digits',
    EVOLUTION_API_ACCEPTED_HTTP_STATUSES: '200',
    EVOLUTION_API_SUCCESS_MODE: 'status-only',
    ...overrides,
  };
}

function validatedConfiguration(overrides: Record<string, string | undefined> = {}) {
  const fingerprint = loadServerConfig(environment(overrides)).profileFingerprint;
  return loadServerConfig(environment({ ...overrides, EVOLUTION_API_VALIDATED_PROFILE_SHA256: fingerprint })).whatsappDispatch;
}

function localTransport(server: EvolutionDocumentServer, productionUrls: string[]) {
  return async (input: string, init: RequestInit): Promise<Response> => {
    productionUrls.push(input);
    const target = new URL(input);
    return fetch(`${server.url}${target.pathname}`, init);
  };
}

async function fixture() {
  const server = await startEvolutionDocumentServer();
  servers.push(server);
  return server;
}

describe('EvolutionDocumentHttpMessenger', () => {
  it('submits one document payload with the configured raw authorization', async () => {
    const transport = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    const messenger = new EvolutionDocumentHttpMessenger(validatedConfiguration(), transport);

    await expect(messenger.send(command)).resolves.toMatchObject({
      kind: 'accepted', acceptedArtifact: 'document', evidence: 'validated-document-status', httpStatus: 200,
    });
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, options] = transport.mock.calls[0] ?? [];
    expect(url).toBe('https://evolution.example.test/message/sendMedia/barberos');
    expect(options).toMatchObject({
      method: 'POST',
      headers: { apikey: 'test-key', 'content-type': 'application/json' },
      body: JSON.stringify({
        number: '5491123456789',
        media: {
          url: command.attachment.mediaUrl,
          filename: command.attachment.filename,
          mimetype: 'application/pdf',
          caption: command.attachment.caption,
        },
      }),
      redirect: 'error',
    });
  });

  it('uses a fresh flat document payload, bearer auth, optional kind, and logical idempotency with a local fixture transport', async () => {
    const server = await fixture();
    server.respond({ body: '' });
    const productionUrls: string[] = [];
    const messenger = new EvolutionDocumentHttpMessenger(validatedConfiguration({
      EVOLUTION_API_AUTH_SCHEME: 'bearer', EVOLUTION_API_AUTH_HEADER: 'X-Api-Key', EVOLUTION_API_IDEMPOTENCY_HEADER: 'X-Idempotency-Key',
      EVOLUTION_API_DESTINATION_FORMAT: 'e164', EVOLUTION_API_DESTINATION_FIELD_PATH: 'destination', EVOLUTION_API_MEDIA_URL_FIELD_PATH: 'url',
      EVOLUTION_API_FILENAME_FIELD_PATH: 'filename', EVOLUTION_API_MIME_TYPE_FIELD_PATH: 'mimeType', EVOLUTION_API_CAPTION_FIELD_PATH: 'caption',
      EVOLUTION_API_MEDIA_KIND_FIELD_PATH: 'mediaKind', EVOLUTION_API_MEDIA_KIND_VALUE: 'document',
    }), localTransport(server, productionUrls));

    await expect(messenger.send(command)).resolves.toMatchObject({ kind: 'accepted', acceptedArtifact: 'document' });
    expect(productionUrls).toEqual(['https://evolution.example.test/message/sendMedia/barberos']);
    expect(server.requests).toHaveLength(1);
    expect(server.requests[0]).toMatchObject({
      method: 'POST', url: '/message/sendMedia/barberos',
      headers: expect.objectContaining({ 'x-api-key': 'Bearer test-key', 'x-idempotency-key': command.logicalMessageKey, 'content-type': 'application/json' }),
    });
    expect(JSON.parse(server.requests[0]?.body ?? '')).toEqual({
      destination: command.toE164, url: mediaUrl, filename: 'bases.pdf', mimeType: 'application/pdf', caption: command.attachment.caption, mediaKind: 'document',
    });
  });

  it.each([
    ['accepted', JSON.stringify({ result: { document: 'accepted', id: 'provider:42' } }), { kind: 'accepted', evidence: 'document-response-marker', providerMessageId: 'provider:42' }],
    ['media-rejected', JSON.stringify({ result: { document: 'media-rejected' } }), { kind: 'rejected', code: 'PROVIDER_MEDIA_REJECTED' }],
      ['media-fetch-failed', JSON.stringify({ result: { document: 'media-fetch-failed' } }), { kind: 'rejected', code: 'PROVIDER_MEDIA_FETCH_FAILED' }],
    ['URL-only', JSON.stringify({ result: { document: 'url-only' } }), { kind: 'rejected', code: 'PROVIDER_ATTACHMENT_NOT_ACCEPTED' }],
    ['malformed JSON', '{', { kind: 'uncertain', code: 'PROVIDER_MALFORMED_RESPONSE' }],
  ])('maps configured json-value %s evidence without a fallback request', async (_name, body, expected) => {
    const server = await fixture();
    server.respond({ body });
    const productionUrls: string[] = [];
    const messenger = new EvolutionDocumentHttpMessenger(validatedConfiguration({
      EVOLUTION_API_SUCCESS_MODE: 'json-value', EVOLUTION_API_RESULT_FIELD_PATH: 'result.document', EVOLUTION_API_ACCEPTED_VALUES: 'accepted',
      EVOLUTION_API_MEDIA_REJECTED_VALUES: 'media-rejected,media-fetch-failed', EVOLUTION_API_URL_ONLY_VALUES: 'url-only', EVOLUTION_API_MESSAGE_ID_PATH: 'result.id',
    }), localTransport(server, productionUrls));

    await expect(messenger.send(command)).resolves.toMatchObject(expected);
    expect(productionUrls).toHaveLength(1);
    expect(server.requests).toHaveLength(1);
  });

  it('blocks an unvalidated profile before transport construction', async () => {
    const transport = vi.fn();
    const messenger = new EvolutionDocumentHttpMessenger(loadServerConfig(environment()).whatsappDispatch, transport);

    await expect(messenger.send(command)).resolves.toEqual({ kind: 'rejected', code: 'CONFIG_INVALID' });
    expect(transport).not.toHaveBeenCalled();
  });

  it('maps network errors and an abort that includes response-body wait time to safe uncertain results', async () => {
    const network = vi.fn().mockRejectedValue(new TypeError('socket closed'));
    await expect(new EvolutionDocumentHttpMessenger(validatedConfiguration(), network).send(command))
      .resolves.toEqual({ kind: 'uncertain', code: 'PROVIDER_NETWORK' });

    const server = await fixture();
    server.respond({ bodyDelayMs: 1100, body: '{}' });
    const messenger = new EvolutionDocumentHttpMessenger(validatedConfiguration({ EVOLUTION_API_TIMEOUT_MS: '1000' }), localTransport(server, []));
    await expect(messenger.send(command)).resolves.toEqual({ kind: 'uncertain', code: 'PROVIDER_TIMEOUT' });
    expect(server.requests).toHaveLength(1);
  });

  it('bounds oversized responses and rejects real local redirects without following them', async () => {
    const oversized = await fixture();
    oversized.respond({ body: 'x'.repeat(64 * 1024 + 1) });
    await expect(new EvolutionDocumentHttpMessenger(validatedConfiguration(), localTransport(oversized, [])).send(command))
      .resolves.toEqual({ kind: 'uncertain', code: 'PROVIDER_RESPONSE_TOO_LARGE' });
    expect(oversized.requests).toHaveLength(1);

    const redirect = await fixture();
    redirect.respond({ status: 302, headers: { location: '/text-fallback' } });
    await expect(new EvolutionDocumentHttpMessenger(validatedConfiguration(), localTransport(redirect, [])).send(command))
      .resolves.toEqual({ kind: 'rejected', code: 'PROVIDER_REJECTED' });
    expect(redirect.requests).toHaveLength(1);
  });

  it.each([408, 409])('preserves HTTP %i as uncertain and never claims document acceptance', async (status) => {
    const server = await fixture();
    server.respond({ status, body: JSON.stringify({ result: { document: 'accepted' } }) });
    const messenger = new EvolutionDocumentHttpMessenger(validatedConfiguration({
      EVOLUTION_API_SUCCESS_MODE: 'json-value', EVOLUTION_API_RESULT_FIELD_PATH: 'result.document', EVOLUTION_API_ACCEPTED_VALUES: 'accepted',
    }), localTransport(server, []));

    await expect(messenger.send(command)).resolves.toEqual({ kind: 'uncertain', code: 'PROVIDER_NETWORK', httpStatus: status });
    expect(server.requests).toHaveLength(1);
  });

  it.each([
    ['media rejection', 400, 'media-rejected', { kind: 'rejected', code: 'PROVIDER_MEDIA_REJECTED', httpStatus: 400 }],
    ['URL-only acceptance', 422, 'url-only', { kind: 'rejected', code: 'PROVIDER_ATTACHMENT_NOT_ACCEPTED', httpStatus: 422 }],
    ['generic rejection', 415, 'other', { kind: 'rejected', code: 'PROVIDER_REJECTED', httpStatus: 415 }],
  ])('uses configured %s evidence for HTTP 4xx before generic status mapping', async (_name, status, result, expected) => {
    const server = await fixture();
    server.respond({ status, body: JSON.stringify({ result: { document: result } }) });
    const messenger = new EvolutionDocumentHttpMessenger(validatedConfiguration({
      EVOLUTION_API_SUCCESS_MODE: 'json-value', EVOLUTION_API_RESULT_FIELD_PATH: 'result.document', EVOLUTION_API_ACCEPTED_VALUES: 'accepted',
      EVOLUTION_API_MEDIA_REJECTED_VALUES: 'media-rejected', EVOLUTION_API_URL_ONLY_VALUES: 'url-only',
    }), localTransport(server, []));

    await expect(messenger.send(command)).resolves.toEqual(expected);
    expect(server.requests).toHaveLength(1);
  });

  it('never accepts a configured JSON marker from an HTTP 4xx response', async () => {
    const server = await fixture();
    server.respond({ status: 400, body: JSON.stringify({ result: { document: 'accepted' } }) });
    const messenger = new EvolutionDocumentHttpMessenger(validatedConfiguration({
      EVOLUTION_API_SUCCESS_MODE: 'json-value', EVOLUTION_API_RESULT_FIELD_PATH: 'result.document', EVOLUTION_API_ACCEPTED_VALUES: 'accepted',
    }), localTransport(server, []));

    await expect(messenger.send(command)).resolves.toEqual({ kind: 'rejected', code: 'PROVIDER_REJECTED', httpStatus: 400 });
    expect(server.requests).toHaveLength(1);
  });

  it('cancels delayed fixture response work when closed', async () => {
    const server = await fixture();
    server.respond({ delayMs: 10_000, body: '{}' });
    const request = fetch(`${server.url}/delayed`);
    await vi.waitFor(() => expect(server.requests).toHaveLength(1));

    await server.close();
    expect(server.pendingWork()).toEqual({ timers: 0, responses: 0 });
    await expect(request).rejects.toThrow();
  });
});
