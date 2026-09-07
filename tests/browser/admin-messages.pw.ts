import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createClient, type Client } from '@libsql/client';
import { dev } from 'astro';
import { expect, test } from '@playwright/test';

import { migrate } from '../../scripts/migrate.mjs';
import { parseEvolutionPrivateMediaProfile } from '../../src/lib/server/notifications/evolution-private-media-profile';

const FIXTURE_PASSWORD = 'correct horse battery staple';
const PASSWORD_HASH = 'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg';
const SESSION_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const RECIPIENT_SECRET = Buffer.alloc(32, 4).toString('base64');
const PROVIDER_URL = 'https://evolution.example.test/message/sendMedia/local-browser';
const IDS = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'] as const;
const ENVIRONMENT = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ADMIN_PASSWORD_HASH', 'ADMIN_SESSION_SECRET_B64', 'CANONICAL_SITE_ORIGIN',
  'ASTRO_DISABLE_UPDATE_CHECK', 'WHATSAPP_DISPATCH_ENABLED', 'WHATSAPP_PRIVATE_MEDIA_ENABLED', 'EVOLUTION_API_BASE_URL', 'EVOLUTION_API_INSTANCE',
  'EVOLUTION_API_KEY', 'EVOLUTION_API_AUTH_HEADER', 'EVOLUTION_API_AUTH_SCHEME', 'EVOLUTION_API_ACCEPTED_HTTP_STATUSES', 'EVOLUTION_API_TIMEOUT_MS',
  'EVOLUTION_API_PRIVATE_MEDIA_VALIDATED_PROFILE_SHA256', 'ADMIN_MESSAGE_RECIPIENT_HMAC_SECRET_B64'] as const;

type Captured = Readonly<{ number: string; fileName: string; mediaBytes: number; isPdf: boolean; hasUrl: boolean }>;
let server: Awaited<ReturnType<typeof dev>>;
let client: Client;
let temporaryDirectory: string;
let origin: string;
let beforeEnvironment: Record<string, string | undefined>;
let providerMode: 'accepted' | 'network' = 'accepted';
const captured: Captured[] = [];
const originalFetch = globalThis.fetch;

function configurePrivateMedia(enabled: boolean) {
  const profile = {
    WHATSAPP_DISPATCH_ENABLED: 'true', WHATSAPP_PRIVATE_MEDIA_ENABLED: enabled ? 'true' : 'false',
    EVOLUTION_API_BASE_URL: 'https://evolution.example.test/', EVOLUTION_API_INSTANCE: 'local-browser', EVOLUTION_API_KEY: 'dummy-browser-secret',
    EVOLUTION_API_AUTH_HEADER: 'apikey', EVOLUTION_API_AUTH_SCHEME: 'raw', EVOLUTION_API_ACCEPTED_HTTP_STATUSES: '200', EVOLUTION_API_TIMEOUT_MS: '1000',
  };
  Object.assign(process.env, profile);
  if (enabled) {
    const parsed = parseEvolutionPrivateMediaProfile(profile);
    if (!('fingerprint' in parsed) || !parsed.fingerprint) throw new Error('Local profile did not produce a fingerprint.');
    process.env.EVOLUTION_API_PRIVATE_MEDIA_VALIDATED_PROFILE_SHA256 = parsed.fingerprint;
  } else delete process.env.EVOLUTION_API_PRIVATE_MEDIA_VALIDATED_PROFILE_SHA256;
}

async function start(enabled: boolean) {
  if (server) await server.stop();
  configurePrivateMedia(enabled);
  server = await dev({ root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  origin = `http://127.0.0.1:${server.address.port}`;
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${origin}/admin/login`);
  await page.getByLabel('Contraseña').fill(FIXTURE_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(`${origin}/admin`);
}

async function expectUsableAt(page: import('@playwright/test').Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  for (const locator of [page.locator('main button:visible'), page.locator('main input:visible'), page.locator('main a:visible')]) {
    for (let index = 0; index < await locator.count(); index += 1) {
      const target = await locator.nth(index).evaluate((element) => ({ height: element.getBoundingClientRect().height, tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 60) }));
      expect(target.height, JSON.stringify(target)).toBeGreaterThanOrEqual(44);
    }
  }
}

test.beforeAll(async () => {
  beforeEnvironment = Object.fromEntries(ENVIRONMENT.map((key) => [key, process.env[key]]));
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'bdb-admin-messages-'));
  process.env.TURSO_DATABASE_URL = pathToFileURL(join(temporaryDirectory, 'messages.db')).href;
  process.env.TURSO_AUTH_TOKEN = 'local-test-token';
  process.env.ADMIN_PASSWORD_HASH = PASSWORD_HASH;
  process.env.ADMIN_SESSION_SECRET_B64 = SESSION_SECRET;
  process.env.ADMIN_MESSAGE_RECIPIENT_HMAC_SECRET_B64 = RECIPIENT_SECRET;
  process.env.CANONICAL_SITE_ORIGIN = 'http://127.0.0.1';
  process.env.ASTRO_DISABLE_UPDATE_CHECK = 'true';
  client = createClient({ url: process.env.TURSO_DATABASE_URL });
  await migrate(client);
  for (const [index, id] of IDS.entries()) {
    await client.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at,
      terms_version, review_state, participant_response_state, receipt_required)
      VALUES (?, ?, ?, ?, ?, 'profesional', 1, ?, ?, 'selected', 'not_requested', 0)`,
    args: [id, `Persona local ${index + 1}`, `local-${index + 1}@example.test`, `011 15-2345-678${index}`, `+549112345678${index}`,
      `2026-09-0${index + 1}T12:00:00.000Z`, index === 0 ? 'draft-2026-09-v1' : 'draft-2026-09-v3'] });
  }
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    if (url !== PROVIDER_URL) return originalFetch(input, init);
    if (providerMode === 'network') throw new TypeError('local simulated network outcome');
    const payload = JSON.parse(String(init?.body)) as Record<string, string>;
    const bytes = Buffer.from(payload.media ?? '', 'base64');
    captured.push({ number: payload.number ?? '', fileName: payload.fileName ?? '', mediaBytes: bytes.byteLength,
      isPdf: bytes.subarray(0, 5).toString() === '%PDF-', hasUrl: (payload.media ?? '').includes('https://') });
    return new Response('{"key":{"id":"provider-browser"}}', { status: 200 });
  };
  await start(false);
});

