import type { Client } from '@libsql/client';

import { PARTICIPANT_RESPONSE_STATES, RECEIPT_STATUSES, REVIEW_STATES, type ParticipantResponseState, type ReceiptStatus, type ReviewState } from '../registrations/domain';
import { SAFE_ERROR_CODES, type SafeErrorCode } from '../notifications/contracts';

const PAGE_SIZE = 50;
const AUDIT_ACTIONS = ['review_state_changed', 'participant_response_changed'] as const;

type Filters = Readonly<{ reviewState?: ReviewState; participantResponseState?: ParticipantResponseState; receiptStatus?: ReceiptStatus; attention?: boolean }>;
type ListInput = Readonly<{ cursor?: string; reviewState?: string; participantResponseState?: string; receiptStatus?: string; attention?: string }>;
type Cursor = Readonly<{ createdAt: string; id: string }>;
type Row = Record<string, unknown>;

export type RegistrationReadRecord = Readonly<{
  id: string; fullName: string; email: string; phoneE164: string | null; createdAt: string; termsVersion: string | null;
  reviewState: ReviewState; participantResponseState: ParticipantResponseState; receiptRequired: boolean; stateVersion: number;
  receipt: Readonly<{ id: string; termsVersion: string; status: ReceiptStatus; attemptCount: number; mediaUrl: string; mediaFilename: string;
    mediaMimeType: 'application/pdf'; lastErrorCode: SafeErrorCode | null; lastErrorMessage: string | null; lastAttemptAt: string | null; sentAt: string | null;
    attempts: readonly Readonly<{ outcome: string; startedAt: string; completedAt: string | null; errorCode: SafeErrorCode | null; errorMessage: string | null }>[] }> | null;
}>;
export type RegistrationDetail = RegistrationReadRecord & Readonly<{ auditEvents: readonly Readonly<{ action: string; fromValue: string | null; toValue: string | null; createdAt: string }>[] }>;
export type RegistrationReadRepository = Readonly<{
  list(input?: ListInput): Promise<Readonly<{ registrations: readonly RegistrationReadRecord[]; nextCursor: string | null }>>;
  count(input?: ListInput): Promise<number>;
  findById(id: string): Promise<RegistrationDetail | null>;
}>;

function inEnum<T extends readonly string[]>(value: string | undefined, values: T): value is T[number] {
  return value === undefined || values.includes(value);
}

function filters(input: ListInput = {}): Filters {
  if (!inEnum(input.reviewState, REVIEW_STATES) || !inEnum(input.participantResponseState, PARTICIPANT_RESPONSE_STATES)
    || !inEnum(input.receiptStatus, RECEIPT_STATUSES) || (input.attention !== undefined && input.attention !== '1' && input.attention !== '0')) {
    throw new Error('Invalid registration filter.');
  }
  return { reviewState: input.reviewState, participantResponseState: input.participantResponseState,
    receiptStatus: input.receiptStatus, attention: input.attention === '1' };
}

function decodeCursor(value: string | undefined): Cursor | null {
  if (value === undefined) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== 'string' || typeof parsed[1] !== 'string'
      || !parsed[0] || !parsed[1] || Buffer.from(JSON.stringify(parsed)).toString('base64url') !== value) throw new Error();
    return { createdAt: parsed[0], id: parsed[1] };
  } catch { throw new Error('Invalid registration cursor.'); }
}

function encodeCursor(record: RegistrationReadRecord): string {
  return Buffer.from(JSON.stringify([record.createdAt, record.id])).toString('base64url');
}

function where(input: ListInput): Readonly<{ sql: string; args: Array<string | number>; cursor: Cursor | null }> {
  const selected = filters(input), cursor = decodeCursor(input.cursor), clauses: string[] = [], args: Array<string | number> = [];
  if (selected.reviewState) { clauses.push('b.review_state = ?'); args.push(selected.reviewState); }
  if (selected.participantResponseState) { clauses.push('b.participant_response_state = ?'); args.push(selected.participantResponseState); }
  if (selected.receiptStatus) { clauses.push('n.status = ?'); args.push(selected.receiptStatus); }
  if (selected.attention) clauses.push("((b.receipt_required = 1 AND n.id IS NULL) OR n.status IN ('pending', 'failed', 'uncertain'))");
  if (cursor) { clauses.push('(b.created_at < ? OR (b.created_at = ? AND b.id < ?))'); args.push(cursor.createdAt, cursor.createdAt, cursor.id); }
  return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', args, cursor };
}

function safeError(value: unknown): SafeErrorCode | null {
  return typeof value === 'string' && (SAFE_ERROR_CODES as readonly string[]).includes(value) ? value as SafeErrorCode : null;
}

function diagnostic(value: unknown): Readonly<{ code: SafeErrorCode | null; message: string | null }> {
  const code = safeError(value);
  return { code, message: code ? 'Error del proveedor al enviar el documento.' : null };
}

function auditValue(action: typeof AUDIT_ACTIONS[number], value: unknown): string | null {
  const values = action === 'review_state_changed' ? REVIEW_STATES : PARTICIPANT_RESPONSE_STATES;
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? value : null;
}

