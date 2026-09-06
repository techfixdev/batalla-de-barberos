import { createServer, type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createClient, type Client } from '@libsql/client';
import { dev } from 'astro';
import { expect, test } from '@playwright/test';

import { migrate } from '../../scripts/migrate.mjs';

const FIXTURE_PASSWORD = 'correct horse battery staple';
const PASSWORD_HASH = 'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg';
const SESSION_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const ENVIRONMENT = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ADMIN_PASSWORD_HASH', 'ADMIN_SESSION_SECRET_B64', 'CANONICAL_SITE_ORIGIN', 'ASTRO_DISABLE_UPDATE_CHECK', 'WHATSAPP_DISPATCH_ENABLED'] as const;

let astroServer: Awaited<ReturnType<typeof dev>>;
let attackerServer: Server;
let client: Client;
let temporaryDirectory: string;
let appOrigin: string;
let attackerOrigin: string;
let attackerCsrf = '';
let attackerStateVersion = 0;
let beforeEnvironment: Record<string, string | undefined>;

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('Expected a local TCP address.'));
      resolve(address.port);
    });
  });
}

async function seedRegistration() {
  await client.execute({
    sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at,
      terms_version, review_state, participant_response_state, receipt_required)
      VALUES (?, ?, ?, ?, ?, 'profesional', 1, ?, 'draft-2026-09-v1', 'received', 'not_requested', 0)`,
    args: ['browser-registration', 'Persona Browser', 'browser@example.test', '+54 9 11 2345-6789', '+5491123456789', '2026-09-05T12:00:00.000Z'],
  });
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${appOrigin}/admin/login`);
  const loginRequest = page.waitForRequest((request) => request.url() === `${appOrigin}/api/admin/login` && request.method() === 'POST');
  await page.getByLabel('Contraseña').fill(FIXTURE_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const request = await loginRequest;
  expect(request.headers()['origin']).toBe(appOrigin);
  await expect(page).toHaveURL(`${appOrigin}/admin`);
}

test.beforeAll(async () => {
  beforeEnvironment = Object.fromEntries(ENVIRONMENT.map((key) => [key, process.env[key]]));
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'bdb-admin-browser-'));
  process.env.TURSO_DATABASE_URL = pathToFileURL(join(temporaryDirectory, 'browser.db')).href;
  process.env.TURSO_AUTH_TOKEN = 'local-test-token';
  process.env.ADMIN_PASSWORD_HASH = PASSWORD_HASH;
  process.env.ADMIN_SESSION_SECRET_B64 = SESSION_SECRET;
  process.env.CANONICAL_SITE_ORIGIN = 'http://127.0.0.1';
  process.env.ASTRO_DISABLE_UPDATE_CHECK = 'true';
  process.env.WHATSAPP_DISPATCH_ENABLED = 'false';

  client = createClient({ url: process.env.TURSO_DATABASE_URL });
  await migrate(client);
  await seedRegistration();
  astroServer = await dev({ root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  appOrigin = `http://127.0.0.1:${astroServer.address.port}`;

  attackerServer = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><html><body><form method="post" action="${appOrigin}/api/admin/registrations/browser-registration/review-state">
      <input name="csrf" value="${attackerCsrf}"><input name="stateVersion" value="${attackerStateVersion}"><input name="reviewState" value="selected">
      <button type="submit">Atacar</button></form></body></html>`);
  });
  attackerOrigin = `http://127.0.0.1:${await listen(attackerServer)}`;
});

test.afterAll(async () => {
  await astroServer?.stop();
  await new Promise<void>((resolve, reject) => attackerServer?.close((error) => error ? reject(error) : resolve()));
  client?.close();
  for (const key of ENVIRONMENT) {
    if (beforeEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = beforeEnvironment[key];
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

test('native login submits a same-origin Origin and opens the protected admin', async ({ page }) => {
  await login(page);
});

test('login presents the existing event identity with accessible responsive controls', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`${appOrigin}/admin/login`);

  await expect(page).toHaveTitle('Administración · Batalla de Barberos');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('heading', { level: 1, name: 'Acceso administrativo' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Entre Cortes' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al sitio' })).toHaveAttribute('href', '/');
  await expect(page.getByLabel('Contraseña')).toHaveAttribute('autocomplete', 'current-password');
  expect(await page.getByLabel('Contraseña').evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.getByRole('button', { name: 'Ingresar' }).evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('authenticated native detail form and logout keep same-origin requests usable', async ({ page }) => {
  await login(page);
  await page.goto(`${appOrigin}/admin/inscripciones/browser-registration`);

  const updateRequest = page.waitForRequest((request) => request.url().endsWith('/review-state') && request.method() === 'POST');
  await page.getByLabel('Nuevo estado de revisión').selectOption('under_review');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  expect((await updateRequest).headers()['origin']).toBe(appOrigin);
  await expect(page.getByText('En revisión', { exact: true }).first()).toBeVisible();

  const logoutRequest = page.waitForRequest((request) => request.url() === `${appOrigin}/api/admin/logout`);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  expect((await logoutRequest).headers()['origin']).toBe(appOrigin);
  await expect(page).toHaveURL(`${appOrigin}/admin/login`);
});

test('cross-origin native form remains forbidden without mutating registration state', async ({ page }) => {
  await login(page);
  await page.goto(`${appOrigin}/admin/inscripciones/browser-registration`);
  attackerCsrf = await page.locator('input[name="csrf"]').first().inputValue();
  const beforeResult = await client.execute(`SELECT review_state, state_version FROM barber_signups WHERE id = 'browser-registration'`);
  const before = beforeResult.rows;
  attackerStateVersion = Number(before[0]!.state_version);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/review-state') && response.request().method() === 'POST');
  await page.goto(attackerOrigin);
  await page.getByRole('button', { name: 'Atacar' }).click();
  const response = await responsePromise;

  expect(response.request().headers()['origin']).toBe(attackerOrigin);
  expect(response.status()).toBe(403);
  expect((await client.execute(`SELECT review_state, state_version FROM barber_signups WHERE id = 'browser-registration'`)).rows).toEqual(before);
});
