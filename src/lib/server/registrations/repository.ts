import type { Client } from '@libsql/client';

export type RegistrationRecord = Readonly<{
  id: string;
  phoneE164: string | null;
  reviewState: string;
  participantResponseState: string;
  receiptRequired: number;
  termsVersion: string | null;
}>;

export function createRegistrationRepository(database: Client) {
  return {
    async findById(id: string): Promise<RegistrationRecord | null> {
      const result = await database.execute({
        sql: `SELECT id, phone_e164 AS phoneE164, review_state AS reviewState,
          participant_response_state AS participantResponseState,
          receipt_required AS receiptRequired, terms_version AS termsVersion
          FROM barber_signups WHERE id = ?`,
        args: [id],
      });
      return result.rows[0] as RegistrationRecord | undefined ?? null;
    },
  };
}
