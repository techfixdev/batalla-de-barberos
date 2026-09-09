import { createReceiptCaption } from '../notifications/receipt-caption';
import { createReceiptService } from '../notifications/receipt-service';
import type { ReceiptMessenger } from '../notifications/contracts';
import type { ReceiptNotificationRepository, StoredReceiptNotification } from '../notifications/registration-receipts';
import type { RegistrationRecord } from '../registrations/repository';
import { getDraftTermsByVersion, type DraftTerms } from '../../terms/draft-terms-manifest';

export type ReceiptRecoveryResult = Readonly<{ kind: 'accepted' | 'conflict' | 'notfound' | 'invalid' | 'unavailable' }>;
type RecoveryInput = Readonly<{ registrationId: string; ackUncertain?: string }>;
type RegistrationRepository = Readonly<{ findById(id: string): Promise<RegistrationRecord | null> }>;
type RecoveryOptions = Readonly<{
  registrations: RegistrationRepository; notifications: ReceiptNotificationRepository; messenger: ReceiptMessenger;
  canonicalSiteOrigin: string; dispatchAvailable: boolean; termsByVersion?: (version: string) => DraftTerms | null;
  beforeClaim?: () => Promise<void>;
}>;

function expectedSnapshot(terms: DraftTerms, origin: string) {
  try {
    const site = new URL(origin);
    if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) return null;
    const mediaUrl = new URL(terms.publicPath, site).href;
    return { mediaUrl, filename: terms.filename, mimeType: terms.mimeType, sha256: terms.sha256, caption: createReceiptCaption(mediaUrl, terms.legalMarker) };
  } catch { return null; }
}

function validatesSnapshot(notification: StoredReceiptNotification, origin: string, termsByVersion: (version: string) => DraftTerms | null) {
  const terms = termsByVersion(notification.termsVersion);
  const expected = terms && expectedSnapshot(terms, origin);
  return !!expected && notification.attachment.mediaUrl === expected.mediaUrl && notification.attachment.filename === expected.filename
    && notification.attachment.mimeType === expected.mimeType && notification.sha256 === expected.sha256 && notification.attachment.caption === expected.caption;
}

export function createReceiptRecoveryService(options: RecoveryOptions) {
  const dispatch = createReceiptService(options.notifications, options.messenger);
  const termsByVersion = options.termsByVersion ?? getDraftTermsByVersion;
  async function registration(input: RecoveryInput) {
    const value = await options.registrations.findById(input.registrationId);
    return value?.receiptRequired === 1 && value.termsVersion ? value : null;
  }
  async function settleStale(notification: StoredReceiptNotification) {
    if (notification.status !== 'pending' || !notification.leaseExpiresAt || Date.parse(notification.leaseExpiresAt) > Date.now()) return false;
    await options.notifications.settleExpired(notification.logicalMessageKey);
    return true;
  }
  async function send(notification: StoredReceiptNotification, registration: RegistrationRecord, input: RecoveryInput,
    trigger: 'admin_retry' | 'admin_reconcile'): Promise<ReceiptRecoveryResult> {
    if (!validatesSnapshot(notification, options.canonicalSiteOrigin, termsByVersion)) return { kind: 'invalid' };
    if (!options.dispatchAvailable) return { kind: 'unavailable' };
    await options.beforeClaim?.();
    const preconditions = {
      expected: { status: notification.status, attemptCount: notification.attemptCount, registrationId: registration.id,
        termsVersion: registration.termsVersion!, attachment: notification.attachment, sha256: notification.sha256 },
      ...(input.ackUncertain === '1' ? { acknowledgeUncertain: true as const } : {}),
    };
    return (await dispatch.dispatch(notification.logicalMessageKey, trigger, preconditions)) === 'completed' ? { kind: 'accepted' } : { kind: 'conflict' };
  }
  return {
    async retry(input: RecoveryInput): Promise<ReceiptRecoveryResult> {
      const persisted = await registration(input);
      if (!persisted) return (await options.registrations.findById(input.registrationId)) ? { kind: 'invalid' } : { kind: 'notfound' };
      const notification = await options.notifications.getByRegistrationAndVersion(persisted.id, persisted.termsVersion!);
      if (!notification) return { kind: 'notfound' };
      if (await settleStale(notification) || notification.leaseToken || notification.status === 'sent') return notification.status === 'sent' ? { kind: 'invalid' } : { kind: 'conflict' };
      if (notification.status !== 'failed' && notification.status !== 'uncertain') return { kind: 'invalid' };
      if (notification.status === 'uncertain' && input.ackUncertain !== '1') return { kind: 'invalid' };
      return send(notification, persisted, input, 'admin_retry');
    },
    async reconcile(input: RecoveryInput): Promise<ReceiptRecoveryResult> {
      const persisted = await registration(input);
      if (!persisted) return (await options.registrations.findById(input.registrationId)) ? { kind: 'invalid' } : { kind: 'notfound' };
      let notification = await options.notifications.getByRegistrationAndVersion(persisted.id, persisted.termsVersion!);
      if (!notification) {
        const terms = termsByVersion(persisted.termsVersion!);
        const snapshot = terms && expectedSnapshot(terms, options.canonicalSiteOrigin);
        if (!snapshot) return { kind: 'invalid' };
        await options.notifications.ensureForRegistration({ registrationId: persisted.id, termsVersion: terms.version, ...snapshot });
        notification = await options.notifications.getByRegistrationAndVersion(persisted.id, persisted.termsVersion!);
      }
      if (!notification || await settleStale(notification) || notification.leaseToken) return { kind: 'conflict' };
      if (notification.status !== 'pending' || notification.attemptCount !== 0) return { kind: 'invalid' };
      return send(notification, persisted, input, 'admin_reconcile');
    },
  };
}
