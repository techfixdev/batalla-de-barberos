import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';

import { createReceiptCaption } from '../../src/lib/server/notifications/receipt-caption';
import { safeErrorCode, type ReceiptMessenger, type SendReceiptCommand } from '../../src/lib/server/notifications/contracts';
import { createReceiptNotificationRepository, deriveLogicalMessageKey } from '../../src/lib/server/notifications/registration-receipts';
import { createReceiptService } from '../../src/lib/server/notifications/receipt-service';
import { DRAFT_TERMS } from '../../src/lib/terms/draft-terms-manifest';
import { migrate } from '../../scripts/migrate.mjs';

const databases: Client[] = [];
const oldPdf = 'https://batalla.test/documentos/bases-y-categorias/borrador-2026-09-v1.pdf';
const newPdf = 'https://batalla.test/documentos/bases-y-categorias/borrador-2026-10-v1.pdf';
const oldFilename = 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v1.pdf';
const marker = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';

async function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  await migrate(client);
  await client.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at)
    VALUES ('registration-1', 'Ana', 'ana@example.test', '+54 9 11 2345-6789', '+5491123456789', 'profesional', 1, ?)`, args: [new Date().toISOString()] });
  return client;
}

async function pendingNotification(client: Client, values = { mediaUrl: oldPdf, filename: oldFilename, caption: createReceiptCaption(oldPdf, marker) }) {
  const repository = createReceiptNotificationRepository(client);
  await repository.ensureForRegistration({
    registrationId: 'registration-1', termsVersion: 'draft-2026-09-v1', sha256: 'a'.repeat(64), ...values,
  });
  const logicalMessageKey = (await client.execute('SELECT logical_message_key FROM receipt_notifications')).rows[0]?.logical_message_key as string;
  return { repository, logicalMessageKey };
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('provider-neutral document receipt service', () => {
  it('sends the persisted immutable PDF snapshot as a document receipt and records document acceptance', async () => {
    const client = await database();
    const { repository, logicalMessageKey } = await pendingNotification(client);
    const commands: SendReceiptCommand[] = [];
    const messenger: ReceiptMessenger = { send: async (command) => {
      commands.push(command);
      return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', providerMessageId: 'provider-123', httpStatus: 202 };
    } };

    await createReceiptService(repository, messenger).dispatch(logicalMessageKey);

    expect(commands).toEqual([{ logicalMessageKey: expect.any(String), attemptKey: expect.any(String), toE164: '+5491123456789', attachment: {
      kind: 'document', mediaUrl: oldPdf, filename: oldFilename, mimeType: 'application/pdf', caption: createReceiptCaption(oldPdf, marker),
    } }]);
    expect(commands[0]?.logicalMessageKey).toHaveLength(64);
    expect(commands[0]?.attemptKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(commands[0]?.attemptKey).not.toBe(commands[0]?.logicalMessageKey);
    expect((await client.execute('SELECT status, provider_message_id, last_error_code FROM receipt_notifications')).rows)
      .toEqual([{ status: 'sent', provider_message_id: 'provider-123', last_error_code: null }]);
    expect((await client.execute('SELECT attempt_no, outcome, acceptance_evidence FROM receipt_notification_attempts')).rows)
      .toEqual([{ attempt_no: 1, outcome: 'sent', acceptance_evidence: 'document-response-marker' }]);
  });

  it('uses the stored snapshot on retry after current terms change and fails a URL-only outcome', async () => {
    const client = await database();
    const { repository, logicalMessageKey } = await pendingNotification(client);
    const captured: SendReceiptCommand[] = [];
    const messenger: ReceiptMessenger = { send: async (command) => {
      captured.push(command);
      return { kind: 'accepted', acceptedArtifact: 'url' as never, evidence: 'document-response-marker', httpStatus: 200 };
    } };
    const service = createReceiptService(repository, messenger);
    const key = logicalMessageKey;

    await service.dispatch(key);
    const currentTerms = DRAFT_TERMS['draft-2026-09-v1'] as { publicPath: string; filename: string };
    const storedCurrentTerms = { ...currentTerms };
    currentTerms.publicPath = new URL(newPdf).pathname;
    currentTerms.filename = 'bases-y-categorias-batalla-de-barberos-borrador-2026-10-v1.pdf';
    try {
      await service.dispatch(key);
    } finally {
      Object.assign(currentTerms, storedCurrentTerms);
    }
    expect(captured.map((command) => command.attachment)).toEqual([
      expect.objectContaining({ kind: 'document', mediaUrl: oldPdf, filename: oldFilename, mimeType: 'application/pdf', caption: expect.stringContaining(marker) }),
      expect.objectContaining({ kind: 'document', mediaUrl: oldPdf, filename: oldFilename, mimeType: 'application/pdf', caption: expect.stringContaining(oldPdf) }),
    ]);
    expect((await client.execute('SELECT status, last_error_code FROM receipt_notifications')).rows)
      .toEqual([{ status: 'failed', last_error_code: 'PROVIDER_ATTACHMENT_NOT_ACCEPTED' }]);
    expect((await client.execute('SELECT attempt_no, outcome, error_code FROM receipt_notification_attempts ORDER BY attempt_no')).rows)
      .toEqual([
        { attempt_no: 1, outcome: 'failed', error_code: 'PROVIDER_ATTACHMENT_NOT_ACCEPTED' },
        { attempt_no: 2, outcome: 'failed', error_code: 'PROVIDER_ATTACHMENT_NOT_ACCEPTED' },
      ]);
  });

  it('rejects corrupted persisted snapshots before sending any document command', async () => {
    const invalidSnapshots = [
      ['media_url', 'http://batalla.test/documentos/bases-y-categorias/borrador-2026-09-v1.pdf'],
      ['media_url', 'https://batalla.test/documentos/bases-y-categorias/borrador-2026-09-v1.txt'],
      ['media_filename', 'bases-y-categorias.txt'],
      ['media_mime_type', ''],
      ['media_mime_type', 'text/plain'],
      ['caption_text', createReceiptCaption(oldPdf, marker).replace(marker, 'BORRADOR APROBADO')],
      ['caption_text', createReceiptCaption(oldPdf, marker).replace(oldPdf, newPdf)],
      ['caption_text', 'Texto de acuse alterado'],
    ] as const;

    for (const [column, value] of invalidSnapshots) {
      const client = await database();
      const { repository, logicalMessageKey } = await pendingNotification(client);
      const commands: SendReceiptCommand[] = [];
      if (column === 'media_mime_type') await client.execute('PRAGMA ignore_check_constraints = ON');
      await client.execute({ sql: `UPDATE receipt_notifications SET ${column} = ?`, args: [value] });
      if (column === 'media_mime_type') await client.execute('PRAGMA ignore_check_constraints = OFF');

      await createReceiptService(repository, { send: async (command) => {
        commands.push(command);
        return { kind: 'accepted', acceptedArtifact: 'document', evidence: 'document-response-marker', httpStatus: 202 };
      } }).dispatch(logicalMessageKey);

      expect(commands, `invalid ${column}`).toEqual([]);
      expect((await client.execute('SELECT attempt_count, status FROM receipt_notifications')).rows)
        .toEqual([{ attempt_count: 0, status: 'pending' }]);
    }
  });

  it('derives stable, non-colliding logical keys while attempt keys remain opaque and distinct', async () => {
    expect(deriveLogicalMessageKey('registration-1', 'draft-2026-09-v1')).toBe('b798509512ec126397fc58072897505ea82158934ee0abab6f8d7062613f686a');
    expect(deriveLogicalMessageKey('registration-1', 'draft-2026-10-v1')).not.toBe('b798509512ec126397fc58072897505ea82158934ee0abab6f8d7062613f686a');
    expect(deriveLogicalMessageKey('registration-2', 'draft-2026-10-v1')).toBe('324bf908583dceb4079f9d2fbfdc1a94de7e16fff901ea3850d8783e9f7a75a3');

    const client = await database();
    const { repository, logicalMessageKey } = await pendingNotification(client);
    const commands: SendReceiptCommand[] = [];
    await createReceiptService(repository, { send: async (command) => {
      commands.push(command);
      return { kind: 'rejected', code: 'PROVIDER_REJECTED' };
    } }).dispatch(logicalMessageKey);

    expect(commands[0]?.logicalMessageKey).toBe(logicalMessageKey);
    expect(commands[0]?.attemptKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(commands[0]?.attemptKey).not.toBe(logicalMessageKey);
  });

  it('builds receipt-only Spanish copy with the exact marker and fallback URL', () => {
    expect(createReceiptCaption(oldPdf, marker)).toBe(`Recibimos tu inscripción a Batalla de Barberos.\n\nEste mensaje confirma únicamente la recepción de tu inscripción. No implica selección, aceptación para competir, confirmación de participación ni asignación de categoría.\n\nAdjuntamos las bases y categorías: ${marker}.\n\nSi no podés abrir el documento adjunto, consultá esta misma versión: ${oldPdf}`);
    expectTypeOf<ReceiptMessenger['send']>().parameters.toEqualTypeOf<[SendReceiptCommand]>();
    expect(safeErrorCode('provider echoed a secret')).toBe('PROVIDER_REJECTED');
  });
});
