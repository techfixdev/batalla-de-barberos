import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { dev } from 'astro';
import { createClient, type Client } from '@libsql/client';
import { expect, it } from 'vitest';

import { migrate } from '../../scripts/migrate.mjs';

const PASSWORD_HASH = 'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg';
const SESSION_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const ENVIRONMENT = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ADMIN_PASSWORD_HASH', 'ADMIN_SESSION_SECRET_B64', 'ASTRO_DISABLE_UPDATE_CHECK', 'WHATSAPP_DISPATCH_ENABLED'] as const;

function restoreEnvironment(before: Record<string, string | undefined>) {
  for (const key of ENVIRONMENT) {
    if (before[key] === undefined) delete process.env[key];
    else process.env[key] = before[key];
  }
}

function setCookie(response: Response, name: string): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const values = headers.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? ''];
  const value = values.find((cookie) => cookie.startsWith(`${name}=`));
  if (!value) throw new Error(`Missing ${name} cookie.`);
  return value.split(';', 1)[0]!;
}

function detailIds(html: string): string[] {
  return [...html.matchAll(/href="\/admin\/inscripciones\/(registration-\d+)"/g)].map((match) => match[1]!);
}

async function seed(client: Client) {
  for (let index = 1; index <= 52; index += 1) {
    const id = `registration-${String(index).padStart(2, '0')}`;
    const createdAt = `2026-09-05T12:${String(index).padStart(2, '0')}:00.000Z`;
    const historical = index === 52;
    await client.execute({
      sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at,
        terms_version, review_state, participant_response_state, receipt_required)
        VALUES (?, ?, ?, ?, ?, 'profesional', 1, ?, 'draft-2026-09-v1', 'received', 'not_requested', ?)`,
      args: [id, index === 51 ? '<img src=x onerror=alert(1)>' : `Persona ${index}`, `${id}@example.test`, '+54 9 11 2345-6789',
        historical ? null : '+5491123456789', createdAt, historical ? 0 : 1],
    });
    if (!historical) {
      const status = index === 2 ? 'failed' : index === 3 ? 'uncertain' : 'pending';
      await client.execute({
        sql: `INSERT INTO receipt_notifications (id, logical_message_key, registration_id, terms_version, attachment_kind,
          media_url, media_filename, media_mime_type, media_sha256, caption_text, status, attempt_count, created_at, updated_at)
          VALUES (?, ?, ?, 'draft-2026-09-v1', 'document', ?, 'bases.pdf', 'application/pdf', ?, 'Acuse de inscripción', ?, 0, ?, ?)`,
        args: [`receipt-${id}`, `key-${id}`, id, 'https://batalla.test/bases.pdf', 'a'.repeat(64), status, createdAt, createdAt],
      });
    }
  }
}


it('renders the protected submitted-registration list through local Astro HTTP only', async () => {
  const before = Object.fromEntries(ENVIRONMENT.map((key) => [key, process.env[key]]));
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'bdb-admin-astro-'));
  const databasePath = join(temporaryDirectory, 'admin-runtime.db');
  let client: Client | undefined;
  let server: Awaited<ReturnType<typeof dev>> | undefined;

  try {
    process.env.TURSO_DATABASE_URL = pathToFileURL(databasePath).href;
    process.env.TURSO_AUTH_TOKEN = 'local-test-token';
    process.env.ADMIN_PASSWORD_HASH = PASSWORD_HASH;
    process.env.ADMIN_SESSION_SECRET_B64 = SESSION_SECRET;
    process.env.ASTRO_DISABLE_UPDATE_CHECK = 'true';
    process.env.WHATSAPP_DISPATCH_ENABLED = 'false';
    client = createClient({ url: process.env.TURSO_DATABASE_URL });
    await migrate(client);
    await seed(client);
    server = await dev({ root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
    const origin = `http://127.0.0.1:${server.address.port}`;

    const unauthenticated = await fetch(`${origin}/admin`, { redirect: 'manual' });
    expect(unauthenticated.status).toBe(302);
    expect(new URL(unauthenticated.headers.get('location')!, origin).pathname).toBe('/admin/login');

    const loginPage = await fetch(`${origin}/admin/login`, { redirect: 'manual' });
    const preauth = /name="preauth" value="([^"]+)"/.exec(await loginPage.text())?.[1];
    expect(preauth).toEqual(expect.any(String));
    const preauthCookie = setCookie(loginPage, 'bdb_admin_preauth');
    const login = await fetch(`${origin}/api/admin/login`, {
      method: 'POST', redirect: 'manual', headers: { Origin: origin, Cookie: preauthCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ preauth: preauth!, password: 'correct horse battery staple' }),
    });
    expect(login.status).toBe(303);
    expect(login.headers.get('location')).toBe('/admin');
    const sessionCookie = setCookie(login, 'bdb_admin');

    const list = await fetch(`${origin}/admin`, { headers: { Cookie: sessionCookie } });
    const listHtml = await list.text();
    expect(listHtml).toContain('52 inscripciones recibidas');
    expect(listHtml).toContain('No disponible (registro anterior)');

    const filtered = await fetch(`${origin}/admin?attention=1`, { headers: { Cookie: sessionCookie } });
    const filteredHtml = await filtered.text();
    expect(filtered.status).toBe(200);
    expect(filteredHtml).toContain('51 inscripciones recibidas');
    expect(filtered.headers.get('cache-control')).toBe('private, no-store');
    expect(filtered.headers.get('x-frame-options')).toBe('DENY');
    expect(filtered.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(filteredHtml).toContain('Revisión de inscripción');
    expect(filteredHtml).toContain('Respuesta del participante');
    expect(filteredHtml).toContain('Acuse documental por WhatsApp');
    expect(filteredHtml).toContain('Acuse documental fallido');
    expect(filteredHtml).toContain('Estado del acuse incierto');
    expect(filteredHtml).toContain('name="csrf"');
    expect(filteredHtml).toContain('Cerrar sesión');
    expect(filteredHtml).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(filteredHtml).not.toContain('<img src=x onerror=alert(1)>');
    const firstIds = detailIds(filteredHtml);
    expect(firstIds).toHaveLength(50);
    const nextHref = /href="([^"]+)"[^>]*>Siguientes 50 inscripciones/.exec(filteredHtml)?.[1];
    expect(nextHref).toContain('attention=1');
    expect(nextHref).toContain('cursor=');

    const second = await fetch(`${origin}${nextHref!.replaceAll('&#38;', '&')}`, { headers: { Cookie: sessionCookie } });
    const secondIds = detailIds(await second.text());
    expect(second.status).toBe(200);
    expect(secondIds).toEqual(['registration-01']);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);

    await client.execute('DELETE FROM receipt_notifications');
    await client.execute('DELETE FROM barber_signups');
    const empty = await fetch(`${origin}/admin`, { headers: { Cookie: sessionCookie } });
    expect(await empty.text()).toContain('Todavía no hay inscripciones recibidas');

    const csrf = /name="csrf" value="([^"]+)"/.exec(filteredHtml)?.[1];
    const logout = await fetch(`${origin}/api/admin/logout`, { method: 'POST', redirect: 'manual', headers: { Origin: origin, Cookie: sessionCookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf: csrf! }) });
    expect(logout.status).toBe(303);
    expect((await fetch(`${origin}/admin`, { redirect: 'manual', headers: { Cookie: sessionCookie } })).status).toBe(302);
  } finally {
    await server?.stop();
    client?.close();
    restoreEnvironment(before);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}, 30_000);
