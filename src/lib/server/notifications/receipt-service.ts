import { isValidReceiptDocument, type ReceiptMessenger, type SendReceiptResult } from './contracts';
import type { ReceiptNotificationRepository } from './registration-receipts';

function outcome(result: SendReceiptResult) {
  if (result.kind === 'accepted' && result.acceptedArtifact === 'document') {
    return { status: 'sent' as const, providerMessageId: result.providerMessageId, evidence: result.evidence };
  }
  if (result.kind === 'accepted') return { status: 'failed' as const, errorCode: 'PROVIDER_ATTACHMENT_NOT_ACCEPTED' as const };
  return { status: result.kind === 'rejected' ? 'failed' as const : 'uncertain' as const, errorCode: result.code };
}

export function createReceiptService(repository: ReceiptNotificationRepository, messenger: ReceiptMessenger) {
  return {
    async dispatch(logicalMessageKey: string): Promise<void> {
      const attempt = await repository.claim(logicalMessageKey);
      if (!attempt || !isValidReceiptDocument(attempt.attachment)) return;
      try {
        const result = await messenger.send({
          logicalMessageKey: attempt.logicalMessageKey, attemptKey: attempt.attemptKey, toE164: attempt.toE164,
          attachment: attempt.attachment,
        });
        await repository.complete(attempt, outcome(result));
      } catch {
        await repository.complete(attempt, { status: 'uncertain', errorCode: 'PROVIDER_NETWORK' });
      }
    },
  };
}
