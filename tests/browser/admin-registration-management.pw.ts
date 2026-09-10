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
const DELETE_IDS = ['a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222'] as const;
const REMAINING_ID = 'c3333333-3333-4333-8333-333333333333';
const ENVIRONMENT = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ADMIN_PASSWORD_HASH', 'ADMIN_SESSION_SECRET_B64',
  'CANONICAL_SITE_ORIGIN', 'ASTRO_DISABLE_UPDATE_CHECK', 'WHATSAPP_DISPATCH_ENABLED'] as const;

let server: Awaited<ReturnType<typeof dev>>;
let client: Client;
let temporaryDirectory: string;
let origin: string;
let beforeEnvironment: Record<string, string | undefined>;

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${origin}/admin/login`);
  await page.getByLabel('Contraseña').fill(FIXTURE_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(`${origin}/admin`);
}

async function seed(id: string, name: string, createdAt: string, reviewState = 'received') {
  await client.execute({ sql: `INSERT INTO barber_signups
    (id, full_name, email, phone, experience, accepted_rules, created_at, review_state)
    VALUES (?, ?, ?, '1', 'profesional', 1, ?, ?)`, args: [id, name, `${id}@example.test`, createdAt, reviewState] });
}

test.beforeAll(async () => {
  beforeEnvironment = Object.fromEntries(ENVIRONMENT.map((key) => [key, process.env[key]]));
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'bdb-admin-delete-browser-'));
  process.env.TURSO_DATABASE_URL = pathToFileURL(join(temporaryDirectory, 'deletion.db')).href;
  process.env.TURSO_AUTH_TOKEN = 'local-test-token';
  process.env.ADMIN_PASSWORD_HASH = PASSWORD_HASH;
  process.env.ADMIN_SESSION_SECRET_B64 = SESSION_SECRET;
  process.env.CANONICAL_SITE_ORIGIN = 'http://127.0.0.1';
  process.env.ASTRO_DISABLE_UPDATE_CHECK = 'true';
  process.env.WHATSAPP_DISPATCH_ENABLED = 'false';

  client = createClient({ url: process.env.TURSO_DATABASE_URL });
  await migrate(client);
  await seed(DELETE_IDS[0], 'Eliminar Dummy Alfa', '2026-03-03T00:00:00.000Z');
  await seed(DELETE_IDS[1], 'Eliminar Dummy Bravo', '2026-03-02T00:00:00.000Z');
  await seed(REMAINING_ID, 'Conservar Dummy Charlie', '2026-03-01T00:00:00.000Z', 'selected');
  server = await dev({ root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  origin = `http://127.0.0.1:${server.address.port}`;
});

test.afterAll(async () => {
  await server?.stop();
  client?.close();
  for (const key of ENVIRONMENT) {
    if (beforeEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = beforeEnvironment[key];
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

test('permanently deletes only two selected disposable records through the authenticated UI', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await login(page);
  await page.getByRole('link', { name: 'Herramientas' }).click();
  await expect(page).toHaveURL(`${origin}/admin?tools=1`);
  const numberRows = (await client.execute({ sql: `SELECT registration_id, number FROM registration_numbers
    WHERE registration_id IN (?, ?, ?)`, args: [...DELETE_IDS, REMAINING_ID] })).rows;
  const numbers = new Map(numberRows.map((row) => [String(row.registration_id), Number(row.number)]));
  const remainingNumber = numbers.get(REMAINING_ID)!;
  const deletedMaximum = Math.max(...DELETE_IDS.map((id) => numbers.get(id)!));
  const selection = DELETE_IDS.map((id) => page.getByLabel(`Seleccionar inscripción ${numbers.get(id)}`, { exact: true }));

  for (const checkbox of selection) {
    const box = await checkbox.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await checkbox.check();
  }
  await expect(page.getByText('2 seleccionadas', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar seleccionadas' }).click();
  const confirmation = page.getByLabel('Escribí ELIMINAR 2', { exact: true });
  const acknowledgement = page.getByLabel('Entiendo que los registros no se pueden recuperar.', { exact: true });
  await confirmation.fill('ELIMINAR 1');
  await acknowledgement.check();
  await expect(page.getByRole('button', { name: 'Eliminar permanentemente', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#delete-confirmation')).not.toBeVisible();
  expect((await client.execute({ sql: 'SELECT COUNT(*) AS count FROM barber_signups WHERE id IN (?, ?)', args: [...DELETE_IDS] })).rows)
    .toEqual([{ count: 2 }]);

  await page.getByLabel('Revisión').selectOption('selected');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByText('0 seleccionadas', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('0 seleccionadas', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Restablecer filtros' }).click();

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const checkbox of selection) await checkbox.check();
  const open = page.getByRole('button', { name: 'Eliminar seleccionadas' });
  await open.focus();
  await page.keyboard.press('Enter');
  await expect(confirmation).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(acknowledgement).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#delete-confirmation')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);

  await page.setViewportSize({ width: 390, height: 900 });
  await open.click();
  await confirmation.fill('ELIMINAR 2');
  await acknowledgement.check();
  const deletionRequest = page.waitForRequest((request) => request.url() === `${origin}/api/admin/registrations/delete`
    && request.method() === 'POST');
  await page.getByRole('button', { name: 'Eliminar permanentemente', exact: true }).click();
  expect((await deletionRequest).headers()['origin']).toBe(origin);

  await expect(page).toHaveURL(`${origin}/admin?deleted=1`);
  await expect(page.getByRole('status')).toHaveText('La eliminación permanente se completó.');
  await expect(page.getByText('Eliminar Dummy Alfa', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Eliminar Dummy Bravo', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Conservar Dummy Charlie', { exact: true })).toBeVisible();
  expect((await client.execute({ sql: 'SELECT id FROM barber_signups WHERE id IN (?, ?)', args: [...DELETE_IDS] })).rows).toEqual([]);
  expect((await client.execute({ sql: 'SELECT number FROM registration_numbers WHERE registration_id = ?', args: [REMAINING_ID] })).rows)
    .toEqual([{ number: remainingNumber }]);

  await seed('d4444444-4444-4444-8444-444444444444', 'Nuevo Dummy Delta', '2026-03-04T00:00:00.000Z');
  const newNumber = Number((await client.execute({ sql: 'SELECT number FROM registration_numbers WHERE registration_id = ?', args: ['d4444444-4444-4444-8444-444444444444'] })).rows[0]?.number);
  expect(newNumber).toBeGreaterThan(deletedMaximum);
  expect(newNumber).not.toBe(remainingNumber);
});
