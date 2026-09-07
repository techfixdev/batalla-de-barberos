import { createClient, type Client } from '@libsql/client';
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getDatabaseMock } = vi.hoisted(() => ({ getDatabaseMock: vi.fn() }));

vi.mock('../../src/lib/database', () => ({ getDatabase: getDatabaseMock }));

import { POST, createConfiguredSignupPost, createSignupPost } from '../../src/pages/api/signups';
import { migrate } from '../../scripts/migrate.mjs';

const databases: Client[] = [];
const payload = { fullName: 'Ana Barbera', email: 'ana@example.com', phone: '+54 9 11 2345-6789', barbershop: '', experience: 'profesional', acceptedRules: true };
const signupEnvironmentKeys = ['NODE_ENV', 'CANONICAL_SITE_ORIGIN', 'WHATSAPP_DISPATCH_ENABLED'] as const;

function restoreSignupEnvironment(before: Record<string, string | undefined>) {
  for (const key of signupEnvironmentKeys) {
    if (before[key] === undefined) delete process.env[key];
    else process.env[key] = before[key];
  }
}

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

afterEach(() => {
  databases.splice(0).forEach((client) => client.close());
  getDatabaseMock.mockReset();
  vi.restoreAllMocks();
});

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

  it('concurrently persists one registration and pending logical notification when dispatch is disabled', async () => {
    const client = await database();
    const post = createSignupPost({ database: client });
    const key = crypto.randomUUID();
    const responses = await Promise.all([submit(post, payload, key), submit(post, payload, key)]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 201]);
    expect((await client.execute('SELECT id FROM barber_signups')).rows).toHaveLength(1);
    expect((await client.execute('SELECT status, attempt_count, lease_token FROM receipt_notifications')).rows)
      .toEqual([{ status: 'pending', attempt_count: 0, lease_token: null }]);
    expect((await client.execute('SELECT id FROM receipt_notification_attempts')).rows).toEqual([]);
  });

  it('keeps an initial registration persistence error fatal without a dispatch diagnostic', async () => {
    const client = await database();
    const diagnostics: unknown[] = [];
    await client.execute("CREATE TRIGGER reject_signup BEFORE INSERT ON barber_signups BEGIN SELECT RAISE(ABORT, 'db-secret ana@example.com'); END");
    try {
      const response = await submit(createSignupPost({ database: client, diagnosticSink: (diagnostic) => diagnostics.push(diagnostic) }));
      expect(response.status).toBe(500);
      expect(await response.text()).not.toContain('db-secret ana@example.com');
      expect((await client.execute('SELECT id FROM barber_signups')).rows).toEqual([]);
      expect(diagnostics).toEqual([]);
    } finally {
      await client.execute('DROP TRIGGER reject_signup');
    }
  });

  it('reports only a static reconciliation diagnostic for notification persistence failure', async () => {
    const client = await database();
    const diagnostics: unknown[] = [];
    const tainted = 'db-secret ana@example.com +5491123456789';
    const post = createSignupPost({ database: client, notificationRepository: { ensureForRegistration: async () => { throw new Error(tainted); } }, diagnosticSink: (diagnostic) => diagnostics.push(diagnostic) });
    expect((await submit(post)).status).toBe(201);
    expect(diagnostics).toEqual([{ event: 'receipt-reconciliation-required', outcome: 'reconciliation-required' }]);
    expect(JSON.stringify(diagnostics)).not.toContain(tainted);
  });

  it('rejects invalid configured signup origin before constructing the default database client', async () => {
    let databaseConstructed = false;
    const post = createConfiguredSignupPost({
      database: () => { databaseConstructed = true; throw new Error('must not construct'); },
      environment: { NODE_ENV: 'production', WHATSAPP_DISPATCH_ENABLED: 'false' },
    });

    const response = await post({ request: new Request('https://attacker.example.test/api/signups', { method: 'POST' }), clientAddress: 'test' } as never);
    expect(response.status).toBe(503);
    expect(databaseConstructed).toBe(false);
  });

  it('uses the actual exported POST wrapper for configured production canonical snapshots and blocks missing or unsafe origins before getDatabase', async () => {
    const before = Object.fromEntries(signupEnvironmentKeys.map((key) => [key, process.env[key]]));
    const client = await database();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    try {
      process.env.NODE_ENV = 'production';
      process.env.CANONICAL_SITE_ORIGIN = 'https://public.example.test';
      process.env.WHATSAPP_DISPATCH_ENABLED = 'false';
      getDatabaseMock.mockReturnValue(client);

      const saved = await POST({
        request: new Request('https://attacker.example.test/api/signups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
        clientAddress: crypto.randomUUID(),
      } as never);
      expect(saved.status).toBe(201);
      expect(getDatabaseMock).toHaveBeenCalledTimes(1);
      expect((await client.execute('SELECT media_url FROM receipt_notifications')).rows)
        .toEqual([{ media_url: 'https://public.example.test/documentos/bases-y-categorias/borrador-2026-09-v3.pdf' }]);
      expect(fetchSpy).not.toHaveBeenCalled();

      getDatabaseMock.mockClear();
      delete process.env.CANONICAL_SITE_ORIGIN;
      const missing = await POST({ request: new Request('https://attacker.example.test/api/signups', { method: 'POST' }), clientAddress: 'test' } as never);
      expect(missing.status).toBe(503);
      expect(getDatabaseMock).not.toHaveBeenCalled();

      process.env.CANONICAL_SITE_ORIGIN = 'https://public.example.test/unsafe';
      const unsafe = await POST({ request: new Request('https://attacker.example.test/api/signups', { method: 'POST' }), clientAddress: 'test' } as never);
      expect(unsafe.status).toBe(503);
      expect(getDatabaseMock).not.toHaveBeenCalled();
    } finally {
      restoreSignupEnvironment(before);
    }
  });

  it('snapshots the configured canonical origin instead of an incoming Host and fails closed before database work', async () => {
    const client = await database();
    const environment = { NODE_ENV: 'production', CANONICAL_SITE_ORIGIN: 'https://public.example.test', WHATSAPP_DISPATCH_ENABLED: 'false' };
    const post = createSignupPost({ database: client, environment } as never);
    const response = await post({
      request: new Request('https://attacker.example.test/api/signups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
      clientAddress: crypto.randomUUID(),
    } as never);

    expect(response.status).toBe(201);
    expect((await client.execute('SELECT media_url FROM receipt_notifications')).rows)
      .toEqual([{ media_url: 'https://public.example.test/documentos/bases-y-categorias/borrador-2026-09-v3.pdf' }]);

    let databaseUsed = false;
    const blocked = createSignupPost({
      database: { execute: async () => { databaseUsed = true; throw new Error('must not query'); } },
      environment: { NODE_ENV: 'production', WHATSAPP_DISPATCH_ENABLED: 'false' },
    } as never);
    const unavailable = await blocked({
      request: new Request('https://attacker.example.test/api/signups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
      clientAddress: crypto.randomUUID(),
    } as never);

    expect(unavailable.status).toBe(503);
    expect(databaseUsed).toBe(false);
  });
});
