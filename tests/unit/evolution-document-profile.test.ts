import { describe, expect, it } from 'vitest';

import {
  loadServerConfig,
  resolveEvolutionDocumentUrl,
} from '../../src/lib/server/config';
import { formatEvolutionAuthorization } from '../../src/lib/server/notifications/evolution-document-wire-profile';

const fingerprint = '0'.repeat(64);

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
    EVOLUTION_API_ACCEPTED_HTTP_STATUSES: '200,201',
    EVOLUTION_API_SUCCESS_MODE: 'status-only',
    EVOLUTION_API_VALIDATED_PROFILE_SHA256: fingerprint,
    ...overrides,
  };
}

describe('Evolution document wire profile', () => {
  function validated(overrides: Record<string, string | undefined> = {}) {
    const first = loadServerConfig(environment(overrides));
    return loadServerConfig(environment({ ...overrides, EVOLUTION_API_VALIDATED_PROFILE_SHA256: first.profileFingerprint }));
  }

  it('returns a typed, fingerprint-gated document profile with a same-origin HTTPS endpoint', () => {
    const first = loadServerConfig(environment());
    expect(first.whatsappDispatch).toMatchObject({ kind: 'blocked', reason: 'profile-fingerprint-mismatch' });

    const expected = first.profileFingerprint;
    const config = loadServerConfig(environment({ EVOLUTION_API_VALIDATED_PROFILE_SHA256: expected }));

    expect(config.whatsappDispatch).toMatchObject({
      kind: 'ready',
      profile: {
        destinationFormat: 'digits',
        acceptedHttpStatuses: [200, 201],
        success: { mode: 'status-only' },
        authorization: { header: 'apikey', value: 'test-key' },
      },
    });
    expect(resolveEvolutionDocumentUrl(config.whatsappDispatch, 'barberos')).toBe(
      'https://evolution.example.test/message/sendMedia/barberos',
    );
  });

  it('rejects non-exact status values rather than coercing them into an accepted status', () => {
    expect(loadServerConfig(environment({ EVOLUTION_API_ACCEPTED_HTTP_STATUSES: '2e2' })).whatsappDispatch)
      .toMatchObject({ kind: 'blocked', reason: 'invalid-profile' });
  });

  it('requires five non-colliding safe request mappings and an all-or-nothing document kind pair', () => {
    for (const overrides of [
      { EVOLUTION_API_SUCCESS_MODE: 'json-value' },
      { EVOLUTION_API_ACCEPTED_VALUES: 'accepted' },
    ]) expect(loadServerConfig(environment(overrides)).whatsappDispatch).toMatchObject({ kind: 'blocked', reason: 'invalid-profile' });

    for (const overrides of [
      { EVOLUTION_API_FILENAME_FIELD_PATH: 'media.url' },
      { EVOLUTION_API_FILENAME_FIELD_PATH: 'media' },
      { EVOLUTION_API_CAPTION_FIELD_PATH: 'media.__proto__.caption' },
      { EVOLUTION_API_CAPTION_FIELD_PATH: 'media.0.caption' },
      { EVOLUTION_API_MEDIA_KIND_FIELD_PATH: 'media.kind' },
      { EVOLUTION_API_MEDIA_KIND_VALUE: 'document' },
    ]) expect(loadServerConfig(environment(overrides)).whatsappDispatch).toMatchObject({ kind: 'blocked', reason: 'invalid-profile' });

    const config = validated({
      EVOLUTION_API_MEDIA_KIND_FIELD_PATH: 'media.kind', EVOLUTION_API_MEDIA_KIND_VALUE: 'document',
      EVOLUTION_API_SUCCESS_MODE: 'json-value', EVOLUTION_API_RESULT_FIELD_PATH: 'result.document',
      EVOLUTION_API_ACCEPTED_VALUES: 'accepted,queued', EVOLUTION_API_MEDIA_REJECTED_VALUES: 'media-rejected',
      EVOLUTION_API_URL_ONLY_VALUES: 'url-only', EVOLUTION_API_MESSAGE_ID_PATH: 'result.id', EVOLUTION_API_IDEMPOTENCY_HEADER: 'x-idempotency-key',
    });
    expect(config.whatsappDispatch).toMatchObject({ kind: 'ready', profile: {
      fields: { mediaKind: { path: ['media', 'kind'], value: 'document' } },
      success: { mode: 'json-value', acceptedValues: ['accepted', 'queued'] }, messageIdPath: ['result', 'id'], idempotencyHeader: 'x-idempotency-key',
    } });
  });

  it('canonicalizes non-secret profiles before fingerprint gating', () => {
    const first = loadServerConfig(environment());
    const reordered = loadServerConfig(environment({ EVOLUTION_API_ACCEPTED_HTTP_STATUSES: '201,200' }));
    expect(reordered.profileFingerprint).toBe(first.profileFingerprint);
    const ready = validated({ EVOLUTION_API_ACCEPTED_HTTP_STATUSES: '201,200', EVOLUTION_API_DESTINATION_FORMAT: 'e164' }).whatsappDispatch;
    expect(ready).toMatchObject({ kind: 'ready', profile: { destinationFormat: 'e164' } });
  });

  it('blocks unsafe URLs and unvalidated profiles without endpoint capability and formats configured authorization', () => {
    for (const overrides of [
      { EVOLUTION_API_BASE_URL: 'http://evolution.example.test' }, { EVOLUTION_API_BASE_URL: 'https://key@evolution.example.test' },
      { EVOLUTION_API_BASE_URL: 'https://evolution.example.test?debug=1' }, { EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE: '//other.test/{instance}' },
      { EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE: '/message/{instance}/{instance}' }, { EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE: '/message/../{instance}' },
    ]) expect(loadServerConfig(environment(overrides)).whatsappDispatch).toMatchObject({ kind: 'blocked', reason: 'invalid-profile' });

    const blocked = loadServerConfig(environment());
    expect(resolveEvolutionDocumentUrl(blocked.whatsappDispatch, 'barberos')).toBeNull();
    const ready = validated({ EVOLUTION_API_AUTH_SCHEME: 'bearer' }).whatsappDispatch;
    if (ready.kind !== 'ready') throw new Error('expected validated profile');
    expect(formatEvolutionAuthorization(ready.profile)).toBe('Bearer test-key');
    const raw = validated().whatsappDispatch;
    if (raw.kind !== 'ready') throw new Error('expected validated raw profile');
    expect(formatEvolutionAuthorization(raw.profile)).toBe('test-key');
    expect(resolveEvolutionDocumentUrl(ready, '../escape')).toBeNull();
  });

  it('keeps credentials out of the fingerprint and rejects incomplete or unsafe profile settings', () => {
    const first = loadServerConfig(environment());
    expect(loadServerConfig(environment({ EVOLUTION_API_KEY: 'rotated-key' })).profileFingerprint).toBe(first.profileFingerprint);
    for (const overrides of [
      { EVOLUTION_API_SUCCESS_MODE: 'json-value', EVOLUTION_API_ACCEPTED_VALUES: 'accepted' },
      { EVOLUTION_API_BASE_URL: 'https://evolution.example.test?' }, { EVOLUTION_API_BASE_URL: 'https://evolution.example.test#' },
      { EVOLUTION_API_AUTH_HEADER: 'Content-Type' }, { EVOLUTION_API_IDEMPOTENCY_HEADER: 'content-type' },
      { EVOLUTION_API_AUTH_HEADER: 'X-Key', EVOLUTION_API_IDEMPOTENCY_HEADER: 'x-key' },
      ...['999', '15001', '7000.5', 'invalid'].map((EVOLUTION_API_TIMEOUT_MS) => ({ EVOLUTION_API_TIMEOUT_MS })),
    ]) expect(loadServerConfig(environment(overrides)).whatsappDispatch).toMatchObject({ kind: 'blocked', reason: 'invalid-profile' });

    for (const timeout of ['1000', '15000']) {
      const configuration = validated({ EVOLUTION_API_TIMEOUT_MS: timeout }).whatsappDispatch;
      expect(configuration).toMatchObject({ kind: 'ready', profile: { timeoutMs: Number(timeout) } });
    }
    expect(validated().whatsappDispatch).toMatchObject({ kind: 'ready', profile: { timeoutMs: 7000 } });
  });

  it('allows distinct non-reserved authentication and idempotency headers', () => {
    expect(validated({
      EVOLUTION_API_AUTH_HEADER: 'X-Api-Key', EVOLUTION_API_IDEMPOTENCY_HEADER: 'X-Idempotency-Key',
    }).whatsappDispatch).toMatchObject({ kind: 'ready', profile: {
      authorization: { header: 'X-Api-Key' }, idempotencyHeader: 'X-Idempotency-Key',
    } });
  });
});
