import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { parseEvolutionPrivateMediaProfile } from '../../src/lib/server/notifications/evolution-private-media-profile';
import { EvolutionPrivateMediaMessenger } from '../../src/lib/server/notifications/evolution-private-media-messenger';

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    WHATSAPP_DISPATCH_ENABLED: 'true', WHATSAPP_PRIVATE_MEDIA_ENABLED: 'true',
    EVOLUTION_API_BASE_URL: 'https://evolution.example.test', EVOLUTION_API_INSTANCE: 'barberos', EVOLUTION_API_KEY: 'test-secret',
    EVOLUTION_API_AUTH_HEADER: 'apikey', EVOLUTION_API_AUTH_SCHEME: 'raw', EVOLUTION_API_TIMEOUT_MS: '7000',
    EVOLUTION_API_ACCEPTED_HTTP_STATUSES: '200', EVOLUTION_API_SUCCESS_MODE: 'status-only',
    ...overrides,
  };
}
function validated() {
  const candidate = parseEvolutionPrivateMediaProfile(environment());
  expect(candidate.kind).toBe('blocked');
  const fingerprint = candidate.kind === 'blocked' ? candidate.fingerprint : undefined;
  return parseEvolutionPrivateMediaProfile(environment({ EVOLUTION_API_PRIVATE_MEDIA_VALIDATED_PROFILE_SHA256: fingerprint }));
}

describe('private Evolution PDF media profile', () => {
  it('is independently disabled and fingerprint gated without containing secrets in its fingerprint', () => {
    expect(parseEvolutionPrivateMediaProfile(environment({ WHATSAPP_PRIVATE_MEDIA_ENABLED: 'false' }))).toEqual({ kind: 'blocked', reason: 'private-media-disabled' });
    const first = parseEvolutionPrivateMediaProfile(environment());
    const second = parseEvolutionPrivateMediaProfile(environment({ EVOLUTION_API_KEY: 'different-secret' }));
    expect(first).toMatchObject({ kind: 'blocked', reason: 'profile-fingerprint-mismatch' });
    expect(second).toMatchObject({ fingerprint: first.kind === 'blocked' ? first.fingerprint : undefined });
    expect(validated().kind).toBe('ready');
  });

  it('posts raw base64 in the official 2.3.7 shape and reports provider acceptance only', async () => {
    const bytes = new Uint8Array(Buffer.from('%PDF-1.7\nfixture'));
    const transport = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    const messenger = new EvolutionPrivateMediaMessenger(validated(), transport);
    const result = await messenger.send({ logicalMessageKey: 'job-1', attemptKey: 'attempt-1', toE164: '+5491123456789', attachment: {
      kind: 'private-document', bytes, byteLength: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex'),
      filename: 'inscripciones.pdf', mimeType: 'application/pdf', caption: 'Lista de inscripciones',
    } });
    expect(result).toMatchObject({ kind: 'accepted', acceptedArtifact: 'document' });
    const [url, init] = transport.mock.calls[0]!;
    expect(url).toBe('https://evolution.example.test/message/sendMedia/barberos');
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({ number: '5491123456789', mediatype: 'document', mimetype: 'application/pdf', media: Buffer.from(bytes).toString('base64'), fileName: 'inscripciones.pdf', caption: 'Lista de inscripciones' });
    expect(Buffer.from(body.media, 'base64')).toEqual(Buffer.from(bytes));
  });

  it('rejects invalid PDFs and size limits before transport', async () => {
    const transport = vi.fn();
    const messenger = new EvolutionPrivateMediaMessenger(validated(), transport);
    const bad = new Uint8Array(Buffer.from('not-pdf'));
    await expect(messenger.send({ logicalMessageKey: 'x', attemptKey: 'y', toE164: '+5491123456789', attachment: {
      kind: 'private-document', bytes: bad, byteLength: bad.length, sha256: createHash('sha256').update(bad).digest('hex'), filename: 'safe.pdf', mimeType: 'application/pdf', caption: 'safe',
    } })).resolves.toEqual({ kind: 'rejected', code: 'CONFIG_INVALID' });
    expect(transport).not.toHaveBeenCalled();
  });
});
