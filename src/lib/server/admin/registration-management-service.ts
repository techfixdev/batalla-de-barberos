import { randomUUID } from 'node:crypto';

import { PARTICIPANT_RESPONSE_STATES, REVIEW_STATES } from '../registrations/domain';
import type { RegistrationLifecycleRepository } from './registration-lifecycle-repository';

type TransitionInput = Readonly<{
  registrationId: unknown;
  expectedStateVersion: unknown;
  nextState: unknown;
  sessionId: unknown;
  requestId: unknown;
}>;

type Success = Readonly<{ kind: 'success'; stateVersion: number }>;
type Failure = Readonly<{ kind: 'conflict' | 'notfound' | 'noop' | 'invalid' | 'safe_unavailable' }>;
export type RegistrationLifecycleOutcome = Success | Failure;
export type RegistrationManagementService = Readonly<{
  changeReview(input: TransitionInput): Promise<RegistrationLifecycleOutcome>;
  changeParticipantResponse(input: TransitionInput): Promise<RegistrationLifecycleOutcome>;
}>;

type Dependencies = Readonly<{
  repository: RegistrationLifecycleRepository;
  now?: () => string;
  createId?: () => string;
}>;

function hasValue<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function isInternalId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

function isExpectedVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function createRegistrationManagementService(dependencies: Dependencies): RegistrationManagementService {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const createId = dependencies.createId ?? randomUUID;

  async function change(input: TransitionInput, axis: 'review' | 'participant'): Promise<RegistrationLifecycleOutcome> {
    const states = axis === 'review' ? REVIEW_STATES : PARTICIPANT_RESPONSE_STATES;
    if (!isInternalId(input.registrationId) || !isInternalId(input.sessionId) || !isInternalId(input.requestId)
      || !isExpectedVersion(input.expectedStateVersion) || !hasValue(input.nextState, states)) return { kind: 'invalid' };
    try {
      const current = await dependencies.repository.findById(input.registrationId);
      if (!current) return { kind: 'notfound' };
      if (current.stateVersion !== input.expectedStateVersion) return { kind: 'conflict' };
      const currentState = axis === 'review' ? current.reviewState : current.participantResponseState;
      if (currentState === input.nextState) return { kind: 'noop' };
      const action = axis === 'review' ? 'review_state_changed' as const : 'participant_response_changed' as const;
      const update = axis === 'review' ? dependencies.repository.updateReview : dependencies.repository.updateParticipantResponse;
      const updated = await update({ registrationId: input.registrationId, expectedStateVersion: input.expectedStateVersion, nextState: input.nextState,
        audit: { id: createId(), sessionId: input.sessionId, registrationId: input.registrationId, action, fromValue: currentState,
          toValue: input.nextState, requestId: input.requestId, createdAt: now() } });
      return updated ? { kind: 'success', stateVersion: input.expectedStateVersion + 1 } : { kind: 'conflict' };
    } catch {
      return { kind: 'safe_unavailable' };
    }
  }

  return {
    changeReview: (input) => change(input, 'review'),
    changeParticipantResponse: (input) => change(input, 'participant'),
  };
}