test.afterAll(async () => {
  await server?.stop();
  client?.close();
  globalThis.fetch = originalFetch;
  for (const key of ENVIRONMENT) {
    if (beforeEnvironment[key] === undefined) delete process.env[key]; else process.env[key] = beforeEnvironment[key];
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

test('blocked readiness keeps export and deletion controls usable with zero private requests', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await login(page);
  await expect(page.getByText(/envío privado está deshabilitado/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeEnabled();
  await page.getByLabel('Seleccionar inscripción 1').check();
  await expect(page.getByRole('button', { name: 'Eliminar seleccionadas' })).toBeEnabled();
  await expectUsableAt(page, 320);
  expect(captured).toHaveLength(0);
  expect((await client.execute('SELECT COUNT(*) AS count FROM admin_message_jobs')).rows).toEqual([{ count: 0 }]);
});

test('ready mobile UI posts organization and confirmation actions through real routes without overflow', async ({ page }) => {
  await start(true);
  await page.setViewportSize({ width: 390, height: 1100 });
  await login(page);
  await page.getByLabel('Seleccionar inscripción 1').check();
  await expect(page.getByText('Enviar 1 inscripciones seleccionadas')).toBeVisible();
  await page.getByLabel('Número argentino de destino').fill('011 15-2345-6799');
  await page.getByLabel(/Revisé la cantidad y el destino/).check();
  await page.getByRole('button', { name: 'Crear y enviar listado' }).click();
  await expect(page).toHaveURL(/\/admin\/envios\//);
  await expect(page.getByText('Aceptado por el proveedor', { exact: true })).toBeVisible();
  await expect(page.getByText('Intento 1 · Aceptado por el proveedor', { exact: true })).toBeVisible();
  await expect(page.getByText('Intento 1 · sent', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/no demuestra entrega, lectura ni respuesta/i)).toBeVisible();
  await expectUsableAt(page, 390);

  await page.goto(`${origin}/admin/inscripciones/${IDS[0]}`);
  await expect(page.getByRole('heading', { name: 'Confirmación manual de plaza' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Acuse documental' })).toBeVisible();
  await page.getByLabel(/Confirmo explícitamente que esta plaza fue aceptada/).check();
  await page.getByRole('button', { name: 'Enviar confirmación de plaza' }).click();
  await expect(page).toHaveURL(/\/admin\/envios\//);
  await expect(page.getByText('Aceptado por el proveedor', { exact: true })).toBeVisible();
  await expect(page.getByText('N.º 1')).toBeVisible();
  await expectUsableAt(page, 390);

  expect(captured).toHaveLength(2);
  expect(captured).toEqual(expect.arrayContaining([
    expect.objectContaining({ number: '5491123456799', fileName: 'listado-inscripciones-1.pdf', isPdf: true, hasUrl: false }),
    expect.objectContaining({ number: '5491123456780', fileName: 'bases-draft-2026-09-v1.pdf', isPdf: true, hasUrl: false }),
  ]));
  expect(captured.every((item) => item.mediaBytes > 5)).toBe(true);
});

test('uncertain provider outcome shows explicit duplicate-risk acknowledgement before retry', async ({ page }) => {
  providerMode = 'network';
  await page.setViewportSize({ width: 390, height: 1000 });
  await login(page);
  await page.getByLabel('Seleccionar inscripción 2').check();
  await page.getByLabel('Número argentino de destino').fill('011 15-2345-6798');
  await page.getByLabel(/Revisé la cantidad y el destino/).check();
  await page.getByRole('button', { name: 'Crear y enviar listado' }).click();
  await expect(page).toHaveURL(/\/admin\/envios\//);
  await expect(page.getByText('Resultado incierto', { exact: true })).toBeVisible();
  await expect(page.getByText(/podría haber aceptado el envío/i)).toBeVisible();
  const acknowledgement = page.getByLabel(/reintentar puede duplicarlo/i);
  await expect(acknowledgement).toBeVisible();
  await page.getByLabel('Número argentino de la organización').fill('011 15-2345-6798');
  const retry = page.getByRole('button', { name: 'Reintentar envío' });
  expect(await acknowledgement.evaluate((input: HTMLInputElement) => input.form?.reportValidity())).toBe(false);
  await expect(acknowledgement).toBeFocused();
  await acknowledgement.check();
  await expect(retry).toBeEnabled();
  await expectUsableAt(page, 390);
});