function record(row: Row | undefined): RegistrationReadRecord | null {
  if (!row || typeof row.id !== 'string' || typeof row.full_name !== 'string' || typeof row.email !== 'string' || typeof row.created_at !== 'string'
    || !inEnum(typeof row.review_state === 'string' ? row.review_state : undefined, REVIEW_STATES)
    || !inEnum(typeof row.participant_response_state === 'string' ? row.participant_response_state : undefined, PARTICIPANT_RESPONSE_STATES)) return null;
  const reviewState = row.review_state as ReviewState;
  const participantResponseState = row.participant_response_state as ParticipantResponseState;
  const hasReceipt = typeof row.receipt_id === 'string';
  const receiptError = diagnostic(row.last_error_code);
  const receipt = hasReceipt && typeof row.receipt_terms_version === 'string' && inEnum(typeof row.receipt_status === 'string' ? row.receipt_status : undefined, RECEIPT_STATUSES)
    && typeof row.media_url === 'string' && typeof row.media_filename === 'string' && row.media_mime_type === 'application/pdf'
    ? { id: row.receipt_id as string, termsVersion: row.receipt_terms_version, status: row.receipt_status as ReceiptStatus, attemptCount: Number(row.attempt_count),
      mediaUrl: row.media_url, mediaFilename: row.media_filename, mediaMimeType: 'application/pdf' as const,
      lastErrorCode: receiptError.code, lastErrorMessage: receiptError.message,
      lastAttemptAt: typeof row.last_attempt_at === 'string' ? row.last_attempt_at : null, sentAt: typeof row.sent_at === 'string' ? row.sent_at : null, attempts: [] } : null;
  return { id: row.id, fullName: row.full_name, email: row.email, phoneE164: typeof row.phone_e164 === 'string' ? row.phone_e164 : null,
    createdAt: row.created_at, termsVersion: typeof row.terms_version === 'string' ? row.terms_version : null, reviewState,
    participantResponseState, receiptRequired: row.receipt_required === 1, stateVersion: Number(row.state_version), receipt };
}

const projection = `SELECT b.id, b.full_name, b.email, b.phone_e164, b.created_at, b.terms_version, b.review_state,
  b.participant_response_state, b.receipt_required, b.state_version, n.id AS receipt_id, n.terms_version AS receipt_terms_version,
  n.status AS receipt_status, n.attempt_count, n.media_url, n.media_filename, n.media_mime_type, n.last_error_code,
  n.last_error_message, n.last_attempt_at, n.sent_at FROM barber_signups b LEFT JOIN receipt_notifications n
  ON n.registration_id = b.id AND n.terms_version = b.terms_version`;

export function createRegistrationReadRepository(database: Client): RegistrationReadRepository {
  return {
    async list(input = {}) {
      const condition = where(input);
      const result = await database.execute({ sql: `${projection}${condition.sql} ORDER BY b.created_at DESC, b.id DESC LIMIT ?`, args: [...condition.args, PAGE_SIZE + 1] });
      const rows = result.rows.map((row) => record(row as Row)).filter((value): value is RegistrationReadRecord => value !== null);
      const hasNext = rows.length > PAGE_SIZE;
      const registrations = hasNext ? rows.slice(0, PAGE_SIZE) : rows;
      return { registrations, nextCursor: hasNext ? encodeCursor(registrations.at(-1)!) : null };
    },
    async count(input = {}) {
      decodeCursor(input.cursor);
      const condition = where({ ...input, cursor: undefined });
      const result = await database.execute({ sql: `SELECT COUNT(*) AS count FROM barber_signups b LEFT JOIN receipt_notifications n
        ON n.registration_id = b.id AND n.terms_version = b.terms_version${condition.sql}`, args: condition.args });
      return Number((result.rows[0] as Row | undefined)?.count ?? 0);
    },
    async findById(id) {
      if (!id || id.length > 200) return null;
      const result = await database.execute({ sql: `${projection} WHERE b.id = ?`, args: [id] });
      const value = record(result.rows[0] as Row | undefined);
      if (!value) return null;
      const [attemptRows, auditRows] = await Promise.all([
        value.receipt ? database.execute({ sql: `SELECT outcome, started_at, completed_at, error_code, error_message FROM receipt_notification_attempts
          WHERE notification_id = ? ORDER BY attempt_no DESC`, args: [value.receipt.id] }) : Promise.resolve({ rows: [] }),
        database.execute({ sql: `SELECT action, from_value, to_value, created_at FROM admin_audit_events WHERE registration_id = ?
          AND action IN ('review_state_changed', 'participant_response_changed') ORDER BY created_at DESC`, args: [id] }),
      ]);
      const attempts = attemptRows.rows.map((row) => row as Row).filter((row) => typeof row.outcome === 'string' && typeof row.started_at === 'string').map((row) => {
        const attemptError = diagnostic(row.error_code);
        return { outcome: row.outcome as string, startedAt: row.started_at as string, completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
          errorCode: attemptError.code, errorMessage: attemptError.message };
      });
      const auditEvents = auditRows.rows.map((row) => row as Row).filter((row) => typeof row.action === 'string'
        && (AUDIT_ACTIONS as readonly string[]).includes(row.action) && typeof row.created_at === 'string').map((row) => {
        const action = row.action as typeof AUDIT_ACTIONS[number];
        return { action, fromValue: auditValue(action, row.from_value), toValue: auditValue(action, row.to_value), createdAt: row.created_at as string };
      });
      return { ...value, receipt: value.receipt ? { ...value.receipt, attempts } : null, auditEvents };
    },
  };
}
