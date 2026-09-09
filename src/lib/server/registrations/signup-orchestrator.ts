import { createHash } from 'node:crypto';

import type { Client } from '@libsql/client';

import type { SignupInput } from '../../barber-signups';
import { getCurrentDraftTerms } from '../../terms/draft-terms-manifest';
import { createReceiptCaption } from '../notifications/receipt-caption';
import { createRegistrationNotificationRepository, type RegistrationNotificationRepository } from '../notifications/registration-receipts';

const NOTICE_VERSION = 'public-copy-2026-09-v2';
type Existing = { id: string; submission_fingerprint: string | null };
export type SignupOutcome = 'created' | 'replay' | 'idempotency_conflict' | 'duplicate_email';

function fingerprint(input: SignupInput): string {
  return createHash('sha256').update(JSON.stringify([input.fullName, input.email, input.phoneE164, input.barbershop, input.experience, input.acceptedRules, getCurrentDraftTerms().version, NOTICE_VERSION])).digest('hex');
}

async function findExisting(database: Client, field: 'submission_key' | 'email', value: string): Promise<Existing | null> {
  const result = await database.execute({ sql: `SELECT id, submission_fingerprint FROM barber_signups WHERE ${field} = ?`, args: [value] });
  return result.rows[0] as Existing | undefined ?? null;
}

export function createSignupOrchestrator(database: Client, notifications = createRegistrationNotificationRepository(database), onNotificationPersistenceFailure: () => void = () => {}) {
  return async (input: SignupInput, submissionKey: string | null, origin: string): Promise<SignupOutcome> => {
    const acceptedFingerprint = fingerprint(input);
    const replay = (existing: Existing | null, conflict: SignupOutcome): SignupOutcome | null =>
      existing ? (existing.submission_fingerprint === acceptedFingerprint ? 'replay' : conflict) : null;
    const keyMatch = submissionKey ? replay(await findExisting(database, 'submission_key', submissionKey), 'idempotency_conflict') : null;
    if (keyMatch) return keyMatch;
    const emailMatch = replay(await findExisting(database, 'email', input.email), 'duplicate_email');
    if (emailMatch) return emailMatch;

    let id = crypto.randomUUID();
    try {
      await database.execute({
        sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, barbershop, experience, accepted_rules, submission_key, submission_fingerprint, terms_version, notice_version, receipt_required)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1)`,
        args: [id, input.fullName, input.email, input.phone, input.phoneE164, input.barbershop || null, input.experience, submissionKey, acceptedFingerprint, getCurrentDraftTerms().version, NOTICE_VERSION],
      });
    } catch {
      const raced = (submissionKey ? await findExisting(database, 'submission_key', submissionKey) : null) ?? await findExisting(database, 'email', input.email);
      const outcome = replay(raced, submissionKey ? 'idempotency_conflict' : 'duplicate_email');
      if (!outcome) throw new Error('Unable to persist signup.');
      return outcome;
    }

    const terms = getCurrentDraftTerms();
    try {
      const mediaUrl = new URL(terms.publicPath, origin).toString();
      await notifications.ensureForRegistration({ registrationId: id, termsVersion: terms.version, mediaUrl, filename: terms.filename, sha256: terms.sha256,
        caption: createReceiptCaption(mediaUrl, terms.legalMarker) });
    } catch {
      // A durable receipt_required flag keeps this persisted registration reconcilable.
      onNotificationPersistenceFailure();
    }
    return 'created';
  };
}

export type { RegistrationNotificationRepository };
