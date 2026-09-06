import { createClient, type Client } from '@libsql/client';
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';

import { createSignupPost } from '../../src/pages/api/signups';
import { migrate } from '../../scripts/migrate.mjs';

const databases: Client[] = [];
const payload = { fullName: 'Ana Barbera', email: 'ana@example.com', phone: '+54 9 11 2345-6789', barbershop: '', experience: 'profesional', acceptedRules: true };

async function database() {
  const client = createClient({ url: 'file::memory:' });
  databases.push(client);
  await migrate(client);
  return client;
}

async function submit(post: ReturnType<typeof createSignupPost>, body = payload, key: string | null = crypto.randomUUID()) {
  const headers = { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) };
  return post({ request: new Request('https://signup.test/api/signups', { method: 'POST', headers, body: JSON.stringify(body) }), clientAddress: crypto.randomUUID() } as never);
}

afterEach(() => databases.splice(0).forEach((client) => client.close()));

describe('signup identity and orchestration', () => {
  it('validates and normalizes before persisting', async () => {
    const client = await database();
    const response = await submit(createSignupPost({ database: client }), { ...payload, phone: '011 2345 6789' });
    expect(response.status).toBe(422);
    expect((await client.execute('SELECT id FROM barber_signups')).rows).toEqual([]);
  });

  it('keeps a committed registration visible when notification persistence fails', async () => {
    const client = await database();
    let registrationsBeforeNotification = 0;
    const post = createSignupPost({ database: client, notificationRepository: { ensureForRegistration: async () => {
      registrationsBeforeNotification = (await client.execute('SELECT id FROM barber_signups')).rows.length;
      throw new Error('unavailable');
    } } });
    expect((await submit(post)).status).toBe(201);
    expect(registrationsBeforeNotification).toBe(1);
    expect((await client.execute('SELECT phone_e164, receipt_required FROM barber_signups')).rows)
      .toEqual([{ phone_e164: '+5491123456789', receipt_required: 1 }]);
    expect((await client.execute('SELECT id FROM receipt_notifications')).rows).toEqual([]);
  });

  it('leaves a notification unclaimed when its attempt insert is rejected', async () => {
    const client = await database();
    await client.execute(`CREATE TRIGGER reject_automatic_receipt_attempt
      BEFORE INSERT ON receipt_notification_attempts
      BEGIN SELECT RAISE(ABORT, 'forced attempt insert failure'); END`);

    try {
      expect((await submit(createSignupPost({ database: client }))).status).toBe(201);
      expect((await client.execute('SELECT status, attempt_count, lease_token, lease_expires_at FROM receipt_notifications')).rows)
        .toEqual([{ status: 'pending', attempt_count: 0, lease_token: null, lease_expires_at: null }]);
      expect((await client.execute('SELECT id FROM receipt_notification_attempts')).rows).toEqual([]);
    } finally {
      await client.execute('DROP TRIGGER reject_automatic_receipt_attempt');
    }
  });

  it('replays only the matching accepted submission and rejects a conflicting key', async () => {
    const client = await database();
    const post = createSignupPost({ database: client });
    const key = crypto.randomUUID();
    expect((await submit(post, payload, key)).status).toBe(201);
    expect((await submit(post, payload, key)).status).toBe(200);
    expect((await submit(post, { ...payload, fullName: 'Otra Persona' }, key)).status).toBe(409);
    expect((await client.execute('SELECT id FROM barber_signups')).rows).toHaveLength(1);
  });

  it('recognizes a matching email fingerprint without an idempotency key', async () => {
    const client = await database();
    const post = createSignupPost({ database: client });
    expect((await submit(post, payload, null)).status).toBe(201);
    expect((await submit(post, payload, null)).status).toBe(200);
    expect((await client.execute('SELECT id FROM barber_signups')).rows).toHaveLength(1);
  });

  it('retains the browser idempotency UUID until a successful response', async () => {
    const form = await readFile('src/components/SignupForm.astro', 'utf8');
    expect(form).toContain('let submissionKey = crypto.randomUUID();');
    expect(form).toContain("'Idempotency-Key': submissionKey");
    expect(form.indexOf('if (!response.ok)')).toBeLessThan(form.lastIndexOf('submissionKey = crypto.randomUUID();'));
  });

  it('concurrently produces one registration, logical notification, and claimed attempt', async () => {
    const client = await database();
    const post = createSignupPost({ database: client });
    const key = crypto.randomUUID();
    const responses = await Promise.all([submit(post, payload, key), submit(post, payload, key)]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 201]);
    expect((await client.execute('SELECT id FROM barber_signups')).rows).toHaveLength(1);
    expect((await client.execute('SELECT id FROM receipt_notifications')).rows).toHaveLength(1);
    expect((await client.execute("SELECT id FROM receipt_notification_attempts WHERE outcome = 'in_progress'")).rows).toHaveLength(1);
  });
});
