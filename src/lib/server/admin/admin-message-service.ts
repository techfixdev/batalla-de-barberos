import { createHash } from 'node:crypto';

import type { PrivateMediaMessenger, PrivatePdfDocument } from '../notifications/evolution-private-media-messenger';
import type { SafeErrorCode } from '../notifications/contracts';
import type { RegistrationListInput } from './registration-read-repository';
import type { AdminMessageAttemptClaim } from './admin-message-contracts';
import type { AdminMessageClaimResult, AdminMessageJobRepository } from './admin-message-job-repository';

export type LoadedAdminPdf = Readonly<{ bytes: Uint8Array; filename: string; sha256?: string }>;
export type AdminMessageServiceResult =
  | Readonly<{ kind: 'accepted' | 'failed' | 'uncertain' | 'already_exists'; jobId: string }>
  | Readonly<{ kind: 'blocked' | 'conflict' | 'invalid' | 'busy' | 'sent' | 'acknowledgement_required' }>;

type Options = Readonly<{
  ready: boolean;
  repository: AdminMessageJobRepository;
  messenger: PrivateMediaMessenger;
  loadConfirmationDocument(termsVersion: string): Promise<LoadedAdminPdf>;
  createOrganizationDocument(records: AdminMessageAttemptClaim['registrations'], generatedAt: string): Promise<LoadedAdminPdf>;
}>;

type ConfirmationInput = Readonly<{ registrationId: string; recipientE164: `+${string}`; termsVersion: string; operationNonce: string; sessionId: string }>;
type OrganizationInput = Readonly<{ registrationIds: readonly string[]; filters: RegistrationListInput; recipientE164: `+${string}`; operationNonce: string; sessionId: string }>;
type RetryInput = Readonly<{ jobId: string; recipientE164: `+${string}`; acknowledgeUncertain?: true }>;

function claimOutcome(result: Exclude<AdminMessageClaimResult, { kind: 'claimed' }>): AdminMessageServiceResult {
  return result.kind === 'already_exists' ? { kind: 'already_exists', jobId: result.jobId } : { kind: result.kind };
}

function caption(claim: AdminMessageAttemptClaim) {
  if (claim.kind === 'organization_list') return `Listado de inscripciones · ${claim.registrations.length} registros`;
  return `N.º ${claim.registrations[0]!.registrationNumber}. Confirmamos tu plaza en Batalla de Barberos. Adjuntamos bases y categorías.`;
}

function attachment(claim: AdminMessageAttemptClaim, document: LoadedAdminPdf, sha256: string): PrivatePdfDocument {
  return Object.freeze({ kind: 'private-document', bytes: document.bytes, byteLength: document.bytes.byteLength, sha256,
    filename: document.filename, mimeType: 'application/pdf', caption: caption(claim) });
}

export function createAdminMessageService(options: Options) {
  async function dispatch(result: AdminMessageClaimResult): Promise<AdminMessageServiceResult> {
    if (result.kind !== 'claimed') return claimOutcome(result);
    const claim = result.claim;
    let document: LoadedAdminPdf;
    try {
      document = claim.kind === 'confirmation'
        ? await options.loadConfirmationDocument(claim.termsVersion ?? '')
        : await options.createOrganizationDocument(claim.registrations, claim.createdAt);
    } catch {
      await options.repository.complete(claim, { state: 'failed', errorCode: 'CONFIG_INVALID' });
      return { kind: 'failed', jobId: claim.jobId };
    }
    const sha256 = createHash('sha256').update(document.bytes).digest('hex');
    if (document.sha256 && document.sha256 !== sha256) {
      await options.repository.complete(claim, { state: 'failed', errorCode: 'CONFIG_INVALID' });
      return { kind: 'failed', jobId: claim.jobId };
    }
    if (!await options.repository.bindDocumentDigest(claim, sha256)) {
      await options.repository.complete(claim, { state: 'failed', errorCode: 'PROVIDER_MEDIA_REJECTED' });
      return { kind: 'failed', jobId: claim.jobId };
    }
    let sent: Awaited<ReturnType<PrivateMediaMessenger['send']>>;
    try {
      sent = await options.messenger.send({ logicalMessageKey: claim.operationNonce, attemptKey: claim.attemptKey,
        toE164: claim.recipientE164, attachment: attachment(claim, document, sha256) });
    } catch {
      await options.repository.complete(claim, { state: 'uncertain', errorCode: 'PROVIDER_NETWORK' });
      return { kind: 'uncertain', jobId: claim.jobId };
    }
    if (sent.kind === 'accepted') {
      const completed = await options.repository.complete(claim, { state: 'sent', evidence: sent.evidence, providerMessageId: sent.providerMessageId });
      return { kind: completed ? 'accepted' : 'uncertain', jobId: claim.jobId };
    }
    const state = sent.kind === 'uncertain' ? 'uncertain' : 'failed';
    await options.repository.complete(claim, { state, errorCode: sent.code as SafeErrorCode });
    return { kind: state, jobId: claim.jobId };
  }

  return Object.freeze({
    async sendConfirmation(input: ConfirmationInput) {
      if (!options.ready) return { kind: 'blocked' } as const;
      return dispatch(await options.repository.claimInitial({ kind: 'confirmation', operationNonce: input.operationNonce,
        registrationIds: [input.registrationId], recipientE164: input.recipientE164, termsVersion: input.termsVersion, createdBySessionId: input.sessionId }));
    },
    async sendOrganizationList(input: OrganizationInput) {
      if (!options.ready) return { kind: 'blocked' } as const;
      return dispatch(await options.repository.claimInitial({ kind: 'organization_list', operationNonce: input.operationNonce,
        registrationIds: input.registrationIds, filters: input.filters, recipientE164: input.recipientE164, createdBySessionId: input.sessionId }));
    },
    async retry(input: RetryInput) {
      if (!options.ready) return { kind: 'blocked' } as const;
      return dispatch(await options.repository.claimRetry(input));
    },
    async reconcile(jobId: string) {
      if (!options.ready) return { kind: 'blocked' } as const;
      return await options.repository.reconcileExpired(jobId) ? { kind: 'uncertain', jobId } as const : { kind: 'conflict' } as const;
    },
  });
}

export type AdminMessageService = ReturnType<typeof createAdminMessageService>;
