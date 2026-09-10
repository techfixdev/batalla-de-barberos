import { randomUUID } from 'node:crypto';

import type { Client } from '@libsql/client';

import { validateSignup, type Experience } from '../../barber-signups';

export type RegistrationResponses = Readonly<{
  fullName: string;
  email: string;
  phone: string;
  barbershop: string;
  experience: Experience;
}>;

type UpdateInput = Readonly<{
  registrationId: unknown;
  expectedStateVersion: unknown;
  sessionId: unknown;
  requestId: unknown;
  responses: unknown;
}>;

type Outcome = Readonly<{ kind: 'success'; stateVersion: number }> | Readonly<{
  kind: 'conflict' | 'email_conflict' | 'invalid' | 'noop' | 'notfound' | 'safe_unavailable';
}>;

type Dependencies = Readonly<{
  database: Client;
  now?: () => string;
  createId?: () => string;
}>;

type Row = Record<string, unknown>;

export type RegistrationResponseEditor = Readonly<{ update(input: UpdateInput): Promise<Outcome> }>;

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

function validVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function responses(value: unknown): RegistrationResponses | null {
  const candidate = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const validated = validateSignup({ ...candidate, acceptedRules: true });
  if (!validated.success) return null;
  const { fullName, email, phone, barbershop, experience } = validated.data;
  return { fullName, email, phone, barbershop, experience };
}

function uniqueEmailError(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate?.code === 'SQLITE_CONSTRAINT_UNIQUE'
    || (typeof candidate?.message === 'string' && candidate.message.includes('UNIQUE constraint failed: barber_signups.email'));
}

function sameResponses(row: Row, value: RegistrationResponses, phoneE164: string): boolean {
  return row.full_name === value.fullName && row.email === value.email && row.phone === value.phone
    && row.phone_e164 === phoneE164 && (row.barbershop ?? '') === value.barbershop && row.experience === value.experience;
}

export function createRegistrationResponseEditor(dependencies: Dependencies): RegistrationResponseEditor {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const createId = dependencies.createId ?? randomUUID;

  return {
    async update(input) {
      if (!validId(input.registrationId) || !validId(input.sessionId) || !validId(input.requestId) || !validVersion(input.expectedStateVersion)) {
        return { kind: 'invalid' };
      }
      const next = responses(input.responses);
      if (!next) return { kind: 'invalid' };
      const validated = validateSignup({ ...next, acceptedRules: true });
      if (!validated.success) return { kind: 'invalid' };
      const phoneE164 = validated.data.phoneE164;

      try {
        const found = await dependencies.database.execute({
          sql: `SELECT full_name, email, phone, phone_e164, barbershop, experience, state_version
            FROM barber_signups WHERE id = ?`,
          args: [input.registrationId],
        });
        const current = found.rows[0] as Row | undefined;
        if (!current) return { kind: 'notfound' };
        if (Number(current.state_version) !== input.expectedStateVersion) return { kind: 'conflict' };
        if (sameResponses(current, next, phoneE164)) return { kind: 'noop' };

        const duplicate = await dependencies.database.execute({
          sql: 'SELECT 1 FROM barber_signups WHERE email = ? AND id <> ? LIMIT 1',
          args: [next.email, input.registrationId],
        });
        if (duplicate.rows.length) return { kind: 'email_conflict' };

        const result = await dependencies.database.batch([
          {
            sql: `UPDATE barber_signups SET full_name = ?, email = ?, phone = ?, phone_e164 = ?, barbershop = ?, experience = ?,
              state_version = state_version + 1 WHERE id = ? AND state_version = ?
              AND NOT EXISTS (SELECT 1 FROM barber_signups other WHERE other.email = ? AND other.id <> ?)`,
            args: [next.fullName, next.email, next.phone, phoneE164, next.barbershop || null, next.experience,
              input.registrationId, input.expectedStateVersion, next.email, input.registrationId],
          },
          {
            sql: `INSERT INTO admin_audit_events (id, session_id, registration_id, action, from_value, to_value, request_id, created_at)
              SELECT ?, ?, ?, 'registration_responses_updated', NULL, NULL, ?, ? WHERE changes() = 1`,
            args: [createId(), input.sessionId, input.registrationId, input.requestId, now()],
          },
        ], 'write');
        if (result[0]?.rowsAffected === 1 && result[1]?.rowsAffected === 1) {
          return { kind: 'success', stateVersion: input.expectedStateVersion + 1 };
        }

        const latest = await dependencies.database.execute({
          sql: 'SELECT state_version FROM barber_signups WHERE id = ?', args: [input.registrationId],
        });
        if (!latest.rows.length) return { kind: 'notfound' };
        const emailOwner = await dependencies.database.execute({
          sql: 'SELECT 1 FROM barber_signups WHERE email = ? AND id <> ? LIMIT 1', args: [next.email, input.registrationId],
        });
        return emailOwner.rows.length ? { kind: 'email_conflict' } : { kind: 'conflict' };
      } catch (error) {
        return uniqueEmailError(error) ? { kind: 'email_conflict' } : { kind: 'safe_unavailable' };
      }
    },
  };
}
