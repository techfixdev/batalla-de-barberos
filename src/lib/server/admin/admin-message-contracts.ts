import { createHash, createHmac } from 'node:crypto';

import type { SafeErrorCode } from '../notifications/contracts';
import type { RegistrationExportRecord, RegistrationListInput } from './registration-read-repository';

export const ADMIN_MESSAGE_KINDS = ['confirmation', 'organization_list'] as const;
export const ADMIN_MESSAGE_STATES = ['pending', 'sent', 'failed', 'uncertain'] as const;
export const ADMIN_MESSAGE_ATTEMPT_TRIGGERS = ['initial', 'admin_retry', 'admin_reconcile'] as const;
export type AdminMessageKind = typeof ADMIN_MESSAGE_KINDS[number];
export type AdminMessageState = typeof ADMIN_MESSAGE_STATES[number];
export type AdminMessageAttemptTrigger = typeof ADMIN_MESSAGE_ATTEMPT_TRIGGERS[number];

export type AdminMessageCreateInput = Readonly<{
  kind: AdminMessageKind;
  operationNonce: string;
  registrationIds: readonly string[];
  filters?: RegistrationListInput;
  recipientE164: `+${string}`;
  termsVersion?: string;
  createdBySessionId: string;
}>;
export type AdminMessageRetryInput = Readonly<{
  jobId: string;
  recipientE164: `+${string}`;
  acknowledgeUncertain?: true;
}>;
export type AdminMessageAttemptClaim = Readonly<{
  jobId: string; kind: AdminMessageKind; state: AdminMessageState; operationNonce: string;
  attemptNo: number; attemptKey: string; leaseToken: string; leaseExpiresAt: string; createdAt: string;
  recipientE164: `+${string}`; recipientFingerprint: string; termsVersion: string | null;
  expectedDocumentSha256: string | null; registrations: readonly RegistrationExportRecord[];
}>;
export type AdminMessageCompletion = Readonly<{
  state: 'sent' | 'failed' | 'uncertain'; providerMessageId?: string;
  evidence?: 'validated-document-status'; errorCode?: SafeErrorCode;
}>;
export type AdminMessageJobSummary = Readonly<{
  id: string; kind: AdminMessageKind; state: AdminMessageState; operationNonce: string;
  registrationNumbers: readonly number[]; attemptCount: number; documentSha256: string | null;
  termsVersion: string | null; lastErrorCode: SafeErrorCode | null; leaseExpiresAt: string | null;
  createdAt: string; updatedAt: string; sentAt: string | null;
  attempts: readonly Readonly<{ attemptNo: number; trigger: AdminMessageAttemptTrigger; outcome: string; startedAt: string; completedAt: string | null; errorCode: SafeErrorCode | null }>[];
}>;

export function normalizeAdminMessageRecipient(value: string): `+${string}` | null {
  const normalized = value.trim().replace(/[\s()-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized as `+${string}` : null;
}
export function fingerprintAdminMessageRecipient(recipientE164: string, secret: Uint8Array): string {
  if (secret.byteLength < 32) throw new Error('Invalid recipient HMAC secret.');
  const normalized = normalizeAdminMessageRecipient(recipientE164);
  if (!normalized) throw new Error('Invalid recipient.');
  return createHmac('sha256', secret).update(`admin-message-recipient:v1:${normalized}`).digest('hex');
}
export function immutableAdminMessageInputSha256(input: Readonly<{
  kind: AdminMessageKind; registrationIds: readonly string[]; recipientFingerprint: string; termsVersion?: string; filters?: RegistrationListInput;
}>): string {
  const filters = Object.fromEntries(Object.entries(input.filters ?? {}).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b)));
  return createHash('sha256').update(JSON.stringify({ version: 1, kind: input.kind, registrationIds: [...input.registrationIds],
    recipientFingerprint: input.recipientFingerprint, termsVersion: input.termsVersion ?? null, filters })).digest('hex');
}
