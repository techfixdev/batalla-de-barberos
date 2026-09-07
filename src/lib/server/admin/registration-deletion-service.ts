import { randomUUID } from 'node:crypto';

import type { RegistrationDeletionRepository } from './registration-deletion-repository';

export type RegistrationDeletionInput = Readonly<{
  registrationIds: readonly string[];
  confirmation: string;
  irreversible: string;
  operationId: string;
  sessionId: string;
}>;
export type RegistrationDeletionResult =
  | Readonly<{ kind: 'deleted' | 'already_done'; count: number }>
  | Readonly<{ kind: 'invalid' | 'conflict' | 'unavailable' }>;

type Options = Readonly<{
  repository: RegistrationDeletionRepository;
  createId?: () => string;
  now?: () => string;
}>;

function validOpaque(value: string) {
  return /^[A-Za-z0-9_-]{16,200}$/.test(value);
}

function validSession(value: string) {
  return /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

export function createRegistrationDeletionService(options: Options) {
  return {
    async deleteSelected(input: RegistrationDeletionInput): Promise<RegistrationDeletionResult> {
      const ids = input.registrationIds;
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || new Set(ids).size !== ids.length
        || ids.some((id) => typeof id !== 'string' || !validOpaque(id))
        || input.confirmation !== `ELIMINAR ${ids.length}` || input.irreversible !== '1'
        || !validOpaque(input.operationId) || !validSession(input.sessionId)) return { kind: 'invalid' };
      try {
        return await options.repository.deleteSelected({
          registrationIds: ids,
          operationId: input.operationId,
          sessionId: input.sessionId,
          auditId: (options.createId ?? randomUUID)(),
          createdAt: (options.now ?? (() => new Date().toISOString()))(),
        });
      } catch {
        return { kind: 'unavailable' };
      }
    },
  };
}
