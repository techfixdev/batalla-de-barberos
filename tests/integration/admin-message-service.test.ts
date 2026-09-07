import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createAdminMessageService } from '../../src/lib/server/admin/admin-message-service';
import type { AdminMessageAttemptClaim } from '../../src/lib/server/admin/admin-message-contracts';
import type { SendPrivateMediaCommand } from '../../src/lib/server/notifications/evolution-private-media-messenger';

const record = Object.freeze({ id: '11111111-1111-4111-8111-111111111111', registrationNumber: 27, fullName: 'Ana Pérez', email: 'ana@example.test', phone: '+5491123456789', barbershop: 'Sur', experience: 'profesional', createdAt: '2026-01-01T00:00:00.000Z', review: 'selected', participant: 'not_requested', receipt: 'not_required' });
const claim: AdminMessageAttemptClaim = Object.freeze({ jobId: '22222222-2222-4222-8222-222222222222', kind: 'confirmation', state: 'pending', operationNonce: 'operation-confirmation-001', attemptNo: 1, attemptKey: 'attempt', leaseToken: 'lease', leaseExpiresAt: '2099-01-01T00:00:00.000Z', createdAt: '2026-02-01T00:00:00.000Z', recipientE164: '+5491123456789', recipientFingerprint: 'a'.repeat(64), termsVersion: 'draft-2026-09-v1', expectedDocumentSha256: null, registrations: [record] });
const pdf = new Uint8Array(Buffer.from('%PDF-test'));

function fixture(ready = true) {
  const repository = { claimInitial: vi.fn(async () => ({ kind: 'claimed' as const, claim })), claimRetry: vi.fn(), bindDocumentDigest: vi.fn(async () => true), complete: vi.fn(async () => true), reconcileExpired: vi.fn(), get: vi.fn(), getConfirmationRecipient: vi.fn(), list: vi.fn() };
  const messenger = { send: vi.fn(async (_command: SendPrivateMediaCommand) => ({ kind: 'accepted' as const, acceptedArtifact: 'document' as const, evidence: 'validated-document-status' as const, providerMessageId: 'provider-1', httpStatus: 200 })) };
  const loadConfirmationDocument = vi.fn(async () => ({ bytes: pdf, filename: 'bases-v1.pdf', sha256: createHash('sha256').update(pdf).digest('hex') }));
  const service = createAdminMessageService({ ready, repository, messenger, loadConfirmationDocument, createOrganizationDocument: vi.fn() });
  return { repository, messenger, service, loadConfirmationDocument };
}

describe('manual admin WhatsApp service', () => {
  it('blocks private dispatch before creating a job or calling the provider', async () => {
    const { repository, messenger, service } = fixture(false);
    await expect(service.sendConfirmation({ registrationId: record.id, recipientE164: '+5491123456789', termsVersion: 'draft-2026-09-v1', operationNonce: 'operation-confirmation-001', sessionId: 'session-1' })).resolves.toEqual({ kind: 'blocked' });
    expect(repository.claimInitial).not.toHaveBeenCalled();
    expect(messenger.send).not.toHaveBeenCalled();
  });

  it('claims first, binds the exact PDF digest, sends one private BASE64 document, and records provider acceptance', async () => {
    const { repository, messenger, service } = fixture();
    const outcome = await service.sendConfirmation({ registrationId: record.id, recipientE164: '+5491123456789', termsVersion: 'draft-2026-09-v1', operationNonce: 'operation-confirmation-001', sessionId: 'session-1' });
    expect(outcome).toEqual({ kind: 'accepted', jobId: claim.jobId });
    expect(repository.claimInitial).toHaveBeenCalledBefore(repository.bindDocumentDigest);
    expect(repository.bindDocumentDigest).toHaveBeenCalledWith(claim, createHash('sha256').update(pdf).digest('hex'));
    expect(messenger.send).toHaveBeenCalledTimes(1);
    expect(messenger.send.mock.calls[0]![0]).toMatchObject({ toE164: '+5491123456789', attachment: { bytes: pdf, mimeType: 'application/pdf', caption: expect.stringContaining('N.º 27') } });
    expect(repository.complete).toHaveBeenCalledWith(claim, { state: 'sent', evidence: 'validated-document-status', providerMessageId: 'provider-1' });
  });

  it('does not report a provider acceptance as sent when the completion CAS loses', async () => {
    const { repository, service } = fixture();
    repository.complete.mockResolvedValueOnce(false);
    await expect(service.sendConfirmation({ registrationId: record.id, recipientE164: '+5491123456789', termsVersion: 'draft-2026-09-v1', operationNonce: 'operation-confirmation-001', sessionId: 'session-1' }))
      .resolves.toEqual({ kind: 'uncertain', jobId: claim.jobId });
    expect(repository.complete).toHaveBeenCalledWith(claim, { state: 'sent', evidence: 'validated-document-status', providerMessageId: 'provider-1' });
  });

  it('settles document generation failure instead of leaving a live lease', async () => {
    const { repository, service, loadConfirmationDocument } = fixture();
    loadConfirmationDocument.mockRejectedValueOnce(new Error('private detail'));
    await expect(service.sendConfirmation({ registrationId: record.id, recipientE164: '+5491123456789', termsVersion: 'draft-2026-09-v1', operationNonce: 'operation-confirmation-001', sessionId: 'session-1' })).resolves.toEqual({ kind: 'failed', jobId: claim.jobId });
    expect(repository.complete).toHaveBeenCalledWith(claim, { state: 'failed', errorCode: 'CONFIG_INVALID' });
  });
});
