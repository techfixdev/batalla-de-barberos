import type { Client } from '@libsql/client';

import { PARTICIPANT_RESPONSE_STATES, REVIEW_STATES, type ParticipantResponseState, type ReviewState } from '../registrations/domain';

export type RegistrationLifecycleSnapshot = Readonly<{
  reviewState: ReviewState;
  participantResponseState: ParticipantResponseState;
  stateVersion: number;
}>;

type AuditEvent = Readonly<{
  id: string;
  sessionId: string;
  registrationId: string;
  action: 'review_state_changed' | 'participant_response_changed';
  fromValue: string;
  toValue: string;
  requestId: string;
  createdAt: string;
}>;

type UpdateInput = Readonly<{ registrationId: string; expectedStateVersion: number; nextState: string; audit: AuditEvent }>;

export type RegistrationLifecycleRepository = Readonly<{
  findById(registrationId: string): Promise<RegistrationLifecycleSnapshot | null>;
  updateReview(input: UpdateInput): Promise<boolean>;
  updateParticipantResponse(input: UpdateInput): Promise<boolean>;
}>;

type Row = Record<string, unknown>;

function snapshot(row: Row | undefined): RegistrationLifecycleSnapshot | null {
  if (!row || typeof row.review_state !== 'string' || typeof row.participant_response_state !== 'string'
    || !(REVIEW_STATES as readonly string[]).includes(row.review_state)
    || !(PARTICIPANT_RESPONSE_STATES as readonly string[]).includes(row.participant_response_state)
    || !Number.isInteger(Number(row.state_version))) return null;
  return { reviewState: row.review_state as ReviewState, participantResponseState: row.participant_response_state as ParticipantResponseState,
    stateVersion: Number(row.state_version) };
}

const MUTATIONS = {
  review: { column: 'review_state', update: 'UPDATE barber_signups SET review_state = ?, state_version = state_version + 1 WHERE id = ? AND state_version = ?' },
  participant: { column: 'participant_response_state', update: 'UPDATE barber_signups SET participant_response_state = ?, state_version = state_version + 1 WHERE id = ? AND state_version = ?' },
} as const;

async function update(database: Client, input: UpdateInput, axis: keyof typeof MUTATIONS): Promise<boolean> {
  const mutation = MUTATIONS[axis];
  const results = await database.batch([
    { sql: mutation.update, args: [input.nextState, input.registrationId, input.expectedStateVersion] },
    { sql: `INSERT INTO admin_audit_events (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1`,
      args: [input.audit.id, input.audit.sessionId, input.audit.registrationId, input.audit.action, input.audit.fromValue, input.audit.toValue,
        input.audit.requestId, input.audit.createdAt] },
  ], 'write');
  return results[0]?.rowsAffected === 1 && results[1]?.rowsAffected === 1;
}

export function createRegistrationLifecycleRepository(database: Client): RegistrationLifecycleRepository {
  return {
    async findById(registrationId) {
      const result = await database.execute({ sql: `SELECT review_state, participant_response_state, state_version FROM barber_signups WHERE id = ?`, args: [registrationId] });
      return snapshot(result.rows[0] as Row | undefined);
    },
    updateReview: (input) => update(database, input, 'review'),
    updateParticipantResponse: (input) => update(database, input, 'participant'),
  };
}
