import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';
import { parseRegistrationExportForm } from '../../src/lib/server/admin/registration-export-form';
import { createRegistrationReadRepository, type RegistrationExportRecord } from '../../src/lib/server/admin/registration-read-repository';
import { createRegistrationExportService } from '../../src/lib/server/admin/registration-export-service';

const databases: Client[] = [];
async function setup() { const client = createClient({ url: 'file::memory:' }); databases.push(client); await migrate(client); return client; }
async function seed(client: Client, index: number) {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  await client.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, barbershop, experience, accepted_rules, created_at, terms_version, review_state, participant_response_state, receipt_required)
    VALUES (?, ?, ?, '+54 9 11 1234-5678', '+5491112345678', 'Barbería', 'profesional', 1, ?, 'draft-2026-09-v1', ?, 'not_requested', 0)`,
    args: [id, `Persona ${index}`, `person${index}@example.test`, `2026-09-${String((index % 20) + 1).padStart(2, '0')}T12:00:00.000Z`, index % 2 ? 'received' : 'selected'] });
  return id;
}
afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('registration export snapshot', () => {
  it('exports all filtered pages, selected rows only, and no internal identifiers', async () => {
    const client = await setup(); const ids: string[] = [];
    for (let index = 1; index <= 75; index += 1) ids.push(await seed(client, index));
    const repository = createRegistrationReadRepository(client);
    const all = await repository.listForExport({ reviewState: 'received' });
    expect(all).toHaveLength(38);
    const selected = await repository.listForExport({}, [ids[2]!, ids[60]!]);
    expect(selected).toHaveLength(2);
    expect(Object.keys(selected[0]!)).toEqual(['registrationNumber', 'fullName', 'email', 'phone', 'barbershop', 'experience', 'createdAt', 'review', 'participant', 'receipt']);
    expect(JSON.stringify(selected)).not.toContain(ids[2]);
    const internal = await repository.listForExport({}, [ids[2]!, ids[60]!], { includeInternalId: true, executor: client });
    expect(internal.map((record) => record.id)).toEqual([ids[2], ids[60]]);
    expect(Object.keys(internal[0]!)).toEqual(['id', 'registrationNumber', 'fullName', 'email', 'phone', 'barbershop', 'experience', 'createdAt', 'review', 'participant', 'receipt']);
    await expect(repository.listForExport({ reviewState: "received' OR 1=1 --" })).rejects.toThrow('Invalid registration filter.');
    await expect(repository.listForExport({}, [ids[0]!, '10000000-0000-4000-8000-000000000999'])).rejects.toThrow('Registration selection conflict.');
  });
});

describe('export cap', () => {
  const row: RegistrationExportRecord = Object.freeze({ registrationNumber: 1, fullName: 'A', email: 'a@test', phone: '', barbershop: '', experience: 'profesional', createdAt: '2026-01-01T00:00:00Z', review: 'received', participant: 'not_requested', receipt: 'not_required' });
  it('accepts exactly 1000 records and explicitly rejects 1001 without invoking a generator', async () => {
    let records = Array.from({ length: 1000 }, (_, index) => ({ ...row, registrationNumber: index + 1 }));
    let generated = 0;
    const service = createRegistrationExportService({ repository: { listForExport: async () => records }, loadAssets: async () => ({ regularFont: new Uint8Array(), boldFont: new Uint8Array(), emblemJpeg: new Uint8Array() }),
      createXlsx: async () => { generated += 1; return new Uint8Array([1]); }, createPdf: async () => new Uint8Array([2]) });
    expect((await service({ format: 'xlsx', filters: {}, registrationIds: [] })).kind).toBe('document');
    records = [...records, { ...row, registrationNumber: 1001 }];
    expect(await service({ format: 'xlsx', filters: {}, registrationIds: [] })).toEqual({ kind: 'too_many' });
    expect(generated).toBe(1);
  });
});

describe('strict export form', () => {
  const request = (body: string, init: RequestInit = {}) => new Request('https://admin.test/api/admin/registrations/export', { method: 'POST', headers: { origin: 'https://admin.test', 'content-type': 'application/x-www-form-urlencoded' }, body, ...init });
  it('accepts exact filtered fields and rejects duplicates, unknown fields, origins, and over-limit selections', async () => {
    const valid = 'csrf=token&scope=filtered&format=xlsx&review=&participant=&receipt=&attention=';
    expect(await parseRegistrationExportForm(request(valid))).toMatchObject({ format: 'xlsx', registrationIds: [] });
    expect(await parseRegistrationExportForm(request(`${valid}&format=pdf`))).toMatchObject({ status: 400 });
    expect(await parseRegistrationExportForm(request(`${valid}&operationId=secret`))).toMatchObject({ status: 400 });
    expect(await parseRegistrationExportForm(request(valid, { headers: { origin: 'https://evil.test', 'content-type': 'application/x-www-form-urlencoded' } }))).toMatchObject({ status: 403 });
    const id = '00000000-0000-4000-8000-000000000001';
    expect(await parseRegistrationExportForm(request(`${valid}&${Array.from({ length: 1001 }, () => `registrationId=${id}`).join('&')}`))).toMatchObject({ status: 413 });
  });
});
